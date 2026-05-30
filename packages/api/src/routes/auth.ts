import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { users, wallets } from '../db/schema.js';
import { getBalance } from '../services/wallet.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /auth/login
  fastify.post<{
    Body: { username: string; password: string };
  }>('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { username, password } = req.body;

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user) return reply.code(401).send({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'Credenciales inválidas' });

    if (user.status === 'banned') return reply.code(403).send({ error: 'Cuenta suspendida' });

    const balance = await getBalance(db, user.id);

    const token = fastify.jwt.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });

    return reply.send({ token, role: user.role, mustChangePassword: user.mustChangePassword, balance });
  });

  // POST /auth/change-password  (requiere token)
  fastify.post<{
    Body: { currentPassword: string; newPassword: string };
  }>('/auth/change-password', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword:     { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (req, reply) => {
    const userId = req.user.sub;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return reply.code(404).send({ error: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'Contraseña actual incorrecta' });

    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await db.update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, userId));

    const newToken = fastify.jwt.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: false,
    });

    return reply.send({ ok: true, token: newToken });
  });
};
