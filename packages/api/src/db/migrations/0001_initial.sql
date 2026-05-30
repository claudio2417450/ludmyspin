-- LuDmySpin — migración inicial
-- Ejecutar en orden; las FK requieren que las tablas referenciadas existan primero.

CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username             TEXT UNIQUE NOT NULL,
  password_hash        TEXT NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'player'
                         CHECK (role IN ('player','admin','owner')),
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','banned')),
  created_by           UUID REFERENCES users(id),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  max_load_per_tx      BIGINT,
  max_load_per_day     BIGINT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_parent ON users(created_by);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallets (
  user_id    UUID PRIMARY KEY REFERENCES users(id),
  balance    BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_transactions (
  id         BIGSERIAL PRIMARY KEY,
  from_user  UUID REFERENCES users(id),
  to_user    UUID REFERENCES users(id),
  amount     BIGINT NOT NULL CHECK (amount > 0),
  type       TEXT NOT NULL
               CHECK (type IN ('owner_mint','owner_to_admin','admin_to_player','player_withdrawal')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_to   ON credit_transactions(to_user,   created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_from ON credit_transactions(from_user,  created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS slots (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  reels      JSONB NOT NULL,
  paytable   JSONB NOT NULL,
  num_rows   INTEGER NOT NULL DEFAULT 3,
  paylines   JSONB NOT NULL,
  target_rtp NUMERIC(5,2) NOT NULL,
  min_bet    BIGINT NOT NULL DEFAULT 1,
  max_bet    BIGINT NOT NULL DEFAULT 100000,
  features   JSONB NOT NULL DEFAULT '{}',
  enabled    BOOLEAN NOT NULL DEFAULT true
);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  slot_id    TEXT NOT NULL REFERENCES slots(id),
  kind       TEXT NOT NULL,
  state      JSONB NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','finished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON game_sessions(user_id, slot_id) WHERE status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS spins (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id),
  slot_id          TEXT NOT NULL REFERENCES slots(id),
  bet              BIGINT NOT NULL,
  payout           BIGINT NOT NULL,
  win_lines        JSONB NOT NULL DEFAULT '[]',
  multiplier       INTEGER NOT NULL DEFAULT 1,
  steps            JSONB NOT NULL DEFAULT '[]',
  session_id       UUID REFERENCES game_sessions(id),
  balance_after    BIGINT NOT NULL,
  server_seed      TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  client_seed      TEXT NOT NULL,
  nonce            BIGINT NOT NULL,
  result           JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spins_user ON spins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spins_wins ON spins(user_id, created_at DESC)
  WHERE payout > 0;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS withdrawals (
  id          BIGSERIAL PRIMARY KEY,
  player_id   UUID NOT NULL REFERENCES users(id),
  amount      BIGINT NOT NULL CHECK (amount > 0),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
  resolved_by UUID REFERENCES users(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status, created_at);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   UUID NOT NULL REFERENCES users(id),
  action     TEXT NOT NULL,
  target_id  UUID REFERENCES users(id),
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key        TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  endpoint   TEXT NOT NULL,
  response   JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
