import { batch, first, nowTs } from '../data/db.js';

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const WALLET_SCHEMA = {
  rewardBalanceColumn: 'reward_balance',
  lockedRewardColumn: 'locked_reward',
  ledgerRewardColumn: 'balance_after_reward',
  ledgerLockedRewardColumn: 'balance_after_locked_reward',
  dailyRewardClaimsTable: 'daily_reward_claims',
  rewardBucket: 'reward',
  lockedRewardBucket: 'locked_reward',
};

export async function getWalletSchema() {
  return WALLET_SCHEMA;
}

function getCachedWalletSchema() {
  return WALLET_SCHEMA;
}

export function totalAvailable(wallet) {
  return wallet.purchased + wallet.profit + wallet.rewardCredits;
}

function normalizeWalletRow(row, userId) {
  return {
    userId,
    purchased: Number(row?.purchased_balance || 0),
    profit: Number(row?.profit_balance || 0),
    rewardCredits: Number(row?.reward_balance ?? row?.bonus_balance ?? 0),
    lockedPurchased: Number(row?.locked_purchased || 0),
    lockedProfit: Number(row?.locked_profit || 0),
    lockedReward: Number(row?.locked_reward ?? row?.locked_bonus ?? 0),
    realizedPnlTotal: Number(row?.realized_pnl_total || 0),
    totalRecharged: Number(row?.total_recharged || 0),
    version: Number(row?.version || 0),
  };
}

export function buildWalletUpdateStatement(db, userId, wallet, expectedVersion, updatedAt) {
  const schema = getCachedWalletSchema();
  return db.prepare(`
    UPDATE user_wallets
    SET
      purchased_balance = ?2,
      profit_balance = ?3,
      ${schema.rewardBalanceColumn} = ?4,
      locked_purchased = ?5,
      locked_profit = ?6,
      ${schema.lockedRewardColumn} = ?7,
      realized_pnl_total = ?8,
      total_recharged = ?9,
      version = version + 1,
      updated_at = ?10
    WHERE user_id = ?1 AND version = ?11
  `).bind(
    userId,
    wallet.purchased,
    wallet.profit,
    wallet.rewardCredits,
    wallet.lockedPurchased,
    wallet.lockedProfit,
    wallet.lockedReward,
    wallet.realizedPnlTotal,
    wallet.totalRecharged,
    updatedAt,
    expectedVersion,
  );
}

export function buildLedgerStatement(db, userId, ledger, walletAfter) {
  const schema = getCachedWalletSchema();
  const bucket = ledger.bucket === 'reward' ? schema.rewardBucket : ledger.bucket === 'locked_reward' ? schema.lockedRewardBucket : ledger.bucket;
  return db.prepare(`
    INSERT INTO wallet_ledger (
      id,
      user_id,
      ref_type,
      ref_id,
      entry_type,
      direction,
      bucket,
      amount,
      balance_after_purchased,
      balance_after_profit,
      ${schema.ledgerRewardColumn},
      balance_after_locked_purchased,
      balance_after_locked_profit,
      ${schema.ledgerLockedRewardColumn},
      metadata_json,
      created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
  `).bind(
    ledger.id || crypto.randomUUID(),
    userId,
    ledger.refType,
    ledger.refId || null,
    ledger.entryType,
    ledger.direction,
    bucket,
    ledger.amount,
    walletAfter.purchased,
    walletAfter.profit,
    walletAfter.rewardCredits,
    walletAfter.lockedPurchased,
    walletAfter.lockedProfit,
    walletAfter.lockedReward,
    JSON.stringify(ledger.metadata || {}),
    ledger.createdAt,
  );
}

export async function ensureWallet(db, userId) {
  await getWalletSchema();
  const now = nowTs();
  await db.prepare(`
    INSERT INTO user_wallets (user_id, created_at, updated_at)
    VALUES (?1, ?2, ?2)
    ON CONFLICT(user_id) DO NOTHING
  `).bind(userId, now).run();

  const row = await first(db, `SELECT * FROM user_wallets WHERE user_id = ?1`, userId);
  return normalizeWalletRow(row, userId);
}

export async function getCreditInfo(db, userId) {
  const wallet = await ensureWallet(db, userId);
  const today = getTodayDate();
  return {
    date: today,
    purchased: wallet.purchased,
    profit: wallet.profit,
    rewardCredits: wallet.rewardCredits,
    total: totalAvailable(wallet),
    remainingCredits: totalAvailable(wallet),
  };
}

export async function getWalletBalanceInfo(db, userId) {
  if (!db || !userId) return null;
  const schema = await getWalletSchema();

  const row = await first(db, `
    SELECT purchased_balance, profit_balance, ${schema.rewardBalanceColumn} AS reward_balance
    FROM user_wallets
    WHERE user_id = ?1
    LIMIT 1
  `, userId);

  if (!row) return null;

  const purchased = Number(row.purchased_balance || 0);
  const profit = Number(row.profit_balance || 0);
  const rewardCredits = Number(row.reward_balance || 0);
  const total = purchased + profit + rewardCredits;

  return {
    purchased,
    profit,
    rewardCredits,
    total,
    remainingCredits: total,
  };
}

