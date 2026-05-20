# Provider/Auth Router Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend SkillMall's Phase 1 provider/auth router into a local gateway-aware provider system with model refresh, routing policy evaluation, usage/cost attribution, and a selected OSS gateway adapter path, without adding a hosted paid dependency or a duplicate gateway product.

**Architecture:** Phase 2 keeps SkillMall's native router as the product contract and treats OSS gateways as possible local execution backends behind that contract. Direct provider execution remains supported. The selected gateway path must integrate through SkillMall-owned auth modes, secret references, model/pricing cache, request ledger, and sanitized provider APIs rather than replacing them with an external dashboard.

**Tech Stack:** TypeScript, Next.js 16 app routes, Node CLI, Vitest, better-sqlite3, existing `lib/providers/*`, existing `lib/llm/router/*`, local/self-hosted OSS gateway candidate only after decision gate.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Branch:** `codex/agent-operating-contract-auth-token-skill`

**Implementation status:** Completed locally on 2026-05-20. Receipts and final verification live in `docs/goals/provider-auth-router-phase2/state.yaml`; no staging, commit, push, or PR was performed in the implementation run.

---

## Approval Scope

This plan is for approval before Phase 2 implementation. Creating this document and its GoalBuddy board does not approve code implementation.

Do not implement, cleanup, stage, commit, or push as part of creating or reviewing this plan.

Phase 2 includes:

- SkillMall-native gateway adapter contract behind the existing router call surface.
- Model-list refresh infrastructure for configured providers.
- Pricing snapshot refresh and local cost-estimation plumbing.
- Runtime routing-policy evaluation for approved local modes.
- Gateway virtual-key/auth reference support where it protects upstream API keys.
- Bounded adapter spike and implementation for the selected OSS/local gateway path.
- Provider API/CLI/docs updates that expose sanitized gateway/model/cost status.
- Tests, lint/typecheck gates, code review, review fixes, docs, blocker reporting, and final verification.

Phase 2 excludes:

- Hosted gateway/router/observability services as required SkillMall infrastructure.
- A duplicate external dashboard as the product settings surface.
- Broad Provider Center UI redesign beyond API/CLI/status support required by this phase.
- Raw ChatGPT browser/session token handling.
- Raw Claude.ai OAuth token handling outside official Claude Code/tooling flows.
- Copying Claude Code credential files or Codex credential files into SkillMall config.
- Implementing every candidate gateway.
- Vendoring or copying OSS code before license, dependency, and security review.
- Staging, committing, pushing, or opening a PR without explicit user approval.

## Current Source Facts

Phase 1 currently provides the local contract that Phase 2 must preserve:

- `lib/llm/router/types.ts` defines `LLMAuthMode`, `GatewayBackend`, `SecretRef`, `RouterProviderConfig`, and ledger input types.
- `lib/llm/router/config.ts` resolves provider config from env/config. Phase 2 allows `gateway_virtual_key` and `bifrost_local` after the T803 Bifrost decision.
- `lib/llm/router/create-client.ts` wraps direct clients and records local request lifecycle rows.
- `lib/llm/router/request-ledger.ts` writes request/event rows and scrubs prompt/response-shaped metadata by default.
- `lib/providers/index.ts` still exposes `resolveProviderConfig()` and `createLLMClient(config)`.
- `lib/providers/types.ts` still defines the narrow `ProviderID` union and the compatibility `LLMClient.complete()` interface.
- `docs/reference/provider-catalog.md` documents direct provider access plus the Phase 2 local Bifrost gateway boundary.
- `docs/reference/database-schema.md` documents Phase 2 router tables with `direct`/`bifrost_local`, gateway virtual-key refs, approved routing modes, model refresh, and pricing snapshots.

Phase 2 must not break the compatibility surface:

```text
resolveProviderConfig() -> createLLMClient(config) -> LLMClient.complete(prompt, options)
```

Phase 2 may extend the internals behind that surface, but app and pipeline call sites must continue to work until a later approved refactor replaces the public interface.

## Research Refresh

Current maintainer-source evidence checked for Phase 2 planning:

