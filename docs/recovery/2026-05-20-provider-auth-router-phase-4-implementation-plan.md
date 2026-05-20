# Provider/Auth Router Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 3 Provider Center from a broad, safe configuration/status surface into a source-backed model and pricing catalog with executable OpenAI-compatible registry providers.

**Architecture:** Phase 4 keeps SkillMall as the source of truth for provider config, auth modes, model cache, pricing snapshots, routing policy, and the SQLite request ledger. It adds typed provider model-source adapters, a cached pricing-source adapter, and one generic OpenAI-compatible execution path for registry rows such as OpenRouter, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, xAI, Together, Cerebras, DeepInfra if approved, Z.AI if approved, Alibaba/DashScope if approved, and custom endpoints. It does not make a hosted gateway, Bifrost dashboard, Portkey dashboard, LiteLLM proxy, or GoModel dashboard the product control plane.

**Tech Stack:** TypeScript, Next.js 16 app routes, React 19, Node CLI, Vitest, better-sqlite3, existing `lib/providers/*`, existing `lib/llm/router/*`, existing local SQLite `llm_models` and `llm_pricing_snapshots` tables, GoalBuddy.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Planning branch:** `codex/provider-auth-router-phase4-plan`

**Implementation prerequisite:** Phase 4 must start from updated `main` after the completed PR queue cleanup. `main` now includes Phase 3 PR #9 (`f288c6b`) and the older architecture/refactor PR queue through `bb03dc6`.

**Implementation status:** Implementation is now being executed through `docs/goals/provider-auth-router-phase4/state.yaml`. T1001 through T1008 receipts record the current implemented behavior: source-backed model adapters, registry model snapshots, executable OpenAI-compatible registry targets, source-backed pricing refresh, Provider Center parity, and CLI parity. Sections labeled "Current Source Facts" below describe the pre-implementation Phase 3 baseline that Phase 4 was designed to change; the GoalBuddy receipts are the live status source during implementation.

---

## Approval Boundary

This document and `docs/goals/provider-auth-router-phase4/` are planning and GoalBuddy prep artifacts for approval. Do not implement Phase 4 code, clean unrelated files, stage, commit, push, or open a Phase 4 PR from this planning turn unless the user explicitly asks for that publish step.

Phase 4 implementation is approved only when the user runs:

```text
/goal Follow docs/goals/provider-auth-router-phase4/goal.md.
```

## Why Phase 4 Exists

Phase 3 shipped the broad Provider Center and intentionally conservative registry:

- `ProviderRegistryID` is broad and user-facing.
- `ProviderID` remains narrow for current direct clients.
- Registry-only rows can be configured as metadata but many cannot become the active executable route.
- `official_provider_models`, `account_scoped_models`, `cloud_project_scoped_models`, and `local_runtime_models` mostly return status contracts instead of live refresh.
- `llm_pricing_snapshots` exists, but pricing refresh is only a storage helper and not a source-backed user flow.

That was the right safety boundary for Phase 3. It is not the final product behavior. The user requirement has always included broad well-known provider support, changing model lists, cost visibility, and no hosted paid gateway dependency. Phase 4 is the first phase that makes that real beyond the initial direct-provider set.

## Non-Negotiables

- No hosted gateway/router/proxy/observability product may be required.
- No extra paid gateway app may become required infrastructure.
- SkillMall remains the provider/settings/model/pricing/cost source of truth.
- External model/pricing sources are inputs to SkillMall caches, not dashboards users must manage.
- API-key access must remain optional and labeled API access.
- Subscription/tool-session auth must not be collapsed into API-key access.
- SkillMall must not ask users to paste raw ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, copied credential-file contents, or browser session cookies.
- Claude Code stays local-tool/session auth only unless official Claude Code docs authorize a different integration.
- ChatGPT/Codex account auth stays separate from OpenAI API-key access.
- OpenAI-compatible registry execution must not widen `ProviderID` by adding one enum value per broad provider row. Add a generic execution target or backend that preserves the registry/executable split.
- Static fallback model labels must not be presented as live provider catalogs.
- Pricing snapshots must label estimated cost separately from provider/gateway-reported actual cost.
- Planned-source-review rows may become live only after current official docs or maintainer repos prove the exact model discovery and execution contract.
- Incomplete work and blockers must be documented in the board receipts before handoff.

## Current Source Facts At Phase 4 Start

Phase 4 started from updated `main` at or after `bb03dc6`, which includes Phase 3 PR #9 and the completed PR queue cleanup. The bullets in this section are the pre-implementation baseline, not the current post-T1008 implementation state.

Important current files and limits:

- `lib/providers/registry.ts`
  - Contains 27 broad registry rows.
  - Planned-source-review rows are `alibaba_dashscope_qwen`, `zai`, `perplexity`, and `deepinfra`.
  - Many OpenAI-compatible rows have no `executableProviderId`.
