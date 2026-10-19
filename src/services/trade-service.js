import { all, batch, first, nowTs, parseJson } from '../data/db.js';
import {
  buildLedgerStatement,
  buildWalletUpdateStatement,
  ensureWallet,
  getCreditInfo,
  lockWalletFunds,
  settleWalletFunds,
} from './wallet-service.js';

const TRADE_SCHEMA = {
  positionMarginRewardColumn: 'margin_reward',
  eventMarginRewardDeltaColumn: 'margin_reward_delta',
};
const MIN_MANUAL_TRADE_MARGIN = 1;

function getCachedTradeSchema() {
  return TRADE_SCHEMA;
}

function buildCreateOrUpdateTradeStats(db, userId, pnl, now) {
  const isWin = pnl > 0;
  return db.prepare(`
    INSERT INTO user_trade_stats (
      user_id, total_trade_count, closed_trade_count, win_trade_count, loss_trade_count, realized_pnl_total, last_trade_at, updated_at
    ) VALUES (?1, 1, 1, ?2, ?3, ?4, ?5, ?5)
    ON CONFLICT(user_id) DO UPDATE SET
      total_trade_count = total_trade_count + 1,
      closed_trade_count = closed_trade_count + 1,
      win_trade_count = win_trade_count + ?2,
      loss_trade_count = loss_trade_count + ?3,
      realized_pnl_total = realized_pnl_total + ?4,
      last_trade_at = ?5,
      updated_at = ?5
  `).bind(userId, isWin ? 1 : 0, isWin ? 0 : 1, pnl, now);
}

function normalizePositionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    marketKey: row.market_key || 'btc-usdt-sim',
    symbol: getSymbolFromMarketKey(row.market_key),
    side: row.side,
    status: row.status,
    entryPrice: Number(row.entry_price),
    quantity: Number(row.quantity),
    leverage: Number(row.leverage),
    marginPurchased: Number(row.margin_purchased || 0),
    marginProfit: Number(row.margin_profit || 0),
    marginReward: Number(row.margin_reward ?? row.margin_bonus ?? 0),
    realizedPnl: Number(row.realized_pnl || 0),
    openedAt: Number(row.opened_at),
  };
}

function positionMargin(position) {
  return position.marginPurchased + position.marginProfit + position.marginReward;
}

function calculatePnl(side, openPrice, closePrice, margin, leverage) {
  // 合约盈亏 = 价格变动比例 × 保证金 × 杠杆倍数
  if (!openPrice || !margin) return 0;
  const effectiveLeverage = Number(leverage) || 1;
  const priceChangeRatio = side === 'long'
    ? (closePrice - openPrice) / openPrice
    : (openPrice - closePrice) / openPrice;
  return Number((priceChangeRatio * margin * effectiveLeverage).toFixed(2));
}

const UNIFIED_SYMBOL_MAP = Object.freeze({
  BTC: 'BTC',
  BTCUSDT: 'BTC',
  BTCUSD: 'BTC',
  BITCOIN: 'BTC',
  XAU: 'XAU',
  XAUUSDT: 'XAU',
  XAUUSD: 'XAU',
  PAXG: 'XAU',
  PAXGUSDT: 'XAU',
  GOLD: 'XAU',
});

export function normalizeTradeSymbol(symbol = 'BTC') {
  const normalized = String(symbol || 'BTC').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return UNIFIED_SYMBOL_MAP[normalized] || UNIFIED_SYMBOL_MAP.BTC;
}

function getMarketKeyForSymbol(symbol = 'BTC') {
  return normalizeTradeSymbol(symbol) === 'XAU' ? 'xau-usdt-sim' : 'btc-usdt-sim';
}

function getSymbolFromMarketKey(marketKey = 'btc-usdt-sim') {
  const normalized = String(marketKey || '').trim().toLowerCase();
  if (normalized.includes('xau')) return 'XAU';
  return 'BTC';
}

function buildTradeEventStatement(db, event) {
  const schema = getCachedTradeSchema();
  return db.prepare(`
    INSERT INTO trade_events (
      id, position_id, user_id, event_type, price, quantity_delta,
      margin_purchased_delta, margin_profit_delta, ${schema.eventMarginRewardDeltaColumn},
      realized_pnl, event_payload_json, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
  `).bind(
    event.id || crypto.randomUUID(),
    event.positionId,
    event.userId,
    event.eventType,
    event.price,
    event.quantityDelta,
    event.marginPurchasedDelta,
    event.marginProfitDelta,
    event.marginRewardDelta,
    event.realizedPnl,
    JSON.stringify(event.payload || {}),
    event.createdAt,
  );
}

