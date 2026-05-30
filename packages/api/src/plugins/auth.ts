import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

export interface JwtPayload {
  sub: string;                             // userId
  username: string;
  role: 'player' | 'admin' | 'owner';
  mustChangePassword: boolean;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** authenticate + rechaza si must_change_password es true */
    authenticatePlayer: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_TTL },
  });

  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Token inválido o expirado' });
    }
  });

  fastify.decorate('authenticatePlayer', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Token inválido o expirado' });
    }
    if (req.user.mustChangePassword) {
      reply.code(403).send({ error: 'Debes cambiar tu contraseña antes de continuar' });
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
