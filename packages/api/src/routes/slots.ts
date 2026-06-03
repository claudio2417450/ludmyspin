import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { slots } from '../db/schema.js';
import type { Paytable, Payline, FeaturesConfig } from '@ludmyspin/engine';

export const slotsRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /slots — lista todos los slots habilitados (público)
  fastify.get('/slots', async (_req, reply) => {
    const rows = await db.select({
      id:       slots.id,
      name:     slots.name,
      numRows:  slots.numRows,
      paylines: slots.paylines,
      paytable: slots.paytable,   // incluido para derivar símbolos en el frontend
      reels:    slots.reels,       // necesario para initial grid y ciclo de spin
      minBet:   slots.minBet,
      maxBet:   slots.maxBet,
    }).from(slots).where(eq(slots.enabled, true));

    // Derivar la lista de símbolos únicos de la paytable (más las keys del wild si aplica)
    const slotsWithSymbols = rows.map(row => {
      const paytable  = row.paytable as Record<string, unknown>;
      const reels     = row.reels as string[][];
      // Símbolos únicos del primer rodillo (representa todos los posibles)
      const symbols   = [...new Set(reels[0] ?? [])];
      return { ...row, symbols, reels: undefined, paytable: undefined };
    });

    return reply.send({ slots: slotsWithSymbols });
  });

  // GET /slots/:id/config — configuración completa (para el motor y la UI)
  fastify.get<{ Params: { id: string } }>(
    '/slots/:id/config',
    async (req, reply) => {
      const [row] = await db.select().from(slots).where(eq(slots.id, req.params.id)).limit(1);
      if (!row || !row.enabled) return reply.code(404).send({ error: 'Slot no encontrado' });

      return reply.send({
        id:        row.id,
        name:      row.name,
        numRows:   row.numRows,
        paylines:  row.paylines as Payline[],
        paytable:  row.paytable as Paytable,
        minBet:    row.minBet,
        maxBet:    row.maxBet,
        targetRtp: Number(row.targetRtp),
        features:  row.features as FeaturesConfig,
      });
    },
  );
};
