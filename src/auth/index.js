import { batch, first, run, nowTs } from '../data/db.js';

/**
 * Auth Module - 邮箱验证码注册 + 密码登录
 *
 * 功能：
 * - 注册：邮箱验证码验证 + 设置密码
 * - 登录：密码登录（默认）或邮箱验证码登录
 * - 密码 PBKDF2-SHA256 加盐哈希存储
 * - 防暴力破解：验证码/密码 5次错误锁30分钟
 * - 防滥用：每邮箱每天最多20次验证码
 * - 生成/验证 JWT Token
 *
 * 数据存储：
 * - D1 auth_state 表：验证码、锁定状态、邮箱统计、模拟时间
 * - D1 users 表：用户认证信息（含 password_hash/password_salt）
 */

// =============================================================================
// 配置
// =============================================================================

// 邮件发送配置（BTLUO 自有邮件网关 htatemail.btluo.com）
let emailConfig = {
  apiUrl: 'https://htatemail.btluo.com/send-code',
  serviceKey: '',
};

export function initEmailConfig(env) {
  if (env.EMAIL_API_URL) {
    emailConfig.apiUrl = env.EMAIL_API_URL;
  }
  if (env.EMAIL_SERVICE_KEY) {
    emailConfig.serviceKey = String(env.EMAIL_SERVICE_KEY).trim();
  }
}

export function getEmailConfig() {
  return emailConfig;
}

export async function testSendEmail() {
  const { apiUrl, serviceKey } = getEmailConfig();

  if (!serviceKey) {
    return { error: '未配置邮件网关密钥（EMAIL_SERVICE_KEY）' };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': serviceKey },
      body: JSON.stringify({ to: 'test@test.com', code: '888888' }),
    });

    const result = await response.json();
    return {
      success: result.code === 200,
      response: result,
      status: response.status,
    };
  } catch (e) {
    return { error: e.message };
  }
}

let AUTH_DB = null;
export function setAuthDatabase(db) {
  if (!db) {
    throw new Error('D1 database binding (DB) is required for authentication. Please ensure your D1 database is properly bound in wrangler.jsonc.');
  }
  AUTH_DB = db;
}

let JWT_SECRET = '';
export function setJwtSecret(secret) {
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    console.error('[Auth] JWT_SECRET 未配置或为空。请运行: npx wrangler secret put JWT_SECRET 并输入至少16字符的密钥。');
    JWT_SECRET = '';
    return;
  }
  if (secret.length < 16) {
    console.warn(`[Auth] JWT_SECRET 太短 (${secret.length} < 16)，Token 验证将失败。请设置至少16字符的密钥。`);
  }
  JWT_SECRET = secret.trim();
}
export function getJwtSecret() {
  return JWT_SECRET;
}

const TOKEN_EXPIRY_SECONDS = 365 * 24 * 60 * 60;
const VERIFY_CODE_EXPIRY_SECONDS = 10 * 60;
const VERIFY_CODE_LENGTH = 6;

const MAX_VERIFY_ATTEMPTS = 5;
const LOCK_DURATION_SECONDS = 30 * 60;
const MAX_DAILY_CODES = 20;

const ALLOWED_LOGIN_EMAIL_DOMAINS = new Set(['qq.com', 'gmail.com']);

// Auth state types for D1 auth_state table
const AUTH_STATE_TYPES = {
  VERIFY_CODE: 'verify_code',
  LOCK_STATUS: 'lock_status',
  EMAIL_STATS: 'email_stats',
  SIM_TIME_USAGE: 'sim_time_usage',
  PASSWORD_ATTEMPTS: 'password_attempts',
};

// =============================================================================
// 邮箱验证工具
// =============================================================================

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim().toLowerCase());
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function isAllowedLoginEmailDomain(email) {
  const normalizedEmail = normalizeEmail(email || '');
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex < 0) return false;
  const domain = normalizedEmail.slice(atIndex + 1);
  return ALLOWED_LOGIN_EMAIL_DOMAINS.has(domain);
}

function getLoginEmailDomainError() {
  return '目前仅支持@qq.com和@gmail.com邮箱登录';
}

export function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email;
  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex);
  if (localPart.length <= 4) {
    return localPart.charAt(0) + '**' + domainPart;
  }
  return localPart.substring(0, 2) + '**' + domainPart;
}

