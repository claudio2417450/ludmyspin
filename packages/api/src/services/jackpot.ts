import { sql } from 'drizzle-orm';
import type { TX } from '../db/client.js';
import type { WinLine } from '@ludmyspin/engine';

export interface JackpotResult {
  name:    string;
  won:     boolean;
  amount:  number;   // cuánto se paga si won=true
  current: number;   // valor del pozo después de esta TX (para broadcast)
}

/**
 * Dentro de la TX del giro:
 *   - Añade la contribución al pozo.
 *   - Si el giro contiene 3 sevens, paga el jackpot y lo reinicia al seed.
 * Usa SELECT FOR UPDATE para que no haya condiciones de carrera bajo concurrencia.
 */
export async function processJackpot(
  tx: TX,
  slotId: string,
  bet: number,
  winLines: WinLine[],
  userId: string,
): Promise<JackpotResult | null> {
  const rows = await tx.execute<{
    id: number; current: string; seed: string; contribution: string; name: string;
  }>(sql`
    SELECT id, current, seed, contribution, name
    FROM jackpots
    WHERE slot_id = ${slotId} AND enabled = true
    FOR UPDATE
    LIMIT 1
  `);

  const jp = rows[0];
  if (!jp) return null;

  const contribution = Math.max(1, Math.floor(bet * Number(jp.contribution)));
  const triggered    = winLines.some((w) => w.symbol === 'seven' && w.count >= 3);

  if (triggered) {
    const wonAmount = Number(jp.current) + contribution;
    await tx.execute(sql`
      UPDATE jackpots
      SET current         = ${Number(jp.seed)},
          last_won_at     = now(),
          last_won_by     = ${userId}::uuid,
          last_won_amount = ${wonAmount}
      WHERE id = ${jp.id}
    `);
    return { name: jp.name, won: true, amount: wonAmount, current: Number(jp.seed) };
  }

  const newCurrent = Number(jp.current) + contribution;
  await tx.execute(sql`UPDATE jackpots SET current = ${newCurrent} WHERE id = ${jp.id}`);
  return { name: jp.name, won: false, amount: 0, current: newCurrent };
}
