PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  login_count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email_normalized);

CREATE TABLE IF NOT EXISTS user_wallets (
  user_id TEXT PRIMARY KEY,
  purchased_balance REAL NOT NULL DEFAULT 0,
  profit_balance REAL NOT NULL DEFAULT 0,
  bonus_balance REAL NOT NULL DEFAULT 0,
  locked_purchased REAL NOT NULL DEFAULT 0,
  locked_profit REAL NOT NULL DEFAULT 0,
  locked_bonus REAL NOT NULL DEFAULT 0,
  realized_pnl_total REAL NOT NULL DEFAULT 0,
  total_recharged REAL NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id TEXT,
  entry_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  bucket TEXT NOT NULL CHECK (
    bucket IN (
      'purchased',
      'profit',
      'bonus',
      'locked_purchased',
      'locked_profit',
      'locked_bonus'
    )
  ),
  amount REAL NOT NULL,
  balance_after_purchased REAL NOT NULL,
  balance_after_profit REAL NOT NULL,
  balance_after_bonus REAL NOT NULL,
  balance_after_locked_purchased REAL NOT NULL,
  balance_after_locked_profit REAL NOT NULL,
  balance_after_locked_bonus REAL NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created
  ON wallet_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_ref
  ON wallet_ledger(ref_type, ref_id);

CREATE TABLE IF NOT EXISTS daily_bonus_claims (
  user_id TEXT NOT NULL,
  claim_date TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, claim_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trade_positions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  market_key TEXT NOT NULL DEFAULT 'btc-usdt-sim',
  source_type TEXT NOT NULL DEFAULT 'manual',
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'liquidated', 'cancelled')),
  entry_price REAL NOT NULL,
  close_price REAL,
  quantity REAL NOT NULL,
  leverage INTEGER NOT NULL,
  margin_purchased REAL NOT NULL DEFAULT 0,
  margin_profit REAL NOT NULL DEFAULT 0,
  margin_bonus REAL NOT NULL DEFAULT 0,
  realized_pnl REAL NOT NULL DEFAULT 0,
  liquidation_margin_rate REAL,
  open_reason TEXT,
  close_reason TEXT,
  open_snapshot_json TEXT,
  close_snapshot_json TEXT,
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_positions_one_open_per_user
  ON trade_positions(user_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_trade_positions_user_status_time
  ON trade_positions(user_id, status, opened_at DESC);

CREATE TABLE IF NOT EXISTS trade_events (
  id TEXT PRIMARY KEY,
  position_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('open', 'increase', 'decrease', 'close', 'liquidate', 'settlement')
  ),
  price REAL,
  quantity_delta REAL,
  margin_purchased_delta REAL NOT NULL DEFAULT 0,
  margin_profit_delta REAL NOT NULL DEFAULT 0,
  margin_bonus_delta REAL NOT NULL DEFAULT 0,
  realized_pnl REAL NOT NULL DEFAULT 0,
  event_payload_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (position_id) REFERENCES trade_positions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trade_events_user_created
  ON trade_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_events_position_created
  ON trade_events(position_id, created_at ASC);

CREATE TABLE IF NOT EXISTS user_trade_stats (
  user_id TEXT PRIMARY KEY,
  total_trade_count INTEGER NOT NULL DEFAULT 0,
  closed_trade_count INTEGER NOT NULL DEFAULT 0,
  win_trade_count INTEGER NOT NULL DEFAULT 0,
  loss_trade_count INTEGER NOT NULL DEFAULT 0,
  realized_pnl_total REAL NOT NULL DEFAULT 0,
  last_trade_at INTEGER,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 注：生产环境的策略库表（strategies）与 AI 相关表结构属于闭源部分，未包含在本开源仓库中。

CREATE TABLE IF NOT EXISTS battle_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('battle', 'pattern')),
  pattern_key TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  expected_direction TEXT,
  user_decision TEXT,
  ai_decision TEXT,
  ai_confidence REAL NOT NULL DEFAULT 0,
  final_direction TEXT,
  price_change REAL NOT NULL DEFAULT 0,
  user_correct INTEGER,
  ai_correct INTEGER,
  status TEXT NOT NULL CHECK (status IN ('preview', 'battle', 'result', 'aborted')),
  signals_json TEXT,
  summary_json TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_battle_sessions_user_started
  ON battle_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS system_state (
  state_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