// =============================================================================
// D1 存储（用户认证信息 + 认证状态）
// =============================================================================

export async function getUserProfile(email) {
  const normalizedEmail = normalizeEmail(email);

  const row = await first(AUTH_DB, `
    SELECT id, email, created_at, last_login_at, login_count
    FROM users
    WHERE email_normalized = ?1
    LIMIT 1
  `, normalizedEmail);

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    createdAt: Number(row.created_at || 0),
    lastLoginAt: Number(row.last_login_at || 0),
    loginCount: Number(row.login_count || 0),
  };
}

/**
 * 读取用户认证记录（含密码哈希，仅服务端内部使用）
 */
async function getUserAuthRecord(normalizedEmail) {
  return first(AUTH_DB, `
    SELECT id, email, password_hash, password_salt, created_at, last_login_at, login_count
    FROM users
    WHERE email_normalized = ?1
    LIMIT 1
  `, normalizedEmail);
}

/**
 * 已存在用户的登录落库（不创建新用户）
 */
async function touchUserLoginRecord(normalizedEmail) {
  const now = nowTs();
  await run(AUTH_DB, `
    UPDATE users SET last_login_at = ?1, login_count = login_count + 1
    WHERE email_normalized = ?2
  `, now, normalizedEmail);
  return getUserProfile(normalizedEmail);
}

// =============================================================================
// 密码（PBKDF2-SHA256 加盐哈希）
// =============================================================================

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const PBKDF2_ITERATIONS = 100000;
const MAX_PASSWORD_ATTEMPTS = 5;

export function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return '请输入密码';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `密码至少需要 ${PASSWORD_MIN_LENGTH} 个字符`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `密码不能超过 ${PASSWORD_MAX_LENGTH} 个字符`;
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return '密码需同时包含字母和数字';
  }
  return null;
}

function generatePasswordSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, saltHex) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// D1 auth_state 表操作
// =============================================================================

/**
 * 读取 auth_state 表中指定类型的状态
 */
async function getAuthState(emailNormalized, stateType) {
  const row = await first(AUTH_DB, `
    SELECT value_json, expires_at
    FROM auth_state
    WHERE email_normalized = ?1 AND state_type = ?2
    LIMIT 1
  `, emailNormalized, stateType);

  if (!row) return null;

  // 检查是否过期
  if (row.expires_at && Number(row.expires_at) < nowTs()) {
    await run(AUTH_DB, `
      DELETE FROM auth_state WHERE email_normalized = ?1 AND state_type = ?2
    `, emailNormalized, stateType);
    return null;
  }

  try {
    return JSON.parse(row.value_json);
  } catch {
    return null;
  }
}

/**
 * 保存 auth_state 到 D1，带可选过期时间
 */
async function setAuthState(emailNormalized, stateType, valueJson, expiresAt = null) {
  const now = nowTs();
  const valueStr = typeof valueJson === 'string' ? valueJson : JSON.stringify(valueJson);

  await run(AUTH_DB, `
    INSERT INTO auth_state (
      email_normalized, state_type, value_json, expires_at, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
    ON CONFLICT(email_normalized, state_type) DO UPDATE SET
      value_json = excluded.value_json,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
  `, emailNormalized, stateType, valueStr, expiresAt, now);
}

/**
 * 删除 auth_state
 */
async function deleteAuthState(emailNormalized, stateType) {
  await run(AUTH_DB, `
    DELETE FROM auth_state WHERE email_normalized = ?1 AND state_type = ?2
  `, emailNormalized, stateType);
}

/**
 * 清理过期的 auth_state 记录
 */
async function cleanupExpiredAuthState() {
  await run(AUTH_DB, `
    DELETE FROM auth_state WHERE expires_at IS NOT NULL AND expires_at < ?1
  `, nowTs());
}

// =============================================================================
// JWT Token
// =============================================================================

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function hmacSha256(key, data) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateToken(payload, secret = JWT_SECRET) {
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET 未配置或长度不足。请运行: npx wrangler secret put JWT_SECRET');
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sigHex = await hmacSha256(secret, signatureInput);
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const encodedSig = base64UrlEncode(String.fromCharCode(...sigBytes));

  return `${encodedHeader}.${encodedPayload}.${encodedSig}`;
}

