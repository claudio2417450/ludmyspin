import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { jackpots } from '../db/schema.js';

export const jackpotRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /jackpots/:slotId — valor actual del jackpot de un slot
  fastify.get<{ Params: { slotId: string } }>(
    '/jackpots/:slotId',
    async (req, reply) => {
      const [jp] = await db.select({
        name:         jackpots.name,
        current:      jackpots.current,
        seed:         jackpots.seed,
        lastWonAt:    jackpots.lastWonAt,
        lastWonAmount: jackpots.lastWonAmount,
      }).from(jackpots)
        .where(eq(jackpots.slotId, req.params.slotId))
        .limit(1);

      if (!jp) return reply.code(404).send({ error: 'No hay jackpot para este slot' });
      return reply.send(jp);
    },
  );
};