function toEnginePosition(position) {
  if (!position) return null;
  return {
    id: position.id,
    side: position.side,
    openPrice: position.entryPrice,
    quantity: position.quantity,
    openTime: position.openedAt,
    leverage: position.leverage,
    margin: positionMargin(position),
    symbol: position.symbol,
  };
}

async function getOpenPosition(db, userId, symbol = 'BTC') {
  const marketKey = getMarketKeyForSymbol(symbol);
  const row = await first(db, `
    SELECT *
    FROM trade_positions
    WHERE user_id = ?1 AND market_key = ?2 AND status = 'open'
    LIMIT 1
  `, userId, marketKey);
  return normalizePositionRow(row);
}

function syncEnginePosition(tradingEngine, userId, position, symbol = null) {
  if (!tradingEngine) return;
  const resolvedSymbol = normalizeTradeSymbol(position?.symbol || symbol || 'BTC');
  tradingEngine.restoreUserPosition(userId, position ? toEnginePosition(position) : null, resolvedSymbol);
}

async function closePosition({ db, userId, tradingEngine, action, closeReason, symbol = 'BTC' }) {
  const resolvedSymbol = normalizeTradeSymbol(symbol);
  const position = await getOpenPosition(db, userId, resolvedSymbol);
  if (!position) return { success: false, error: '没有持仓' };

  const wallet = await ensureWallet(db, userId);
  const currentPrice = Number(tradingEngine.getSymbolPrice?.(resolvedSymbol));
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return { success: false, error: `缺少 ${resolvedSymbol} 有效价格，无法平仓` };
  }
  const pnl = calculatePnl(position.side, position.entryPrice, currentPrice, positionMargin(position), position.leverage);
  const allocation = {
    purchased: position.marginPurchased,
    profit: position.marginProfit,
    reward: position.marginReward,
  };
  const settled = settleWalletFunds(wallet, allocation, pnl);
  const now = nowTs();
  const finalAction = action === 'force_close' ? 'force_close' : 'close';
  const status = action === 'force_close' ? 'liquidated' : 'closed';
  const reason = closeReason || (action === 'force_close' ? 'liquidation' : 'manual_close');

  const results = await batch(db, [
    buildWalletUpdateStatement(db, userId, settled.wallet, wallet.version, now),
    db.prepare(`
      UPDATE trade_positions
      SET status = ?2, close_price = ?3, realized_pnl = ?4, close_reason = ?5, closed_at = ?6, updated_at = ?6
      WHERE id = ?1 AND status = 'open'
    `).bind(position.id, status, currentPrice, pnl, reason, now),
    buildTradeEventStatement(db, {
      positionId: position.id,
      userId,
      eventType: action === 'force_close' ? 'liquidate' : 'close',
      price: currentPrice,
      quantityDelta: -position.quantity,
      marginPurchasedDelta: -position.marginPurchased,
      marginProfitDelta: -position.marginProfit,
      marginRewardDelta: -position.marginReward,
      realizedPnl: pnl,
      payload: {
        type: finalAction,
        side: position.side,
        quantity: position.quantity,
        leverage: position.leverage,
        margin: positionMargin(position),
        openPrice: position.entryPrice,
        closePrice: currentPrice,
        pnl,
        reason,
        symbol: position.symbol,
      },
      createdAt: now,
    }),
    buildLedgerStatement(db, userId, {
      refType: 'trade_position',
      refId: position.id,
      entryType: finalAction,
      direction: settled.finalAmount >= 0 ? 'credit' : 'debit',
      bucket: 'profit',
      amount: Math.abs(settled.finalAmount),
      metadata: { pnl, finalAmount: settled.finalAmount, allocation, reason },
      createdAt: now,
    }, settled.wallet),
    buildCreateOrUpdateTradeStats(db, userId, pnl, now),
  ]);

  if (results[0]?.meta?.changes !== 1 || results[1]?.meta?.changes !== 1) {
    return { success: false, error: '系统繁忙，请稍后重试' };
  }

  syncEnginePosition(tradingEngine, userId, null, position.symbol);
  const creditInfo = await getCreditInfo(db, userId);

  return {
    success: true,
    action: finalAction,
    pnl,
    margin: positionMargin(position),
    finalAmount: settled.finalAmount,
    price: currentPrice,
    symbol: position.symbol,
    remainingCredits: creditInfo.remainingCredits,
    needsSnapshotSync: true,
  };
}