| Candidate | Current evidence | Phase 2 disposition |
| --- | --- | --- |
| LiteLLM | Maintainer repo describes an open-source AI gateway for 100+ LLMs, self-hosted, OpenAI-format calls, virtual keys, spend tracking, guardrails, load balancing, and admin dashboard. | Serious reference and possible user-managed connector. Not the default integration unless the spike proves the Python/service footprint is acceptable and the dashboard can be kept subordinate to SkillMall. |
| Bifrost | Maintainer repo/docs describe a Go/OpenAI-compatible gateway with multi-provider support, local `npx`/Docker startup, budget management, observability, Vault support, model catalog, pricing sync, and custom pricing. | Primary local gateway spike candidate because it is local/self-hostable, Apache-2.0, Go-centered, model/pricing aware, and closer to a lightweight infrastructure service than a full reseller product. |
| TensorZero | Maintainer docs/repo describe an open-source LLMOps platform with gateway, observability, evaluation, optimization, experimentation, provider integrations, and OpenAI SDK compatibility. | Architecture/reference candidate. Too broad for default Phase 2 unless the spike proves a minimal gateway-only adoption path without requiring its full LLMOps stack. |
| Portkey Gateway | Maintainer repo/docs describe an open-source gateway runnable locally with `npx`, routing, fallbacks, load balancing, guardrails, and broad model support. | Possible external connector/reference. Risk: hosted/enterprise posture and console overlap. Must not become required hosted Portkey. |
| QuantumNous/new-api | Maintainer repo/docs describe a next-generation LLM gateway/AI asset platform, AGPL-3.0, OpenAI/Claude/Gemini conversion, routing, cost accounting, quota, auth, and full admin/product surface. | Reject as default dependency for Phase 2 because AGPL/full-product overlap creates integration and product-control risk. Keep as reference for provider/channel/cost UX only. |
| labring/aiproxy | Maintainer repo describes an OpenAI/Claude/Gemini protocol gateway with multi-tenant management, monitoring, billing, quotas, Redis/Postgres options, and management panel. | Strong reference, not default Phase 2 backend unless Bifrost fails and the full control-plane footprint is acceptable. |
| GoModel | Maintainer repo describes an MIT Go gateway with OpenAI-compatible API, provider breadth including DeepSeek/Z.ai/xAI/OpenRouter/Azure/Ollama/vLLM/Bedrock, `/v1/models`, usage endpoints, admin endpoints, caching, and logging. | Strong fallback/local spike candidate. Needs maturity review and secret/logging defaults review because examples include body/header logging flags. |
| GPT-Load | Maintainer repo describes a Go transparent proxy with native API preservation, key rotation, load balancing, monitoring, and OpenAI/Gemini/Anthropic support. | Reference for key-pool/load-balancing mechanics. Not first choice because transparent native proxying is less aligned with SkillMall-owned normalized router behavior. |

Phase 2 decision from this research:

1. Do not implement a many-gateway bakeoff.
2. Keep SkillMall-native router/ledger/model/pricing contract as the product-owned layer.
3. Spike exactly two local gateway backends at most:
   - Primary: Bifrost.
   - Fallback: GoModel.
4. Reject default adoption of new-api for Phase 2 because AGPL/full-product overlap is a known blocker.
5. Use LiteLLM, TensorZero, Portkey, labring/aiproxy, and GPT-Load as references unless a Judge explicitly promotes one due a documented Bifrost/GoModel blocker.

## T803 Gateway Decision

Decision after current-source and maintainer-source revalidation: select `bifrost_local` as the Phase 2 gateway backend.

Bifrost wins the Phase 2 adapter path because the current maintainer evidence shows Apache-2.0 licensing, local `npx`/Docker execution, an OpenAI-compatible gateway surface, broad provider support, model catalog support, pricing synchronization, custom pricing, budget controls, virtual-key governance, and provider key references through environment values. That combination fits SkillMall's Phase 2 need better than a full product/admin platform or a gateway with weaker pricing/model catalog evidence.

Adoption constraints:

- SkillMall remains the provider/auth/model/pricing/router source of truth.
- Bifrost is a local backend selected by SkillMall configuration, not a required hosted service.
- Bifrost's built-in UI/control plane may be used only as an operator/debug surface during local development; it must not replace SkillMall's settings, ledger, or docs.
- SkillMall must pass credential references and local gateway virtual-key references, not raw provider secrets through feature code or public API responses.
- SkillMall must continue recording its own request ledger and exact-versus-estimated cost labels even when Bifrost reports usage/cost data.

Rejected/default-deferred:

