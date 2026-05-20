-- Migration 006: SkillMall-native LLM router core and local request ledger.
-- Phase 1 is direct-only and stores secret references, never raw secret values.

CREATE TABLE IF NOT EXISTS llm_provider_configs (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  auth_mode TEXT NOT NULL,
  secret_ref_type TEXT,
  secret_ref TEXT,
  base_url TEXT,
  gateway_backend TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (auth_mode IN ('env_key', 'local_cli_session', 'none_local')),
  CHECK (secret_ref_type IS NULL OR secret_ref_type IN ('env', 'none')),
  CHECK (gateway_backend IS NULL OR gateway_backend IN ('direct')),
  CHECK (
    (
      auth_mode = 'env_key'
      AND secret_ref_type = 'env'
      AND secret_ref IS NOT NULL
      AND length(trim(secret_ref)) > 0
    )
    OR (
      auth_mode IN ('local_cli_session', 'none_local')
      AND (secret_ref_type IS NULL OR secret_ref_type = 'none')
      AND secret_ref IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_llm_provider_configs_provider
  ON llm_provider_configs(provider_id);

CREATE TABLE IF NOT EXISTS llm_models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT,
  capabilities_json TEXT NOT NULL DEFAULT '{}',
  context_window INTEGER,
  max_output_tokens INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  last_checked_at TEXT,
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider_id, model_id)
);

CREATE TABLE IF NOT EXISTS llm_pricing_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  pricing_json TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL,
  source_url TEXT,
  snapshot_at TEXT NOT NULL DEFAULT (datetime('now')),
  hash TEXT
);

CREATE TABLE IF NOT EXISTS llm_routing_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL,
  rules_json TEXT NOT NULL DEFAULT '{}',
  budget_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (mode IN ('manual'))
);

CREATE TABLE IF NOT EXISTS llm_requests (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_id TEXT,
  route_backend TEXT NOT NULL DEFAULT 'direct',
  auth_mode TEXT NOT NULL,
  routing_policy_id TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_input_tokens INTEGER,
  reasoning_tokens INTEGER,
  estimated_cost_usd REAL,
  actual_cost_usd REAL,
  cost_source TEXT,
  error_code TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  CHECK (status IN ('started', 'succeeded', 'failed')),
  CHECK (route_backend IN ('direct')),
  CHECK (auth_mode IN ('env_key', 'local_cli_session', 'none_local'))
);

CREATE INDEX IF NOT EXISTS idx_llm_requests_started
  ON llm_requests(started_at);
CREATE INDEX IF NOT EXISTS idx_llm_requests_provider_model
  ON llm_requests(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_llm_requests_operation
  ON llm_requests(operation);

CREATE TABLE IF NOT EXISTS llm_request_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_id TEXT,
  model_id TEXT,
  message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES llm_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_llm_request_events_request
  ON llm_request_events(request_id);
