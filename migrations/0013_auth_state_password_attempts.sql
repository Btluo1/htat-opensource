-- 允许 auth_state.state_type 使用 'password_attempts'（密码错误计数）
PRAGMA defer_foreign_keys = on;

CREATE TABLE auth_state_new (
  email_normalized TEXT NOT NULL,
  state_type TEXT NOT NULL CHECK (state_type IN (
    'verify_code', 'lock_status', 'email_stats', 'sim_time_usage', 'password_attempts'
  )),
  value_json TEXT NOT NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (email_normalized, state_type)
);

INSERT INTO auth_state_new SELECT * FROM auth_state;
DROP TABLE auth_state;
ALTER TABLE auth_state_new RENAME TO auth_state;

CREATE INDEX IF NOT EXISTS idx_auth_state_expires
  ON auth_state(expires_at)
  WHERE expires_at IS NOT NULL;