export async function executeTrade({ db, userId, tradingEngine, action, quantity = 1, leverage = 1, symbol = 'BTC' }) {
  if (!db) return { success: false, error: 'D1 未初始化' };
  if (!tradingEngine) return { success: false, error: 'Engine not initialized' };
  const tradeSchema = getCachedTradeSchema();

  const normalizedAction = String(action || '').trim();
  const resolvedAction = normalizedAction === 'add_position'
    ? 'increase_position'
    : (normalizedAction === 'reduce_position' ? 'decrease_position' : normalizedAction);

  const qty = Number(quantity || 0);
  if (!Number.isFinite(qty) || qty < 0) {
    return { success: false, error: '数量无效' };
  }
  const resolvedSymbol = normalizeTradeSymbol(symbol);
  const marketKey = getMarketKeyForSymbol(resolvedSymbol);
  const currentPrice = Number(tradingEngine.getSymbolPrice?.(resolvedSymbol));
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return { success: false, error: `缺少 ${resolvedSymbol} 有效价格，无法执行交易` };
  }
  const now = nowTs();

  if (resolvedAction === 'close' || resolvedAction === 'force_close') {
    return closePosition({ db, userId, tradingEngine, action: resolvedAction, symbol: resolvedSymbol });
  }

  if (resolvedAction === 'open_long' || resolvedAction === 'open_short') {
    if (qty <= 0) return { success: false, error: '数量必须大于 0' };
    if (qty < MIN_MANUAL_TRADE_MARGIN) return { success: false, error: `开仓/加仓最低金额为 ${MIN_MANUAL_TRADE_MARGIN} 积分` };
    if (leverage < 1 || leverage > 200) {
      return { success: false, error: '杠杆倍数必须在 1-200 之间' };
    }

    const existing = await getOpenPosition(db, userId, resolvedSymbol);
    if (existing) {
      return { success: false, error: '请先平仓当前持仓后再开新仓' };
    }

    const wallet = await ensureWallet(db, userId);
    // 合约交易：用户输入的数量就是保证金金额（credits）
    const requiredMargin = Number(qty.toFixed(2));
    const locked = lockWalletFunds(wallet, requiredMargin);
    if (!locked.success) {
      return {
        success: false,
        error: '余额不足，保证金不足',
        creditsExpired: true,
        remainingCredits: locked.remainingCredits,
        requiredMargin,
      };
    }

    const positionId = crypto.randomUUID();
    const side = resolvedAction === 'open_long' ? 'long' : 'short';
    const results = await batch(db, [
      buildWalletUpdateStatement(db, userId, locked.wallet, wallet.version, now),
      db.prepare(`
        INSERT INTO trade_positions (
          id, user_id, market_key, source_type, side, status, entry_price, quantity, leverage,
          margin_purchased, margin_profit, ${tradeSchema.positionMarginRewardColumn}, open_reason, open_snapshot_json, opened_at, updated_at
        ) VALUES (?1, ?2, ?3, 'manual', ?4, 'open', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)
      `).bind(
        positionId,
        userId,
        marketKey,
        side,
        currentPrice,
        qty,
        leverage,
        locked.allocation.purchased,
        locked.allocation.profit,
        locked.allocation.reward,
        resolvedAction,
        JSON.stringify({ currentPrice, quantity: qty, leverage, symbol: resolvedSymbol }),
        now,
      ),
      buildTradeEventStatement(db, {
        positionId,
        userId,
        eventType: 'open',
        price: currentPrice,
        quantityDelta: qty,
        marginPurchasedDelta: locked.allocation.purchased,
        marginProfitDelta: locked.allocation.profit,
        marginRewardDelta: locked.allocation.reward,
        realizedPnl: 0,
        payload: {
          type: 'open',
          side,
          quantity: qty,
          leverage,
          margin: requiredMargin,
          openPrice: currentPrice,
          symbol: resolvedSymbol,
        },
        createdAt: now,
      }),
      buildLedgerStatement(db, userId, {
        refType: 'trade_position',
        refId: positionId,
        entryType: 'open',
        direction: 'debit',
        bucket: locked.allocation.reward > 0 ? 'reward' : locked.allocation.purchased > 0 ? 'purchased' : 'profit',
        amount: requiredMargin,
        metadata: { action: 'lock_margin', allocation: locked.allocation },
        createdAt: now,
      }, locked.wallet),
    ]).catch((error) => {
      const message = String(error?.message || error);
      if (message.includes('idx_trade_positions_one_open_per_user_market')) {
        // 返回明确的错误信息，而不是通用的 "系统繁忙"
        return { _constraintError: true, message: '您已有持仓，请先平仓后再开新仓' };
      }
      throw error;
    });

    // 检查是否是约束错误
    if (results && results._constraintError) {
      return { success: false, error: results.message };
    }

    if (!results || results.length < 4 || results.some(result => result?.error) || results.some(result => result?.meta && result.meta.changes === 0)) {
      return { success: false, error: '系统繁忙，请稍后重试' };
    }

    const position = await getOpenPosition(db, userId, resolvedSymbol);
    syncEnginePosition(tradingEngine, userId, position, resolvedSymbol);

    return {
      success: true,
      action,
      price: currentPrice,
      symbol: resolvedSymbol,
      position: tradingEngine.getUserPosition(userId, resolvedSymbol),
      quantity: qty,
      leverage,
      margin: requiredMargin,
      remainingCredits: locked.remainingCredits,
      needsSnapshotSync: true,
    };
  }

  const position = await getOpenPosition(db, userId, resolvedSymbol);
  if (!position) return { success: false, error: '没有持仓' };

  if (resolvedAction === 'increase_position') {
    if (qty <= 0) return { success: false, error: '数量必须大于 0' };
    if (qty < MIN_MANUAL_TRADE_MARGIN) return { success: false, error: `开仓/加仓最低金额为 ${MIN_MANUAL_TRADE_MARGIN} 积分` };
    const wallet = await ensureWallet(db, userId);
    // 合约交易：加仓金额就是用户输入的数量
    const addMargin = Number(qty.toFixed(2));
    const locked = lockWalletFunds(wallet, addMargin);
    if (!locked.success) {
      return {
        success: false,
        error: '余额不足，保证金不足',
        creditsExpired: true,
        remainingCredits: locked.remainingCredits,
        requiredMargin: addMargin,
      };
    }

    const newQuantity = position.quantity + qty;
    // 按保证金比例加权平均开仓价
    const totalMargin = positionMargin(position) + addMargin;
    const weightedEntry = Number(((position.entryPrice * positionMargin(position) + currentPrice * addMargin) / totalMargin).toFixed(2));
    const results = await batch(db, [
      buildWalletUpdateStatement(db, userId, locked.wallet, wallet.version, now),
      db.prepare(`
        UPDATE trade_positions
        SET
          entry_price = ?2,
          quantity = ?3,
          margin_purchased = margin_purchased + ?4,
          margin_profit = margin_profit + ?5,
          ${tradeSchema.positionMarginRewardColumn} = ${tradeSchema.positionMarginRewardColumn} + ?6,
          updated_at = ?7
        WHERE id = ?1 AND status = 'open'
      `).bind(position.id, weightedEntry, newQuantity, locked.allocation.purchased, locked.allocation.profit, locked.allocation.reward, now),
      buildTradeEventStatement(db, {
        positionId: position.id,
        userId,
        eventType: 'increase',
        price: currentPrice,
        quantityDelta: qty,
        marginPurchasedDelta: locked.allocation.purchased,
        marginProfitDelta: locked.allocation.profit,
        marginRewardDelta: locked.allocation.reward,
        realizedPnl: 0,
        payload: {
          type: 'increase',
          side: position.side,
          addQuantity: qty,
          leverage: position.leverage,
          addMargin,
          newTotalQuantity: newQuantity,
          weightedEntryPrice: weightedEntry,
          symbol: position.symbol,
        },
        createdAt: now,
      }),
      buildLedgerStatement(db, userId, {
        refType: 'trade_position',
        refId: position.id,
        entryType: 'increase',
        direction: 'debit',
        bucket: locked.allocation.reward > 0 ? 'reward' : locked.allocation.purchased > 0 ? 'purchased' : 'profit',
        amount: addMargin,
        metadata: { allocation: locked.allocation, addQuantity: qty },
        createdAt: now,
      }, locked.wallet),
    ]);

    if (results.length < 4 || results.some(result => result?.error) || results.some(result => result?.meta && result.meta.changes === 0)) {
      return { success: false, error: '系统繁忙，请稍后重试' };
    }

    const nextPosition = await getOpenPosition(db, userId, resolvedSymbol);
    syncEnginePosition(tradingEngine, userId, nextPosition, resolvedSymbol);
    const creditInfo = await getCreditInfo(db, userId);

    return {
      success: true,
      action,
      symbol: resolvedSymbol,
      quantity: qty,
      newTotalQuantity: nextPosition.quantity,
      position: tradingEngine.getUserPosition(userId, resolvedSymbol),
      remainingCredits: creditInfo.remainingCredits,
      needsSnapshotSync: true,
    };
  }

  if (resolvedAction === 'decrease_position') {
    const reduceQty = qty > 0 ? qty : 1;
    if (reduceQty >= position.quantity) {
      return closePosition({
        db,
        userId,
        tradingEngine,
        action: 'close',
        closeReason: 'decrease_to_zero',
        symbol: resolvedSymbol,
      });
    }

    const wallet = await ensureWallet(db, userId);
    const ratio = reduceQty / position.quantity;
    const released = {
      purchased: Number((position.marginPurchased * ratio).toFixed(8)),
      profit: Number((position.marginProfit * ratio).toFixed(8)),
      reward: Number((position.marginReward * ratio).toFixed(8)),
    };
    const releasedMargin = released.purchased + released.profit + released.reward;
    const pnl = calculatePnl(position.side, position.entryPrice, currentPrice, releasedMargin, position.leverage);
    const settled = settleWalletFunds(wallet, released, pnl);
    const remainingQuantity = Number((position.quantity - reduceQty).toFixed(8));
    const results = await batch(db, [
      buildWalletUpdateStatement(db, userId, settled.wallet, wallet.version, now),
      db.prepare(`
        UPDATE trade_positions
        SET
          quantity = ?2,
          margin_purchased = margin_purchased - ?3,
          margin_profit = margin_profit - ?4,
          ${tradeSchema.positionMarginRewardColumn} = ${tradeSchema.positionMarginRewardColumn} - ?5,
          realized_pnl = realized_pnl + ?6,
          updated_at = ?7
        WHERE id = ?1 AND status = 'open'
      `).bind(position.id, remainingQuantity, released.purchased, released.profit, released.reward, pnl, now),
      buildTradeEventStatement(db, {
        positionId: position.id,
        userId,
        eventType: 'decrease',
        price: currentPrice,
        quantityDelta: -reduceQty,
        marginPurchasedDelta: -released.purchased,
        marginProfitDelta: -released.profit,
        marginRewardDelta: -released.reward,
        realizedPnl: pnl,
        payload: {
          type: 'decrease',
          side: position.side,
          reduceQuantity: reduceQty,
          leverage: position.leverage,
          reduceMargin: released.purchased + released.profit + released.reward,
          openPrice: position.entryPrice,
          closePrice: currentPrice,
          pnl,
          symbol: position.symbol,
        },
        createdAt: now,
      }),
      buildLedgerStatement(db, userId, {
        refType: 'trade_position',
        refId: position.id,
        entryType: 'decrease',
        direction: settled.finalAmount >= 0 ? 'credit' : 'debit',
        bucket: 'profit',
        amount: Math.abs(settled.finalAmount),
        metadata: { allocation: released, pnl, finalAmount: settled.finalAmount },
        createdAt: now,
      }, settled.wallet),
      buildCreateOrUpdateTradeStats(db, userId, pnl, now),
    ]);

    if (results.length < 5 || results.some(result => result?.error) || results.some(result => result?.meta && result.meta.changes === 0)) {
      return { success: false, error: '系统繁忙，请稍后重试' };
    }

    const nextPosition = await getOpenPosition(db, userId, resolvedSymbol);
    syncEnginePosition(tradingEngine, userId, nextPosition, resolvedSymbol);
    const creditInfo = await getCreditInfo(db, userId);

    return {
      success: true,
      action,
      symbol: resolvedSymbol,
      reduceQuantity: reduceQty,
      pnl,
      reduceMargin: released.purchased + released.profit + released.reward,
      finalAmount: settled.finalAmount,
      price: currentPrice,
      remainingCredits: creditInfo.remainingCredits,
      remainingPosition: tradingEngine.getUserPosition(userId, resolvedSymbol),
      position: tradingEngine.getUserPosition(userId, resolvedSymbol),
      needsSnapshotSync: true,
    };
  }

  return { success: false, error: '不支持的交易操作' };
}

