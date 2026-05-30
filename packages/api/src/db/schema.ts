import {
  pgTable, text, uuid, boolean, bigint, integer,
  timestamp, jsonb, numeric, index, bigserial, serial,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  username:            text('username').unique().notNull(),
  passwordHash:        text('password_hash').notNull(),
  role:                text('role').$type<'player' | 'admin' | 'owner'>().notNull().default('player'),
  status:              text('status').$type<'active' | 'banned'>().notNull().default('active'),
  createdBy:           uuid('created_by').references((): AnyPgColumn => users.id),
  mustChangePassword:  boolean('must_change_password').notNull().default(true),
  // Solo aplican a admins; NULL = sin tope
  maxLoadPerTx:        bigint('max_load_per_tx',  { mode: 'number' }),
  maxLoadPerDay:       bigint('max_load_per_day', { mode: 'number' }),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  parentIdx: index('idx_users_parent').on(t.createdBy),
}));

// ─── Wallets ─────────────────────────────────────────────────────────────────

export const wallets = pgTable('wallets', {
  userId:    uuid('user_id').primaryKey().references(() => users.id),
  balance:   bigint('balance', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Movimientos de crédito ───────────────────────────────────────────────────

export const creditTransactions = pgTable('credit_transactions', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  fromUser:  uuid('from_user').references(() => users.id),  // NULL = el owner emite
  toUser:    uuid('to_user').references(() => users.id),    // NULL = retiro (sale)
  amount:    bigint('amount', { mode: 'number' }).notNull(),
  type:      text('type')
    .$type<'owner_mint' | 'owner_to_admin' | 'admin_to_player' | 'player_withdrawal'>()
    .notNull(),
  note:      text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  toIdx:   index('idx_credit_to').on(t.toUser, t.createdAt),
  fromIdx: index('idx_credit_from').on(t.fromUser, t.createdAt),
}));

// ─── Slots ────────────────────────────────────────────────────────────────────

export const slots = pgTable('slots', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  reels:     jsonb('reels').notNull(),                              // string[][]
  paytable:  jsonb('paytable').notNull(),                          // Paytable
  numRows:   integer('num_rows').notNull().default(3),
  paylines:  jsonb('paylines').notNull(),                          // Payline[]
  targetRtp: numeric('target_rtp', { precision: 5, scale: 2 }).notNull(),
  minBet:    bigint('min_bet',  { mode: 'number' }).notNull().default(1),
  maxBet:    bigint('max_bet',  { mode: 'number' }).notNull().default(100_000),
  features:  jsonb('features').notNull().default({}),
  enabled:   boolean('enabled').notNull().default(true),
});

// ─── Sesiones de funciones especiales ────────────────────────────────────────

export const gameSessions = pgTable('game_sessions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id),
  slotId:    text('slot_id').notNull().references(() => slots.id),
  kind:      text('kind').notNull(),
  state:     jsonb('state').notNull(),
  status:    text('status').$type<'active' | 'finished'>().notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  activeIdx: index('idx_sessions_active').on(t.userId, t.slotId),
}));

// ─── Historial de giros ───────────────────────────────────────────────────────

export const spins = pgTable('spins', {
  id:             bigserial('id', { mode: 'number' }).primaryKey(),
  userId:         uuid('user_id').notNull().references(() => users.id),
  slotId:         text('slot_id').notNull().references(() => slots.id),
  bet:            bigint('bet',    { mode: 'number' }).notNull(),
  payout:         bigint('payout', { mode: 'number' }).notNull(),
  winLines:       jsonb('win_lines').notNull().default([]),
  multiplier:     integer('multiplier').notNull().default(1),
  steps:          jsonb('steps').notNull().default([]),
  sessionId:      uuid('session_id').references(() => gameSessions.id),
  balanceAfter:   bigint('balance_after', { mode: 'number' }).notNull(),
  serverSeed:     text('server_seed').notNull(),
  serverSeedHash: text('server_seed_hash').notNull(),
  clientSeed:     text('client_seed').notNull(),
  nonce:          bigint('nonce', { mode: 'number' }).notNull(),
  result:         jsonb('result').notNull(),   // grid visible (string[][])
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('idx_spins_user').on(t.userId, t.createdAt),
  winsIdx: index('idx_spins_wins').on(t.userId, t.createdAt),
}));

// ─── Retiros ──────────────────────────────────────────────────────────────────

export const withdrawals = pgTable('withdrawals', {
  id:          bigserial('id', { mode: 'number' }).primaryKey(),
  playerId:    uuid('player_id').notNull().references(() => users.id),
  amount:      bigint('amount', { mode: 'number' }).notNull(),
  status:      text('status').$type<'pending' | 'approved' | 'rejected'>().notNull().default('pending'),
  resolvedBy:  uuid('resolved_by').references(() => users.id),
  reason:      text('reason'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt:  timestamp('resolved_at', { withTimezone: true }),
}, (t) => ({
  statusIdx: index('idx_withdrawals_status').on(t.status, t.createdAt),
}));

// ─── Audit log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  actorId:   uuid('actor_id').notNull().references(() => users.id),
  action:    text('action').notNull(),
  targetId:  uuid('target_id').references(() => users.id),
  details:   jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  actorIdx: index('idx_audit_actor').on(t.actorId, t.createdAt),
}));

// ─── Idempotencia ─────────────────────────────────────────────────────────────

export const idempotencyKeys = pgTable('idempotency_keys', {
  key:       text('key').primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id),
  endpoint:  text('endpoint').notNull(),
  response:  jsonb('response').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Jackpots ─────────────────────────────────────────────────────────────────

export const jackpots = pgTable('jackpots', {
  id:            serial('id').primaryKey(),
  slotId:        text('slot_id').notNull().references(() => slots.id),
  name:          text('name').notNull().default('Grand Jackpot'),
  /** Valor actual del pozo. */
  current:       bigint('current', { mode: 'number' }).notNull(),
  /** Valor mínimo tras un premio (semilla de reinicio). */
  seed:          bigint('seed', { mode: 'number' }).notNull(),
  /** Fracción del bet que se acumula al pozo (ej: 0.0100 = 1 %). */
  contribution:  numeric('contribution', { precision: 6, scale: 4 }).notNull().default('0.0100'),
  enabled:       boolean('enabled').notNull().default(true),
  lastWonAt:     timestamp('last_won_at', { withTimezone: true }),
  lastWonBy:     uuid('last_won_by').references(() => users.id),
  lastWonAmount: bigint('last_won_amount', { mode: 'number' }),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