- `lib/providers/types.ts`
  - `ProviderID` is still only `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`.
- `app/api/providers/configure/route.ts`
  - Persists only executable providers.
  - Registry-only rows return `persisted: false` and `metadata_only`.
- `lib/providers/model-discovery.ts`
  - Live network refresh exists only for `openai_compatible_models` with a configured endpoint.
  - Official-provider, account-scoped, cloud-project-scoped, and local-runtime strategies return status-only results.
- `lib/providers/catalog.ts`
  - Older narrow catalog still has direct refresh logic for OpenAI, Anthropic, Groq, and Ollama.
  - This should be reconciled into the newer registry/model-source path instead of becoming a second catalog.
- `lib/llm/router/model-refresh.ts`
  - Writes `llm_models`, but it is tied to narrow `ProviderConfig` and `fetchProviderModels()`.
- `lib/llm/router/pricing-refresh.ts`
  - Stores pricing snapshots, but has no source adapter for Portkey Models, LiteLLM model pricing data, provider pricing docs, or gateway-reported price metadata.
- `app/api/providers/models/refresh/route.ts`
  - Refreshes one selected registry row, but does not persist live model snapshots for registry-only rows.
- `app/api/providers/usage/route.ts` and `lib/llm/router/usage-summary.ts`
  - Summarize ledger rows but depend on the underlying request ledger and pricing snapshots being populated.
- `components/skill-mall/providers/ProviderCenter.tsx`
  - Already exposes model refresh, config, safe test, and usage/cost panels.
  - Phase 4 should upgrade the data contract, not rebuild the whole page from scratch.

Do not modify wizard/preview files in this phase.

## Current Source Receipts

These receipts were checked during planning on 2026-05-20 and must be refreshed by the Scout before implementation:

| Area | Current official or maintainer evidence | Phase 4 implication |
| --- | --- | --- |
| Anthropic models | `https://platform.claude.com/docs/en/api/models/list` | Implement provider-specific `GET /v1/models` adapter with Anthropic headers and API-key env ref. |
| Gemini models | `https://ai.google.dev/api/models` and `https://ai.google.dev/gemini-api/docs/models` | Implement provider-specific Gemini model listing; do not treat Gemini as generic OpenAI-compatible unless an explicit OpenAI-compatible mode is configured elsewhere. |
| Hugging Face Inference Providers | `https://huggingface.co/docs/inference-providers/main/hub-api` and `https://huggingface.co/docs/api-inference/main/en` | Implement Hub/API-backed provider model discovery carefully; record whether `/v1/models` is available for the current inference provider route or whether Hub filters are safer. |
| Cohere models | `https://docs.cohere.com/reference/list-models` | Implement provider-specific model listing. |
| Fireworks models | `https://fireworks.ai/docs/api-reference/list-models` | Keep account-scoped semantics; require account ID/context before network refresh. |
| Replicate official models | `https://replicate.com/docs/topics/models/official-models` and `https://replicate.com/docs/reference/http/` | Implement provider-specific official-model discovery only if the official API/collection endpoint is stable enough; otherwise keep status-only with exact blocker. |
| Ollama local models | `https://docs.ollama.com/api/tags` | Replace status-only local runtime discovery with local `GET /api/tags` adapter using configured local endpoint. |
| Alibaba/DashScope/Qwen | `https://www.alibabacloud.com/help/doc-detail/3016809.html` | Source-review before activation; likely OpenAI-compatible execution may be possible, but model discovery must be proven and documented. |
| Z.AI | `https://docs.z.ai/api-reference/` | Source-review before activation; docs show bearer API and OpenAI SDK examples, but model listing support must be proven before live refresh. |
| Perplexity | `https://docs.perplexity.ai/docs/agent-api/models` | May be source-backed static/pricing catalog rather than live model API; do not invent a refresh endpoint. |
| DeepInfra | `https://docs.deepinfra.com/` and `https://deepinfra.mintlify.app/api-reference/models/models-list` | Candidate to promote from planned-source-review if official docs confirm `GET /models/list` behavior and auth. |
| Bifrost virtual keys/models | `https://docs.getbifrost.ai/features/governance/virtual-keys` | Bifrost `/v1/models` with a virtual key can remain a local gateway model source; SkillMall still owns cache and Provider Center. |
| GoModel | `https://github.com/ENTERPILOT/GOModel/` and `https://gomodel.enterpilot.io/docs/getting-started/quickstart` | Keep as reference/future optional gateway; do not make it Phase 4 default unless Phase 4 Judge explicitly changes scope after current review. |
| Portkey Models | `https://portkey.ai/models`, `https://github.com/orgs/Portkey-AI/repositories`, and `https://portkey.ai/docs/api-reference/inference-api/models/models` | Primary candidate for model/pricing metadata input because the models repo is MIT and current pages expose broad pricing/model data. Prefer repository/static-data ingestion over requiring Portkey API keys or hosted Portkey Gateway. |
| LiteLLM model pricing data | `https://models.litellm.ai/` and `https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json` | Fallback/reference pricing source. Useful breadth, but do not adopt LiteLLM proxy as the default SkillMall runtime. |