export async function verifyToken(token, secret = JWT_SECRET) {
  if (!secret || secret.length < 16) {
    console.error('[Auth] JWT_SECRET 未配置或长度不足，Token 验证跳过。请运行: npx wrangler secret put JWT_SECRET');
    return null;
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSigHex = await hmacSha256(secret, signatureInput);
    const expectedSigBytes = new Uint8Array(expectedSigHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
    const expectedSig = base64UrlEncode(String.fromCharCode(...expectedSigBytes));

    if (encodedSignature !== expectedSig) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch (e) {
    return null;
  }
}

export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get('Cookie') || request.headers.get('cookie') || '';
  if (cookieHeader) {
    const tokenCookie = cookieHeader
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith('TdbToken='));
    if (tokenCookie) {
      const token = tokenCookie.slice('TdbToken='.length);
      if (token) {
        try {
          return decodeURIComponent(token);
        } catch (e) {
          return token;
        }
      }
    }
  }

  return null;
}

// =============================================================================
// 邮件发送
// =============================================================================

async function sendEmail(to, code) {
  const { apiUrl, serviceKey } = getEmailConfig();

  if (!serviceKey) {
    console.error('[Email] 邮件网关密钥未配置（EMAIL_SERVICE_KEY）');
    return { code: 500, message: '邮件服务未配置，请联系管理员' };
  }

  console.log(`[Email] 发送验证码 to="${to}"`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': serviceKey },
      body: JSON.stringify({ to, code }),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (_) {
      console.error(`[Email] 网关响应非 JSON: status=${response.status} body=${responseText.slice(0, 200)}`);
      return { code: 500, message: '邮件服务响应异常，请稍后重试' };
    }

    console.log(`[Email] 网关响应: code=${result.code} message="${result.message}"`);

    if (result.code === 200) {
      return result;
    }

    const providerMessage = String(result.message || '').trim();
    if (result.code === 401 || result.code === 403 || result.code === 40002 || providerMessage.includes('认证失败')) {
      console.error(`[Email] 上游认证失败: code=${result.code} message=${result.message}`);
      return { code: 500, message: '邮件服务认证失败，请联系管理员检查邮件密钥配置' };
    }

    return { code: result.code || 500, message: providerMessage || '邮件发送失败' };
  } catch (e) {
    console.error('[Email] 请求异常:', e.message);
    return { code: 500, message: '邮件发送失败，请稍后重试' };
  }
}

// =============================================================================
// 时间工具
// =============================================================================

function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

// =============================================================================
// 认证服务
// =============================================================================

