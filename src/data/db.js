export function requireDb(db) {
  if (!db || typeof db.prepare !== 'function') {
    throw new Error('D1 binding `DB` is not configured');
  }
  return db;
}

export function nowTs() {
  return Date.now();
}

export async function first(db, sql, ...params) {
  return requireDb(db).prepare(sql).bind(...params).first();
}

export async function all(db, sql, ...params) {
  const result = await requireDb(db).prepare(sql).bind(...params).all();
  return result?.results || [];
}

export async function run(db, sql, ...params) {
  return requireDb(db).prepare(sql).bind(...params).run();
}

export async function batch(db, statements) {
  return requireDb(db).batch(statements);
}

export function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
