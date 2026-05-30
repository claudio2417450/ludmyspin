import bcrypt from 'bcryptjs';
import { eq, and, count, sum } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { users, wallets, withdrawals, spins, creditTransactions } from '../db/schema.js';
import { adminLoadPlayer } from '../services/credit.js';
import { HttpError } from '../services/wallet.js';
import { resolveWithdrawal } from './withdrawals.js';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const isAdmin = [fastify.authenticate, fastify.authorize('admin')];

  // ── Jugadores ──────────────────────────────────────────────────────────────

  // POST /admin/players — crear jugador
  fastify.post<{ Body: { username: string; password: string } }>(
    '/admin/players', { preHandler: isAdmin }, async (req, reply) => {
      const adminId = req.user.sub;
      const { username, password } = req.body;

      const [existing] = await db.select({ id: users.id })
        .from(users).where(eq(users.username, username)).limit(1);
      if (existing) return reply.code(409).send({ error: 'Usuario ya existe' });

      const passwordHash = await bcrypt.hash(password, 12);
      const [player] = await db.insert(users).values({
        username, passwordHash, role: 'player', createdBy: adminId,
      }).returning({ id: users.id, username: users.username });

      await db.insert(wallets).values({ userId: player.id, balance: 0 });
      return reply.code(201).send({ playerId: player.id, username: player.username });
    },
  );

  // GET /admin/players — listar sus jugadores
  fastify.get('/admin/players', { preHandler: isAdmin }, async (req, reply) => {
    const rows = await db.select({
      id: users.id, username: users.username, status: users.status, createdAt: users.createdAt,
    }).from(users)
      .where(and(eq(users.createdBy, req.user.sub), eq(users.role, 'player')));
    return reply.send({ players: rows });
  });

  // PATCH /admin/players/:id — banear / reactivar
  fastify.patch<{
    Params: { id: string };
    Body:   { status: 'active' | 'banned' };
  }>('/admin/players/:id', { preHandler: isAdmin }, async (req, reply) => {
    await assertOwnership(req.user.sub, req.params.id);
    await db.update(users).set({ status: req.body.status }).where(eq(users.id, req.params.id));
    return reply.send({ ok: true });
  });

  // POST /admin/players/:id/credit — cargar crédito
  fastify.post<{
    Params: { id: string };
    Body:   { amount: number; note?: string };
  }>('/admin/players/:id/credit', { preHandler: isAdmin }, async (req, reply) => {
    const { amount, note } = req.body;
    try {
      await db.transaction((tx) => adminLoadPlayer(tx, req.user.sub, req.params.id, amount, note));
    } catch (err) {
      if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
    return reply.send({ ok: true });
  });

  // ── Retiros ────────────────────────────────────────────────────────────────

  // GET /admin/withdrawals — retiros pendientes de sus jugadores
  fastify.get('/admin/withdrawals', { preHandler: isAdmin }, async (req, reply) => {
    const rows = await db.select({
      id: withdrawals.id, playerId: withdrawals.playerId,
      amount: withdrawals.amount, status: withdrawals.status, createdAt: withdrawals.createdAt,
    }).from(withdrawals)
      .innerJoin(users, eq(withdrawals.playerId, users.id))
      .where(and(eq(users.createdBy, req.user.sub), eq(withdrawals.status, 'pending')));
    return reply.send({ withdrawals: rows });
  });

  // PATCH /admin/withdrawals/:id — aprobar / rechazar
  fastify.patch<{
    Params: { id: string };
    Body:   { action: 'approve' | 'reject'; reason?: string };
  }>('/admin/withdrawals/:id', { preHandler: isAdmin }, async (req, reply) => {
    try {
      await resolveWithdrawal(req.user.sub, Number(req.params.id), req.body.action, req.body.reason);
    } catch (err) {
      if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
    return reply.send({ ok: true });
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  fastify.get('/admin/stats', { preHandler: isAdmin }, async (req, reply) => {
    const adminId = req.user.sub;
    const [playerCount] = await db.select({ total: count() })
      .from(users).where(and(eq(users.createdBy, adminId), eq(users.role, 'player')));
    const [spinStats] = await db.select({ total: count(), paid: sum(spins.payout) })
      .from(spins)
      .innerJoin(users, eq(spins.userId, users.id))
      .where(eq(users.createdBy, adminId));
    return reply.send({ players: playerCount.total, spins: spinStats.total, paid: spinStats.paid ?? 0 });
  });

  // GET /admin/wallet — bolsa del admin
  fastify.get('/admin/wallet', { preHandler: isAdmin }, async (req, reply) => {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, req.user.sub)).limit(1);
    const [adminRow] = await db.select({ maxLoadPerTx: users.maxLoadPerTx, maxLoadPerDay: users.maxLoadPerDay })
      .from(users).where(eq(users.id, req.user.sub)).limit(1);
    return reply.send({ balance: wallet?.balance ?? 0, limits: adminRow });
  });
};

async function assertOwnership(adminId: string, playerId: string) {
  const [player] = await db.select({ createdBy: users.createdBy })
    .from(users).where(eq(users.id, playerId)).limit(1);
  if (!player || player.createdBy !== adminId) throw new HttpError(403, 'Jugador no pertenece a este admin');
}