If any source has moved, is stale, is not primary, or conflicts with implementation, the Scout must record the replacement source and the resulting decision in `state.yaml`.

## Phase 4 Contract

Phase 4 must deliver these contracts together. Partial delivery must be labeled incomplete.

### 1. Model Source Adapter Contract

Introduce a shared model-source contract that can be used by app routes, CLI commands, and model-refresh helpers.

Expected shape:

```typescript
export type ModelSourceKind =
  | 'openai_compatible'
  | 'official_provider'
  | 'account_scoped'
  | 'cloud_project_scoped'
  | 'local_runtime'
  | 'source_backed_static'
  | 'manual'
  | 'planned_source_review'

export interface ProviderModelSourceInput {
  providerRegistryId: ProviderRegistryID
  baseURL?: string
  secretRef?: SecretRef
  project?: Record<string, string>
  manualModels?: string[]
}

export interface ProviderModelRecord {
  providerRegistryId: ProviderRegistryID
  modelId: string
  displayName?: string
  source: 'live' | 'source_backed_static' | 'manual' | 'fallback'
  authoritative: boolean
  raw?: Record<string, unknown>
}
```

The exact code may differ, but the behavior must not.

### 2. Executable Registry Provider Contract

Phase 4 must make OpenAI-compatible registry rows executable without adding every row to `ProviderID`.

Acceptable approaches:

- Add `ProviderExecutionTarget` / `RouterExecutionTarget` that includes `providerRegistryId`, `executionKind`, `baseURL`, `model`, `authMode`, `secretRef`, `gatewayBackend`, and optional route policy.
- Or add one generic executable backend such as `openai_compatible` while keeping broad `ProviderRegistryID` separate from executable adapter identity.

Rejected approaches:

- Adding `openrouter`, `minimax`, `deepseek`, `mistral`, `xai`, `together_ai`, etc. directly to `ProviderID` one by one without a generic adapter.
- Duplicating provider config in a separate UI-only store.
- Making Bifrost, GoModel, LiteLLM, Portkey, or another gateway dashboard the source of truth.

### 3. Pricing Source Contract

Phase 4 must populate `llm_pricing_snapshots` from a source-backed data adapter.

Primary candidate:

- Portkey Models repository/static data if license/schema/current repo review passes.

Fallback/reference:

- LiteLLM model pricing/context JSON.
- Provider-specific pricing docs only when the data can be normalized and maintained.

Rejected:

- Requiring a Portkey API key.
- Requiring hosted Portkey Gateway.
- Treating scraped HTML as the only long-term pricing source without a source/API/repo fallback.

### 4. Provider Activation Contract

The following rows should be promoted only when the Scout records current official evidence and tests prove the behavior:

- `deepinfra`: likely candidate because official docs expose a models list endpoint.
- `alibaba_dashscope_qwen`: candidate if official DashScope docs prove OpenAI-compatible execution and model discovery or a source-backed model list.
- `zai`: candidate if official docs prove execution plus model listing/source-backed model list.
- `perplexity`: candidate for source-backed static/pricing list if no live model API is documented; do not invent a `/models` endpoint.
- `nvidia_nim`: local/container runtime refresh via configured local endpoint only; managed/ambiguous variants stay out of scope.

Rows not proven by primary docs stay visible and non-callable with exact blocker text.

### 5. UI/API/CLI Contract

Phase 4 must upgrade the existing Provider Center flows:

- `GET /api/providers` shows last model refresh timestamp/source/count and last pricing refresh timestamp/source/count.
- `POST /api/providers/models/refresh` persists source-backed model snapshots for registry rows when allowed.
- Add or extend pricing refresh API/CLI action.
- Provider Center distinguishes live, source-backed static, manual, fallback, stale, and planned-source-review model sources.
- CLI provider commands use the same adapter contracts as the app, not a duplicated provider list.
- Safe provider test remains metadata/readiness-only unless a provider is executable and configured.

## T1003 Locked Implementation Contract

The Phase 4 Judge rejected Worker release until the exact persistence and execution contracts were written into this plan and board. Workers must treat this section as binding.

### Model Source Adapter Contract

Add shared model-source adapters that return:

- `providerRegistryId`
- `modelId`
- `displayName`
- `source`: `live`, `source_backed_static`, `manual`, or `fallback`
- `authoritative`
- `sourceName`
- `sourceUrl`
- `fetchedAt`
- `blocker`
- sanitized `raw` metadata