export async function restoreOpenPositions(db, tradingEngine) {
  if (!db || !tradingEngine) return;
  const rows = await all(db, `SELECT * FROM trade_positions WHERE status = 'open'`);
  tradingEngine.userPositions = new Map();
  for (const row of rows) {
    const position = normalizePositionRow(row);
    syncEnginePosition(tradingEngine, position.userId, position);
  }
}

/**
 * 用 D1 作为唯一数据源，把指定用户的开仓记录同步进引擎内存。
 *
 * 背景：Worker isolate 会被回收复用，而引擎内存（tradingEngine.userPositions）
 * 只在引擎实例创建时从 D1 恢复一次。若成交由另一个 isolate 执行，当前 isolate 的
 * 内存里可能没有这笔新仓位，导致刷新后 /api/positions 与 SSE init 的持仓快照返回空，
 * 前端显示"暂无持仓"。
 *
 * 因此在读取持仓快照前，按 D1 现状重建该用户的引擎持仓：先清掉该用户的旧记录
 * （避免已平仓仓位残留在内存），再按 status='open' 的记录回填。
 */
export async function restoreUserPositionsForUser(db, tradingEngine, userId) {
  if (!db || !tradingEngine || !userId) return;
  const rows = await all(db, `
    SELECT * FROM trade_positions
    WHERE user_id = ?1 AND status = 'open'
  `, userId);
  const engineUserIds = new Set([String(userId)]);
  for (const row of rows) {
    const position = normalizePositionRow(row);
    if (position) engineUserIds.add(String(position.userId));
  }
  for (const engineUserId of engineUserIds) {
    tradingEngine._deleteUserPositionsForUser?.(engineUserId);
  }
  for (const row of rows) {
    const position = normalizePositionRow(row);
    if (position) syncEnginePosition(tradingEngine, position.userId, position);
  }
}

