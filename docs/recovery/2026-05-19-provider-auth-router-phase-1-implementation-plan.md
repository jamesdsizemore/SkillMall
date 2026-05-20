# Provider/Auth Router Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SkillMall's native provider/auth/router core and local usage ledger without adding a gateway sidecar, broad provider UI, or new external router dependency.

**Architecture:** Phase 1 keeps the current `resolveProviderConfig()` -> `createLLMClient()` -> `LLMClient.complete()` call surface intact while moving the behavior behind a SkillMall-owned router core. It introduces explicit auth modes, secret references, provider/model/pricing metadata tables, and request/cost logging. Existing direct clients remain the execution path.

**Tech Stack:** TypeScript, Next.js 16 app routes, Node CLI, Vitest, better-sqlite3, existing `lib/providers/*`, existing `db/migrations/*`.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Branch:** `codex/agent-operating-contract-auth-token-skill`

---

## Approval Scope

This plan is for approval before implementation. Do not implement, cleanup, stage, commit, or push as part of creating or reviewing this plan.

Phase 1 includes:

- SkillMall-native router types and compatibility client.
- Explicit provider auth modes and secret-reference config shape.
- SQLite tables for provider configs, model cache, pricing snapshots, routing policies, requests, and request events.
- Request ledger writes around existing `LLMClient.complete()` calls.
- Config resolution that no longer treats `apiKey` as the universal credential.
- Tests proving no raw secrets are returned by config/status helpers.

Phase 1 excludes:

- GoModel validation.
- Bifrost validation.
- LiteLLM/new-api/Portkey gateway integration.
- Gateway sidecar process management.
- Provider Center UI redesign.
- Auto-refreshing every provider model list.
- Adding the full provider catalog implementation.
- Claude Code/Codex OAuth login automation.
- Any hosted service.

## Development Operating Contract

This plan is not just a file-change checklist. Implementation must follow this operating contract after approval.

Git/process rules:

- Start from the current branch unless the user explicitly asks for a new branch.
- Before edits, record `git status --short`, `git branch --show-current`, and the relevant dirty-file inventory in the GoalBuddy receipt.
- Treat all existing dirty provider/auth files as REWORK context, not approved implementation.
- Do not cleanup unrelated files.
- Do not stage, commit, or push until the user explicitly approves that action.
- Do not revert user or prior-agent changes unless the user explicitly requests it.
- After each Worker slice, record `git diff --name-only` and confirm the slice stayed inside its allowed files.

Error logging and receipts:

- Every task must keep a short receipt in `docs/goals/provider-auth-router-phase1/state.yaml`.
- Every failed command must be recorded with command, exit status, concise error summary, and whether the failure is PR-owned or pre-existing.
- If a test/lint/typecheck failure is unrelated to the slice, preserve the evidence instead of hiding it behind "tests failed."
- If a task hits a hard stop, mark the task blocked and stop implementation rather than widening scope.

Testing/linting gates:

- Each Worker slice must run focused tests named in its task.
- Shared provider/router changes must also run `npm test -- lib/llm/router lib/providers` before Judge review and final verification.
- Before final review, run the available repo gates:
  - `npm test -- lib/llm/router lib/providers`
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run lint`
  - the secret scan listed in Task 10
- If a gate is blocked by a known environment issue, document the blocker with exact command output and continue only where safe.

Code review and review-fix loop:

- A Judge must review the implementation before final completion.
- Review must check behavior, secret handling, compatibility with current call sites, database migration safety, route response sanitization, test coverage, docs, and diff containment.
- Review findings become a bounded Worker review-fix task with explicit allowed files.
- Final verification must run after review fixes, not before.

Documentation:

- Phase 1 docs must explain auth modes, secret refs, ledger tables, API-key versus subscription/tool-session auth, and future gateway validation boundaries.
- Documentation must not describe `.env.local` writes or raw-token pasting as approved product behavior.
- The implementation plan, GoalBuddy board, and relevant reference docs must be updated when the implemented behavior, scope, blocker state, or verification result changes.

Completion discipline:

- Do complete work for the approved Phase 1 outcome, not a partial helper layer or a handoff packet.
- Do not stop after creating types, wrappers, or tests if later approved Phase 1 tasks remain safe and local.
- After each completed task, immediately advance to the next largest safe board task unless a hard stop applies.
- A task is not complete until its implementation, focused verification, receipt, and any required documentation updates are done.
- The goal is not complete until all approved Phase 1 tasks are done, Judge review is complete, review fixes are done or explicitly accepted, final verification has run, and final docs/receipts are current.
- If any work is not completed, document exactly what was not completed, why it was not completed, what evidence exists, and what the next required action is.
- Environmental failures, unavailable credentials, disabled runtime features, pre-existing test failures, and scope hard stops must be recorded as blockers with exact commands/evidence instead of being smoothed into "not done."
- Do not hand off partial work as final completion. If handoff is unavoidable because of a hard stop, the final receipt must say `blocked`, list completed work, list incomplete work, list blockers, and identify the next safe task.

## Sub-Agent Orchestration

Use GoalBuddy for execution after approval:

```bash
/goal Follow docs/goals/provider-auth-router-phase1/goal.md.
```

If native Codex `/goal` is unavailable, do not skip the board and do not treat the runtime issue as permission to improvise. Use the current Codex thread as PM and execute the same board one active task at a time:

- Keep `docs/goals/provider-auth-router-phase1/state.yaml` as board truth.
- Update the active task, status, and receipt after each task.
- Follow the same Scout, Worker, and Judge responsibilities.
- Preserve the same allowed-file, verification, review, blocker, and documentation gates.
- Record native `/goal` readiness in the T701 receipt.

PM responsibilities:

- Keep exactly one active task.
- Preserve the approval scope and hard stops.
- Assign Scout, Worker, and Judge tasks from `docs/goals/provider-auth-router-phase1/state.yaml`.
- Update receipts after every task.
- Keep implementation moving through the board; do not restart research or reopen a many-repo gateway bakeoff.
- Do not allow final completion while queued safe implementation tasks remain.
- Require blocker and incomplete-work documentation before any pause, handoff, or final response.

Scout responsibilities:

- Read current source and confirm file ownership before any Worker edits.
- Map dirty-file overlap and call out unrelated changes that must be preserved.
- Verify whether local Next.js docs need to be consulted before touching Next app routes.

Worker responsibilities:

- Edit only the files listed in the active task's `allowed_files`.
- Do not revert unrelated dirty files.
- Run the task's focused verification commands.
- Return changed files, commands, failures, and open risks in the receipt.
- Update plan/docs/board receipts when the slice changes expected behavior or reveals blockers.
- If assigned a Worker slice, complete the full slice unless a hard stop applies; do not return only scaffolding or partial implementation.
- When blocked, document incomplete work and next safe action in the receipt.

Judge responsibilities:

- Validate plan conformance before major execution starts.
- Review code after implementation slices and before final completion.
- Reject completion if secret values leak, raw tokens are requested, route responses expose secrets, `.env.local` writes remain in configure flow, or the diff includes excluded UI/wizard/gateway files.
- Reject completion if plan docs, reference docs, or GoalBuddy receipts are stale.
- Reject completion if any approved Phase 1 work remains incomplete without an explicit blocker receipt.

Parallelization rules:

- Parallel Workers are allowed only when their `allowed_files` sets are disjoint.
- Do not parallelize tasks that touch `lib/providers/index.ts`, `lib/providers/types.ts`, or shared router tests at the same time.
- Scout and Judge read-only tasks may run in parallel with non-overlapping Worker implementation only after the board has an approved active task.

## Current Source Facts

Current call path:

- App and CLI routes call `resolveProviderConfig()`.
- They pass the result to `createLLMClient(config)`.
- Pipeline modules accept the resulting `LLMClient`.
- Current `LLMClient` only exposes `complete(prompt, options)` and `provider`.

Current risk:

- `ProviderConfig.apiKey` is treated as the normal secret field.
- Dirty `config-store.ts` writes API key material into `~/.skill-mall/config.json`.
- Dirty app configure route writes `.env.local` and mutates `process.env`.
- Existing provider IDs are narrow: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, `ollama`.

## File Map

Create:

- `db/migrations/006_llm_router_core.sql`
  - Adds local ledger/config/model/pricing/routing tables.
- `lib/llm/router/types.ts`
  - Defines auth modes, secret refs, route config, request ledger records, and router result metadata.
- `lib/llm/router/secret-refs.ts`
  - Normalizes secret references and prevents raw secret values from leaving config helpers.
- `lib/llm/router/config.ts`
  - Resolves non-secret router/provider config from env and `~/.skill-mall/config.json`.
- `lib/llm/router/request-ledger.ts`
  - Writes request and request-event rows to SQLite.
- `lib/llm/router/create-client.ts`
  - Wraps existing direct `LLMClient` instances and records request metadata.
- `lib/llm/router/__tests__/config.test.ts`
  - Tests config resolution, auth modes, and secret redaction.
- `lib/llm/router/__tests__/request-ledger.test.ts`
  - Tests ledger inserts and failure events.
- `lib/llm/router/__tests__/create-client.test.ts`
  - Tests compatibility with current `LLMClient.complete()`.

Modify:

- `lib/providers/types.ts`
  - Add compatibility-friendly fields without breaking existing direct clients.
- `lib/providers/index.ts`
  - Delegate resolution/client creation to router core while preserving exported names.
- `lib/providers/config-store.ts`
  - Stop writing raw `apiKey`; write auth mode and secret refs only.
- `lib/providers/__tests__/config-resolution.test.ts`
  - Update expectations for auth-mode config.
- `lib/providers/__tests__/providers.test.ts`
  - Ensure existing direct clients still construct.
- `cli/src/commands/configure.ts`
  - Stop writing raw `apiKey` to JSON; support env-var secret refs for Phase 1.
- `app/api/providers/route.ts`
  - Return sanitized provider/router status only.
- `app/api/providers/configure/route.ts`
  - Remove `.env.local` write behavior; store non-secret config refs only.
- `docs/reference/provider-catalog.md`
  - Mark old API-key-only config as superseded by router auth modes.
- `docs/reference/database-schema.md`
  - Document new local ledger/config tables.

Do not modify in Phase 1:

- `app/settings/providers/page.tsx`
- Skill creation wizard files.
- Any GoModel/Bifrost/LiteLLM/new-api code.
- Any generated `.env.local`.

## Phase 1 Runtime Boundaries

Phase 1 is a direct-client compatibility layer. It does not implement gateway routing, routing-policy evaluation, hosted routing, local sidecar management, or OAuth/device-login automation.

Allowed Phase 1 auth modes:

- `env_key` - API access through an environment variable reference such as `OPENAI_API_KEY`; SkillMall stores the variable name, not the secret value.
- `local_cli_session` - official local CLI/session access where the provider tool owns credentials, such as Claude Code; SkillMall does not copy credential files.
- `none_local` - local runtimes that do not require a credential, such as default Ollama.

Reserved future auth modes, not to be implemented in Phase 1:

- Raw `api_key` storage.
- `keychain_ref`
- `gateway_virtual_key`
- `codex_session`
- `oauth_device_flow`
- `file_ref`

Phase 1 gateway backend:

- The only executable backend is `direct`.
- `gomodel`, `bifrost`, `external_openai_compatible`, and any gateway/sidecar backend are reserved for later phases and must not appear in Phase 1 runtime config, tests as enabled behavior, or API responses except as future documentation.

Phase 1 routing policy:

- Routing-policy storage is schema-only in Phase 1.
- Runtime policy evaluation is not implemented in Phase 1.
- The only allowed Phase 1 routing-policy mode is `manual`.
- `local_first`, `fallback_chain`, `cheapest_compatible`, and `quality_first` are future modes and must not be implemented or tested as active behavior in Phase 1.

## Data Model

Migration `006_llm_router_core.sql` must add:

```sql
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
  CHECK (auth_mode IN (
    'env_key',
    'local_cli_session',
    'none_local'
  )),
  CHECK (secret_ref_type IS NULL OR secret_ref_type IN ('env', 'none')),
  CHECK (gateway_backend IS NULL OR gateway_backend IN ('direct')),
  CHECK (
    (auth_mode = 'env_key' AND secret_ref_type = 'env' AND secret_ref IS NOT NULL AND length(secret_ref) > 0)
    OR (auth_mode IN ('local_cli_session', 'none_local') AND (secret_ref_type IS NULL OR secret_ref_type = 'none') AND secret_ref IS NULL)
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
```

## Public Type Contract

Router auth modes:

```ts
export type LLMAuthMode =
  | 'env_key'
  | 'local_cli_session'
  | 'none_local'

export type SecretRefType = 'env' | 'none'

export type SecretRef =
  | { type: 'env'; name: string }
  | { type: 'none' }

export interface RouterProviderConfig {
  provider: string
  model: string
  authMode: LLMAuthMode
  secretRef?: SecretRef
  baseURL?: string
  gatewayBackend?: 'direct'
  routingPolicyId?: string
}
```

Compatibility rule:

- Keep `ProviderConfig` and `LLMClient` exports available from `lib/providers`.
- Existing callers must not change in Phase 1.
- `createLLMClient(config)` must return a wrapper that still satisfies `LLMClient`.
- The wrapper records ledger rows and delegates to the current direct client implementation.
- Do not add runtime routing-policy selection in Phase 1.
- Do not add gateway backend selection in Phase 1.

## GoalBuddy Board

Implementation is tracked in:

- `docs/goals/provider-auth-router-phase1/goal.md`
- `docs/goals/provider-auth-router-phase1/state.yaml`

The board is approval-gated. Creating the board does not approve code implementation.

## Tasks

### Task 1: Approval Gate And Source Revalidation

**Role:** Judge

**Files:**

- Read only.

- [ ] Confirm the user has approved Phase 1 implementation.
- [ ] Re-read `AGENTS.md`, both recovery inputs, this plan, and current source touchpoints.
- [ ] Record branch, dirty status, staged status, and excluded dirty files.
- [ ] Confirm no task requires excluded UI/wizard/gateway files.
- [ ] Confirm the GoalBuddy board matches this plan.
- [ ] Confirm the board requires complete work, blocker documentation, incomplete-work documentation, review fixes, final verification, and docs updates.
- [ ] Confirm native `/goal` readiness or document Codex-thread PM fallback.
- [ ] Confirm Phase 1 auth modes are limited to `env_key`, `local_cli_session`, and `none_local`.
- [ ] Confirm Phase 1 gateway backend is limited to `direct`.
- [ ] Confirm routing-policy evaluation is not in scope.

Run:

```bash
git branch --show-current
git status --short
git diff --cached --name-only
npx goalbuddy@0.3.7 doctor --target codex --goal-ready --json
```

Expected:

- Implementation starts only after approval.
- Staged diff is empty unless the user has explicitly staged something.

### Task 2: Add Router Types And Secret References

**Files:**

- Create: `lib/llm/router/types.ts`
- Create: `lib/llm/router/secret-refs.ts`
- Create: `lib/llm/router/__tests__/config.test.ts`

- [ ] Add router auth-mode and provider-config types.
- [ ] Add `sanitizeSecretRef()` that returns only `{ type, name }`.
- [ ] Add `resolveEnvSecret(name)` helper that reads `process.env[name]` but never returns the env value in status objects.
- [ ] Test that `sanitizeSecretRef({ type: 'env', name: 'OPENAI_API_KEY' })` returns the variable name only.
- [ ] Test that invalid secret refs throw a useful error.
- [ ] Test that unsupported Phase 1 auth modes such as `api_key`, `keychain_ref`, `codex_session`, `oauth_device_flow`, and `gateway_virtual_key` are rejected.
- [ ] Test that unsupported gateway backends such as `gomodel`, `bifrost`, and `external_openai_compatible` are rejected.
- [ ] Test that `env_key` requires `secretRef.type = 'env'` and a non-empty env-var name.
- [ ] Test that `local_cli_session` and `none_local` reject secret values.

Run:

```bash
npm test -- lib/llm/router/__tests__/config.test.ts
```

Expected:

- Fails before implementation.
- Passes after types/helpers exist.

### Task 3: Add SQLite Router Ledger Migration

**Files:**

- Create: `db/migrations/006_llm_router_core.sql`
- Create: `lib/llm/router/__tests__/request-ledger.test.ts`

- [ ] Add the SQL migration exactly under `db/migrations/006_llm_router_core.sql`.
- [ ] Write a test that calls `getDb()` and asserts all new tables exist.
- [ ] Write a test that inserts one `llm_requests` row and one `llm_request_events` row.
- [ ] Write a test that `auth_mode = 'raw_token'` fails the check constraint.
- [ ] Write a test that reserved future auth modes fail the Phase 1 check constraint.
- [ ] Write a test that non-`direct` gateway backend values fail the Phase 1 check constraint.
- [ ] Write a test that non-`manual` routing-policy modes fail the Phase 1 check constraint.
- [ ] Write a test that `env_key` without an env secret ref fails the check constraint.
- [ ] Write a test that `local_cli_session` or `none_local` with a secret ref fails the check constraint.
- [ ] Write a test that `llm_requests.route_backend != 'direct'` fails the check constraint.
- [ ] Write a test that `llm_requests.auth_mode` outside Phase 1 modes fails the check constraint.

Run:

```bash
npm test -- lib/llm/router/__tests__/request-ledger.test.ts
```

Expected:

- New migration applies through existing `getDb()` migration runner.
- Constraint test fails for unsupported auth modes.

### Task 4: Implement Request Ledger Helpers

**Files:**

- Create: `lib/llm/router/request-ledger.ts`
- Modify: `lib/llm/router/__tests__/request-ledger.test.ts`

- [ ] Add `startLLMRequest(input)` that inserts `status = 'started'`.
- [ ] Add `finishLLMRequest(input)` that updates status, completion time, latency, tokens, cost, and error.
- [ ] Add `recordLLMRequestEvent(input)` for fallback/retry/error metadata.
- [ ] Ensure metadata is JSON-stringified through a helper and never stores prompt/response text by default.
- [ ] Test success lifecycle: `started` -> `succeeded`.
- [ ] Test failure lifecycle: `started` -> `failed` with `error_code`.
- [ ] Test that metadata can store operation context without prompt body.

Run:

```bash
npm test -- lib/llm/router/__tests__/request-ledger.test.ts
```

Expected:

- Request and event rows are written.
- No prompt or completion body is required to log a request.

### Task 5: Add Router Config Resolution

**Files:**

- Create: `lib/llm/router/config.ts`
- Modify: `lib/providers/config-store.ts`
- Modify: `lib/providers/__tests__/config-resolution.test.ts`
- Modify: `cli/src/commands/configure.ts`

- [ ] Define config-file shape with provider, model, auth mode, secret refs, base URL, gateway backend, and routing policy ID.
- [ ] Preserve env precedence for `SKILL_MALL_PROVIDER` and `SKILL_MALL_MODEL`.
- [ ] Map `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and `GROQ_API_KEY` to `authMode = 'env_key'` with `secretRef.name` set to the env var name.
- [ ] Map `claude-code` to `authMode = 'local_cli_session'`.
- [ ] Map `ollama` to `authMode = 'none_local'`.
- [ ] Reject reserved future auth modes in Phase 1 config resolution.
- [ ] Reject non-`direct` gateway backends in Phase 1 config resolution.
- [ ] Do not evaluate or apply routing policies in Phase 1.
- [ ] Stop `writeProviderConfig()` from writing raw `apiKey`.
- [ ] Update CLI non-interactive configure so `--key-env OPENAI_API_KEY` is accepted, while `--key sk-...` is not written to config.
- [ ] Add a test that raw `apiKey` in an old config is ignored or migrated to a redacted warning shape.
- [ ] Add a test that returned provider status never includes secret values.

Run:

```bash
npm test -- lib/providers/__tests__/config-resolution.test.ts lib/llm/router/__tests__/config.test.ts
```

Expected:

- Config resolution returns auth mode and secret ref.
- No raw secret value appears in returned status/config objects.

### Task 6: Add Router-Compatible Client Wrapper

**Files:**

- Create: `lib/llm/router/create-client.ts`
- Create: `lib/llm/router/__tests__/create-client.test.ts`
- Modify: `lib/providers/index.ts`
- Modify: `lib/providers/types.ts`
- Modify: `lib/providers/__tests__/providers.test.ts`

- [ ] Add `createRouterLLMClient(config, directFactory)` that returns `LLMClient`.
- [ ] The wrapper must call the current direct provider client.
- [ ] The wrapper must log a started request before `complete()`.
- [ ] The wrapper must log succeeded request after `complete()`.
- [ ] The wrapper must log failed request on thrown error.
- [ ] Add `operation` metadata that defaults to `unknown` when callers do not provide it.
- [ ] Preserve `readonly provider`.
- [ ] Keep existing direct provider construction tests passing.

Run:

```bash
npm test -- lib/llm/router/__tests__/create-client.test.ts lib/providers/__tests__/providers.test.ts
```

Expected:

- Existing clients still construct.
- Wrapper logs success and failure lifecycle.

### Task 7: Sanitize Provider API Routes

**Files:**

- Modify: `app/api/providers/route.ts`
- Modify: `app/api/providers/configure/route.ts`
- Create: `app/api/providers/__tests__/providers-route.test.ts`
- Create a focused route-contract test if no existing provider route harness exists.
- Read first: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`

- [ ] `GET /api/providers` must return configured status, provider, model, auth mode, gateway backend, and secret ref display name only.
- [ ] `GET /api/providers` must not return raw secret values.
- [ ] `POST /api/providers/configure` must not write `.env.local`.
- [ ] `POST /api/providers/configure` must not mutate `process.env`.
- [ ] `POST /api/providers/configure` must accept provider/model/auth mode/secret ref only.
- [ ] Invalid auth-mode/provider combinations must return 400.
- [ ] Non-`direct` gateway backends must return 400 in Phase 1.
- [ ] Reserved future auth modes must return 400 in Phase 1.
- [ ] Tests must cover the configure route contract; do not skip route tests because no harness already exists.
- [ ] Before editing app routes, read the local Next.js route-handler docs and record that in the task receipt.

Run:

```bash
npm test -- lib/providers/__tests__/config-resolution.test.ts
npm test -- lib/llm/router/__tests__/config.test.ts
npm test -- app/api/providers
```

Expected:

- Config APIs use the same safe config-store behavior as CLI.

### Task 8: Update Docs For Phase 1 Behavior

**Files:**

- Modify: `docs/reference/provider-catalog.md`
- Modify: `docs/reference/database-schema.md`
- Modify: `docs/reference/api-routes.md`

- [ ] Document auth modes.
- [ ] Document that API access is separate from subscription/tool-session auth.
- [ ] Document that config stores secret references, not raw secrets.
- [ ] Document new SQLite tables.
- [ ] Mark gateway sidecar validation as future Phase 2, not Phase 1.
- [ ] Document that Phase 1 only supports `env_key`, `local_cli_session`, `none_local`, `direct`, and manual routing metadata.
- [ ] Document reserved future auth modes/gateway backends as not implemented.
- [ ] If any reference doc does not require content changes, document the no-change reason in the receipt.

Run:

```bash
rg -n "apiKey|\\.env.local|gateway sidecar|GoModel|Bifrost|codex_session|oauth_device_flow|keychain_ref|gateway_virtual_key|fallback_chain|cheapest_compatible|quality_first" docs/reference/provider-catalog.md docs/reference/database-schema.md docs/reference/api-routes.md
```

Expected:

- No docs describe `.env.local` writes as the primary app configure path.
- GoModel/Bifrost are described only as future validation, if mentioned.
- Reserved auth/routing/gateway terms are described only as not implemented or future phase, if mentioned.

### Task 9: Code Review

**Role:** Judge

**Files:**

- Read only.

- [ ] Review full diff for scope containment.
- [ ] Review auth mode and secret-ref handling.
- [ ] Review that Phase 1 auth modes are limited to `env_key`, `local_cli_session`, and `none_local`.
- [ ] Review that gateway backend is limited to `direct`.
- [ ] Review that routing-policy evaluation was not implemented.
- [ ] Review API routes for secret redaction and no `.env.local` writes.
- [ ] Review ledger schema and helpers for prompt/response body avoidance.
- [ ] Review compatibility with existing `resolveProviderConfig()` and `createLLMClient()` callers.
- [ ] Review tests and docs.
- [ ] Review whether implementation docs and GoalBuddy receipts match actual behavior.
- [ ] Review whether any approved Phase 1 task remains partially complete.
- [ ] Review reserved-term scan hits and classify each as `negative test`, `future/not implemented docs`, or `drift`.
- [ ] Produce findings ordered by severity, with file/line references.
- [ ] If findings exist, create/update the review-fix task receipt with explicit allowed files.
- [ ] If no findings exist, explicitly record `ready_for_final_verification` so final verification can run without review-fix allowed files.

Run:

```bash
git diff --name-only
git diff --stat
git diff
```

Expected:

- Completion is blocked until Judge findings are fixed or explicitly accepted by the user.
- Completion is blocked if any incomplete work lacks a blocker and next-action receipt.

### Task 10: Review Fixes And Final Verification For Phase 1

**Files:**

- Only files explicitly named by Judge review findings, unless T710 records `ready_for_final_verification` with no fixes needed. In that case, T10 is verification-only and must not edit files.

T710 review-fix scope recorded during execution:

- `vitest.config.ts` was added to the bounded fix set because `app/api/providers/__tests__/providers-route.test.ts` existed but the repo test include pattern excluded `app/**/*.test.ts`, causing `npm test -- app/api/providers` to report no tests.
- `lib/providers/catalog.ts` was added to the bounded fix set because `GET /api/providers` returns the fallback catalog and the catalog still described raw API-key pasting instead of Phase 1 env secret references.
- User/developer provider setup docs were added to the bounded fix set because they still documented `--key`, raw `apiKey` JSON, or `.env.local` provider writes after Phase 1 changed CLI/API configure behavior.
- Phase 1 tests were added to the bounded fix set to replace fake `sk-`-shaped fixtures with non-secret placeholder strings before final secret-scan classification.

- [ ] Run focused router/provider tests.
- [ ] Run full Vitest suite; if blocked, document exact blocker command/output.
- [ ] Run TypeScript check.
- [ ] Run lint; if blocked, document exact blocker command/output.
- [ ] Run `git diff --name-only` and confirm no UI/wizard/gateway sidecar files changed.
- [ ] Confirm no raw secrets are present in created tests or docs.
- [ ] Confirm no gateway execution, routing-policy evaluation, raw API-key storage, keychain/file-ref support, Codex OAuth automation, or Claude/Codex credential-file reading was implemented.
- [ ] Classify reserved-term scan hits as `negative test`, `future/not implemented docs`, or `drift`; any `drift` hit blocks completion.
- [ ] Update GoalBuddy receipts with pass/fail evidence.
- [ ] Update docs if review fixes changed behavior.
- [ ] Update this implementation plan if actual approved implementation differs from the plan.
- [ ] Document any incomplete work and why it was not completed.
- [ ] Document any blockers with exact command/evidence and next safe action.
- [ ] Confirm no approved safe local Phase 1 work remains queued.
- [ ] Leave staging/commit/push untouched unless the user explicitly approves them.

Commands:

```bash
npm test -- lib/llm/router lib/providers
npm test
npx tsc --noEmit
npm run lint
git diff --name-only
rg -n "sk-[A-Za-z0-9]|apiKey.*sk-|ANTHROPIC_AUTH_TOKEN=.*|CLAUDE_CODE_OAUTH_TOKEN=.*" .
rg -n "gomodel|bifrost|external_openai_compatible|gateway_virtual_key|codex_session|oauth_device_flow|keychain_ref|file_ref|fallback_chain|cheapest_compatible|quality_first" lib app cli db docs/reference
```

Expected:

- Focused tests pass.
- Full tests pass or any unrelated pre-existing failures are documented.
- Typecheck and lint pass or blockers are documented with exact commands.
- Diff does not include excluded files.
- Secret scan finds no real secret values.
- Gateway/auth/routing reserved-term scan finds no implemented Phase 1 behavior; any mention is clearly future/not implemented.
- GoalBuddy receipts and docs are current.
- Any incomplete work is explicitly documented with blocker evidence and next action.
- No partial-work handoff is presented as complete.

## Hard Stops

Stop implementation and report back if any of these occur:

- A task requires changing `app/settings/providers/page.tsx`.
- A task requires adding or starting GoModel, Bifrost, LiteLLM, new-api, or any other gateway.
- A task requires asking users to paste raw ChatGPT/Claude browser/session tokens.
- A task requires writing `.env.local`.
- A task requires storing raw API keys in `~/.skill-mall/config.json`.
- A task requires staging, committing, or pushing without explicit user approval.
- A task requires reverting unrelated dirty files.

## Approval Decision

Approve Phase 1 if this is the intended first implementation slice:

- Router facade and ledger first.
- Secret references instead of raw secrets.
- Existing provider call sites preserved.
- Existing direct provider clients preserved.
- No gateway sidecar.
- No Provider Center redesign yet.
- No many-repo spike.