- `new-api`: rejected as the default dependency due AGPL/full-product/control-plane overlap.
- `gomodel_local`: fallback only; it is locally viable and MIT, but Bifrost has stronger current model/pricing catalog evidence and GoModel's examples around empty master keys plus body/header logging require additional safeguards.
- LiteLLM, TensorZero, Portkey Gateway, labring/aiproxy, and GPT-Load: reference only unless Bifrost is blocked and a Judge promotes one with current source-backed evidence.

## Phase 2 Architecture

Phase 2 introduces a layered contract:

```text
Feature/Pipeline code
  -> createLLMClient(config)
  -> SkillMall router runtime
  -> route policy evaluator
  -> direct provider backend OR local gateway adapter backend
  -> provider/gateway outbound call
  -> request ledger + model/pricing cache + sanitized status APIs
```

SkillMall owns:

- Provider registry.
- Auth-mode labels and secret-reference model.
- User-visible provider/gateway configuration.
- Model refresh schedule and cached model metadata.
- Pricing snapshot storage and estimated/exact cost labels.
- Routing-policy evaluation.
- Request ledger and feature/pipeline attribution.
- Sanitized status surfaces.

Gateway backend owns only:

- Final outbound provider request normalization when selected.
- Upstream API key isolation when configured through a gateway virtual key.
- Provider failover/load balancing only when explicitly selected by SkillMall policy.
- Provider usage/cost metadata if it exposes reliable fields.

The gateway must not own:

- SkillMall's provider settings UX.
- SkillMall's local request ledger as the only source of truth.
- Raw user-visible secrets.
- Hosted telemetry.
- A required paid account.
- Completion proof for the phase.

## New Runtime Concepts

Phase 2 may add these executable values after tests and docs:

Auth modes:

- Existing: `env_key`, `local_cli_session`, `none_local`.
- New: `gateway_virtual_key`, for local gateway bearer keys that protect upstream provider keys.
- Reserved but still not implemented unless official docs prove exact support: `codex_session`, `oauth_device_flow`, `keychain_ref`, `file_ref`.

Secret reference types:

- Existing: `env`, `none`.
- New: `gateway_virtual_key_ref`, stored as an env var reference or future keychain reference. The raw virtual key must not be returned by API routes.

Gateway backends:

- Existing: `direct`.
- New selected backend: `bifrost_local`.
- Deferred fallback backend: `gomodel_local`, not implemented unless Bifrost is blocked and a Judge promotes it.
- Deferred generic backend: `external_openai_compatible`, not implemented in Phase 2.

Routing policies:

- Existing: `manual`.
- New after tests:
  - `fallback_chain`
  - `local_first`
  - `budget_guarded_manual`
- Do not implement `cheapest_compatible` until pricing refresh coverage and capability matching are proven.
- Do not implement `quality_first` until there is a real evaluation signal.

## File Map

Likely creates:

- `lib/llm/router/gateway-adapter.ts`
  - Defines the adapter interface and normalized gateway request/response metadata.
- `lib/llm/router/gateway-client.ts`
  - Creates selected gateway clients and keeps direct mode intact.
- `lib/llm/router/routing-policy.ts`
  - Evaluates approved runtime routing policies.
- `lib/llm/router/model-refresh.ts`
  - Refreshes model lists for direct providers and selected gateway backend.
- `lib/llm/router/pricing-refresh.ts`
  - Fetches/stores pricing snapshots and marks exact versus estimated costs.
- `lib/llm/router/costing.ts`
  - Calculates ledger costs from provider usage and pricing snapshots.
- `lib/llm/router/__tests__/gateway-adapter.test.ts`
- `lib/llm/router/__tests__/routing-policy.test.ts`
- `lib/llm/router/__tests__/model-refresh.test.ts`
- `lib/llm/router/__tests__/pricing-refresh.test.ts`
- `lib/llm/router/__tests__/costing.test.ts`
- `db/migrations/007_llm_router_phase2.sql`
  - Extends constraints/tables for approved Phase 2 modes without weakening Phase 1 guarantees.

Likely modifies:

- `lib/llm/router/types.ts`
- `lib/llm/router/secret-refs.ts`
- `lib/llm/router/config.ts`
- `lib/llm/router/create-client.ts`
- `lib/llm/router/request-ledger.ts`
- `lib/providers/types.ts`
- `lib/providers/index.ts`
- `lib/providers/catalog.ts`
- `lib/providers/defaults.ts`
- `lib/providers/config-store.ts`
- `app/api/providers/route.ts`
- `app/api/providers/configure/route.ts`
- `cli/src/commands/configure.ts`
- `docs/reference/provider-catalog.md`
- `docs/reference/database-schema.md`
- `docs/recovery/2026-05-20-provider-auth-router-phase-2-implementation-plan.md`
- `docs/goals/provider-auth-router-phase2/state.yaml`

