import bcrypt from 'bcryptjs';
import { eq, sum } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { users, wallets, creditTransactions } from '../db/schema.js';
import { ownerFundAdmin } from '../services/credit.js';
import { HttpError } from '../services/wallet.js';

export const ownerRoutes: FastifyPluginAsync = async (fastify) => {
  const isOwner = [fastify.authenticate, fastify.authorize('owner')];

  // POST /owner/mint — el owner emite créditos al sistema (los añade a su propia billetera)
  fastify.post<{ Body: { amount: number; note?: string } }>(
    '/owner/mint', { preHandler: isOwner }, async (req, reply) => {
      const { amount, note } = req.body;
      if (!Number.isInteger(amount) || amount <= 0) {
        return reply.code(400).send({ error: 'Monto inválido' });
      }
      const ownerId = req.user.sub;
      await db.transaction(async (tx) => {
        const { lockWallet, setBalance } = await import('../services/wallet.js');
        const current = await lockWallet(tx, ownerId);
        await setBalance(tx, ownerId, current + amount);
        await tx.insert(creditTransactions).values({
          fromUser: null, toUser: ownerId, amount, type: 'owner_mint', note,
        });
      });
      return reply.send({ ok: true, minted: amount });
    },
  );

  // POST /owner/admins — crear admin
  fastify.post<{ Body: { username: string; password: string } }>(
    '/owner/admins', { preHandler: isOwner }, async (req, reply) => {
      const { username, password } = req.body;

      const [existing] = await db.select({ id: users.id })
        .from(users).where(eq(users.username, username)).limit(1);
      if (existing) return reply.code(409).send({ error: 'Usuario ya existe' });

      const passwordHash = await bcrypt.hash(password, 12);
      const [admin] = await db.insert(users).values({
        username, passwordHash, role: 'admin', createdBy: req.user.sub,
      }).returning({ id: users.id, username: users.username });

      await db.insert(wallets).values({ userId: admin.id, balance: 0 });
      return reply.code(201).send({ adminId: admin.id, username: admin.username });
    },
  );

  // POST /owner/admins/:id/fund — fondear bolsa de un admin
  fastify.post<{
    Params: { id: string };
    Body:   { amount: number; note?: string };
  }>('/owner/admins/:id/fund', { preHandler: isOwner }, async (req, reply) => {
    try {
      await db.transaction((tx) =>
        ownerFundAdmin(tx, req.user.sub, req.params.id, req.body.amount, req.body.note),
      );
    } catch (err) {
      if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
    return reply.send({ ok: true });
  });

  // PATCH /owner/admins/:id/limits — fijar límites al admin
  fastify.patch<{
    Params: { id: string };
    Body:   { maxLoadPerTx?: number | null; maxLoadPerDay?: number | null };
  }>('/owner/admins/:id/limits', { preHandler: isOwner }, async (req, reply) => {
    await db.update(users)
      .set({ maxLoadPerTx: req.body.maxLoadPerTx, maxLoadPerDay: req.body.maxLoadPerDay })
      .where(eq(users.id, req.params.id));
    return reply.send({ ok: true });
  });

  // PATCH /owner/users/:id/role — cambiar rol
  fastify.patch<{
    Params: { id: string };
    Body:   { role: 'player' | 'admin' | 'owner' };
  }>('/owner/users/:id/role', { preHandler: isOwner }, async (req, reply) => {
    await db.update(users).set({ role: req.body.role }).where(eq(users.id, req.params.id));
    return reply.send({ ok: true });
  });

  // GET /owner/users — árbol completo
  fastify.get('/owner/users', { preHandler: isOwner }, async (req, reply) => {
    const rows = await db.select({
      id: users.id, username: users.username, role: users.role,
      status: users.status, createdBy: users.createdBy, createdAt: users.createdAt,
    }).from(users);
    return reply.send({ users: rows });
  });

  // GET /owner/transactions — todos los movimientos de crédito
  fastify.get('/owner/transactions', { preHandler: isOwner }, async (req, reply) => {
    const rows = await db.select().from(creditTransactions)
      .orderBy(creditTransactions.id).limit(200);
    return reply.send({ transactions: rows });
  });

  // GET /owner/stats — resumen global
  fastify.get('/owner/stats', { preHandler: isOwner }, async (req, reply) => {
    const [{ emitted }] = await db
      .select({ emitted: sum(creditTransactions.amount) })
      .from(creditTransactions)
      .where(eq(creditTransactions.type, 'owner_mint'));
    return reply.send({ totalEmitted: emitted ?? 0 });
  });
};
