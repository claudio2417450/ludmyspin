import Fastify from 'fastify';
import authPlugin from './plugins/auth.js';
import rolesPlugin from './plugins/roles.js';
import rateLimitPlugin from './plugins/ratelimit.js';
import { authRoutes } from './routes/auth.js';
import { spinRoutes } from './routes/spin.js';
import { slotsRoutes }   from './routes/slots.js';
import { jackpotRoutes } from './routes/jackpot.js';
import { walletRoutes } from './routes/wallet.js';
import { fairnessRoutes } from './routes/fairness.js';
import { historyRoutes } from './routes/history.js';
import { withdrawalRoutes } from './routes/withdrawals.js';
import { adminRoutes } from './routes/admin.js';
import { ownerRoutes } from './routes/owner.js';
import { setupWss } from './ws/broadcast.js';
import { config } from './config.js';

const fastify = Fastify({
  logger: { level: config.NODE_ENV === 'production' ? 'warn' : 'info' },
});

// ── Plugins globales ──────────────────────────────────────────────────────────
await fastify.register(rateLimitPlugin);
await fastify.register(authPlugin);
await fastify.register(rolesPlugin);

// ── Rutas ─────────────────────────────────────────────────────────────────────
await fastify.register(authRoutes);
await fastify.register(spinRoutes);
await fastify.register(slotsRoutes);
await fastify.register(jackpotRoutes);
await fastify.register(walletRoutes);
await fastify.register(fairnessRoutes);
await fastify.register(historyRoutes);
await fastify.register(withdrawalRoutes);
await fastify.register(adminRoutes, { prefix: '' });
await fastify.register(ownerRoutes, { prefix: '' });

// ── Health check ──────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({ ok: true }));

// ── Arrancar ──────────────────────────────────────────────────────────────────
try {
  await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
  // WebSocket server comparte el puerto HTTP de Fastify
  setupWss(fastify.server);
  fastify.log.info('WebSocket server activo en /ws');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