Inputs may include only `providerRegistryId`, `baseURL`, `secretRef`, account/project context, and `manualModels`. Generic `/v1/models` probing is allowed only for rows whose strategy is `openai_compatible_models` or explicitly configured custom OpenAI-compatible endpoints. Provider-specific, account-scoped, cloud-project, local-runtime, source-backed static, manual, and planned rows must not be probed generically.

### Executable Registry Provider Contract

Introduce `ProviderExecutionTarget` or `RouterExecutionTarget` with:

- `providerRegistryId`
- `executionKind`
- optional `directProviderId`
- `baseURL`
- `model`
- `authMode`
- `secretRef`
- `gatewayBackend`
- `routingPolicyId`

`ProviderID` remains narrow. Broad registry rows execute through `executionKind = openai_compatible`, not by adding one `ProviderID` value per provider row.

### Config Store Contract

`~/.skill-mall/config.json` becomes target-aware:

- add `activeProviderRegistryId`
- add `providerTargets` keyed by `ProviderRegistryID`
- preserve legacy `provider` and `providers` migration/compatibility for direct providers
- store only secret references
- reject raw key/token/session/browser-token/credential-path/credential-file fields

### Database And Ledger Contract

Add migration `008_provider_auth_router_phase4.sql` to make registry identity explicit. Add `provider_registry_id` and `execution_kind` to `llm_provider_configs`, `llm_models`, `llm_pricing_snapshots`, `llm_requests`, and `llm_request_events` where appropriate. Rebuild constrained tables if SQLite requires it.

`provider_id` may remain as legacy/direct adapter identity. `provider_registry_id` is the broad Provider Center identity. `execution_kind` distinguishes `direct`, `openai_compatible`, `bifrost_local`, `local_runtime`, `source_backed_static`, and blocked/status-only cases where needed.

`startLLMRequest`, `finishLLMRequest`, and request-event inputs must carry `providerRegistryId` and `executionKind` when available. Ledger metadata must continue to strip prompt/response/request/response bodies and must never store raw secrets, browser/session tokens, credential paths, or copied credential material.

### Pricing Source Contract

Primary pricing source is Portkey Models repository/static JSON, not Portkey Gateway. Normalize Portkey `pricing_config.pay_as_you_go` / `batch_config` records, remembering that prices are in cents per token, into SkillMall `ModelPricing` values in USD per million tokens. Store source name, source URL, fetched timestamp, currency, hash, provider registry ID, and license evidence.

LiteLLM `model_prices_and_context_window.json` is fallback/reference only. Provider docs are supplemental only when data can be normalized and maintained. No hosted gateway API key, hosted dashboard, or paid external app may be required for pricing refresh.

### Provider Promotion And Blocker Contract

Promote in Phase 4:

- Anthropic, Gemini, Cohere, and Ollama through provider-specific/local adapters.
- DeepInfra through official models-list schema normalization.
- Perplexity for source-backed model/pricing discovery, with execution gated until tested against supported API semantics.

Keep bounded or blocked:

- Fireworks remains account-scoped until account context exists.
- Alibaba/DashScope and Z.AI may be executable through configured OpenAI-compatible endpoints, but use source-backed static/manual discovery unless a durable official model-list endpoint is proven.
- Bifrost remains optional local gateway, not required infrastructure or source of truth.
- GoModel remains reference only.
- AWS Bedrock, Azure OpenAI, and Google Vertex require cloud/project context.
- Replicate remains limited/status-only unless stable official discovery is implemented.

## Out Of Scope For Phase 4

- Hosted gateway setup as required infrastructure.
- Full GoModel or LiteLLM embedded runtime adoption.
- New full dashboard/control plane.
- Semantic/cheapest/quality routing beyond the already approved routing-policy vocabulary.
- Streaming/tool-call execution refactors unless required for a provider adapter and explicitly approved.
- Cloud IAM onboarding UX for AWS Bedrock, Azure OpenAI, or Google Vertex beyond source-backed status and blocker handling.
- Wizard/preview repairs.
- Raw secret storage or browser token/session token collection.

## Development Workflow Requirements

The implementation agent must:

1. Start from a clean implementation branch created from updated `origin/main`.
2. Verify `origin/main` contains the completed PR queue cleanup through `bb03dc6`.
3. Stop if implementation would start from an older branch, the Phase 4 planning branch, or a source tree missing Phase 3 files.
4. Read `AGENTS.md`, this plan, the GoalBuddy board, Phase 1-3 recovery docs, and current provider/router source before coding.
5. Use sub-agent orchestration:
   - Scout for current source, current official docs, maintainer repos, and license/schema evidence.
   - Worker for bounded implementation slices with explicit allowed files.
   - Judge for contract review, code review, drift review, and final verification.
6. Use TDD for each contract change.
7. Update `docs/goals/provider-auth-router-phase4/state.yaml` after every task with receipt, blockers, incomplete work, and verification.
8. Update docs whenever implementation behavior differs from this plan.
9. Fix code review findings before final verification.
10. Run final verification and classify lint failures as PR-owned or pre-existing.
11. Stop before stage/commit/push unless the user explicitly asks for commit-prep.