Do not modify without explicit separate approval:

- `app/settings/providers/page.tsx`
- Skill creation wizard files.
- Preview/wizard stash content.
- Any hosted gateway account configuration.
- Any credential files under `~/.codex`, `~/.claude`, or provider-owned directories.

## Implementation Tasks

### Task 1: Approval, Branch, and Scope Gate

**Files:**

- Modify only `docs/goals/provider-auth-router-phase2/state.yaml` for receipt updates.

- [ ] Record `git branch --show-current`.
- [ ] Record `git status --short`.
- [ ] Record `git diff --cached --name-only`.
- [ ] Confirm the user approved implementation after this plan.
- [ ] Confirm Phase 1 PR state and whether this branch should continue or a new branch should be created.
- [ ] Confirm preserved preview/wizard stash remains out of scope.
- [ ] Stop if implementation is not approved.

### Task 2: Scout Current Source and Gateway Evidence

**Files:**

- Modify only `docs/goals/provider-auth-router-phase2/state.yaml` for receipt updates.

- [ ] Read current `lib/llm/router/*`, `lib/providers/*`, `app/api/providers/*`, `cli/src/commands/configure.ts`, and database migration docs.
- [ ] Recheck current maintainer docs/repos for Bifrost and GoModel before code work.
- [ ] Recheck LiteLLM, TensorZero, Portkey, new-api, labring/aiproxy, and GPT-Load only for hard blockers or promotion evidence.
- [ ] Record exact license, runtime, dependency, model-list, pricing/cost, auth, logging, and local-running evidence.
- [ ] Stop if no candidate can satisfy local/no-hosted/no-duplicate-product constraints.

### Task 3: Judge Gateway Selection

**Files:**

- Modify `docs/goals/provider-auth-router-phase2/state.yaml`.
- Modify `docs/recovery/2026-05-20-provider-auth-router-phase-2-implementation-plan.md` only if source evidence changes the approved plan.

- [ ] Apply hard reject criteria:
  - Hosted account required for core use.
  - Extra paid gateway required.
  - License incompatible with intended integration.
  - Requires duplicate dashboard as source of truth.
  - Requires raw credential copying.
  - Logs prompts/responses/secrets by default without a safe default override.
  - Cannot run locally from source/container without external SaaS.
  - Cannot integrate through OpenAI-compatible or clearly bounded adapter surface.
- [ ] Select `bifrost_local`, `gomodel_local`, or `no_gateway_backend_yet`.
- [ ] If `no_gateway_backend_yet`, convert Phase 2 into internal router/model/pricing/cost implementation only and document the blocker.

### Task 4: Router Type and Migration Contract

**Files:**

- Modify `lib/llm/router/types.ts`.
- Modify `lib/llm/router/secret-refs.ts`.
- Modify `db/migrations/007_llm_router_phase2.sql`.
- Test `lib/llm/router/__tests__/config.test.ts`.
- Test `lib/llm/router/__tests__/gateway-adapter.test.ts`.

- [ ] Write failing tests for new executable auth/backend/policy values.
- [ ] Add only the values approved by Task 3.
- [ ] Keep reserved auth modes rejected unless separately approved by official-doc evidence.
- [ ] Update migration constraints without allowing raw secret storage.
- [ ] Run focused tests.

### Task 5: Gateway Adapter Contract

**Files:**

- Create `lib/llm/router/gateway-adapter.ts`.
- Create `lib/llm/router/gateway-client.ts`.
- Modify `lib/llm/router/create-client.ts`.
- Test `lib/llm/router/__tests__/gateway-adapter.test.ts`.
- Test `lib/llm/router/__tests__/create-client.test.ts`.

- [ ] Write tests proving direct backend remains unchanged.
- [ ] Write tests proving the selected gateway backend sends normalized requests without exposing raw secrets in metadata.
- [ ] Implement the smallest gateway adapter that satisfies `LLMClient.complete()`.
- [ ] Capture provider/model/usage/cost metadata when available.
- [ ] Run focused tests.

