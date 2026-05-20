# Database Schema

SkillMall Phase 2 uses SQLite via `better-sqlite3`. No cloud database. No Supabase. The database file lives at `data/skillmall.db` (gitignored) and is created automatically on first run.

Provider/Auth Router Phase 1 adds local LLM provider metadata and request-ledger tables. Phase 2 expands those tables for local Bifrost gateway execution, model refresh, pricing snapshots, and routing-policy evaluation. Phase 3 exposes those records through the Provider Center, model refresh/status actions, safe provider tests, and grouped usage/cost summaries. Phase 4 adds explicit `provider_registry_id` and `execution_kind` metadata so broad Provider Center rows can cache models/pricing without widening the narrow executable `ProviderID` union. These tables are local-only and do not introduce a hosted gateway, hosted observability service, or cloud database.

The database stores provider IDs, auth modes, secret references, model snapshots, pricing snapshots, request metadata, and routing/budget state. It must not store raw ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, raw API key values, or credential-file paths.

## Setup

```bash
npm run db:migrate
```

This applies all pending migrations from `db/migrations/` in filename order. Idempotent — safe to run multiple times. Creates the database file if it doesn't exist.

## Migration Files

All migrations are plain SQL files in `db/migrations/`. They are committed to the repository. The migration runner applies them in alphabetical order and records each applied migration in the `schema_migrations` table.

---

## Tables

### sessions

Stores GitHub OAuth sessions. Sessions expire after 7 days.

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,           -- random 32-byte hex token
  github_id TEXT NOT NULL,       -- GitHub user numeric ID
  github_login TEXT NOT NULL,    -- GitHub username
  scopes TEXT NOT NULL DEFAULT 'read:user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL       -- ISO 8601, 7 days from creation
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
```

**Notes:**
- `id` is the session token set in the `sm_session` httpOnly cookie
- Sessions are validated by checking `expires_at > datetime('now')`
- Expired sessions are left in the table until explicit cleanup
- No access tokens are stored — only the GitHub user identity

---

### install_events

Records skill installation events. **Zero PII.** No user identity is stored in this table.

```sql
CREATE TABLE IF NOT EXISTS install_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,      -- e.g. "skill-creator"
  agent_type TEXT NOT NULL,      -- 'claude-code' | 'cursor' | 'codex' | 'gemini-cli' | 'other'
  installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_install_events_slug ON install_events(skill_slug);
CREATE INDEX IF NOT EXISTS idx_install_events_installed ON install_events(installed_at);
```

**Notes:**
- Events are logged by `lib/analytics.ts:logInstallEvent()` on every successful skill deployment
- `agent_type` comes from the deploy command (`--agent` flag or auto-detected)
- No user identity, IP address, or session reference is stored — aggregate analytics only
- Used by trending computations, rising detection, and contributor dashboards

---

### reviews

Stores skill ratings and reviews.

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  reviewer_github_id TEXT NOT NULL,
  reviewer_login TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 150),
  is_generic INTEGER NOT NULL DEFAULT 0,        -- 1 = deprioritized in display
  has_install_signal INTEGER NOT NULL DEFAULT 0, -- 1 = verified skill has installs
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_slug, reviewer_github_id)         -- one review per skill per user
);
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(skill_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at);
```

**Constraints enforced by the database:**
- `rating` must be 1–5 (CHECK constraint)
- `body` must be 1–150 characters (CHECK constraint)
- One review per (skill, reviewer) pair (UNIQUE constraint) — attempting a second review returns SQLITE_CONSTRAINT_UNIQUE

**Generic review detection:**
The `is_generic` flag is set by `lib/reviews.ts:isGenericReview()` when the review body matches common generic phrases ("great skill", "very useful", etc.). Generic reviews are stored and displayed but sorted below specific reviews.

**Install signal:**
`has_install_signal` is set to 1 when the skill has at least one `install_events` record. This is a catalog-level signal, not per-user — Phase 2 does not track which specific user installed which skill.

---

### schema_migrations

Tracks which migration files have been applied. Created by the migration runner automatically.

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

---

### llm_provider_configs

Stores non-secret provider configuration for the router. Secret values are not stored here. `env_key` rows store only the environment variable name in `secret_ref`; `gateway_virtual_key` rows store only the gateway virtual-key environment variable name.

Allowed auth modes are:

- `env_key`
- `local_cli_session`
- `none_local`
- `gateway_virtual_key`

Allowed gateway backends:

