-- Migration: Replace KV storage with D1 tables
-- Purpose: Reduce KV operations, use D1 as primary storage
-- KV storage being replaced:
--   - Auth: verify codes, lock status, email stats, sim time usage
--   - AI Agent: ai_score, ai_log
--   - Runtime: sim_state, global_pnl, engine_snapshot, ai_position_snapshot, battle_state

-- ============================================================================
-- Auth State: Replace KV keys "verify:*", "lock:*", "email_stats:*", "sim_time:*"
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_state (
  email_normalized TEXT NOT NULL,
  state_type TEXT NOT NULL CHECK (state_type IN (
    'verify_code', 'lock_status', 'email_stats', 'sim_time_usage'
  )),
  value_json TEXT NOT NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (email_normalized, state_type)
);

CREATE INDEX IF NOT EXISTS idx_auth_state_expires
  ON auth_state(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- AI Agent State: Replace KV keys "ai_score", "ai_log"
-- Uses global key (single-row table for system-wide AI state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_agent_state (
  state_key TEXT PRIMARY KEY CHECK (state_key IN ('ai_score', 'ai_log')),
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ============================================================================
-- Runtime State: Replace KV keys
--   "sim:state"         -> runtime_state with key 'sim_state'
--   "global:pnl"        -> runtime_state with key 'global_pnl'
--   "engine:snapshot"   -> runtime_state with key 'engine_snapshot'
--   "ai:position:snapshot" -> runtime_state with key 'ai_position_snapshot'
--   "battle:state"      -> runtime_state with key 'battle_state'
-- ============================================================================
CREATE TABLE IF NOT EXISTS runtime_state (
  state_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ============================================================================
-- Schema Version Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
);

INSERT OR REPLACE INTO schema_migrations (version, applied_at, description)
VALUES (2, unixepoch(), 'Replace KV storage with D1 tables for auth, AI, and runtime state');