Expected verification gates:

```bash
npm test -- lib/providers lib/llm/router app/api/providers components/skill-mall/providers
npm test
npx tsc --noEmit --pretty false
cd cli && npm run type-check
npm run lint
git diff --name-only
git diff --cached --name-only
(git diff --name-only; git ls-files --others --exclude-standard) | xargs rg --pcre2 -n "sk-(proj|live|ant-api)[A-Za-z0-9_-]+|OPENAI_API_KEY=(?!your-|sk-test)[A-Za-z0-9_-]+|ANTHROPIC_API_KEY=(?!your-)[A-Za-z0-9_-]+|CLAUDE_CODE_OAUTH_TOKEN=[A-Za-z0-9_-]+|CODEX_ACCESS_TOKEN=[A-Za-z0-9_-]+"
```

`npm run lint` is known to fail on current `main` / Phase 3 lineage from unrelated files unless fixed separately. Any lint failure must be classified by file path.

## File Map

Likely creates:

- `lib/providers/model-sources.ts`
  - Shared provider model-source adapter contract and adapter registry.
- `lib/providers/model-sources/__tests__/model-sources.test.ts`
  - Contract tests for adapter selection, source labels, non-network planned rows, and secret redaction.
- `lib/providers/pricing-sources.ts`
  - Source-backed pricing adapter contract and normalization into `ModelPricing`.
- `lib/providers/__tests__/pricing-sources.test.ts`
  - Portkey Models/LiteLLM fixture tests and no-hosted-key-required proof.
- `lib/llm/router/openai-compatible-client.ts`
  - Generic executable OpenAI-compatible backend, if not implemented through existing gateway/direct client modules.
- `lib/llm/router/__tests__/openai-compatible-client.test.ts`
  - Request/response, secret reference, usage/cost, error, and no prompt/response ledger leakage tests.
- `app/api/providers/pricing/refresh/route.ts`
  - Manual pricing refresh endpoint.
- `db/migrations/008_provider_auth_router_phase4.sql`
  - Adds registry identity and execution-kind columns required by Phase 4.

Likely modifies:

- `lib/providers/types.ts`
- `lib/providers/registry.ts`
- `lib/providers/model-discovery.ts`
- `lib/providers/model-sources.ts`
- `lib/providers/config-store.ts`
- `lib/providers/catalog.ts`
- `lib/providers/index.ts`
- `lib/llm/router/types.ts`
- `lib/llm/router/config.ts`
- `lib/llm/router/create-client.ts`
- `lib/llm/router/model-refresh.ts`
- `lib/llm/router/pricing-refresh.ts`
- `lib/llm/router/request-ledger.ts`
- `lib/llm/router/usage-summary.ts`
- `app/api/providers/route.ts`
- `app/api/providers/configure/route.ts`
- `app/api/providers/models/refresh/route.ts`
- `app/api/providers/test/route.ts`
- `app/api/providers/usage/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`
- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/UsageCostPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `cli/src/commands/providers.ts`
- `cli/src/commands/configure.ts`
- `docs/reference/provider-catalog.md`
- `docs/reference/api-routes.md`
- `docs/reference/database-schema.md`
- `docs/user/configuring-providers.md`
- `docs/user/using-the-cli.md`
- `docs/developer/cli-reference.md`
- `docs/developer/deployment.md`
- `docs/developer/faq.md`
- `docs/developer/architecture.md`
- `docs/recovery/2026-05-20-provider-auth-router-phase-4-implementation-plan.md`
- `docs/goals/provider-auth-router-phase4/state.yaml`

Do not modify:

- `components/skill-mall/wizard/*`
- preview repair files
- unrelated lint-debt files unless explicitly approved
- credential files or home-directory provider auth files

## Implementation Tasks

### Task 1: Branch, Mainline, And Scope Gate

**Files:**

- Modify only `docs/goals/provider-auth-router-phase4/state.yaml` for receipts.

- [ ] Run `git status -sb`.
- [ ] Run `git branch --show-current`.
- [ ] Run `git fetch origin`.
- [ ] Verify whether `origin/main` contains `bb03dc6`.
- [ ] Confirm staged diff is empty before coding.
- [ ] Record the implementation base as `main_after_pr_queue_cleanup`.

**Stop if:** Phase 3 files are not present, the branch is dirty, or implementation would start from an older branch, planning branch, or unknown provider/router state.

### Task 2: Scout Current Source, Official Docs, Maintainer Repos, And Licenses

**Files:**

- Modify only `docs/goals/provider-auth-router-phase4/state.yaml` unless the Scout finds this plan must be corrected before implementation.