export async function getUserTradeHistory(db, userId, limit = 50, offset = 0) {
  const rows = await all(db, `
    SELECT id, event_type, price, realized_pnl, event_payload_json, created_at
    FROM trade_events
    WHERE user_id = ?1
    ORDER BY created_at DESC
    LIMIT ?2 OFFSET ?3
  `, userId, limit, offset);
  const totalRow = await first(db, `SELECT COUNT(*) AS total FROM trade_events WHERE user_id = ?1`, userId);
  return {
    trades: rows.map((row) => ({
      id: row.id,
      type: row.event_type,
      price: row.price == null ? null : Number(row.price),
      pnl: Number(row.realized_pnl || 0),
      timestamp: Number(row.created_at),
      payload: parseJson(row.event_payload_json, {}),
    })),
    total: Number(totalRow?.total || 0),
  };
}

export async function getUserTradeStats(db, userId) {
  const aggregate = await first(db, `
    SELECT COUNT(*) AS tradeCount
    FROM trade_events
    WHERE user_id = ?1
  `, userId);
  const history = await getUserTradeHistory(db, userId, 100, 0);
  const wallet = await ensureWallet(db, userId);
  const personalTotalPnl = Number(wallet.realizedPnlTotal || 0);
  return {
    trades: history.trades,
    personalTotalPnl,
    totalPnl: personalTotalPnl,
    tradeCount: Number(aggregate?.tradeCount || 0),
  };
}

