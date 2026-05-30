import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from './auth.js';

type Role = 'player' | 'admin' | 'owner';
const LEVELS: Record<Role, number> = { player: 0, admin: 1, owner: 2 };

declare module 'fastify' {
  interface FastifyInstance {
    authorize: (minRole: Role) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const rolesPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'authorize',
    (minRole: Role) => async (req: FastifyRequest, reply: FastifyReply) => {
      const user = req.user as JwtPayload;
      if (!user || LEVELS[user.role] < LEVELS[minRole]) {
        reply.code(403).send({ error: 'Forbidden' });
      }
    },
  );
};

export default fp(rolesPlugin, { name: 'roles' });