- [ ] Read `AGENTS.md`.
- [ ] Read this plan.
- [ ] Read Phase 1, Phase 2, Phase 3 recovery plans and GoalBuddy receipts.
- [ ] Map current files under `lib/providers`, `lib/llm/router`, `app/api/providers`, `components/skill-mall/providers`, `app/settings/providers`, and `cli/src`.
- [ ] Recheck official docs for every provider whose discovery/activation is in scope.
- [ ] Recheck maintainer repos/docs for Portkey Models, LiteLLM pricing data, Bifrost, and GoModel.
- [ ] Record license and schema status for the selected pricing source.
- [ ] Record which planned-source-review rows can be promoted and which must remain planned.
- [ ] Record exact official URLs and current implementation blockers.

**Verification command:**

```bash
rg -n "ProviderRegistryID|ProviderID|discoveryStrategy|llm_models|llm_pricing_snapshots|models/refresh|providers configure|ProviderCenter" lib app cli docs db
```

**Stop if:** any provider activation, model source, or pricing source would rely on stale/unofficial evidence only.

### Task 3: Judge Phase 4 Contract

**Files:**

- `docs/goals/provider-auth-router-phase4/state.yaml`
- This plan only if the Judge requires corrections.

- [ ] Decide the exact model-source adapter contract.
- [ ] Decide the exact executable registry-provider contract.
- [ ] Decide the pricing source and fallback source.
- [ ] Decide which rows may be promoted from planned-source-review.
- [ ] Reject any design that creates a duplicate dashboard or hosted dependency.
- [ ] Reject any design that widens `ProviderID` one provider row at a time instead of preserving the registry/executable split.
- [ ] Reject any design that accepts raw keys/tokens/credential files.
- [ ] Confirm implementation slices are large enough to produce working user-visible behavior.

**Stop if:** the design cannot make registry-only OpenAI-compatible providers executable without violating the Phase 3 identity split.

### Task 4: Model Source Adapter Layer

**Files:**

- Create `lib/providers/model-sources.ts`
- Create `lib/providers/model-sources/__tests__/model-sources.test.ts`
- Modify `lib/providers/model-discovery.ts`
- Modify `lib/providers/registry.ts`
- Modify `lib/providers/types.ts`
- Modify `docs/reference/provider-catalog.md`

- [ ] Write tests for adapter selection by `ProviderRegistryID` and `discoveryStrategy`.
- [ ] Write tests proving planned-source-review rows do not make network calls.
- [ ] Write tests proving fallback/static/manual/source-backed/live labels are distinct.
- [ ] Write tests for secret redaction from raw model metadata.
- [ ] Implement adapters for OpenAI-compatible rows through configured base URLs.
- [ ] Implement provider-specific adapters for Anthropic, Gemini, Cohere, Hugging Face, Ollama, Fireworks, and any Scout-approved planned rows.
- [ ] Keep cloud-project rows status-only unless project/resource fields and official API calls are fully specified.
- [ ] Run focused tests.

**Verification command:**

```bash
npm test -- lib/providers/model-sources lib/providers/__tests__/model-discovery.test.ts lib/providers/__tests__/registry.test.ts
```

### Task 5: Persistent Registry Model Refresh

**Files:**

- Create or modify `db/migrations/008_provider_auth_router_phase4.sql`
- Modify `lib/llm/router/model-refresh.ts`
- Modify `lib/llm/router/__tests__/model-refresh.test.ts`
- Modify `app/api/providers/models/refresh/route.ts`
- Modify `app/api/providers/route.ts`
- Modify `app/api/providers/__tests__/providers-route.test.ts`
- Modify `docs/reference/api-routes.md`
- Modify `docs/reference/database-schema.md`

- [ ] Write route tests proving registry-only rows can refresh and persist model snapshots when source-backed.
- [ ] Write route tests proving planned rows return blockers without writes.
- [ ] Write tests proving `llm_models.raw_json` strips key/token/secret-like fields.
- [ ] Write tests proving `provider_registry_id` and `execution_kind` are persisted for registry model snapshots.
- [ ] Write tests proving `GET /api/providers` returns model count, source, timestamp, stale flag, and blocker/status.
- [ ] Implement persistent refresh for registry model sources.
- [ ] Preserve existing direct/Bifrost refresh behavior.
- [ ] Run focused tests.

**Verification command:**

```bash
npm test -- lib/llm/router/__tests__/model-refresh.test.ts app/api/providers/__tests__/providers-route.test.ts
```

### Task 6: Executable OpenAI-Compatible Registry Providers

**Files:**

