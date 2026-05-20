# Provider/Auth Router Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user-facing Provider Center and broad provider catalog layer on top of the Phase 1/2 router so users can configure well-known APIs/gateways/local runtimes, refresh model lists, test access, and inspect usage/cost state without raw secret exposure or hosted gateway requirements.

**Architecture:** Phase 3 does not replace the Phase 1/2 router. It turns that router into a product surface: a provider registry, app/API/CLI configuration workflows, model/pricing refresh status, gateway health checks, and usage/cost visibility. SkillMall remains the source of truth; Bifrost/local gateway backends remain execution backends, not external dashboards.

**Tech Stack:** TypeScript, Next.js 16 app routes and client components, React 19, existing SkillMall design system classes, Vitest, better-sqlite3, existing `lib/providers/*`, PR #8 `lib/llm/router/*`, local SQLite migrations, GoalBuddy.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Planning branch:** `codex/provider-auth-router-phase3-plan`

**Implementation prerequisite:** PR #8, `Provider/Auth Router Phases 1 and 2`, must be merged or the implementation branch must explicitly start from `ff37711` with PR #8 as a stacked prerequisite. Do not implement Phase 3 on this planning branch while `origin/main` lacks the Phase 1/2 router files.

---

## Approval Boundary

This document and `docs/goals/provider-auth-router-phase3/` are planning and GoalBuddy prep artifacts only.

Do not implement Phase 3 code, cleanup unrelated files, stage, commit, push, or open another PR from this planning turn unless the user explicitly approves that publish step.

Phase 3 implementation is approved only when the user runs:

```text
/goal Follow docs/goals/provider-auth-router-phase3/goal.md.
```

## Non-Negotiables

- No hosted gateway/router/proxy/observability service may be required for core SkillMall use.
- No extra paid gateway app may become required infrastructure.
- SkillMall remains the provider/settings/model/cost source of truth.
- Bifrost local remains an execution backend, not a replacement dashboard.
- API-key access must be labeled API access.
- Subscription/tool-session auth must not be collapsed into API-key access.
- SkillMall must not ask users to paste raw ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, or Claude Code credential files.
- Claude Code session/OAuth support must stay inside official Claude Code/local-tooling boundaries.
- OpenAI/Codex session/access-token support must stay inside official Codex/App Server/local-tooling boundaries.
- Provider coverage must include the major APIs the user named: OpenAI, Anthropic, Claude Code, Gemini, Groq, Ollama, OpenRouter, Alibaba Cloud Model Studio/DashScope/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock, Azure OpenAI, Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM, Perplexity, DeepInfra, Cerebras, plus OpenAI-compatible custom providers.
- Model refresh must follow each provider row's declared `discoveryStrategy`. Rows without an official or configured discovery path must show manual, stale, static fallback, or `planned_provider_source_review` status instead of pretending a generic `/v1/models` endpoint exists.
- Cost/usage visibility must distinguish provider-reported actual cost from estimated cost.
- Incomplete work and blockers must be documented in the plan and board receipts before any handoff.

## Current Source And PR Facts

Current `origin/main` still has the old narrow provider settings page and provider catalog:

- `app/settings/providers/page.tsx` is a flat client page that posts raw `apiKey` in the request body and knows only a small provider set.
- `docs/reference/provider-catalog.md` still documents five providers and raw config examples on `origin/main`.
- `docs/reference/api-routes.md` still documents the old Phase 0/early provider configure body on `origin/main`.
- PR #8 introduces the router foundation:
  - auth modes: `env_key`, `local_cli_session`, `none_local`, `gateway_virtual_key`;
  - secret refs: `env`, `none`, `gateway_virtual_key_ref`;
  - gateway backends: `direct`, `bifrost_local`;
  - routing-policy modes: `manual`, `fallback_chain`, `local_first`, `budget_guarded_manual`;
  - model refresh, pricing refresh, costing, request ledger, Bifrost adapter/client, and sanitized provider API/config store behavior.

Phase 3 must begin by reconciling the implementation checkout with PR #8. If PR #8 is not merged, implementation must either stop or explicitly use a stacked branch rooted at `ff37711`.

## Current External Source Receipts

Phase 3 implementation must refresh official docs again before coding. These current receipts establish that the plan is pointed at real provider discovery surfaces:

| Provider/source | Current official evidence to recheck during T902 |
| --- | --- |
| OpenAI | Models can be listed through the OpenAI Models API (`GET /v1/models`). Source: <https://developers.openai.com/api/reference/resources/models/methods/list> |
| Anthropic | Claude API exposes a list models endpoint. Source: <https://platform.claude.com/docs/en/api/models/list> |
| Gemini | Google AI exposes model APIs/docs for model listing. Source: <https://ai.google.dev/api/models> |
| Groq | Groq exposes API reference/model endpoints under its console docs. Source: <https://console.groq.com/docs/api-reference> |
| OpenRouter | OpenRouter exposes `GET /api/v1/models` with pricing and capability metadata. Source: <https://openrouter.ai/docs/api/api-reference/models/get-models> |
| Hugging Face | Hub API can list models by inference provider and expose provider mappings. Source: <https://huggingface.co/docs/inference-providers/main/hub-api> |
| MiniMax | MiniMax exposes OpenAI-compatible `GET /v1/models`. Source: <https://platform.minimax.io/docs/api-reference/models/openai/list-models> |
| DeepSeek | DeepSeek exposes `GET /models`. Source: <https://api-docs.deepseek.com/api/list-models> |
| Mistral | Mistral exposes `GET /v1/models`. Source: <https://docs.mistral.ai/api/endpoint/models> |
| Cohere | Cohere exposes `GET /v1/models`. Source: <https://docs.cohere.com/reference/list-models> |
| xAI | xAI exposes a models endpoint for the authenticating API key. Source: <https://docs.x.ai/developers/rest-api-reference/inference/models> |
| Together AI | Together exposes `GET /models` with pricing/capability metadata. Source: <https://docs.together.ai/reference/models> |
| Fireworks | Fireworks exposes account-scoped model listing. Source: <https://fireworks.ai/docs/api-reference/list-models> |
| Replicate | Replicate exposes public model listing and official model docs. Sources: <https://replicate.com/docs/reference/http/> and <https://replicate.com/docs/topics/models/official-models> |
| NVIDIA NIM | NIM LLM exposes OpenAI-compatible `GET /v1/models` for loaded local/container models. Source: <https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html> |
| Azure OpenAI | Azure model availability is resource/deployment-specific and uses Models/Deployments APIs. Source: <https://learn.microsoft.com/en-sg/azure/ai-services/openai/how-to/working-with-models> |
| Alibaba/DashScope | Alibaba Model Studio/DashScope publishes Qwen API docs and points to current model lists. Source: <https://www.alibabacloud.com/help/doc-detail/3016809.html> |

If any source has moved, the Scout must record the new official URL in the T902 receipt and docs.

## Approved Phase 3 Contract

T903 rejected implementation until this contract is present in the plan and board. Workers must treat this section as binding.

### Provider Identity

Phase 3 must introduce a broad `ProviderRegistryID` or `ProviderCatalogID` for Provider Center rows.

Keep executable `ProviderID` narrow for currently implemented direct/router clients unless a Worker proves a safe, tested expansion for a specific executable adapter. Registry inclusion does not imply a direct router client.

Each registry row may declare:

- `id`: broad registry/catalog ID.
- `executableProviderId`: optional current router provider mapping.
- `gatewayProfile`: optional OpenAI-compatible or Bifrost-local execution mapping.
- `accessModes`: API access, local CLI/session, local runtime, gateway virtual-key access, cloud-project access, or custom OpenAI-compatible access.
- `discoveryStrategy`: one of `openai_compatible_models`, `official_provider_models`, `account_scoped_models`, `cloud_project_scoped_models`, `local_runtime_models`, `manual_custom_models`, `static_fallback_only`, or `planned_provider_source_review`.
- `status`: active/configurable/status-only/planned-source-review state.

### Provider Row Classification

