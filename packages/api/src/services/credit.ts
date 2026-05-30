import { eq, and, gte, sum } from 'drizzle-orm';
import { users, creditTransactions, auditLog } from '../db/schema.js';
import { lockWallet, setBalance, HttpError } from './wallet.js';
import type { TX } from '../db/client.js';

/**
 * El owner fondea la bolsa de un admin.
 * Ejecutar dentro de una transacción.
 */
export async function ownerFundAdmin(
  tx: TX,
  ownerId: string,
  adminId: string,
  amount: number,
  note?: string,
): Promise<void> {
  if (amount <= 0) throw new HttpError(400, 'El monto debe ser mayor a 0');

  const ownerBalance = await lockWallet(tx, ownerId);
  if (ownerBalance < amount) throw new HttpError(400, 'Saldo del owner insuficiente');

  const adminBalance = await lockWallet(tx, adminId);

  await setBalance(tx, ownerId, ownerBalance - amount);
  await setBalance(tx, adminId, adminBalance + amount);

  await tx.insert(creditTransactions).values({
    fromUser: ownerId, toUser: adminId, amount, type: 'owner_to_admin', note,
  });
  await tx.insert(auditLog).values({
    actorId: ownerId, action: 'owner_to_admin', targetId: adminId,
    details: { amount, note },
  });
}

/**
 * Un admin carga crédito a uno de sus jugadores.
 * Verifica pertenencia, límites por TX y por día. Ejecutar dentro de TX.
 */
export async function adminLoadPlayer(
  tx: TX,
  adminId: string,
  playerId: string,
  amount: number,
  note?: string,
): Promise<void> {
  if (amount <= 0) throw new HttpError(400, 'El monto debe ser mayor a 0');

  // Verificar que el jugador pertenece a este admin
  const [player] = await tx.select({ createdBy: users.createdBy })
    .from(users).where(eq(users.id, playerId)).limit(1);
  if (!player || player.createdBy !== adminId) {
    throw new HttpError(403, 'El jugador no pertenece a este admin');
  }

  // Obtener límites del admin
  const [admin] = await tx.select({ maxLoadPerTx: users.maxLoadPerTx, maxLoadPerDay: users.maxLoadPerDay })
    .from(users).where(eq(users.id, adminId)).limit(1);
  if (!admin) throw new HttpError(404, 'Admin no encontrado');

  if (admin.maxLoadPerTx != null && amount > admin.maxLoadPerTx) {
    throw new HttpError(400, `Supera el límite por transacción (${admin.maxLoadPerTx})`);
  }

  // Verificar límite diario
  if (admin.maxLoadPerDay != null) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const [{ total }] = await tx
      .select({ total: sum(creditTransactions.amount) })
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.fromUser, adminId),
        eq(creditTransactions.type, 'admin_to_player'),
        gte(creditTransactions.createdAt, startOfDay),
      ));
    if ((Number(total ?? 0) + amount) > admin.maxLoadPerDay) {
      throw new HttpError(400, 'Límite diario de carga excedido');
    }
  }

  const adminBalance = await lockWallet(tx, adminId);
  if (adminBalance < amount) throw new HttpError(400, 'Bolsa del admin insuficiente');

  const playerBalance = await lockWallet(tx, playerId);

  await setBalance(tx, adminId, adminBalance - amount);
  await setBalance(tx, playerId, playerBalance + amount);

  await tx.insert(creditTransactions).values({
    fromUser: adminId, toUser: playerId, amount, type: 'admin_to_player', note,
  });
  await tx.insert(auditLog).values({
    actorId: adminId, action: 'admin_load_player', targetId: playerId,
    details: { amount, note },
  });
}