/**
 * 批量查询多用户余额（单次 SQL），用于强平检查
 * @param {D1Database} db
 * @param {string[]} userIds
 * @returns {Promise<Map<string, {purchased, profit, rewardCredits, total}>>}
 */
export async function getWalletBalanceInfoBatch(db, userIds) {
  const result = new Map();
  if (!db || !userIds || userIds.length === 0) return result;
  const schema = getCachedWalletSchema();
  // D1 不支持 IN (?) 绑定数组，需用 UNION ALL 子查询或逐条查
  // 对于 <100 用户用 batch API 更高效（并行多条 prepared statement）
  const stmts = userIds.map(uid =>
    db.prepare(`SELECT user_id, purchased_balance, profit_balance, ${schema.rewardBalanceColumn} AS reward_balance FROM user_wallets WHERE user_id = ?1 LIMIT 1`).bind(uid)
  );
  try {
    const batchResults = await db.batch(stmts);
    for (const res of batchResults) {
      const row = res?.results?.[0];
      if (!row) continue;
      const purchased = Number(row.purchased_balance || 0);
      const profit = Number(row.profit_balance || 0);
      const rewardCredits = Number(row.reward_balance || 0);
      result.set(row.user_id, { purchased, profit, rewardCredits, total: purchased + profit + rewardCredits });
    }
  } catch (e) {
    console.error('[WalletService] batch balance query failed:', e);
  }
  return result;
}

/**
 * 汇总全站所有用户钱包的总账户余额（可用 + 锁定）。
 * 口径与后台「钱包总权益」一致，用作 AI 账户的动态仓位基数。
 */
export async function getAllUsersTotalBalance(db) {
  if (!db) return 0;
  try {
    const schema = getCachedWalletSchema();
    const availableExpr = `COALESCE(purchased_balance, 0) + COALESCE(profit_balance, 0) + COALESCE(${schema.rewardBalanceColumn}, 0)`;
    const lockedExpr = `COALESCE(locked_purchased, 0) + COALESCE(locked_profit, 0) + COALESCE(${schema.lockedRewardColumn}, 0)`;
    const row = await first(db, `
      SELECT COALESCE(SUM((${availableExpr}) + (${lockedExpr})), 0) AS total
      FROM user_wallets
    `);
    return Number(row?.total || 0);
  } catch (e) {
    console.error('[wallet] getAllUsersTotalBalance error:', e);
    return 0;
  }
}

export function lockWalletFunds(wallet, amount) {
  const required = Number(amount || 0);
  const allocation = { purchased: 0, profit: 0, reward: 0, total: required };

  if (required <= 0) {
    return { success: true, wallet: { ...wallet }, allocation, remainingCredits: totalAvailable(wallet) };
  }

  if (totalAvailable(wallet) < required) {
    return { success: false, remainingCredits: totalAvailable(wallet) };
  }

  const next = { ...wallet };
  let remaining = required;

  const spend = (availableKey, lockedKey, allocationKey) => {
    if (remaining <= 0 || next[availableKey] <= 0) return;
    const used = Math.min(remaining, next[availableKey]);
    next[availableKey] -= used;
    next[lockedKey] += used;
    allocation[allocationKey] += used;
    remaining -= used;
  };

  spend('rewardCredits', 'lockedReward', 'reward');
  spend('purchased', 'lockedPurchased', 'purchased');
  spend('profit', 'lockedProfit', 'profit');

  return {
    success: remaining <= 0,
    wallet: next,
    allocation,
    remainingCredits: totalAvailable(next),
  };
}

export function settleWalletFunds(wallet, allocation, pnl) {
  const next = { ...wallet };
  const marginTotal = Number(allocation.purchased || 0) + Number(allocation.profit || 0) + Number(allocation.reward || 0);
  next.lockedPurchased = Math.max(0, next.lockedPurchased - Number(allocation.purchased || 0));
  next.lockedProfit = Math.max(0, next.lockedProfit - Number(allocation.profit || 0));
  next.lockedReward = Math.max(0, next.lockedReward - Number(allocation.reward || 0));
  next.realizedPnlTotal += Number(pnl || 0);

  const finalAmount = marginTotal + Number(pnl || 0);
  if (finalAmount >= 0) {
    next.profit += finalAmount;
    return { wallet: next, finalAmount, deducted: 0 };
  }

  let remainingLoss = Math.abs(finalAmount);
  const deduct = (key) => {
    if (remainingLoss <= 0 || next[key] <= 0) return;
    const used = Math.min(remainingLoss, next[key]);
    next[key] -= used;
    remainingLoss -= used;
  };

  deduct('profit');
  deduct('purchased');
  deduct('rewardCredits');

  return {
    wallet: next,
    finalAmount,
    deducted: Math.abs(finalAmount) - remainingLoss,
    excessLoss: remainingLoss > 0 ? remainingLoss : 0,
  };
}