- `direct`
- `bifrost_local`

Reserved future auth/gateway modes such as `codex_session`, `oauth_device_flow`, `keychain_ref`, GoModel, LiteLLM, Portkey, TensorZero, and external hosted gateways are not implemented in Phase 2.

```sql
CREATE TABLE IF NOT EXISTS llm_provider_configs (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  provider_registry_id TEXT,
  execution_kind TEXT NOT NULL DEFAULT 'direct',
  auth_mode TEXT NOT NULL CHECK (auth_mode IN ('env_key', 'local_cli_session', 'none_local', 'gateway_virtual_key')),
  secret_ref_type TEXT CHECK (secret_ref_type IS NULL OR secret_ref_type IN ('env', 'none', 'gateway_virtual_key_ref')),
  secret_ref TEXT,
  base_url TEXT,
  gateway_backend TEXT CHECK (gateway_backend IS NULL OR gateway_backend IN ('direct', 'bifrost_local')),
  enabled INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

The migration also enforces auth/secret pairing: `env_key` requires an env secret reference, while `local_cli_session` and `none_local` cannot store secret references.

---

### llm_models

Caches model metadata by provider. Phase 4 model refresh follows each Provider Center row's declared `discoveryStrategy`. OpenAI-compatible rows may probe configured endpoints, implemented provider-specific rows use official provider adapters, cloud-project rows require project/resource context, local runtime rows require local runtime endpoints, source-backed static rows use documented/static labels, manual rows use manual labels, and planned-source-review rows are visible but not live-callable. Static provider defaults remain fallbacks only.

Phase 6 populates `capabilities_json`, `context_window`, and `max_output_tokens` from normalized capability metadata when a source exposes those fields. `capabilities_json` includes source, source URL, fetched timestamp, confidence, capability flags, token limits, mode/endpoint family when known, and blocker codes. Unknown, reference-only, manual-only, fallback-only, stale, missing-price, or missing-metadata states are represented as blockers; they are not silently treated as eligible for automatic cost-aware routing.

```sql
CREATE TABLE IF NOT EXISTS llm_models (
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
```

`raw_json` remains sanitized model metadata and must not contain raw API keys, auth headers, tokens, sessions, credential paths, prompts, or responses. Token-limit fields such as `inputTokenLimit`, `outputTokenLimit`, `max_input_tokens`, and `max_output_tokens` are metadata and may be preserved.

---

### llm_pricing_snapshots

Stores local pricing snapshots for cost estimation. Phase 4 can populate these rows from source-backed public pricing data. Portkey Models repository/static JSON is the primary source; LiteLLM model pricing JSON is fallback/reference data. Neither source requires hosted gateway credentials.

Phase 2 uses these rows for local estimated-cost calculation when a provider or selected gateway does not report an exact request cost. Provider/gateway-reported costs are recorded as `actual_cost_usd`; locally calculated costs are recorded as `estimated_cost_usd` and must never be presented as exact spend.

```sql
CREATE TABLE IF NOT EXISTS llm_pricing_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT NOT NULL,
  provider_registry_id TEXT,
  execution_kind TEXT,
  model_id TEXT NOT NULL,
  pricing_json TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL,
  source_url TEXT,
  snapshot_at TEXT NOT NULL DEFAULT (datetime('now')),
  hash TEXT
);
```

`pricing_json` stores normalized USD-per-million token fields and may include source license evidence such as `sourceLicense`. `provider_registry_id` and `execution_kind` preserve broad Provider Center attribution separately from the legacy/direct `provider_id`.

---

### llm_routing_policies

Stores routing-policy metadata. Phase 2 added bounded runtime evaluation for approved modes. Phase 5 adds app/API/CLI management and local-only policy simulation over this same table.

Allowed modes:

- `manual`
- `fallback_chain`
- `local_first`
- `budget_guarded_manual`

Future/not implemented modes include `cheapest_compatible`, `quality_first`, and semantic/eval-based routing.

`rules_json` stores sanitized routing candidates. Candidate configs may contain provider/model/auth-mode/secret-reference/base-URL metadata, but must not contain raw keys, raw tokens, copied credential contents, credential-file paths, prompt bodies, response bodies, message arrays, or output content.

`budget_json` stores normalized numeric budget metadata. Phase 5 recognizes `remainingUsd` and `limitUsd` for policy management. The usage summary also recognizes legacy snake-case and monthly-budget aliases for display.

```sql
CREATE TABLE IF NOT EXISTS llm_routing_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('manual', 'fallback_chain', 'local_first', 'budget_guarded_manual')),
  rules_json TEXT NOT NULL DEFAULT '{}',
  budget_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### llm_requests

