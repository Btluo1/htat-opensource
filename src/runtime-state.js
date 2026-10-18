// =============================================================================
// Runtime State Helpers
// =============================================================================
// 本文件保留工具函数（模式K线生成、技术信号检测等）
// 状态存储已迁移到 D1 runtime_state 表
// runtime_state 表的 state_key 枚举
const RUNTIME_KEYS = {
  SIM_STATE: 'sim_state',
  GLOBAL_PNL: 'global_pnl',
  ENGINE_SNAPSHOT: 'engine_snapshot',
};

const RUNTIME_STATE_VERSION = 1;

function normalizeRuntimeStateEnvelope(value = {}, fallbackType = '') {
  const source = value && typeof value === 'object' ? value : {};
  return {
    version: Number(source.version || RUNTIME_STATE_VERSION),
    type: String(source.type || fallbackType || '').trim() || null,
    updatedAt: Number(source.updatedAt || Date.now()),
    data: source.data !== undefined ? source.data : source,
  };
}

function unwrapRuntimeStateEnvelope(value = null) {
  if (!value || typeof value !== 'object') return value;
  if (Object.prototype.hasOwnProperty.call(value, 'data') && (value.type || value.version)) {
    return value.data;
  }
  return value;
}

// ============================================================================
// D1 runtime_state 操作函数
// ============================================================================

/**
 * 从 D1 runtime_state 表读取状态
 * @param {D1Database} db
 * @param {string} stateKey - runtime_state.state_key
 */
async function getRuntimeState(db, stateKey) {
  if (!db) return null;
  try {
    const row = await db
      .prepare('SELECT value_json FROM runtime_state WHERE state_key = ?1')
      .bind(stateKey)
      .first();
    if (!row) return null;
    return unwrapRuntimeStateEnvelope(JSON.parse(row.value_json));
  } catch (e) {
    console.error(`[D1] getRuntimeState(${stateKey}) error:`, e);
    return null;
  }
}

/**
 * 保存状态到 D1 runtime_state 表
 * @param {D1Database} db
 * @param {string} stateKey
 * @param {Object} value
 */
async function setRuntimeState(db, stateKey, value) {
  if (!db) return;
  try {
    const now = Date.now();
    const normalized = normalizeRuntimeStateEnvelope(value, stateKey);
    await db
      .prepare(`
        INSERT INTO runtime_state (state_key, value_json, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(state_key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = excluded.updated_at
      `)
      .bind(stateKey, JSON.stringify(normalized), now)
      .run();
  } catch (e) {
    console.error(`[D1] setRuntimeState(${stateKey}) error:`, e);
    throw e;
  }
}

// ============================================================================
// 模拟状态（SIM_STATE）
// ============================================================================

export async function getSimState(db) {
  return getRuntimeState(db, RUNTIME_KEYS.SIM_STATE);
}

export async function updateSimState(db, updates) {
  if (!db || !updates || typeof updates !== 'object') return;
  const current = (await getSimState(db)) || {};
  const currentData = current?.data && typeof current.data === 'object' ? current.data : current;
  const next = { ...currentData, ...updates };
  await setRuntimeState(db, RUNTIME_KEYS.SIM_STATE, { version: RUNTIME_STATE_VERSION, type: RUNTIME_KEYS.SIM_STATE, data: next });
}

// ============================================================================
// 引擎快照（ENGINE_SNAPSHOT）
// ============================================================================

export async function getEngineSnapshot(db) {
  return getRuntimeState(db, RUNTIME_KEYS.ENGINE_SNAPSHOT);
}

export async function saveEngineSnapshot(db, snapshot) {
  if (!db || !snapshot) return;
  await setRuntimeState(db, RUNTIME_KEYS.ENGINE_SNAPSHOT, { version: RUNTIME_STATE_VERSION, type: RUNTIME_KEYS.ENGINE_SNAPSHOT, data: snapshot });
}

// ============================================================================
// 全局盈亏统计（GLOBAL_PNL）
// ============================================================================

export async function getGlobalPnl(db) {
  if (!db) return { aiTotalPnl: 0, userTotalPnl: 0 };
  const data = await getRuntimeState(db, RUNTIME_KEYS.GLOBAL_PNL);
  let userTotalPnl = Number(data?.userTotalPnl ?? data?.userPnl ?? 0);

  try {
    // 用户已实现盈亏以 user_trade_stats 为准：该表的 realized_pnl_total 由成交/平仓链路
    // 增量维护；user_wallets.realized_pnl_total 实际上不会被更新，用它求和恒为 0。
    const statsRow = await db
      .prepare(`
        SELECT COALESCE(SUM(realized_pnl_total), 0) AS user_total_pnl
        FROM user_trade_stats
      `)
      .first();
    userTotalPnl = Number(statsRow?.user_total_pnl || 0);
  } catch (e) {
    console.error('[D1] getGlobalPnl(user_total_pnl) error:', e);
  }

  return {
    aiTotalPnl: Number(data?.aiTotalPnl ?? data?.aiPnl ?? 0),
    userTotalPnl,
  };
}

export async function updateGlobalAiPnl(db, pnl) {
  if (!db) return;
  const current = (await getGlobalPnl(db)) || { aiTotalPnl: 0, userTotalPnl: 0 };
  const next = {
    version: RUNTIME_STATE_VERSION,
    type: RUNTIME_KEYS.GLOBAL_PNL,
    aiTotalPnl: Number(pnl || 0),
    userTotalPnl: Number(current.userTotalPnl || 0),
    updatedAt: Date.now(),
  };
  await setRuntimeState(db, RUNTIME_KEYS.GLOBAL_PNL, next);
}

/**
 * 原子累加 AI 总盈亏。
 * 直接对 D1 中的旧值做增量，而不是"读本地缓存算出绝对值再整体覆盖"——
 * 后者在缓存陈旧（跨实例写入、实例刚冷启动）时会把累计盈亏整体写坏。
 * @returns 更新后的 { aiTotalPnl, userTotalPnl }，未实际写入时返回 null
 */
export async function incrementGlobalAiPnl(db, delta) {
  const numericDelta = Number(delta || 0);
  if (!db || !Number.isFinite(numericDelta) || numericDelta === 0) return null;

  const now = Date.now();
  const insertDoc = {
    version: RUNTIME_STATE_VERSION,
    type: RUNTIME_KEYS.GLOBAL_PNL,
    updatedAt: now,
    data: {
      version: RUNTIME_STATE_VERSION,
      type: RUNTIME_KEYS.GLOBAL_PNL,
      aiTotalPnl: numericDelta,
      userTotalPnl: 0,
      updatedAt: now,
    },
  };

  const result = await db
    .prepare(`
      INSERT INTO runtime_state (state_key, value_json, updated_at)
      VALUES (?1, ?2, ?3)
      ON CONFLICT(state_key) DO UPDATE SET
        value_json = json_set(
          runtime_state.value_json,
          '$.data.aiTotalPnl', COALESCE(json_extract(runtime_state.value_json, '$.data.aiTotalPnl'), 0) + ?4,
          '$.data.updatedAt', ?3,
          '$.updatedAt', ?3,
          '$.type', ?5,
          '$.data.type', ?5
        ),
        updated_at = excluded.updated_at
    `)
    .bind(
      RUNTIME_KEYS.GLOBAL_PNL,
      JSON.stringify(insertDoc),
      now,
      numericDelta,
      RUNTIME_KEYS.GLOBAL_PNL,
    )
    .run();

  if (Number(result?.meta?.changes || 0) <= 0) return null;
  return getGlobalPnl(db);
}


