-- K 线历史持久化：用户请求只读 D1，上游 Binance/OKX 仅用于回填缺口
--
-- chart_klines      存闭合 K 线（open_time 秒），复合主键覆盖所有查询（范围+排序），无需额外索引
-- chart_klines_meta 存每个 (symbol, timeframe) 的回填断点与写入配额计数：
--   min_open_time   —— 回填断点，仅 cron 连续回填推进（用户路径写库不得触碰，防止孤立旧块污染断点）
--   backfill_done   —— 已回填到 3 年 horizon 或上游无更早数据时置 1
--   writes_day/today —— D1 免费版每日 10 万行写入配额的消耗计数（按日重置）

CREATE TABLE IF NOT EXISTS chart_klines (
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  open_time INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL,
  PRIMARY KEY (symbol, timeframe, open_time)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS chart_klines_meta (
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  min_open_time INTEGER,
  backfill_done INTEGER NOT NULL DEFAULT 0,
  writes_day TEXT,
  writes_today INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (symbol, timeframe)
) WITHOUT ROWID;