- Create or modify `lib/llm/router/openai-compatible-client.ts`
- Create `lib/llm/router/__tests__/openai-compatible-client.test.ts`
- Create or modify `db/migrations/008_provider_auth_router_phase4.sql`
- Modify `lib/llm/router/types.ts`
- Modify `lib/llm/router/config.ts`
- Modify `lib/llm/router/create-client.ts`
- Modify `lib/llm/router/request-ledger.ts`
- Modify `lib/llm/router/usage-summary.ts`
- Modify `lib/providers/config-store.ts`
- Modify `lib/providers/index.ts`
- Modify `app/api/providers/configure/route.ts`
- Modify `app/api/providers/test/route.ts`
- Modify `app/api/providers/__tests__/providers-route.test.ts`
- Modify `docs/reference/provider-catalog.md`
- Modify `docs/reference/database-schema.md`
- Modify `docs/user/configuring-providers.md`

- [ ] Write tests proving OpenRouter/DeepSeek/Mistral-style registry rows persist executable config through the generic OpenAI-compatible backend.
- [ ] Write tests proving broad rows do not get added as individual `ProviderID` values.
- [ ] Write tests proving configured base URL and secret ref are required for endpoint-required rows.
- [ ] Write tests proving raw key/token/path fields are rejected.
- [ ] Write tests proving request ledger rows include registry provider ID, model ID, route backend, auth mode, usage, latency, and estimated/actual cost labels without prompt/response bodies.
- [ ] Write tests proving provider configs are target-aware with `activeProviderRegistryId` and `providerTargets` while preserving legacy direct-provider compatibility.
- [ ] Implement the generic execution path.
- [ ] Keep existing direct providers working.
- [ ] Run focused router/API tests.

**Verification command:**

```bash
npm test -- lib/llm/router/__tests__/openai-compatible-client.test.ts lib/llm/router app/api/providers/__tests__/providers-route.test.ts
```

### Task 7: Pricing Source Refresh

**Files:**

- Create `lib/providers/pricing-sources.ts`
- Create `lib/providers/__tests__/pricing-sources.test.ts`
- Create or modify `db/migrations/008_provider_auth_router_phase4.sql`
- Modify `lib/llm/router/pricing-refresh.ts`
- Modify `lib/llm/router/__tests__/pricing-refresh.test.ts`
- Create `app/api/providers/pricing/refresh/route.ts`
- Modify `app/api/providers/usage/route.ts`
- Modify `app/api/providers/__tests__/providers-route.test.ts`
- Modify `docs/reference/api-routes.md`
- Modify `docs/reference/database-schema.md`

- [ ] Write fixture tests for the selected pricing source schema.
- [ ] Write tests proving no hosted gateway API key is required for pricing refresh.
- [ ] Write tests proving model/pricing records store source URL, source name, timestamp, hash, currency, input/output/cache/reasoning prices where present.
- [ ] Write tests proving `provider_registry_id` and `execution_kind` are stored for pricing snapshots.
- [ ] Write tests proving pricing refresh is cache-first and failure-tolerant.
- [ ] Implement pricing source normalization into `ModelPricing`.
- [ ] Implement manual pricing refresh route.
- [ ] Preserve actual-vs-estimated cost labels.
- [ ] Run focused tests.

**Verification command:**

```bash
npm test -- lib/providers/__tests__/pricing-sources.test.ts lib/llm/router/__tests__/pricing-refresh.test.ts app/api/providers/__tests__/providers-route.test.ts
```

### Task 8: Provider Center And CLI Parity

**Files:**

