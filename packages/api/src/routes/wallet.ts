import type { FastifyPluginAsync } from 'fastify';
import { getBalance } from '../services/wallet.js';
import { db } from '../db/client.js';

export const walletRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/wallet', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const balance = await getBalance(db, req.user.sub);
    return reply.send({ balance });
  });
};
