import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(rateLimit, {
    global: true,
    max: 120,       // 120 req/min por IP por defecto
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({ error: 'Demasiadas solicitudes, intenta más tarde' }),
  });
};

export default fp(rateLimitPlugin, { name: 'ratelimit' });