export function generateVerifyCode() {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  const num = (arr[0] * 16777216 + arr[1] * 65536 + arr[2] * 256 + arr[3]) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * 发送验证码
 */
export async function sendVerifyCode(email) {
  if (!isValidEmail(email)) {
    return { success: false, error: '邮箱格式不正确' };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isAllowedLoginEmailDomain(normalizedEmail)) {
    return { success: false, error: getLoginEmailDomainError() };
  }
  const today = getTodayDate();

  let emailStats = await getAuthState(normalizedEmail, AUTH_STATE_TYPES.EMAIL_STATS);

  if (!emailStats || emailStats.date !== today) {
    emailStats = { date: today, count: 0 };
  }

  if (emailStats.count >= MAX_DAILY_CODES) {
    return {
      success: false,
      error: `今日发送次数已用完(${MAX_DAILY_CODES}次/天)，请明天再试`,
    };
  }

  const code = generateVerifyCode();

  // 保存验证码到 D1
  const expiresAt = nowTs() + VERIFY_CODE_EXPIRY_SECONDS * 1000;
  await setAuthState(normalizedEmail, AUTH_STATE_TYPES.VERIFY_CODE, {
    code,
    email: normalizedEmail,
    createdAt: Date.now(),
    attempts: 0,
  }, expiresAt);

  const emailResult = await sendEmail(normalizedEmail, code);

  if (emailResult.code !== 200) {
    await deleteAuthState(normalizedEmail, AUTH_STATE_TYPES.VERIFY_CODE);
    return { success: false, error: emailResult.message || '邮件发送失败，请稍后重试' };
  }

  emailStats.count++;
  const ttlSeconds = getSecondsUntilMidnight();
  const ttlMs = ttlSeconds * 1000;
  await setAuthState(normalizedEmail, AUTH_STATE_TYPES.EMAIL_STATS, emailStats, nowTs() + ttlMs);

  // 异步清理过期数据
  cleanupExpiredAuthState().catch(console.error);

  return {
    success: true,
    message: '验证码已发送到您的邮箱',
    remaining: MAX_DAILY_CODES - emailStats.count,
  };
}

/**
 * 检查账号锁定状态；锁已过期则自动清除
 * @returns {{ locked: boolean, response?: Object }}
 */
async function checkAccountLock(normalizedEmail) {
  const lockData = await getAuthState(normalizedEmail, AUTH_STATE_TYPES.LOCK_STATUS);
  if (!lockData) return { locked: false };

  const lockEndTime = Number(lockData.lockedUntil || 0);
  const now = Date.now();

  if (lockEndTime && now < lockEndTime) {
    const remainingSeconds = Math.ceil((lockEndTime - now) / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return {
      locked: true,
      response: {
        success: false,
        error: `登录已锁定，请在 ${minutes}分${seconds}秒后重试`,
        locked: true,
        lockedUntil: lockEndTime,
      },
    };
  }

  await deleteAuthState(normalizedEmail, AUTH_STATE_TYPES.LOCK_STATUS);
  return { locked: false };
}

/**
 * 校验邮箱验证码（含错误计数与锁定），通过后销毁验证码
 */
async function checkVerifyCode(normalizedEmail, code) {
  const lockCheck = await checkAccountLock(normalizedEmail);
  if (lockCheck.locked) return lockCheck.response;

  const stored = await getAuthState(normalizedEmail, AUTH_STATE_TYPES.VERIFY_CODE);

  if (!stored) {
    return { success: false, error: '验证码已过期，请重新获取' };
  }

  if (stored.code !== code) {
    stored.attempts++;
    const expiresAt = nowTs() + VERIFY_CODE_EXPIRY_SECONDS * 1000;
    await setAuthState(normalizedEmail, AUTH_STATE_TYPES.VERIFY_CODE, stored, expiresAt);

    if (stored.attempts >= MAX_VERIFY_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCK_DURATION_SECONDS * 1000;
      await setAuthState(normalizedEmail, AUTH_STATE_TYPES.LOCK_STATUS, {
        lockedUntil,
        attempts: stored.attempts,
      }, lockedUntil);

      await deleteAuthState(normalizedEmail, AUTH_STATE_TYPES.VERIFY_CODE);

      return {
        success: false,
        error: '验证码错误次数过多，登录已锁定30分钟',
        locked: true,
        lockedUntil,
      };
    }

    const remainingAttempts = MAX_VERIFY_ATTEMPTS - stored.attempts;
    return {
      success: false,
      error: `验证码错误，剩余 ${remainingAttempts} 次机会`,
    };
  }

  await deleteAuthState(normalizedEmail, AUTH_STATE_TYPES.VERIFY_CODE);
  return { success: true };
}

/**
 * 构造登录成功响应（Token + 用户信息 + 模拟时长）
 */
async function buildLoginSuccessResponse(normalizedEmail, user) {
  const token = await generateToken({
    email: normalizedEmail,
    userId: normalizedEmail,
  });

  const simTimeInfo = await getSimTimeUsage(normalizedEmail);

  return {
    success: true,
    token,
    user: {
      email: maskEmail(normalizedEmail),
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
    },
    simTime: {
      usedSeconds: simTimeInfo.usedSeconds,
      limitSeconds: simTimeInfo.limitSeconds,
      remainingSeconds: simTimeInfo.limitSeconds === Infinity ? Infinity : simTimeInfo.limitSeconds - simTimeInfo.usedSeconds,
      isVip: simTimeInfo.isVip,
      vipExpiresAt: simTimeInfo.vipExpiresAt,
    },
  };
}

/**
 * 验证码登录（仅限已注册用户；未注册邮箱需先注册并设置密码）
 */
export async function verifyAndLogin(email, code) {
  if (!isValidEmail(email)) {
    return { success: false, error: '邮箱格式不正确' };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isAllowedLoginEmailDomain(normalizedEmail)) {
    return { success: false, error: getLoginEmailDomainError() };
  }

  if (!code || code.length !== VERIFY_CODE_LENGTH || !/^\d+$/.test(code)) {
    return { success: false, error: '请输入6位数字验证码' };
  }

  // 先查注册状态再校验验证码：未注册时保留验证码，用户可直接拿它完成注册
  const existing = await getUserAuthRecord(normalizedEmail);
  if (!existing) {
    return {
      success: false,
      needRegister: true,
      error: '该邮箱尚未注册，请设置密码完成注册',
    };
  }

  const codeCheck = await checkVerifyCode(normalizedEmail, code);
  if (!codeCheck.success) return codeCheck;

  const user = await touchUserLoginRecord(normalizedEmail);
  return buildLoginSuccessResponse(normalizedEmail, user);
}

/**
 * 注册：邮箱验证码验证 + 设置密码
 */
export async function registerWithPassword(email, code, password) {
  if (!isValidEmail(email)) {
    return { success: false, error: '邮箱格式不正确' };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isAllowedLoginEmailDomain(normalizedEmail)) {
    return { success: false, error: getLoginEmailDomainError() };
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return { success: false, error: passwordError };
  }

  if (!code || code.length !== VERIFY_CODE_LENGTH || !/^\d+$/.test(code)) {
    return { success: false, error: '请输入6位数字验证码' };
  }

  const existing = await getUserAuthRecord(normalizedEmail);
  if (existing && existing.password_hash) {
    return { success: false, alreadyRegistered: true, error: '该邮箱已注册，请直接登录' };
  }

  const codeCheck = await checkVerifyCode(normalizedEmail, code);
  if (!codeCheck.success) return codeCheck;

  const salt = generatePasswordSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = nowTs();

  if (existing) {
    // 历史无密码账号：补设密码
    await run(AUTH_DB, `
      UPDATE users SET password_hash = ?1, password_salt = ?2, last_login_at = ?3, login_count = login_count + 1
      WHERE email_normalized = ?4
    `, passwordHash, salt, now, normalizedEmail);
    await run(AUTH_DB, `
      INSERT INTO user_wallets (user_id, created_at, updated_at)
      VALUES (?1, ?2, ?2)
      ON CONFLICT(user_id) DO NOTHING
    `, normalizedEmail, now);
  } else {
    await batch(AUTH_DB, [
      AUTH_DB.prepare(`
        INSERT INTO users (
          id, email, email_normalized, status, created_at, last_login_at, login_count, password_hash, password_salt
        ) VALUES (?1, ?2, ?2, 'active', ?3, ?3, 1, ?4, ?5)
      `).bind(normalizedEmail, normalizedEmail, now, passwordHash, salt),
      AUTH_DB.prepare(`
        INSERT INTO user_wallets (user_id, created_at, updated_at)
        VALUES (?1, ?2, ?2)
        ON CONFLICT(user_id) DO NOTHING
      `).bind(normalizedEmail, now),
    ]);
  }

  const user = await getUserProfile(normalizedEmail);
  return buildLoginSuccessResponse(normalizedEmail, user);
}

/**
 * 密码登录
 */
export async function loginWithPassword(email, password) {
  if (!isValidEmail(email)) {
    return { success: false, error: '邮箱格式不正确' };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isAllowedLoginEmailDomain(normalizedEmail)) {
    return { success: false, error: getLoginEmailDomainError() };
  }

  if (!password || typeof password !== 'string') {
    return { success: false, error: '请输入密码' };
  }

  const lockCheck = await checkAccountLock(normalizedEmail);
  if (lockCheck.locked) return lockCheck.response;

  const user = await getUserAuthRecord(normalizedEmail);
  if (!user) {
    return { success: false, needRegister: true, error: '该邮箱尚未注册，请先注册' };
  }
  if (!user.password_hash || !user.password_salt) {
    return { success: false, error: '该账号未设置密码，请使用邮箱验证码登录' };
  }

  const passwordHash = await hashPassword(password, user.password_salt);
  if (passwordHash !== user.password_hash) {
    let attempts = await getAuthState(normalizedEmail, AUTH_STATE_TYPES.PASSWORD_ATTEMPTS);
    attempts = { count: Number(attempts?.count || 0) + 1 };

    if (attempts.count >= MAX_PASSWORD_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCK_DURATION_SECONDS * 1000;
      await setAuthState(normalizedEmail, AUTH_STATE_TYPES.LOCK_STATUS, {
        lockedUntil,
        attempts: attempts.count,
      }, lockedUntil);
      await deleteAuthState(normalizedEmail, AUTH_STATE_TYPES.PASSWORD_ATTEMPTS);

      return {
        success: false,
        error: '密码错误次数过多，登录已锁定30分钟',
        locked: true,
        lockedUntil,
      };
    }

    await setAuthState(normalizedEmail, AUTH_STATE_TYPES.PASSWORD_ATTEMPTS, attempts);
    const remainingAttempts = MAX_PASSWORD_ATTEMPTS - attempts.count;
    return {
      success: false,
      error: `邮箱或密码错误，剩余 ${remainingAttempts} 次机会`,
    };
  }

  await deleteAuthState(normalizedEmail, AUTH_STATE_TYPES.PASSWORD_ATTEMPTS);
  await deleteAuthState(normalizedEmail, AUTH_STATE_TYPES.LOCK_STATUS);

  const profile = await touchUserLoginRecord(normalizedEmail);
  return buildLoginSuccessResponse(normalizedEmail, profile);
}

/**
 * 验证用户 Token（纯 JWT 验证）
 */
export async function authenticate(request) {
  const token = extractToken(request);
  if (!token) {
    return { authorized: false, error: '未登录，请先验证邮箱' };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { authorized: false, error: '登录已过期，请重新验证邮箱' };
  }

  if (!isAllowedLoginEmailDomain(payload.email || payload.userId || '')) {
    return { authorized: false, error: getLoginEmailDomainError() };
  }

  const user = await getUserProfile(payload.email);
  if (!user) {
    return { authorized: false, error: '用户不存在' };
  }

  return {
    authorized: true,
    user: {
      ...payload,
      id: user.id,
    },
  };
}

/**
 * 获取验证码剩余次数
 */
export async function getVerifyCodeRemaining(email) {
  const normalizedEmail = normalizeEmail(email);
  const today = getTodayDate();

  const emailStats = await getAuthState(normalizedEmail, AUTH_STATE_TYPES.EMAIL_STATS);

  if (!emailStats || emailStats.date !== today) {
    return { remaining: MAX_DAILY_CODES };
  }

  return {
    remaining: Math.max(0, MAX_DAILY_CODES - emailStats.count),
  };
}

/**
 * 获取模拟时间使用情况
 */
async function getSimTimeUsage(emailNormalized) {
  const today = getTodayDate();

  let simTimeData = await getAuthState(emailNormalized, AUTH_STATE_TYPES.SIM_TIME_USAGE);

  if (!simTimeData || simTimeData.date !== today) {
    return {
      date: today,
      usedSeconds: 0,
      limitSeconds: Infinity,
      isVip: simTimeData?.isVip || false,
      vipExpiresAt: simTimeData?.vipExpiresAt || 0
    };
  }

  const isVip = simTimeData.isVip && simTimeData.vipExpiresAt > Date.now();

  return {
    date: simTimeData.date,
    usedSeconds: simTimeData.usedSeconds || 0,
    limitSeconds: isVip ? Infinity : 3600,
    isVip,
    vipExpiresAt: simTimeData.vipExpiresAt || 0
  };
}

/**
 * 获取锁定状态
 */
export async function getLockStatus(email) {
  const normalizedEmail = normalizeEmail(email);
  const lockData = await getAuthState(normalizedEmail, AUTH_STATE_TYPES.LOCK_STATUS);

  if (!lockData) {
    return { locked: false };
  }

  const now = Date.now();
  if (now >= lockData.lockedUntil) {
    await deleteAuthState(normalizedEmail, AUTH_STATE_TYPES.LOCK_STATUS);
    return { locked: false };
  }

  return {
    locked: true,
    lockedUntil: lockData.lockedUntil,
    remainingSeconds: Math.ceil((lockData.lockedUntil - now) / 1000),
  };
}
