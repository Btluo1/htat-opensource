/**
 * chart_klines 表访问层：K 线历史持久化到 D1，用户请求只读自有数据库。
 *
 * 写入纪律：
 * - 只存闭合 K 线（未闭合根会被 INSERT OR IGNORE 永久固化错误的 OHLC，必须过滤）
 * - INSERT OR IGNORE 幂等，多 isolate 并发写入安全
 * - meta.min_open_time 仅由 cron 连续回填推进，用户路径写库不得触碰
 */
import { requireDb } from './db.js';

// D1 单条语句绑定参数上限 100 → 每条 INSERT 最多 12 行（12×8=96）
const ROWS_PER_INSERT = 12;
// 单次 db.batch 语句数软上限，避免单批过大
const STATEMENTS_PER_BATCH = 40;
// 3 年回溯下界（毫秒）
export const CHART_KLINES_HORIZON_MS = 3 * 365 * 24 * 60 * 60 * 1000;

function normalizeKlineRow(candle) {
  const time = Math.floor(Number(candle?.time || 0));
  const open = Number(candle?.open);
  const high = Number(candle?.high);
  const low = Number(candle?.low);
  const close = Number(candle?.close);
  const volume = Number(candle?.volume || 0);
  if (!time || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
    return null;
  }
  return [time, open, high, low, close, Number.isFinite(volume) ? volume : 0];
}

/**
 * 过滤出可入库的闭合 K 线：open_time + intervalSec <= nowSec。
 * cutoffMs > 0 时还要求 open_time*1000 <= cutoffMs（回放模式下不写入"未来"数据）。
 */
export function filterClosedKlines(candles, intervalSec, { nowSec = 0, cutoffMs = 0 } = {}) {
  const effectiveNowSec = nowSec > 0 ? nowSec : Math.floor(Date.now() / 1000);
  const cutoffSec = cutoffMs > 0 ? Math.floor(cutoffMs / 1000) : Number.MAX_SAFE_INTEGER;
  return (Array.isArray(candles) ? candles : []).filter((candle) => {
    const time = Math.floor(Number(candle?.time || 0));
    return time > 0
      && time + intervalSec <= effectiveNowSec
      && time <= cutoffSec;
  });
}

/**
 * 批量写入闭合 K 线（幂等）。返回实际尝试写入的行数（已通过闭合过滤）。
 */
export async function saveChartKlines(db, symbol, timeframe, candles) {
  if (!db) return 0;
  const rows = (Array.isArray(candles) ? candles : [])
    .map(normalizeKlineRow)
    .filter(Boolean);
  if (!rows.length) return 0;

  const statements = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const chunk = rows.slice(i, i + ROWS_PER_INSERT);
    const placeholders = chunk.map(() => '(?1, ?2, ?, ?, ?, ?, ?, ?)').join(', ');
    const sql = `INSERT OR IGNORE INTO chart_klines (symbol, timeframe, open_time, open, high, low, close, volume) VALUES ${placeholders}`;
    const params = [symbol, timeframe];
    for (const row of chunk) {
      params.push(...row);
    }
    statements.push(requireDb(db).prepare(sql).bind(...params));
  }

  for (let i = 0; i < statements.length; i += STATEMENTS_PER_BATCH) {
    await db.batch(statements.slice(i, i + STATEMENTS_PER_BATCH));
  }
  return rows.length;
}

/**
 * 查询 endTimeSec（含）之前最近 count 根，返回升序数组 [{time, open, ...}]。
 */
export async function queryChartKlinesRange(db, symbol, timeframe, endTimeSec, count) {
  if (!db) return [];
  const limit = Math.max(1, Math.min(1000, Math.floor(Number(count) || 0)));
  const result = await requireDb(db)
    .prepare(`SELECT open_time, open, high, low, close, volume
              FROM chart_klines
              WHERE symbol = ?1 AND timeframe = ?2 AND open_time <= ?3
              ORDER BY open_time DESC
              LIMIT ?4`)
    .bind(symbol, timeframe, Math.floor(Number(endTimeSec) || 0), limit)
    .all();
  return (result?.results || [])
    .map((row) => ({
      time: Number(row.open_time),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    }))
    .reverse();
}

export async function getChartKlinesMeta(db, symbol, timeframe) {
  if (!db) return null;
  return requireDb(db)
    .prepare(`SELECT symbol, timeframe, min_open_time, backfill_done, writes_day, writes_today
              FROM chart_klines_meta WHERE symbol = ?1 AND timeframe = ?2`)
    .bind(symbol, timeframe)
    .first();
}

/**
 * 推进回填断点（仅 cron 连续回填调用）。minOpenTime 只往更小方向移动。
 */
export async function advanceChartKlinesMeta(db, symbol, timeframe, { minOpenTime = 0, backfillDone = null } = {}) {
  if (!db) return;
  await requireDb(db)
    .prepare(`INSERT INTO chart_klines_meta (symbol, timeframe, min_open_time, backfill_done, writes_day, writes_today)
              VALUES (?1, ?2, ?3, COALESCE(?4, 0), NULL, 0)
              ON CONFLICT(symbol, timeframe) DO UPDATE SET
                min_open_time = CASE
                  WHEN ?3 > 0 AND (chart_klines_meta.min_open_time IS NULL OR ?3 < chart_klines_meta.min_open_time)
                  THEN ?3
                  ELSE chart_klines_meta.min_open_time
                END,
                backfill_done = COALESCE(?4, chart_klines_meta.backfill_done)`)
    .bind(symbol, timeframe, Math.floor(Number(minOpenTime) || 0), backfillDone === null ? null : (backfillDone ? 1 : 0))
    .run();
}

/**
 * 写入配额闸门：按日计数（UTC 日期），达到 dailyBudget 后拒绝写入并返回 false。
 * 保护 D1 免费版 10 万行/天配额：cron 回填 8 万预算，预留 2 万给用户路径回种。
 */
export async function consumeChartKlinesWriteBudget(db, symbol, timeframe, rows, dailyBudget) {
  if (!db) return false;
  const rowCount = Math.max(0, Math.floor(Number(rows) || 0));
  if (rowCount === 0) return true;
  const today = new Date().toISOString().slice(0, 10);
  const result = await requireDb(db)
    .prepare(`INSERT INTO chart_klines_meta (symbol, timeframe, min_open_time, backfill_done, writes_day, writes_today)
              VALUES (?1, ?2, NULL, 0, ?3, ?4)
              ON CONFLICT(symbol, timeframe) DO UPDATE SET
                writes_day = ?3,
                writes_today = CASE
                  WHEN chart_klines_meta.writes_day = ?3 THEN chart_klines_meta.writes_today + ?4
                  ELSE ?4
                END
              WHERE chart_klines_meta.writes_day IS NULL
                 OR chart_klines_meta.writes_day != ?3
                 OR chart_klines_meta.writes_today + ?4 <= ?5
              RETURNING writes_today`)
    .bind(symbol, timeframe, today, rowCount, Math.floor(Number(dailyBudget) || 0))
    .first();
  // WHERE 不满足（超预算）时 UPDATE 不生效且无 RETURNING 行 → first() 为 null
  return result !== null && result !== undefined;
}