export async function getUserSummary(db, userId) {
  const creditInfo = await getCreditInfo(db, userId);
  const stats = await getUserTradeStats(db, userId);
  const wallet = await ensureWallet(db, userId);
  const personalTotalPnl = Number(wallet.realizedPnlTotal || 0);
  return {
    credits: {
      purchased: creditInfo.purchased,
      profit: creditInfo.profit,
      rewardCredits: creditInfo.rewardCredits,
      total: creditInfo.total,
      remaining: creditInfo.remainingCredits,
    },
    personalTotalPnl,
    totalPnl: personalTotalPnl,
    tradeCount: stats.tradeCount,
  };
}

export async function resetOpenPositions(db) {
  if (!db) return;
  const rows = await all(db, `SELECT * FROM trade_positions WHERE status = 'open'`);
  for (const row of rows) {
    const position = normalizePositionRow(row);
    const wallet = await ensureWallet(db, position.userId);
    const now = nowTs();
    const nextWallet = {
      ...wallet,
      purchased: wallet.purchased + position.marginPurchased,
      profit: wallet.profit + position.marginProfit,
      rewardCredits: wallet.rewardCredits + position.marginReward,
      lockedPurchased: Math.max(0, wallet.lockedPurchased - position.marginPurchased),
      lockedProfit: Math.max(0, wallet.lockedProfit - position.marginProfit),
      lockedReward: Math.max(0, wallet.lockedReward - position.marginReward),
    };
    await batch(db, [
      buildWalletUpdateStatement(db, position.userId, nextWallet, wallet.version, now),
      db.prepare(`
        UPDATE trade_positions
        SET status = 'cancelled', close_reason = 'system_reset', closed_at = ?2, updated_at = ?2
        WHERE id = ?1 AND status = 'open'
      `).bind(position.id, now),
      buildTradeEventStatement(db, {
        positionId: position.id,
        userId: position.userId,
        eventType: 'settlement',
        price: null,
        quantityDelta: 0,
        marginPurchasedDelta: 0,
        marginProfitDelta: 0,
        marginRewardDelta: 0,
        realizedPnl: 0,
        payload: { type: 'reset', reason: 'system_reset', releasedMargin: positionMargin(position) },
        createdAt: now,
      }),
      buildLedgerStatement(db, position.userId, {
        refType: 'trade_position',
        refId: position.id,
        entryType: 'reset_release',
        direction: 'credit',
        bucket: 'purchased',
        amount: positionMargin(position),
        metadata: {
          releasedAllocation: {
            purchased: position.marginPurchased,
            profit: position.marginProfit,
            reward: position.marginReward,
          },
        },
        createdAt: now,
      }, nextWallet),
    ]);
  }
}