- Modify `components/skill-mall/providers/ProviderCenter.tsx`
- Modify `components/skill-mall/providers/ModelRefreshPanel.tsx`
- Modify `components/skill-mall/providers/ProviderConfigPanel.tsx`
- Modify `components/skill-mall/providers/UsageCostPanel.tsx`
- Modify `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- Modify `cli/src/commands/providers.ts`
- Modify `cli/src/commands/configure.ts`
- Modify `docs/user/using-the-cli.md`
- Modify `docs/developer/cli-reference.md`

- [ ] Update Provider Center to show live/source-backed/manual/fallback/planned/stale model-source labels.
- [ ] Add or expose pricing refresh/status controls.
- [ ] Allow executable OpenAI-compatible registry-provider activation through secret refs and configured endpoints only.
- [ ] Keep planned rows visible but non-callable with blocker text.
- [ ] Add CLI parity for model refresh, pricing refresh, executable registry-provider status, and blocker reporting.
- [ ] Run component and CLI type checks.

**Verification commands:**

```bash
npm test -- components/skill-mall/providers/__tests__/provider-center.test.tsx app/api/providers/__tests__/providers-route.test.ts
cd cli && npm run type-check
```

### Task 9: Docs And Migration Notes

**Files:**

- Modify `docs/reference/provider-catalog.md`
- Modify `docs/reference/api-routes.md`
- Modify `docs/reference/database-schema.md`
- Modify `docs/user/configuring-providers.md`
- Modify `docs/user/using-the-cli.md`
- Modify `docs/developer/cli-reference.md`
- Modify `docs/developer/deployment.md`
- Modify `docs/developer/faq.md`
- Modify `docs/developer/architecture.md`
- Modify this plan if implementation scope changes.
- Modify `docs/goals/provider-auth-router-phase4/state.yaml`

- [ ] Document executable registry providers and the preserved registry/executable split.
- [ ] Document model-source labels and refresh behavior.
- [ ] Document pricing-source refresh and cache behavior.
- [ ] Document provider promotions and planned-source-review blockers.
- [ ] Document exact secret/auth boundaries.
- [ ] Document known incomplete work and future phase candidates.
- [ ] Run docs drift scans.

**Verification command:**

```bash
rg -n "raw ChatGPT|paste.*token|apiKey.*sk-|future-only|TODO|TBD|metadata_only.*executable" docs/reference docs/user docs/developer docs/goals/provider-auth-router-phase4 docs/recovery/2026-05-20-provider-auth-router-phase-4-implementation-plan.md
```

### Task 10: Code Review And Review Fixes

**Files:**

- Review-only first.
- Fix files only after Judge names exact findings and allowed files.

- [ ] Judge reviews semantic drift from this plan.
- [ ] Judge reviews provider/auth safety.
- [ ] Judge reviews source-backed model/pricing evidence.
- [ ] Judge reviews executable registry-provider config and secret handling.
- [ ] Judge reviews UI/CLI/API parity.
- [ ] Judge reviews test coverage and docs.
- [ ] Worker fixes all PR-owned findings.
- [ ] Record every finding and fix in the board.

**Stop if:** any finding affects raw secret handling, hosted dependency drift, provider mislabeling, executable-provider identity drift, or unverified model/pricing sources.

### Task 11: Final Verification And Completion Receipt

**Files:**

- Modify only `docs/goals/provider-auth-router-phase4/state.yaml` for final receipt unless final docs corrections are required.

- [ ] Run focused provider/router/API/UI tests.
- [ ] Run full tests.
- [ ] Run root TypeScript.
- [ ] Run CLI TypeScript.
- [ ] Run lint and classify failures.
- [ ] Run changed-file secret scan.
- [ ] Run wizard/preview/DS_Store containment scan.
- [ ] Run staged-diff check.
- [ ] Document complete work, incomplete work, blockers, and next safe action.
- [ ] Stop before stage/commit/push unless user approves commit-prep.

**Verification commands:**

```bash
npm test -- lib/providers lib/llm/router app/api/providers components/skill-mall/providers
npm test
npx tsc --noEmit --pretty false
cd cli && npm run type-check
npm run lint
git diff --name-only
git diff --cached --name-only
(git diff --name-only; git ls-files --others --exclude-standard) | xargs rg --pcre2 -n "sk-(proj|live|ant-api)[A-Za-z0-9_-]+|OPENAI_API_KEY=(?!your-|sk-test)[A-Za-z0-9_-]+|ANTHROPIC_API_KEY=(?!your-)[A-Za-z0-9_-]+|CLAUDE_CODE_OAUTH_TOKEN=[A-Za-z0-9_-]+|CODEX_ACCESS_TOKEN=[A-Za-z0-9_-]+"
(git diff --name-only; git ls-files --others --exclude-standard) | rg -n "(wizard|preview|\\.DS_Store)"
```

## Semantic Drift Guard

Reject Phase 4 completion if any of these happen:

- The agent creates another report instead of implementation-ready tasks.
- The agent implements only UI labels and calls auto-updating models complete.
- Registry-only rows remain non-executable without documented blockers.
- The broad provider list collapses back to the narrow direct ProviderID list.
- The agent adds broad provider rows directly to `ProviderID` one by one.
- Model refresh uses generic `/v1/models` for providers that require provider-specific, account-scoped, cloud-project, local-runtime, or source-backed static behavior.
- Pricing refresh requires a hosted gateway account or paid external app.
- Estimated cost is displayed as actual cost.
- Provider/gateway raw secrets, browser tokens, OAuth tokens, or credential file paths are accepted.
- Bifrost, GoModel, LiteLLM, Portkey, or another dashboard becomes the Provider Center source of truth.
- Docs contradict implementation.
- Review findings are skipped.
- Tests/types are not run.
- Incomplete work is not documented.
- Stage/commit/push happens without explicit user approval.

## Completion Criteria

Phase 4 is complete only when:

- Phase 4 implementation starts from updated `main` after the PR queue cleanup.
- Source-backed model refresh exists for approved provider strategies and persists local snapshots.
- OpenAI-compatible registry rows can become executable through a generic, tested SkillMall-owned execution path.
- Planned-source-review rows are either promoted with official evidence and tests or remain blocked with exact evidence.
- Pricing refresh populates local snapshots from an approved source without requiring hosted gateway credentials.
- Provider Center and CLI expose model/pricing refresh status clearly.
- Usage/cost labels preserve actual vs estimated semantics.
- Docs and GoalBuddy receipts are current.
- Code review and review fixes are complete.
- Final verification is complete or blockers are documented with exact evidence.
