import { eq, and, gt } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { spins } from '../db/schema.js';

export const historyRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /history?wins=true&limit=20&cursor=<lastSpinId>
  fastify.get<{
    Querystring: { wins?: string; limit?: string; cursor?: string };
  }>('/history', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const userId  = req.user.sub;
    const onlyWins = req.query.wins === 'true';
    const limit   = Math.min(Number(req.query.limit ?? 20), 100);
    const cursor  = req.query.cursor ? Number(req.query.cursor) : undefined;

    const conditions = [eq(spins.userId, userId)];
    if (onlyWins) conditions.push(gt(spins.payout, 0));
    if (cursor)   conditions.push(gt(spins.id, cursor));   // paginación hacia adelante

    const rows = await db.select({
      spinId:       spins.id,
      slot:         spins.slotId,
      bet:          spins.bet,
      payout:       spins.payout,
      winLines:     spins.winLines,
      multiplier:   spins.multiplier,
      balanceAfter: spins.balanceAfter,
      at:           spins.createdAt,
    }).from(spins)
      .where(and(...conditions))
      .orderBy(spins.id)
      .limit(limit);

    return reply.send({ spins: rows });
  });
};
