DROP INDEX IF EXISTS idx_trade_positions_one_open_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_positions_one_open_per_user_market
  ON trade_positions(user_id, market_key)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_trade_positions_user_market_status_time
  ON trade_positions(user_id, market_key, status, opened_at DESC);
