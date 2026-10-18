PRAGMA defer_foreign_keys = on;

-- 兼容全新部署：alipay_orders 原建表迁移已不存在，此处幂等补齐旧表结构
CREATE TABLE IF NOT EXISTS alipay_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  out_trade_no TEXT NOT NULL UNIQUE,
  alipay_trade_no TEXT,
  user_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  total_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE TABLE alipay_orders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  out_trade_no TEXT NOT NULL UNIQUE,
  alipay_trade_no TEXT,
  user_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  total_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  paid_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO alipay_orders_new (
  id,
  out_trade_no,
  alipay_trade_no,
  user_id,
  credits,
  total_amount,
  status,
  created_at,
  updated_at,
  paid_at
)
SELECT
  id,
  out_trade_no,
  alipay_trade_no,
  user_id,
  credits,
  total_amount,
  status,
  created_at,
  updated_at,
  paid_at
FROM alipay_orders;

DROP TABLE alipay_orders;
ALTER TABLE alipay_orders_new RENAME TO alipay_orders;

CREATE INDEX IF NOT EXISTS idx_alipay_orders_user ON alipay_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_alipay_orders_status ON alipay_orders(status);
CREATE INDEX IF NOT EXISTS idx_alipay_orders_created ON alipay_orders(created_at);
