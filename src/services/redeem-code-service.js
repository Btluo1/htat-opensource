import { all, batch, first, nowTs } from '../data/db.js';
import { buildWalletUpdateStatement, ensureWallet, totalAvailable } from './wallet-service.js';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_BODY_LENGTH = 32;
const CODE_GROUP_LENGTH = 4;
const CODE_GROUP_COUNT = CODE_BODY_LENGTH / CODE_GROUP_LENGTH;
const MAX_GENERATE_RETRY = 8;
const MAX_NOTE_LENGTH = 120;
const MAX_CREDITS = 9999999999;
const MAX_CODE_SUFFIX_LENGTH = String(MAX_CREDITS).length;
const FORMATTED_CODE_PREFIX_PATTERN = new RegExp(`([A-Z0-9]{${CODE_GROUP_LENGTH}}(?:-[A-Z0-9]{${CODE_GROUP_LENGTH}}){${CODE_GROUP_COUNT - 1}})`, 'i');
const FORMATTED_REDEEM_CODE_PATTERN = new RegExp(`([A-Z0-9]{${CODE_GROUP_LENGTH}}(?:-[A-Z0-9]{${CODE_GROUP_LENGTH}}){${CODE_GROUP_COUNT - 1}}-\\d{1,${MAX_CODE_SUFFIX_LENGTH}})(?!\\d)`, 'i');
export const MIN_TRANSFER_REDEEM_CREDITS = 10000;

export function normalizeRedeemCode(code) {
  const raw = String(code || '').trim().toUpperCase();
  if (!raw) return '';

  const formattedMatch = raw.match(FORMATTED_REDEEM_CODE_PATTERN);
  if (formattedMatch?.[1]) {
    return formattedMatch[1].replace(/[^A-Z0-9]/g, '');
  }

  return raw.replace(/[^A-Z0-9]/g, '');
}

function extractRedeemCodePrefix(code) {
  const raw = String(code || '').trim().toUpperCase();
  if (!raw) return '';

  const formattedPrefixMatch = raw.match(FORMATTED_CODE_PREFIX_PATTERN);
  if (formattedPrefixMatch?.[1]) {
    return formattedPrefixMatch[1].replace(/[^A-Z0-9]/g, '');
  }

  const compact = raw.replace(/[^A-Z0-9]/g, '');
  return compact.length >= CODE_BODY_LENGTH ? compact.slice(0, CODE_BODY_LENGTH) : '';
}

function formatRedeemCode(codePrefix, credits) {
  const prefix = String(codePrefix || '').match(/.{1,4}/g)?.join('-') || '';
  const amountSuffix = String(sanitizeCredits(credits) || '');
  if (prefix && amountSuffix) {
    return `${prefix}-${amountSuffix}`;
  }
  return prefix || amountSuffix;
}

