import { eq, and } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { withdrawals, creditTransactions, auditLog } from '../db/schema.js';
import { lockWallet, setBalance, HttpError } from '../services/wallet.js';

export const withdrawalRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /withdrawals — el jugador solicita retirar fichas
  fastify.post<{
    Body: { amount: number | 'all' };
  }>('/withdrawals', { preHandler: [fastify.authenticatePlayer] }, async (req, reply) => {
    const userId = req.user.sub;

    let amount: number;
    if (req.body.amount === 'all') {
      const row = await db.query.wallets.findFirst({ where: (w, { eq }) => eq(w.userId, userId) });
      if (!row || row.balance === 0) return reply.code(400).send({ error: 'Saldo cero' });
      amount = row.balance;
    } else {
      amount = req.body.amount;
      if (!Number.isInteger(amount) || amount <= 0) {
        return reply.code(400).send({ error: 'Monto inválido' });
      }
    }

    const [row] = await db.insert(withdrawals)
      .values({ playerId: userId, amount })
      .returning({ id: withdrawals.id, amount: withdrawals.amount, status: withdrawals.status });

    return reply.code(201).send({ withdrawalId: row.id, amount: row.amount, status: row.status });
  });

  // GET /withdrawals — historial propio del jugador
  fastify.get('/withdrawals', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const rows = await db.select().from(withdrawals)
      .where(eq(withdrawals.playerId, req.user.sub))
      .orderBy(withdrawals.id)
      .limit(50);
    return reply.send({ withdrawals: rows });
  });

  // PATCH /admin/withdrawals/:id — admin aprueba o rechaza (rutas de admin en admin.ts)
};

/** Lógica de aprobación/rechazo de retiro — reutilizada desde admin.ts */
export async function resolveWithdrawal(
  adminId: string,
  withdrawalId: number,
  action: 'approve' | 'reject',
  reason?: string,
): Promise<void> {
  const [wd] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId)).limit(1);
  if (!wd) throw new HttpError(404, 'Solicitud no encontrada');
  if (wd.status !== 'pending') throw new HttpError(409, 'La solicitud ya fue resuelta');

  if (action === 'reject') {
    await db.update(withdrawals)
      .set({ status: 'rejected', resolvedBy: adminId, reason, resolvedAt: new Date() })
      .where(eq(withdrawals.id, withdrawalId));
    await db.insert(auditLog).values({
      actorId: adminId, action: 'reject_withdrawal', targetId: wd.playerId,
      details: { withdrawalId, reason },
    });
    return;
  }

  // Aprobación: descontar del jugador en TX atómica
  await db.transaction(async (tx) => {
    const balance = await lockWallet(tx, wd.playerId);
    if (balance < wd.amount) throw new HttpError(400, 'Saldo insuficiente para aprobar');

    await setBalance(tx, wd.playerId, balance - wd.amount);

    await tx.update(withdrawals)
      .set({ status: 'approved', resolvedBy: adminId, resolvedAt: new Date() })
      .where(eq(withdrawals.id, withdrawalId));

    // Las fichas salen del sistema: to_user = NULL
    await tx.insert(creditTransactions).values({
      fromUser: wd.playerId, toUser: null, amount: wd.amount, type: 'player_withdrawal',
      note: `Retiro #${withdrawalId} aprobado`,
    });
    await tx.insert(auditLog).values({
      actorId: adminId, action: 'approve_withdrawal', targetId: wd.playerId,
      details: { withdrawalId, amount: wd.amount },
    });
  });
}
