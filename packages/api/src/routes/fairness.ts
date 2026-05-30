import { eq, and } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { spins } from '../db/schema.js';

export const fairnessRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /fairness/:spinId — devuelve semillas para que el jugador verifique su giro
  fastify.get<{ Params: { spinId: string } }>(
    '/fairness/:spinId',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const spinId = Number(req.params.spinId);
      if (!Number.isInteger(spinId)) return reply.code(400).send({ error: 'spinId inválido' });

      const [spin] = await db.select({
        serverSeed:     spins.serverSeed,
        serverSeedHash: spins.serverSeedHash,
        clientSeed:     spins.clientSeed,
        nonce:          spins.nonce,
        result:         spins.result,
        userId:         spins.userId,
      }).from(spins)
        .where(and(eq(spins.id, spinId), eq(spins.userId, req.user.sub)))
        .limit(1);

      if (!spin) return reply.code(404).send({ error: 'Giro no encontrado' });

      // Verificación local del servidor para demostrar integridad
      const computedHash = createHash('sha256').update(spin.serverSeed).digest('hex');
      const valid = computedHash === spin.serverSeedHash;

      return reply.send({
        serverSeed:     spin.serverSeed,
        serverSeedHash: spin.serverSeedHash,
        clientSeed:     spin.clientSeed,
        nonce:          spin.nonce,
        result:         spin.result,
        valid,          // false indica corrupción de datos
      });
    },
  );
};
