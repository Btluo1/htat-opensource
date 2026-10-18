CREATE TABLE IF NOT EXISTS redeem_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  code_normalized TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'disabled')),
  redeemed_by TEXT,
  redeemed_at INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_created
  ON redeem_codes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_status_created
  ON redeem_codes(status, created_at DESC);
