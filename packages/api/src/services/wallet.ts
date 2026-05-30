import { eq, sql } from 'drizzle-orm';
import { wallets } from '../db/schema.js';
import type { TX, DB } from '../db/client.js';

/** Error con código HTTP para lanzar dentro de transacciones */
export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function getBalance(db: DB | TX, userId: string): Promise<number> {
  const [row] = await db.select({ balance: wallets.balance })
    .from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (!row) throw new Error(`Wallet no encontrada para ${userId}`);
  return row.balance;
}

/**
 * Bloquea la fila de wallet con SELECT FOR UPDATE y devuelve el balance.
 * Solo debe llamarse dentro de una transacción.
 */
export async function lockWallet(tx: TX, userId: string): Promise<number> {
  const result = await tx.execute(
    sql`SELECT balance FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE`,
  ) as Array<{ balance: number }>;
  if (!result[0]) throw new HttpError(400, 'Wallet no encontrada');
  return Number(result[0].balance);
}

export async function setBalance(tx: TX, userId: string, newBalance: number): Promise<void> {
  await tx.update(wallets)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(wallets.userId, userId));
}
