-- Migration 008: Provider/Auth Router Phase 4 registry identity and source-backed refresh metadata.
-- Adds broad provider registry identity while preserving the narrow executable provider contract.

PRAGMA foreign_keys = OFF;

BEGIN;

ALTER TABLE llm_provider_configs
  ADD COLUMN provider_registry_id TEXT;

ALTER TABLE llm_provider_configs
  ADD COLUMN execution_kind TEXT NOT NULL DEFAULT 'direct';

ALTER TABLE llm_models RENAME TO llm_models_phase3;

CREATE TABLE llm_models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  provider_registry_id TEXT NOT NULL,
  execution_kind TEXT NOT NULL DEFAULT 'direct',
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
  UNIQUE(provider_registry_id, model_id)
);

INSERT INTO llm_models (
  id,
  provider_id,
  provider_registry_id,
  execution_kind,
  model_id,
  display_name,
  capabilities_json,
  context_window,
  max_output_tokens,
  source,
  last_checked_at,
  raw_json,
  created_at,
  updated_at
)
SELECT
  id,
  provider_id,
  provider_id,
  CASE
    WHEN source = 'live:bifrost_local' THEN 'bifrost_local'
    ELSE 'direct'
  END,
  model_id,
  display_name,
  capabilities_json,
  context_window,
  max_output_tokens,
  source,
  last_checked_at,
  raw_json,
  created_at,
  updated_at
FROM llm_models_phase3;

DROP TABLE llm_models_phase3;

CREATE INDEX IF NOT EXISTS idx_llm_models_provider_registry
  ON llm_models(provider_registry_id, model_id);

ALTER TABLE llm_pricing_snapshots
  ADD COLUMN provider_registry_id TEXT;

ALTER TABLE llm_pricing_snapshots
  ADD COLUMN execution_kind TEXT;

ALTER TABLE llm_requests
  ADD COLUMN provider_registry_id TEXT;

ALTER TABLE llm_requests
  ADD COLUMN execution_kind TEXT;

ALTER TABLE llm_request_events
  ADD COLUMN provider_registry_id TEXT;

ALTER TABLE llm_request_events
  ADD COLUMN execution_kind TEXT;

COMMIT;

PRAGMA foreign_keys = ON;
