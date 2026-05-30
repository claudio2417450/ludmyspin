import { randomBytes } from 'node:crypto';
import { eq, count } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { spin, hashServerSeed } from '@ludmyspin/engine';
import type { SlotConfig, Paytable, Payline, FeaturesConfig } from '@ludmyspin/engine';
import { db } from '../db/client.js';
import { slots, spins, wallets, idempotencyKeys } from '../db/schema.js';
import { lockWallet, setBalance, HttpError } from '../services/wallet.js';
import { processJackpot } from '../services/jackpot.js';
import { getActiveSession, createSession, consumeFreeSpinAndUpdate } from '../services/freeSpins.js';
import { broadcast } from '../ws/broadcast.js';
import { config } from '../config.js';

function dbRowToSlotConfig(row: typeof slots.$inferSelect): SlotConfig {
  return {
    id:        row.id,
    name:      row.name,
    reels:     row.reels as string[][],
    paytable:  row.paytable as Paytable,
    numRows:   row.numRows,
    paylines:  row.paylines as Payline[],
    targetRtp: Number(row.targetRtp),
    minBet:    row.minBet,
    maxBet:    row.maxBet,
    features:  row.features as FeaturesConfig,
  };
}

export const spinRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.post<{
    Params: { id: string };
    Body:   { bet: number; clientSeed?: string };
  }>('/slots/:id/spin', {
    preHandler: [fastify.authenticatePlayer],
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['bet'],
        properties: {
          bet:        { type: 'integer', minimum: 1 },
          clientSeed: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const slotId              = req.params.id;
    const userId              = req.user.sub;
    const { bet, clientSeed = 'default' } = req.body;
    const idempKey            = req.headers['idempotency-key'] as string | undefined;

    // ── Idempotencia ────────────────────────────────────────────────────────
    if (idempKey) {
      const [cached] = await db.select({ response: idempotencyKeys.response })
        .from(idempotencyKeys).where(eq(idempotencyKeys.key, idempKey)).limit(1);
      if (cached) return reply.code(200).send(cached.response);
    }

    // ── Cargar slot ─────────────────────────────────────────────────────────
    const [slotRow] = await db.select().from(slots).where(eq(slots.id, slotId)).limit(1);
    if (!slotRow?.enabled) return reply.code(404).send({ error: 'Slot no encontrado' });

    const slotConfig = dbRowToSlotConfig(slotRow);

    // ── Verificar sesión de free spins activa ──────────────────────────────
    const freeSession = await getActiveSession(db, userId, slotId);
    const isFreeSpinRound = freeSession !== null;

    // Durante free spins la apuesta real es 0 (gratis para el jugador)
    const effectiveBet = isFreeSpinRound ? 0 : bet;

    if (!isFreeSpinRound &&
        (!Number.isInteger(bet) || bet < slotConfig.minBet || bet > slotConfig.maxBet)) {
      return reply.code(400).send({ error: 'Apuesta fuera de rango' });
    }

    // ── Transacción atómica ─────────────────────────────────────────────────
    let response: unknown;
    let jackpotWon = false;
    let jackpotNewValue = 0;

    try {
      const txResult = await db.transaction(async (tx) => {
        // 1. Bloquear wallet
        const balance = await lockWallet(tx, userId);
        if (!isFreeSpinRound && balance < bet) throw new HttpError(400, 'Saldo insuficiente');

        // 2. Nonce
        const [{ total }] = await tx.select({ total: count() })
          .from(spins).where(eq(spins.userId, userId));
        const nonce = Number(total) + 1;

        // 3. Semillas provably fair
        const serverSeed     = randomBytes(32).toString('hex');
        const serverSeedHash = hashServerSeed(serverSeed);

        // 4. Motor (apuesta real; free spin usa la apuesta de referencia para calcular pagos)
        const spinResult = spin(slotConfig, bet, { serverSeed, clientSeed, nonce });

        // 5. Jackpot — solo contribuye/dispara en giros normales
        const jpResult = isFreeSpinRound ? null : await processJackpot(
          tx, slotId, bet, spinResult.steps[0].winLines, userId,
        );

        // 6. Pago total = giro + jackpot (si ganó)
        const jackpotPay  = jpResult?.won ? jpResult.amount : 0;
        const totalPayout = spinResult.payout + jackpotPay;

        // 7. Actualizar saldo (solo descuenta si no es free spin)
        const newBalance = balance - effectiveBet + totalPayout;
        await setBalance(tx, userId, newBalance);

        // 7b. Gestionar sesión de free spins
        let freeSpinsLeft = 0;
        let sessionId: string | null = freeSession?.id ?? null;

        if (isFreeSpinRound && freeSession) {
          freeSpinsLeft = await consumeFreeSpinAndUpdate(tx, freeSession.id, totalPayout);
        } else if (!isFreeSpinRound && spinResult.features.freeSpinsGiven > 0 && slotConfig.features.freeSpins) {
          const newSession = await createSession(tx, userId, slotId, spinResult.features.freeSpinsGiven);
          freeSpinsLeft = newSession.remaining;
          sessionId     = newSession.id;
        }

        // 8. Registrar giro
        const [spinRecord] = await tx.insert(spins).values({
          userId,
          slotId,
          bet,
          payout:         totalPayout,
          winLines:       spinResult.steps[0].winLines,
          multiplier:     spinResult.multiplier,
          steps:          spinResult.steps,
          balanceAfter:   newBalance,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          result:         spinResult.steps[0].grid,
        }).returning({ id: spins.id });

        return {
          res: {
            spinId:         spinRecord.id,
            result:         spinResult.steps[0].grid,
            steps:          spinResult.steps,
            payout:         totalPayout,
            bet,
            balance:        newBalance,
            currency:       config.CURRENCY,
            features: {
              ...spinResult.features,
              freeSpinsLeft,
              sessionId,
            },
            serverSeedHash,
            nonce,
            isFreeSpinRound,
            jackpot: jpResult ? {
              name:    jpResult.name,
              won:     jpResult.won,
              amount:  jpResult.amount,
              current: jpResult.current,
            } : null,
          },
          jpResult,
        };
      });

      response     = txResult.res;
      jackpotWon   = txResult.jpResult?.won ?? false;
      jackpotNewValue = txResult.jpResult?.current ?? 0;

    } catch (err) {
      if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }

    // ── WS broadcasts ────────────────────────────────────────────────────────
    const r = response as typeof response & {
      payout: number; bet: number;
      steps: { winLines: { symbol: string }[] }[];
      jackpot: { name: string; current: number } | null;
    };

    if (r.payout > 0) {
      broadcast({
        type: 'win',
        data: {
          username: req.user.username,
          slotName: slotRow.name,
          payout:   r.payout,
          bet:      r.bet,
          symbol:   r.steps[0]?.winLines[0]?.symbol ?? '',
          at:       new Date().toISOString(),
        },
      });
    }

    if (jackpotWon) {
      broadcast({
        type: 'jackpot',
        data: {
          username:  req.user.username,
          slotName:  slotRow.name,
          slotId,
          amount:    (response as { jackpot: { amount: number } }).jackpot.amount,
          newValue:  jackpotNewValue,
          at:        new Date().toISOString(),
        },
      });
    } else if (r.jackpot) {
      // Actualización del pozo (sin premio)
      broadcast({ type: 'jackpot_update', data: { slotId, current: r.jackpot.current } });
    }

    // ── Idempotencia ─────────────────────────────────────────────────────────
    if (idempKey) {
      await db.insert(idempotencyKeys)
        .values({ key: idempKey, userId, endpoint: `/slots/${slotId}/spin`, response })
        .onConflictDoNothing();
    }

    return reply.send(response);
  });
};