function generateRedeemCodePrefix() {
  const bytes = new Uint8Array(CODE_BODY_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

function generateRedeemCode(credits) {
  const codePrefix = generateRedeemCodePrefix();
  const amountSuffix = String(sanitizeCredits(credits));
  return {
    code: formatRedeemCode(codePrefix, credits),
    codeNormalized: `${codePrefix}${amountSuffix}`,
  };
}

function sanitizeCredits(credits) {
  const value = Math.floor(Number(credits || 0));
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}

function sanitizeNote(note) {
  return String(note || '').trim().slice(0, MAX_NOTE_LENGTH);
}

function allocateCreditsForTransfer(wallet, credits) {
  const required = sanitizeCredits(credits);
  const allocation = {
    purchased: 0,
    profit: 0,
    reward: 0,
    total: required,
  };

  if (required <= 0) {
    return {
      success: false,
      wallet: { ...wallet },
      allocation,
      remainingCredits: totalAvailable(wallet),
    };
  }

  if (totalAvailable(wallet) < required) {
    return {
      success: false,
      wallet: { ...wallet },
      allocation,
      remainingCredits: totalAvailable(wallet),
    };
  }

  const next = { ...wallet };
  let remaining = required;

  const spend = (walletKey, allocationKey) => {
    if (remaining <= 0 || next[walletKey] <= 0) {
      return;
    }
    const used = Math.min(remaining, next[walletKey]);
    next[walletKey] -= used;
    allocation[allocationKey] += used;
    remaining -= used;
  };

  spend('purchased', 'purchased');
  spend('profit', 'profit');
  spend('rewardCredits', 'reward');

  return {
    success: remaining <= 0,
    wallet: next,
    allocation,
    remainingCredits: totalAvailable(next),
  };
}

function buildConditionalWalletLedgerInsertStatement(db, userId, ledger, walletAfter, expectedVersionAfter, updatedAt) {
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
      balance_after_reward,
      balance_after_locked_purchased,
      balance_after_locked_profit,
      balance_after_locked_reward,
      metadata_json,
      created_at
    )
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
    FROM user_wallets
    WHERE user_id = ?17 AND version = ?18 AND updated_at = ?19
  `).bind(
    ledger.id || crypto.randomUUID(),
    userId,
    ledger.refType,
    ledger.refId || null,
    ledger.entryType,
    ledger.direction,
    ledger.bucket,
    ledger.amount,
    walletAfter.purchased,
    walletAfter.profit,
    walletAfter.rewardCredits,
    walletAfter.lockedPurchased,
    walletAfter.lockedProfit,
    walletAfter.lockedReward,
    JSON.stringify(ledger.metadata || {}),
    ledger.createdAt,
    userId,
    expectedVersionAfter,
    updatedAt,
  );
}

function buildConditionalRedeemCodeInsertStatement(db, redeemCode, userId, expectedVersionAfter, updatedAt) {
  return db.prepare(`
    INSERT INTO redeem_codes (
      id,
      code,
      code_normalized,
      credits,
      note,
      created_by,
      created_at,
      status,
      source_type
    )
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', ?8
    FROM user_wallets
    WHERE user_id = ?9 AND version = ?10 AND updated_at = ?11
  `).bind(
    redeemCode.id,
    redeemCode.code,
    redeemCode.codeNormalized,
    redeemCode.credits,
    redeemCode.note,
    redeemCode.createdBy,
    redeemCode.createdAt,
    redeemCode.sourceType,
    userId,
    expectedVersionAfter,
    updatedAt,
  );
}

function resolveRedeemCodeStatus(row) {
  if (!row) return 'unknown';
  if (row.status === 'disabled') return 'disabled';
  if (row.redeemed_at || row.redeemed_by || row.status === 'redeemed') return 'redeemed';
  return 'active';
}

function isRedeemCodeTableMissing(error) {
  const message = String(error?.message || error);
  return message.includes('no such table: redeem_codes') || message.includes('no such column: source_type');
}

function normalizeRedeemRow(row) {
  return {
    id: row.id,
    code: row.code,
    codeNormalized: row.code_normalized,
    credits: Number(row.credits || 0),
    note: row.note || '',
    status: resolveRedeemCodeStatus(row),
    sourceType: row.source_type || 'admin',
    createdBy: row.created_by || '',
    createdAt: Number(row.created_at || 0),
    redeemedBy: row.redeemed_by || '',
    redeemedAt: Number(row.redeemed_at || 0),
  };
}

export async function createRedeemCode(db, { credits, note = '', createdBy = '' } = {}) {
  const redeemCredits = sanitizeCredits(credits);
  if (!redeemCredits) {
    return { success: false, error: '请输入有效的积分数量' };
  }
  if (redeemCredits > MAX_CREDITS) {
    return { success: false, error: `单个兑换码最多支持 ${MAX_CREDITS} 积分` };
  }

  const redeemNote = sanitizeNote(note);
  const now = nowTs();

  for (let attempt = 0; attempt < MAX_GENERATE_RETRY; attempt++) {
    const { code, codeNormalized } = generateRedeemCode(redeemCredits);
    const id = crypto.randomUUID();

    try {
      await db.prepare(`
        INSERT INTO redeem_codes (
          id,
          code,
          code_normalized,
          credits,
          note,
          created_by,
          created_at,
          status,
          source_type
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', 'admin')
      `).bind(id, code, codeNormalized, redeemCredits, redeemNote, createdBy, now).run();

      return {
        success: true,
        redeemCode: {
          id,
          code,
          codeNormalized,
          credits: redeemCredits,
          note: redeemNote,
          status: 'active',
          sourceType: 'admin',
          createdBy,
          createdAt: now,
          redeemedBy: '',
          redeemedAt: 0,
        },
      };
    } catch (error) {
      if (isRedeemCodeTableMissing(error)) {
        return { success: false, error: '兑换码数据表未初始化，请先执行数据库迁移' };
      }
      if (String(error?.message || error).includes('UNIQUE')) {
        continue;
      }
      console.error('Create redeem code error:', error);
      return { success: false, error: '生成兑换码失败，请稍后再试' };
    }
  }

  return { success: false, error: '生成兑换码失败，请稍后再试' };
}

export async function createRedeemCodeFromUserCredits(db, userId, { credits, note = '' } = {}) {
  const redeemCredits = sanitizeCredits(credits);
  if (!redeemCredits) {
    return { success: false, error: '请输入有效的积分数量' };
  }
  if (redeemCredits < MIN_TRANSFER_REDEEM_CREDITS) {
    return { success: false, error: `积分转兑换码最低需要 ${MIN_TRANSFER_REDEEM_CREDITS} 积分` };
  }
  if (redeemCredits > MAX_CREDITS) {
    return { success: false, error: `单个兑换码最多支持 ${MAX_CREDITS} 积分` };
  }

  const redeemNote = sanitizeNote(note);

  for (let attempt = 0; attempt < MAX_GENERATE_RETRY; attempt++) {
    const wallet = await ensureWallet(db, userId);
    const debitResult = allocateCreditsForTransfer(wallet, redeemCredits);

    if (!debitResult.success) {
      return { success: false, error: '可用积分不足，无法转换为兑换码' };
    }

    const now = nowTs();
    const expectedVersionAfter = wallet.version + 1;
    const { code, codeNormalized } = generateRedeemCode(redeemCredits);
    const id = crypto.randomUUID();
    const metadataBase = {
      code,
      credits: redeemCredits,
      note: redeemNote,
      sourceType: 'user_transfer',
    };
    const statements = [
      buildWalletUpdateStatement(db, userId, debitResult.wallet, wallet.version, now),
    ];

    if (debitResult.allocation.purchased > 0) {
      statements.push(buildConditionalWalletLedgerInsertStatement(db, userId, {
        refType: 'redeem_code_create',
        refId: id,
        entryType: 'redeem_code_create',
        direction: 'debit',
        bucket: 'purchased',
        amount: debitResult.allocation.purchased,
        metadata: { ...metadataBase, fromBucket: 'purchased' },
        createdAt: now,
      }, debitResult.wallet, expectedVersionAfter, now));
    }

    if (debitResult.allocation.profit > 0) {
      statements.push(buildConditionalWalletLedgerInsertStatement(db, userId, {
        refType: 'redeem_code_create',
        refId: id,
        entryType: 'redeem_code_create',
        direction: 'debit',
        bucket: 'profit',
        amount: debitResult.allocation.profit,
        metadata: { ...metadataBase, fromBucket: 'profit' },
        createdAt: now,
      }, debitResult.wallet, expectedVersionAfter, now));
    }

    if (debitResult.allocation.reward > 0) {
      statements.push(buildConditionalWalletLedgerInsertStatement(db, userId, {
        refType: 'redeem_code_create',
        refId: id,
        entryType: 'redeem_code_create',
        direction: 'debit',
        bucket: 'reward',
        amount: debitResult.allocation.reward,
        metadata: { ...metadataBase, fromBucket: 'reward' },
        createdAt: now,
      }, debitResult.wallet, expectedVersionAfter, now));
    }

    statements.push(buildConditionalRedeemCodeInsertStatement(db, {
      id,
      code,
      codeNormalized,
      credits: redeemCredits,
      note: redeemNote,
      createdBy: userId,
      createdAt: now,
      sourceType: 'user_transfer',
    }, userId, expectedVersionAfter, now));

    try {
      const results = await batch(db, statements);
      const walletUpdated = results[0]?.meta?.changes === 1;
      const codeInserted = results[results.length - 1]?.meta?.changes === 1;

      if (walletUpdated && codeInserted) {
        return {
          success: true,
          creditsDeducted: redeemCredits,
          remainingCredits: debitResult.remainingCredits,
          redeemCode: {
            id,
            code,
            codeNormalized,
            credits: redeemCredits,
            note: redeemNote,
            status: 'active',
            sourceType: 'user_transfer',
            createdBy: userId,
            createdAt: now,
            redeemedBy: '',
            redeemedAt: 0,
          },
        };
      }
    } catch (error) {
      if (isRedeemCodeTableMissing(error)) {
        return { success: false, error: '兑换码数据表未初始化，请先执行数据库迁移' };
      }
      if (String(error?.message || error).includes('UNIQUE')) {
        continue;
      }
      console.error('Create redeem code from credits error:', error);
      return { success: false, error: '积分转兑换码失败，请稍后再试' };
    }
  }

  return { success: false, error: '积分转兑换码失败，请稍后再试' };
}

export async function redeemCreditsByCode(db, userId, codeInput) {
  const codeNormalized = normalizeRedeemCode(codeInput);
  const codePrefix = extractRedeemCodePrefix(codeInput);
  if (!codeNormalized) {
    return { success: false, error: '请输入兑换码' };
  }

  await ensureWallet(db, userId);

  let redeemRow;
  try {
    redeemRow = await first(db, `
      SELECT id, code, code_normalized, credits, note, status, source_type, created_by, created_at, redeemed_by, redeemed_at
      FROM redeem_codes
      WHERE code_normalized = ?1
      LIMIT 1
    `, codeNormalized);

    if (!redeemRow && codePrefix) {
      redeemRow = await first(db, `
        SELECT id, code, code_normalized, credits, note, status, source_type, created_by, created_at, redeemed_by, redeemed_at
        FROM redeem_codes
        WHERE SUBSTR(code_normalized, 1, ${CODE_BODY_LENGTH}) = ?1
        LIMIT 1
      `, codePrefix);
    }
  } catch (error) {
    if (isRedeemCodeTableMissing(error)) {
      return { success: false, error: '兑换码数据表未初始化，请先执行数据库迁移' };
    }
    throw error;
  }

  if (!redeemRow) {
    return { success: false, error: '兑换码不存在' };
  }

  const currentStatus = resolveRedeemCodeStatus(redeemRow);
  if (currentStatus === 'disabled') {
    return { success: false, error: '兑换码已失效' };
  }
  if (currentStatus === 'redeemed') {
    return { success: false, error: '兑换码已被使用' };
  }
  if ((redeemRow.source_type || 'admin') === 'user_transfer' && redeemRow.created_by === userId) {
    return { success: false, error: '不能兑换自己转换生成的兑换码' };
  }

  const matchedCodeNormalized = redeemRow.code_normalized || codeNormalized;
  const now = nowTs();
  const ledgerId = crypto.randomUUID();
  const metadataJson = JSON.stringify({
    code: redeemRow.code,
    note: redeemRow.note || '',
    sourceType: redeemRow.source_type || 'admin',
  });

  try {
    await batch(db, [
      db.prepare(`
        UPDATE redeem_codes
        SET
          status = 'redeemed',
          redeemed_by = ?2,
          redeemed_at = ?3
        WHERE code_normalized = ?1
          AND status = 'active'
          AND redeemed_by IS NULL
          AND redeemed_at IS NULL
      `).bind(matchedCodeNormalized, userId, now),
      db.prepare(`
        UPDATE user_wallets
        SET
          purchased_balance = purchased_balance + (
            SELECT credits
            FROM redeem_codes
            WHERE code_normalized = ?1
              AND redeemed_by = ?2
              AND redeemed_at = ?3
              AND status = 'redeemed'
          ),
          total_recharged = total_recharged + (
            SELECT credits
            FROM redeem_codes
            WHERE code_normalized = ?1
              AND redeemed_by = ?2
              AND redeemed_at = ?3
              AND status = 'redeemed'
          ),
          version = version + 1,
          updated_at = ?3
        WHERE user_id = ?2
      `).bind(matchedCodeNormalized, userId, now),
      db.prepare(`
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
          balance_after_reward,
          balance_after_locked_purchased,
          balance_after_locked_profit,
          balance_after_locked_reward,
          metadata_json,
          created_at
        ) VALUES (
          ?1,
          ?2,
          'redeem_code',
          ?3,
          'redeem_code',
          'credit',
          'purchased',
          (
            SELECT credits
            FROM redeem_codes
            WHERE code_normalized = ?4
              AND redeemed_by = ?2
              AND redeemed_at = ?5
              AND status = 'redeemed'
          ),
          (SELECT purchased_balance FROM user_wallets WHERE user_id = ?2),
          (SELECT profit_balance FROM user_wallets WHERE user_id = ?2),
          (SELECT reward_balance FROM user_wallets WHERE user_id = ?2),
          (SELECT locked_purchased FROM user_wallets WHERE user_id = ?2),
          (SELECT locked_profit FROM user_wallets WHERE user_id = ?2),
          (SELECT locked_reward FROM user_wallets WHERE user_id = ?2),
          ?6,
          ?5
        )
      `).bind(ledgerId, userId, redeemRow.id, matchedCodeNormalized, now, metadataJson),
    ]);
  } catch (error) {
    const latestRow = await first(db, `
      SELECT id, code, code_normalized, credits, note, status, source_type, created_by, created_at, redeemed_by, redeemed_at
      FROM redeem_codes
      WHERE code_normalized = ?1
      LIMIT 1
    `, matchedCodeNormalized);
    const latestStatus = resolveRedeemCodeStatus(latestRow);
    if (latestStatus === 'disabled') {
      return { success: false, error: '兑换码已失效' };
    }
    if (latestStatus === 'redeemed') {
      return { success: false, error: '兑换码已被使用' };
    }
    console.error('Redeem code error:', error);
    return { success: false, error: '兑换失败，请稍后再试' };
  }

  return {
    success: true,
    creditsAdded: Number(redeemRow.credits || 0),
    redeemCode: redeemRow.code,
    note: redeemRow.note || '',
    sourceType: redeemRow.source_type || 'admin',
  };
}

export async function getRedeemCodeStats(db) {
  const row = await first(db, `
    SELECT
      COUNT(*) AS total_codes,
      SUM(CASE WHEN status = 'active' AND redeemed_at IS NULL THEN 1 ELSE 0 END) AS active_codes,
      SUM(CASE WHEN status = 'redeemed' OR redeemed_at IS NOT NULL THEN 1 ELSE 0 END) AS redeemed_codes,
      COALESCE(SUM(CASE WHEN status = 'redeemed' OR redeemed_at IS NOT NULL THEN credits ELSE 0 END), 0) AS redeemed_credits,
      COALESCE(SUM(credits), 0) AS generated_credits
    FROM redeem_codes
  `).catch((error) => {
    if (isRedeemCodeTableMissing(error)) {
      return null;
    }
    throw error;
  });

  return {
    totalCodes: Number(row?.total_codes || 0),
    activeCodes: Number(row?.active_codes || 0),
    redeemedCodes: Number(row?.redeemed_codes || 0),
    redeemedCredits: Number(row?.redeemed_credits || 0),
    generatedCredits: Number(row?.generated_credits || 0),
  };
}

export async function getRecentRedeemCodes(db, limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit || 20)));
  const rows = await all(db, `
    SELECT id, code, code_normalized, credits, note, status, source_type, created_by, created_at, redeemed_by, redeemed_at
    FROM redeem_codes
    ORDER BY created_at DESC
    LIMIT ?1
  `, safeLimit).catch((error) => {
    if (isRedeemCodeTableMissing(error)) {
      return [];
    }
    throw error;
  });

  return rows.map(normalizeRedeemRow);
}