| Classification | Provider rows |
| --- | --- |
| `active_configurable` | `openai`, `anthropic`, `gemini`, `groq`, `openrouter`, `huggingface`, `minimax`, `kimi_moonshot`, `deepseek`, `mistral`, `cohere`, `xai`, `together_ai`, `fireworks`, `replicate`, `cerebras` |
| `gateway_configurable_openai_compatible` | `openai`, `groq`, `openrouter`, `minimax`, `kimi_moonshot`, `deepseek`, `mistral`, `xai`, `together_ai`, `fireworks_when_endpoint_verified`, `cerebras`, `deepinfra_only_after_primary_source_verification` |
| `local_runtime` / `local_tool_session` | `claude_code` is local-tool/session status only and must not ingest raw Claude.ai or Claude Code credentials; `ollama` is local runtime; `nvidia_nim` is local runtime/OpenAI-compatible deployment only when the user supplies a local/container endpoint |
| `cloud_project_required` | `aws_bedrock`, `azure_openai`, `google_vertex_ai` |
| `custom_openai_compatible` | User-supplied compatible endpoint with `baseUrl` plus env or gateway secret ref; model discovery is optional and must be probed, not assumed |
| `planned_provider_source_review` | `alibaba_dashscope_qwen`, `zai`, `perplexity`, `deepinfra_until_primary_source_is_recorded`, `nvidia_nim_managed_or_ambiguous_variants` |

Planned-source-review rows still belong in the Provider Center catalog so the app reflects the full intended provider universe. They must be visibly labeled as not yet implementation-safe and must not run live discovery or test calls until official source evidence is recorded.

### Model Refresh Semantics

Model refresh only calls strategies that are officially supported or explicitly configured:

- `openai_compatible_models`: probe the configured OpenAI-compatible endpoint and normalize returned model IDs.
- `official_provider_models`: use a provider-specific official models endpoint.
- `account_scoped_models`: require account/provider context before discovery.
- `cloud_project_scoped_models`: require project/resource/region/deployment fields before discovery.
- `local_runtime_models`: query the local runtime endpoint and report local availability.
- `manual_custom_models`: allow manual model labels and optional endpoint probing.
- `static_fallback_only`: display fallback labels as non-authoritative.
- `planned_provider_source_review`: do not refresh; show the exact missing-evidence reason.

Static default models are fallback labels only. They must not be presented as authoritative live provider catalogs.

### API Secret-Status Contract

`GET /api/providers` must expose sanitized Provider Center status only:

- configured boolean/status;
- access mode;
- secret-ref type;
- env var name or gateway ref name when configured;
- secret presence/status, last checked, and test status;
- stale/model refresh status;
- missing cloud project/resource/region/deployment fields.

Env var names and gateway ref names are acceptable because they are references, not secret values. The API must never return raw secret values, copied credential file contents, browser/session tokens, or credential file paths.

`POST /api/providers/configure` may accept `env_key`, `gateway_virtual_key_ref`, `local_cli_session`, `none_local`, cloud/project parameters, local endpoint/base URL, and custom OpenAI-compatible base URL. It must reject `apiKey`, `rawKey`, `token`, `sessionToken`, `credentialPath`, browser-token fields, and credential-file ingestion. The web UI must not write provider secrets into `.env.local`.

### CLI Shared-Contract Requirement

CLI provider commands must consume the shared provider registry, model-discovery, config-store, and secret-ref contracts used by app/API. Legacy `skill-mall configure` may remain as a compatibility wrapper, but the CLI must not maintain a separate provider enum, duplicated provider defaults, or independent status vocabulary.

### Additional Stop Conditions

Stop before T904 implementation if any of these become true:

- executable `ProviderID` is widened globally to registry-only rows;
- a provider row is implemented from stale or unofficial evidence instead of `planned_provider_source_review`;
- model refresh assumes every provider or custom endpoint supports `/v1/models`;
- UI/API/CLI accepts raw browser/session tokens, raw API key persistence fields, or credential-file paths;
- CLI creates an independent provider/default catalog instead of shared contracts;
- hosted gateway infrastructure becomes required for core use.

## Phase 3 Deliverables

Phase 3 must deliver a working user-facing provider system, not another report:

- Provider registry/data model for broad provider rows and model discovery strategies.
- Provider Center app surface replacing the raw-key flat settings UI.
- Sanitized configuration API flows for API access, local CLI/session access, local runtime, gateway virtual-key refs, and OpenAI-compatible custom providers.
- Model refresh/status actions visible from app/API/CLI.
- Provider test action that verifies configuration without leaking secrets.
- Usage/cost summary API and UI using the Phase 2 ledger.
- CLI parity for provider list/configure/test/refresh/status.
- Docs updated for users, developers, API routes, provider catalog, and database schema.
- GoalBuddy receipts, blockers, review findings, review fixes, final verification, and commit-prep audit.

## Out Of Scope For Phase 3

