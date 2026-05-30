import { sql } from 'drizzle-orm';
import { eq, and } from 'drizzle-orm';
import type { TX, DB } from '../db/client.js';
import { gameSessions } from '../db/schema.js';

export interface FreeSpinsSession {
  id:        string;
  remaining: number;
}

/** Obtiene la sesión activa de free spins para un jugador + slot. */
export async function getActiveSession(
  db: DB | TX,
  userId: string,
  slotId: string,
): Promise<FreeSpinsSession | null> {
  const [row] = await db.select({
    id:    gameSessions.id,
    state: gameSessions.state,
  }).from(gameSessions)
    .where(
      and(
        eq(gameSessions.userId, userId),
        eq(gameSessions.slotId, slotId),
        eq(gameSessions.status, 'active'),
        eq(gameSessions.kind, 'free_spins'),
      ),
    ).limit(1);

  if (!row) return null;
  const state = row.state as { remaining: number };
  return { id: row.id, remaining: state.remaining };
}

/** Crea una nueva sesión de free spins. */
export async function createSession(
  tx: TX,
  userId: string,
  slotId: string,
  spinsGranted: number,
): Promise<FreeSpinsSession> {
  const [row] = await tx.insert(gameSessions).values({
    userId,
    slotId,
    kind:   'free_spins',
    state:  { remaining: spinsGranted, totalPayout: 0 },
    status: 'active',
  }).returning({ id: gameSessions.id });

  return { id: row.id, remaining: spinsGranted };
}

/** Decrementa remaining. Si llega a 0, cierra la sesión. */
export async function consumeFreeSpinAndUpdate(
  tx: TX,
  sessionId: string,
  payout: number,
): Promise<number> {
  const [row] = await tx.execute<{ state: { remaining: number; totalPayout: number } }>(
    sql`UPDATE game_sessions
        SET state = jsonb_set(
              jsonb_set(state, '{remaining}', ((state->>'remaining')::int - 1)::text::jsonb),
              '{totalPayout}', ((state->>'totalPayout')::int + ${payout})::text::jsonb
            ),
            status = CASE WHEN (state->>'remaining')::int <= 1 THEN 'finished' ELSE 'active' END,
            updated_at = now()
        WHERE id = ${sessionId}::uuid
        RETURNING state`,
  );

  const newRemaining = Math.max(0, (row.state?.remaining ?? 1) - 1);
  return newRemaining;
}
