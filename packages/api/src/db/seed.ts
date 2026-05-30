import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { classic, fruits, bonanza } from '@ludmyspin/engine';
import { db } from './client.js';
import { users, wallets, slots as slotsTable, jackpots } from './schema.js';
import { config } from '../config.js';

async function seed() {
  // ── Owner ──────────────────────────────────────────────────────────────────
  const existing = await db.select({ id: users.id })
    .from(users).where(eq(users.username, config.OWNER_USERNAME)).limit(1);

  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash(config.OWNER_PASSWORD, 12);
    const [owner] = await db.insert(users).values({
      username: config.OWNER_USERNAME,
      passwordHash,
      role: 'owner',
      mustChangePassword: true,
    }).returning({ id: users.id, username: users.username });

    await db.insert(wallets).values({ userId: owner.id, balance: 0 });
    console.log(`Owner creado: ${owner.username} (${owner.id})`);
  } else {
    console.log('Owner ya existe, omitiendo...');
  }

  // ── Slots ──────────────────────────────────────────────────────────────────
  const slotConfigs = [classic, fruits, bonanza];
  for (const slot of slotConfigs) {
    await db.insert(slotsTable).values({
      id:        slot.id,
      name:      slot.name,
      reels:     slot.reels,
      paytable:  slot.paytable,
      numRows:   slot.numRows,
      paylines:  slot.paylines,
      targetRtp: String(slot.targetRtp),
      minBet:    slot.minBet,
      maxBet:    slot.maxBet,
      features:  slot.features,
      enabled:   true,
    }).onConflictDoUpdate({
      target: slotsTable.id,
      set: {
        name:      slot.name,
        reels:     slot.reels,
        paytable:  slot.paytable,
        numRows:   slot.numRows,
        paylines:  slot.paylines,
        targetRtp: String(slot.targetRtp),
        minBet:    slot.minBet,
        maxBet:    slot.maxBet,
        features:  slot.features,
      },
    });
    console.log(`Slot: ${slot.id}`);

    // Jackpot por slot (si no existe)
    const SEEDS: Record<string, { name: string; seed: number }> = {
      classic: { name: 'Grand Jackpot',   seed: 50_000  },
      fruits:  { name: 'Mega Jackpot',    seed: 100_000 },
      bonanza: { name: 'Bonanza Jackpot', seed: 75_000  },
    };
    const jpConfig = SEEDS[slot.id];
    if (jpConfig) {
      const existing = await db.select({ id: jackpots.id })
        .from(jackpots).where(eq(jackpots.slotId, slot.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(jackpots).values({
          slotId:       slot.id,
          name:         jpConfig.name,
          current:      jpConfig.seed,
          seed:         jpConfig.seed,
          contribution: '0.0100',
          enabled:      true,
        });
        console.log(`  Jackpot: ${jpConfig.name} (seed ${jpConfig.seed.toLocaleString('es')})`);
      }
    }
  }

  console.log('Seed completo.');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