/**
 * 清理数据库中的不一致状态
 * 检查并修复旧的唯一索引导致的问题
 * 确保用户在每个市场上只有一个 open 仓位
 */
export async function cleanupInconsistentPositions(db) {
  if (!db) return { fixed: 0, errors: [] };

  const errors = [];
  let fixedCount = 0;

  try {
    // 检查是否存在旧的唯一索引
    const indexes = await all(db, `SELECT name, sql FROM sqlite_master WHERE type = 'index' AND name = 'idx_trade_positions_one_open_per_user'`);
    
    if (indexes.length > 0) {
      // 删除旧的唯一索引
      await db.prepare(`DROP INDEX IF EXISTS idx_trade_positions_one_open_per_user`).run();
      console.log('[cleanup] Dropped old index idx_trade_positions_one_open_per_user');
    }

    // 确保新的唯一索引存在
    await db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_positions_one_open_per_user_market
        ON trade_positions(user_id, market_key)
        WHERE status = 'open'
    `).run();

    // 查找所有 open 仓位
    const openPositions = await all(db, `
      SELECT id, user_id, market_key, side, entry_price, quantity, leverage, 
             margin_purchased, margin_profit, margin_reward, opened_at
      FROM trade_positions 
      WHERE status = 'open'
      ORDER BY opened_at DESC
    `);

    // 按用户和市场分组，检查是否有重复
    const positionMap = new Map();
    for (const pos of openPositions) {
      const key = `${pos.user_id}::${pos.market_key}`;
      if (positionMap.has(key)) {
        // 发现重复的 open 仓位，需要修复
        const existing = positionMap.get(key);
        const duplicate = pos;
        
        // 保留最新的，将旧的标记为 cancelled
        const toCancel = duplicate.opened_at > existing.opened_at ? existing : duplicate;
        const toKeep = duplicate.opened_at > existing.opened_at ? duplicate : existing;
        
        try {
          await db.prepare(`
            UPDATE trade_positions 
            SET status = 'cancelled', close_reason = 'cleanup_duplicate', closed_at = ?, updated_at = ?
            WHERE id = ? AND status = 'open'
          `).bind(nowTs(), nowTs(), toCancel.id);
          
          fixedCount++;
          console.log(`[cleanup] Fixed duplicate position for user ${pos.user_id} in market ${pos.market_key}`);
        } catch (e) {
          errors.push(`Failed to fix position ${toCancel.id}: ${e.message}`);
        }
      } else {
        positionMap.set(key, pos);
      }
    }

    return { fixed: fixedCount, errors };
  } catch (e) {
    errors.push(`Cleanup failed: ${e.message}`);
    return { fixed: fixedCount, errors };
  }
}