### Task 6: Model Refresh

**Files:**

- Create `lib/llm/router/model-refresh.ts`.
- Modify `lib/providers/catalog.ts`.
- Modify `lib/providers/defaults.ts`.
- Test `lib/llm/router/__tests__/model-refresh.test.ts`.
- Update `docs/reference/provider-catalog.md`.

- [ ] Write tests for direct provider model-list refresh where official endpoints exist.
- [ ] Write tests for gateway `/v1/models` refresh when selected backend exposes it.
- [ ] Preserve static defaults as fallbacks only.
- [ ] Mark provider model entries with `source`, `last_checked_at`, and raw metadata redaction.
- [ ] Run focused tests.

### Task 7: Pricing and Costing

**Files:**

- Create `lib/llm/router/pricing-refresh.ts`.
- Create `lib/llm/router/costing.ts`.
- Modify `lib/llm/router/request-ledger.ts`.
- Test `lib/llm/router/__tests__/pricing-refresh.test.ts`.
- Test `lib/llm/router/__tests__/costing.test.ts`.
- Update `docs/reference/database-schema.md`.

- [ ] Write tests for provider-reported usage/cost taking precedence.
- [ ] Write tests for estimated cost when provider/gateway does not report cost.
- [ ] Write tests that estimated costs are labeled as estimated and exact costs as exact.
- [ ] Store pricing source URL/hash/timestamp.
- [ ] Run focused tests.

### Task 8: Routing Policy Evaluation

**Files:**

- Create `lib/llm/router/routing-policy.ts`.
- Modify `lib/llm/router/create-client.ts`.
- Test `lib/llm/router/__tests__/routing-policy.test.ts`.
- Test `lib/llm/router/__tests__/create-client.test.ts`.

- [ ] Write tests for `manual`.
- [ ] Write tests for approved Phase 2 policy modes only.
- [ ] Implement fallback ordering without hiding failed attempts from the ledger.
- [ ] Implement budget guard checks only from local ledger/pricing state.
- [ ] Run focused tests.

### Task 9: Provider API and CLI Status

**Files:**

- Modify `app/api/providers/route.ts`.
- Modify `app/api/providers/configure/route.ts`.
- Modify `cli/src/commands/configure.ts`.
- Modify `lib/providers/config-store.ts`.
- Test `app/api/providers/__tests__/providers-route.test.ts`.
- Test `lib/providers/__tests__/config-resolution.test.ts`.

- [ ] Read current Next.js route-handler docs from `node_modules/next/dist/docs/` before route edits.
- [ ] Add sanitized gateway/model/cost/auth status.
- [ ] Do not return raw API keys, virtual keys, OAuth tokens, provider credential file paths, or prompt/response bodies.
- [ ] Ensure API access, gateway access, local runtime access, and local tool-session access are labeled distinctly.
- [ ] Run focused tests.

### Task 10: Documentation Update

**Files:**

- Modify `docs/reference/provider-catalog.md`.
- Modify `docs/reference/database-schema.md`.
- Modify `docs/recovery/2026-05-20-provider-auth-router-phase-2-implementation-plan.md`.
- Modify `docs/goals/provider-auth-router-phase2/state.yaml`.

- [ ] Document selected gateway decision and rejected candidates.
- [ ] Document auth modes, secret refs, gateway virtual keys, model refresh, pricing refresh, and estimated versus exact cost.
- [ ] Document blockers or incomplete work if any.
- [ ] Ensure docs do not present raw token pasting as approved behavior.

### Task 11: Judge Review and Review Fixes

**Files:**

- Review all changed files.
- Modify only files named in review-fix findings.

- [ ] Judge reviews behavior, secret handling, license/dependency fit, source conformance, tests, docs, and diff containment.
- [ ] Convert findings into a bounded Worker review-fix task.
- [ ] Run focused verification after review fixes.
- [ ] Stop if findings require a new architecture decision.

### Task 12: Final Verification and PR Prep

**Files:**

- Modify only `docs/goals/provider-auth-router-phase2/state.yaml` for final receipt unless docs need blocker updates.