- Hosted gateway setup as required infrastructure.
- Multiple gateway backend implementation beyond `direct` and PR #8 `bifrost_local`.
- Implementing every provider as a bespoke SDK client.
- Writing provider secrets to `.env.local` from the web UI.
- Copying Codex/Claude credential files into SkillMall config.
- Broad wizard/preview repairs or unrelated UI cleanup.
- Merging PR #8 from inside Phase 3 unless the user explicitly asks.

## Development Workflow Requirements

The coding agent must follow this workflow:

1. Start from a clean branch.
2. Verify whether PR #8 is merged into `origin/main`.
3. If PR #8 is not merged, stop or create an explicitly stacked implementation branch from `ff37711` only with user approval.
4. Read `AGENTS.md`, this plan, the GoalBuddy board, PR #8 docs, and current source before coding.
5. Use sub-agent orchestration:
   - Scout for source and official-doc evidence.
   - Worker for bounded implementation slices with explicit allowed files.
   - Judge for plan validation, phase review, code review, final verification, and drift guard.
6. Use TDD for risky contracts:
   - write/adjust tests before implementation when behavior changes;
   - keep focused tests attached to each worker task;
   - run full tests and typecheck before completion.
7. Record receipts in `docs/goals/provider-auth-router-phase3/state.yaml` after every task.
8. Update docs and plan if behavior, scope, blocker state, or verification changes.
9. Document all blockers and incomplete work with exact evidence and next safe action.
10. Do not present partial work as complete.
11. Run code review, implement review fixes, and run final verification.
12. Stop before stage/commit/push unless the user explicitly asks for commit-prep.

Expected verification gates:

```bash
npm test -- lib/llm/router lib/providers app/api/providers
npm test -- app/settings/providers
npm test
npx tsc --noEmit --pretty false
npm run lint
git diff --name-only
git diff --cached --name-only
```

`npm run lint` may still fail from known pre-existing unrelated lint errors. Any lint failure must be classified as PR-owned or pre-existing with exact file paths.

## File Map

Implementation should create or modify these files after PR #8 is available:

- `lib/providers/registry.ts`
  - Broad provider registry, provider family metadata, auth/access modes, model discovery strategy, setup links, gateway compatibility, and status labels.
- `lib/providers/model-discovery.ts`
  - Provider-specific model discovery normalizers for OpenAI-compatible, Hugging Face, Replicate, Bedrock/Azure/Vertex, and local runtime strategies.
- `lib/providers/provider-health.ts`
  - Safe provider/gateway/local-runtime status checks.
- `lib/providers/__tests__/registry.test.ts`
- `lib/providers/__tests__/model-discovery.test.ts`
- `lib/providers/__tests__/provider-health.test.ts`
- `app/api/providers/route.ts`
  - Return Provider Center-ready catalog/status/model/cost fields.
- `app/api/providers/configure/route.ts`
  - Accept sanitized config modes, never raw browser/session tokens or credential files.
- `app/api/providers/models/refresh/route.ts`
  - Trigger configured-provider or selected-provider model refresh.
- `app/api/providers/test/route.ts`
  - Test access/config without persisting raw request/response bodies.
- `app/api/providers/usage/route.ts`
  - Return ledger usage/cost summary with actual/estimated labels.
- `app/api/providers/__tests__/providers-route.test.ts`
- `app/settings/providers/page.tsx`
  - Replace flat raw-key form with Provider Center.
- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderCatalogList.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `components/skill-mall/providers/UsageCostPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `cli/src/commands/configure.ts`
- `cli/src/commands/providers.ts`
- `cli/src/index.ts`
- `docs/reference/provider-catalog.md`
- `docs/reference/api-routes.md`
- `docs/reference/database-schema.md`
- `docs/user/configuring-providers.md`
- `docs/goals/provider-auth-router-phase3/state.yaml`

Do not modify wizard/preview files unless a later approved task explicitly changes Phase 3 scope.

## Implementation Tasks

### Task 1: Branch, PR #8, And Scope Gate

**Files:**

- Modify only `docs/goals/provider-auth-router-phase3/state.yaml` for receipts.

- [ ] Run `git status -sb`.
- [ ] Run `git branch --show-current`.
- [ ] Run `gh pr view 8 --json state,mergeStateStatus,headRefOid,url`.
- [ ] Verify whether `origin/main` contains `ff37711`.
- [ ] If PR #8 is unmerged, stop implementation unless user approves a stacked branch from `ff37711`.
- [ ] Confirm staged diff is empty before coding.
- [ ] Record whether implementation is `main_after_phase2_merge` or `stacked_on_phase2`.

**Stop if:** PR #8 is missing, dirty, not cleanly available, or implementation would start from an unknown router state.

### Task 2: Scout Current Source And Official Provider Docs

**Files:**

- Modify only `docs/goals/provider-auth-router-phase3/state.yaml` for receipts.

- [ ] Read `AGENTS.md`.
- [ ] Read this plan.
- [ ] Read PR #8 Phase 1/2 plan and board receipts if present in the checkout.
- [ ] Map current files under `lib/providers`, `lib/llm/router`, `app/api/providers`, `app/settings/providers`, and `cli/src`.
- [ ] Recheck official docs for every provider family in the Phase 3 registry.
- [ ] Record model-discovery endpoint, auth type, pricing availability, OpenAI-compatible status, and implementation risk for each provider.
- [ ] Record hard blockers and any provider that must be marked `planned_provider_source_review` instead of active.

**Verification command:**

```bash
rg -n "ProviderID|ProviderConfig|model-refresh|pricing|llm_requests|providers/configure|settings/providers" lib app cli docs db
```

**Stop if:** any provider row would be implemented from stale or unofficial evidence only.

### Task 3: Judge Phase 3 Contract

**Files:**

- `docs/goals/provider-auth-router-phase3/state.yaml`
- Update this plan only if the Judge finds a required correction.

- [ ] Decide the Phase 3 provider registry contract.
- [ ] Decide which providers are `active_configurable`, `gateway_configurable`, `local_runtime`, `cloud_project_required`, or `planned_provider_source_review`.
- [ ] Preserve the approved `ProviderRegistryID`/`ProviderCatalogID` split from executable `ProviderID`.
- [ ] Preserve the approved provider row classification table from this plan.
- [ ] Preserve the approved discoveryStrategy semantics and stop generic `/v1/models` drift.
- [ ] Preserve the approved API secret-status and configure contracts.
- [ ] Preserve the approved CLI shared-contract requirement.
- [ ] Confirm the app UI can configure broad providers without raw key/session token storage.
- [ ] Confirm the implementation slices are large enough to produce working user-visible behavior.

**Stop if:** the contract requires implementing every provider as a bespoke SDK client or requires hosted gateway infrastructure.

### Task 4: Provider Registry And Model Discovery Contracts

**Files:**

- Create `lib/providers/registry.ts`
- Create `lib/providers/model-discovery.ts`
- Create `lib/providers/__tests__/registry.test.ts`
- Create `lib/providers/__tests__/model-discovery.test.ts`
- Modify `lib/providers/types.ts` if PR #8 types need broad-provider compatibility.
- Modify `docs/reference/provider-catalog.md`

- [ ] Add tests proving required provider IDs exist in the registry.
- [ ] Add tests proving every provider declares auth/access label, setup URL, model discovery strategy, and status.
- [ ] Add tests proving registry rows use `ProviderRegistryID`/`ProviderCatalogID` and do not widen executable `ProviderID` globally.
- [ ] Add tests proving planned-source-review rows are visible but not live-callable.
- [ ] Add tests proving OpenAI-compatible discovery normalizes `data[].id`.
- [ ] Add tests proving provider-specific discovery strategies mark account/project-scoped model lists correctly.
- [ ] Implement the registry and discovery normalizers.
- [ ] Run focused tests.

**Verification command:**

```bash
npm test -- lib/providers/__tests__/registry.test.ts lib/providers/__tests__/model-discovery.test.ts
```

### Task 5: Provider API Expansion

**Files:**

- Modify `app/api/providers/route.ts`
- Modify `app/api/providers/configure/route.ts`
- Create `app/api/providers/models/refresh/route.ts`
- Create `app/api/providers/test/route.ts`
- Create `app/api/providers/usage/route.ts`
- Modify `app/api/providers/__tests__/providers-route.test.ts`
- Modify `docs/reference/api-routes.md`

- [ ] Add route tests for sanitized catalog/status output.
- [ ] Add route tests for sanitized secret status, including env var name/gateway ref name references without raw secret values.
- [ ] Add route tests that raw `apiKey`, raw browser/session token fields, and credential-file paths are rejected.
- [ ] Add route tests for `gateway_virtual_key_ref`, `env_key`, `local_cli_session`, `none_local`, and OpenAI-compatible custom provider config.
- [ ] Add model refresh route tests.
- [ ] Add provider test route tests with secret redaction.
- [ ] Add usage/cost summary route tests with actual/estimated labeling.
- [ ] Implement API route changes.
- [ ] Run focused route tests.

**Verification command:**

```bash
npm test -- app/api/providers/__tests__/providers-route.test.ts
```

### Task 6: Provider Center UI

**Files:**

- Modify `app/settings/providers/page.tsx`
- Create `components/skill-mall/providers/ProviderCenter.tsx`
- Create `components/skill-mall/providers/ProviderCatalogList.tsx`
- Create `components/skill-mall/providers/ProviderConfigPanel.tsx`
- Create `components/skill-mall/providers/ModelRefreshPanel.tsx`
- Create `components/skill-mall/providers/UsageCostPanel.tsx`
- Create `components/skill-mall/providers/__tests__/provider-center.test.tsx`

- [ ] Build a Provider Center first screen, not a landing page.
- [ ] Show provider groups: API providers, local tools/sessions, local runtimes, local gateway, cloud/project providers, custom OpenAI-compatible.
- [ ] Label API access, local CLI/session access, local runtime, and gateway access distinctly.
- [ ] Provide env-var/secret-ref inputs, not raw secret persistence fields.
- [ ] Provide model refresh, test connection, active model, gateway backend, routing policy, and usage/cost panels.
- [ ] Avoid nested cards and oversized marketing UI.
- [ ] Use compact controls suitable for repeated settings work.
- [ ] Run component tests or route-render smoke tests.
- [ ] If app/browser verification is possible, run a local dev server and verify `/settings/providers`.

**Verification commands:**

```bash
npm test -- components/skill-mall/providers/__tests__/provider-center.test.tsx app/api/providers/__tests__/providers-route.test.ts
npm run dev
```

### Task 7: CLI Provider Parity

**Files:**

- Modify `cli/src/commands/configure.ts`
- Create `cli/src/commands/providers.ts`
- Modify `cli/src/index.ts`
- Add or modify CLI tests if the repo has CLI test harness patterns.
- Modify `docs/developer/cli-reference.md`

- [ ] Add `skill-mall providers list`.
- [ ] Add `skill-mall providers status`.
- [ ] Add `skill-mall providers refresh-models`.
- [ ] Add `skill-mall providers test`.
- [ ] Use the shared provider registry/config/discovery contracts instead of duplicating provider defaults.
- [ ] Preserve `skill-mall configure` compatibility.
- [ ] Reject raw `--key` writes and prefer `--key-env`/secret refs.
- [ ] Support gateway/local/custom OpenAI-compatible config flags.
- [ ] Run CLI tests or command smoke tests.

**Verification commands:**

```bash
npm test -- lib/providers
npx tsc --noEmit --pretty false
```

### Task 8: Usage, Cost, Budget, And Health Visibility

**Files:**

- Modify `lib/llm/router/request-ledger.ts` only if summary helpers are not already sufficient.
- Create `lib/llm/router/usage-summary.ts`
- Create `lib/llm/router/__tests__/usage-summary.test.ts`
- Modify `components/skill-mall/providers/UsageCostPanel.tsx`
- Modify `app/api/providers/usage/route.ts`
- Modify `docs/reference/database-schema.md`

- [ ] Add summary tests for per-provider, per-model, per-operation, actual cost, estimated cost, token counts, latency, failures, and routing policy.
- [ ] Implement usage summary helpers without storing prompt/response bodies.
- [ ] Surface actual-vs-estimated labels in API and UI.
- [ ] Surface budget-guard policy status if configured.
- [ ] Run focused usage tests.

**Verification command:**

```bash
npm test -- lib/llm/router/__tests__/usage-summary.test.ts app/api/providers/__tests__/providers-route.test.ts
```

### Task 9: Docs And User Guidance

**Files:**

- Modify `docs/reference/provider-catalog.md`
- Modify `docs/reference/api-routes.md`
- Modify `docs/reference/database-schema.md`
- Modify `docs/user/configuring-providers.md`
- Modify `docs/user/using-the-cli.md`
- Modify `docs/developer/cli-reference.md`
- Modify `docs/developer/deployment.md`
- Modify `docs/developer/faq.md`
- Modify `docs/developer/getting-started.md`
- Modify `docs/developer/architecture.md`
- Modify `docs/reference/pipeline-architecture.md`
- Modify this plan if implementation scope changes.
- Modify `docs/goals/provider-auth-router-phase3/state.yaml` receipts.

- [x] Document every supported access label.
- [x] Document every active provider row and every planned/provider-source-review row.
- [x] Document model refresh behavior and stale-model handling.
- [x] Document actual vs estimated usage/cost.
- [x] Document Bifrost local gateway setup without making hosted gateway use required.
- [x] Document OpenAI/Codex and Claude Code supportability boundaries.
- [x] Document known blockers and incomplete provider mechanisms.

**Verification command:**

```bash
rg -n "raw ChatGPT|paste.*token|apiKey.*sk-|future-only|TODO|TBD" docs/reference docs/user docs/developer docs/goals/provider-auth-router-phase3 docs/recovery/2026-05-20-provider-auth-router-phase-3-implementation-plan.md
```

### Task 10: Code Review And Review Fixes

**Files:**

- Review-only first.
- Fix files only after Judge names exact findings and allowed files.

- [ ] Judge reviews semantic drift from this plan.
- [ ] Judge reviews provider/auth safety.
- [ ] Judge reviews UI behavior and copy.
- [ ] Judge reviews route/config/test coverage.
- [ ] Worker fixes all PR-owned findings.
- [ ] Record each finding and fix in the board.

**Stop if:** any finding affects raw secret handling, hosted dependency drift, unsupported subscription auth, or provider catalog mislabeling.

### Task 11: Final Verification And Completion Receipt

**Files:**

- Modify only `docs/goals/provider-auth-router-phase3/state.yaml` for final receipt unless final docs corrections are required.

- [ ] Run focused provider/router/API tests.
- [ ] Run Provider Center tests.
- [ ] Run full tests.
- [ ] Run TypeScript.
- [ ] Run lint and classify failures.
- [ ] Run changed-file secret scan.
- [ ] Run diff containment.
- [ ] Document complete work, incomplete work, blockers, and next safe action.
- [ ] Stop before stage/commit/push unless user approves commit-prep.

**Verification commands:**

```bash
npm test -- lib/llm/router lib/providers app/api/providers
npm test -- components/skill-mall/providers app/settings/providers
npm test
npx tsc --noEmit --pretty false
npm run lint
git diff --name-only
git diff --cached --name-only
(git diff --name-only; git ls-files --others --exclude-standard) | xargs rg --pcre2 -n "sk-(proj|live|ant-api)[A-Za-z0-9_-]+|OPENAI_API_KEY=(?!your-|sk-test)[A-Za-z0-9_-]+|ANTHROPIC_API_KEY=(?!your-)[A-Za-z0-9_-]+|CLAUDE_CODE_OAUTH_TOKEN=[A-Za-z0-9_-]+|CODEX_ACCESS_TOKEN=[A-Za-z0-9_-]+"
```

## Semantic Drift Guard

Reject Phase 3 completion if any of these happen:

- The agent implements a tiny helper-only slice and calls the phase done.
- The Provider Center still asks for raw API keys as the primary app behavior instead of secret references.
- API access, local CLI/session access, local runtime, and gateway access are visually or semantically conflated.
- The broad provider list is collapsed back to OpenAI/Anthropic/Gemini/Groq/Ollama.
- Model lists remain static-only for providers that expose discovery APIs.
- Cost/usage is hidden, missing, or presents estimated cost as actual cost.
- Hosted gateway/router/observability becomes required.
- Bifrost's dashboard becomes the settings source of truth.
- Docs are left stale or contradict implementation.
- Review findings are skipped.
- Tests/types are not run.
- Incomplete work is not documented.
- Stage/commit/push happens without explicit user approval.

## Completion Criteria

Phase 3 is complete only when:

- PR #8 dependency is resolved or explicitly stacked.
- Provider Center works as the user-facing configuration surface.
- Broad provider registry exists and includes the named provider families.
- Model refresh/test/status actions work for approved provider strategies.
- Usage/cost summary works and labels actual vs estimated cost.
- CLI parity is present.
- Docs are updated.
- GoalBuddy receipts are current.
- Code review and review fixes are complete.
- Final verification is complete or blockers are documented with exact evidence.
