-- Jackpots progresivos por slot
CREATE TABLE IF NOT EXISTS jackpots (
  id             SERIAL PRIMARY KEY,
  slot_id        TEXT NOT NULL REFERENCES slots(id),
  name           TEXT NOT NULL DEFAULT 'Grand Jackpot',
  current        BIGINT NOT NULL,
  seed           BIGINT NOT NULL,
  contribution   NUMERIC(6,4) NOT NULL DEFAULT 0.0100,
  enabled        BOOLEAN NOT NULL DEFAULT true,
  last_won_at    TIMESTAMPTZ,
  last_won_by    UUID REFERENCES users(id),
  last_won_amount BIGINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