- [ ] Run `npm test -- lib/llm/router lib/providers app/api/providers`.
- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit --pretty false`.
- [ ] Run `npm run lint` and classify known pre-existing failures separately from PR-owned failures.
- [ ] Run a secret scan over changed files.
- [ ] Run `git diff --name-only` and confirm no excluded files changed.
- [ ] Document incomplete work, blockers, exact failed commands, and next required action if anything is blocked.
- [ ] Stop before staging, committing, pushing, or opening a PR unless user explicitly approves.

## Development Operating Contract

Git/process rules:

- Start from the current branch unless the user explicitly asks for a new branch.
- Before edits, record `git status --short`, `git branch --show-current`, and `git diff --cached --name-only`.
- Do not cleanup unrelated files.
- Do not stage, commit, or push until the user explicitly approves that action.
- Do not revert user or prior-agent changes unless explicitly requested.
- After each Worker slice, record `git diff --name-only` and confirm the slice stayed inside its allowed files.

Error logging and receipts:

- Every task must keep a short receipt in `docs/goals/provider-auth-router-phase2/state.yaml`.
- Every failed command must be recorded with command, exit status, concise error summary, and whether the failure is PR-owned or pre-existing.
- If a test/lint/typecheck failure is unrelated to the slice, preserve the evidence.
- If a hard stop occurs, mark the task blocked and stop implementation rather than widening scope.

Testing/linting gates:

- Each Worker slice must run focused tests named in its task.
- Shared provider/router changes must run `npm test -- lib/llm/router lib/providers app/api/providers` before Judge review and final verification.
- Final verification must run full tests, typecheck, lint, secret scan, and diff containment.

Code review and review-fix loop:

- A Judge must review before final completion.
- Review findings become a bounded Worker review-fix task.
- Final verification must run after review fixes.

Documentation:

- Update plan/docs/board receipts when behavior, scope, blocker state, or verification results change.
- Document anything not completed and why.
- Document exact blocker evidence and the next safe action.

Completion discipline:

- Do complete work for the approved Phase 2 outcome.
- Do not stop after a spike if the selected adapter and safe local tasks remain approved and unblocked.
- Do not hand off partial work as final completion.
- If handoff is unavoidable, the final receipt must say `blocked`, list completed work, list incomplete work, list blockers, and identify the next safe task.

## Sub-Agent Orchestration

Use GoalBuddy for execution after approval:

```bash
/goal Follow docs/goals/provider-auth-router-phase2/goal.md.
```

PM responsibilities:

- Keep exactly one active task.
- Preserve approval scope and hard stops.
- Assign Scout, Worker, and Judge tasks from `docs/goals/provider-auth-router-phase2/state.yaml`.
- Update receipts after every task.
- Prevent many-gateway implementation drift.
- Require blocker and incomplete-work documentation before any pause, handoff, or final response.

Scout responsibilities:

- Read current source and maintainer docs before Worker edits.
- Confirm file ownership and current-source fit.
- Verify selected gateway evidence from official docs/repos.

Worker responsibilities:

- Edit only active task `allowed_files`.
- Run focused verification.
- Record changed files, commands, failures, risks, and docs updates.
- Complete the full assigned slice unless a hard stop applies.

Judge responsibilities:

- Validate plan conformance before major execution starts.
- Decide gateway candidate promotion/rejection.
- Review code and docs before final completion.
- Reject completion for secret leaks, hosted dependencies, duplicate dashboards, missing docs, incomplete receipts, or drift from the selected architecture.

Parallelization rules:

- Parallel Workers are allowed only when their `allowed_files` sets are disjoint.
- Do not parallelize tasks that touch shared router types, config, or create-client files.
- Scout and Judge read-only tasks may run in parallel with non-overlapping Worker work only after the active task is approved.

## Completion Criteria

- User approval is recorded before code implementation begins.
- Current-source and gateway evidence receipts are recorded.
- Gateway candidate is selected or blocked by explicit Judge decision.
- Direct provider backend still works.
- Selected local gateway backend, if approved, works through SkillMall's router contract.
- Provider secrets and gateway virtual keys are secret references only.
- Model refresh writes current local model metadata and preserves static defaults as fallbacks.
- Pricing refresh and cost estimation label exact versus estimated costs.
- Routing policy evaluation supports only approved Phase 2 modes.
- Request ledger records direct/gateway attempts, usage, cost, fallback path, latency, and errors without prompt/response body storage by default.
- Provider API/CLI status is sanitized.
- Docs and board receipts are current.
- Judge review is complete and findings are fixed or explicitly accepted.
- Final verification has run or blockers are documented with exact evidence.
- No excluded files changed.
- No partial work is presented as final completion.
