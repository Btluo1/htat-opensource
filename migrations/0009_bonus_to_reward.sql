-- Rename bonus → reward across all tables to match pattern reward semantics

-- 1. user_wallets: column renames
ALTER TABLE user_wallets RENAME COLUMN bonus_balance TO reward_balance;
ALTER TABLE user_wallets RENAME COLUMN locked_bonus TO locked_reward;

-- 2. daily_bonus_claims → daily_reward_claims
ALTER TABLE daily_bonus_claims RENAME TO daily_reward_claims;

-- 3. trade_positions: column rename
ALTER TABLE trade_positions RENAME COLUMN margin_bonus TO margin_reward;

-- 4. trade_events: column rename
ALTER TABLE trade_events RENAME COLUMN margin_bonus_delta TO margin_reward_delta;

-- 5. wallet_ledger: recreate with new column names + updated CHECK constraint
CREATE TABLE wallet_ledger_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('credit', 'debit')),
  bucket TEXT NOT NULL CHECK(bucket IN ('purchased', 'profit', 'reward', 'locked_purchased', 'locked_profit', 'locked_reward')),
  amount REAL NOT NULL,
  balance_after_purchased REAL NOT NULL,
  balance_after_profit REAL NOT NULL,
  balance_after_reward REAL NOT NULL,
  balance_after_locked_purchased REAL NOT NULL,
  balance_after_locked_profit REAL NOT NULL,
  balance_after_locked_reward REAL NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO wallet_ledger_new (
  id, user_id, ref_type, ref_id, entry_type, direction, bucket, amount,
  balance_after_purchased, balance_after_profit, balance_after_reward,
  balance_after_locked_purchased, balance_after_locked_profit, balance_after_locked_reward,
  metadata_json, created_at
)
SELECT
  id, user_id, ref_type, ref_id, entry_type, direction,
  CASE
    WHEN bucket = 'bonus' THEN 'reward'
    WHEN bucket = 'locked_bonus' THEN 'locked_reward'
    ELSE bucket
  END,
  amount,
  balance_after_purchased, balance_after_profit, balance_after_bonus,
  balance_after_locked_purchased, balance_after_locked_profit, balance_after_locked_bonus,
  metadata_json, created_at
FROM wallet_ledger;

DROP TABLE wallet_ledger;
ALTER TABLE wallet_ledger_new RENAME TO wallet_ledger;

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_ref
  ON wallet_ledger(ref_type, ref_id);