Records local LLM request lifecycle rows. Prompt bodies, response bodies, and raw credential-like metadata are scrubbed before request metadata is serialized.
Provider/auth usage visibility reads this ledger through `lib/llm/router/usage-summary.ts`.
The helper and `/api/providers/usage` summarize request counts, success/failure counts, per-provider
usage, per-model usage, per-operation usage, auth modes, route backends, routing-policy usage, token
counts, latency, and cost. `actual_cost_usd` and `estimated_cost_usd` remain separate fields with
separate API labels: `provider_or_gateway_reported_actual_cost` and `locally_estimated_cost`.
Estimated cost is a local estimate and must not be presented as exact spend.

```sql
CREATE TABLE IF NOT EXISTS llm_requests (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_registry_id TEXT,
  execution_kind TEXT,
  model_id TEXT,
  route_backend TEXT NOT NULL DEFAULT 'direct' CHECK (route_backend IN ('direct', 'bifrost_local')),
  auth_mode TEXT NOT NULL CHECK (auth_mode IN ('env_key', 'local_cli_session', 'none_local', 'gateway_virtual_key')),
  routing_policy_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed')),
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
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
```

---

### llm_request_events

Records local request lifecycle events such as provider errors. Event metadata is JSON and is scrubbed through the same prompt/response/credential-like metadata boundary as request metadata.

```sql
CREATE TABLE IF NOT EXISTS llm_request_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL REFERENCES llm_requests(id),
  event_type TEXT NOT NULL,
  provider_id TEXT,
  provider_registry_id TEXT,
  execution_kind TEXT,
  model_id TEXT,
  message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### Provider usage summary API

`GET /api/providers/usage` is backed by `lib/llm/router/usage-summary.ts` and returns:

- `summary`: total request, success, failure, started, token, latency, actual-cost, and estimated-cost metrics.
- `byProvider`: the same metrics grouped by `provider_id`.
- `byModel`: the same metrics grouped by `provider_id` and `model_id` when the ledger has model IDs.
- `byOperation`: the same metrics grouped by operation.
- `byAuthMode` and `byRouteBackend`: the same metrics grouped by `auth_mode` and `route_backend`.
- `byRoutingPolicy`: the same metrics grouped by `routing_policy_id`.
- `budgetPolicies`: routing-policy budget status derived from `llm_routing_policies.budget_json` when numeric budget fields are present.
- `costLabels`: labels that preserve the distinction between exact provider/gateway-reported actual cost and local estimated cost.

Budget visibility currently recognizes numeric `remainingUsd` or `remaining_usd` as a remaining-budget signal, and numeric `limitUsd`, `limit_usd`, `monthlyLimitUsd`, `monthly_limit_usd`, `monthlyBudgetUsd`, or `monthly_budget_usd` as budget-limit signals. If a budget object exists but those numeric fields are unavailable, the API reports the policy budget status as `unknown` instead of inventing a spend interpretation.

---

## Database Client

File: `lib/db/client.ts`

```typescript
import Database from 'better-sqlite3'

const DB_PATH = path.join(process.cwd(), 'data', 'skillmall.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')   // Write-Ahead Logging
    _db.pragma('foreign_keys = ON')
  }
  return _db
}
```

WAL mode is enabled for better read concurrency. `foreign_keys = ON` is set but no foreign key relationships are defined in Phase 2 — this is future-proofing for Phase 3.

---

## Query Safety

**All queries use parameterized statements.** String concatenation in SQL is never used. The correct pattern:

```typescript
// Correct
db.prepare('SELECT * FROM reviews WHERE skill_slug = ?').all(skillSlug)

// Never do this
db.exec(`SELECT * FROM reviews WHERE skill_slug = '${skillSlug}'`) // vulnerable to SQL injection
```

---

## Production Considerations

SQLite WAL mode requires the database file to be on a local filesystem. This works on any VPS, dedicated server, or local development setup. It does not work on Vercel's read-only filesystem — Phase 2 is designed for local-first or self-hosted deployments where the filesystem is writable.

For cloud deployments, the migration path is to Turso (LibSQL — SQLite-compatible, cloud-hosted, serverless). The `better-sqlite3` API is compatible with `@libsql/client` for basic operations, making migration straightforward.
