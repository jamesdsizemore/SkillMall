# Provider/Auth Router Phase 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation. Execute through GoalBuddy receipts. Do not implement from this document until the user runs the Phase 6 `/goal` command.

**Phase:** Provider/Auth Router Phase 6 - Model Capability Metadata and Route Eligibility

**Goal:** Build a SkillMall-owned capability and route-eligibility substrate so routing decisions can prove whether a candidate model is usable before cost-aware routing is allowed.

**Architecture:** Phase 6 extends the existing Provider Center, model cache, pricing snapshots, policy simulation, and local SQLite ledger. It does not add a hosted gateway, paid control plane, duplicate dashboard, raw credential store, or one `ProviderID` per broad provider registry row. Capability data is normalized locally from official provider model APIs, source-backed model metadata, Portkey Models, LiteLLM reference metadata, and existing manual/fallback rows with provenance and blocker semantics.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, local SQLite through `better-sqlite3`, SkillMall provider registry, GoalBuddy.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Planning branch:** `codex/provider-auth-router-phase6-plan`

**Implementation prerequisite:** Phase 6 starts from updated `main` containing Phase 5 merge commit `ff04dcd`.

---

## Approval Boundary

This document and `docs/goals/provider-auth-router-phase6/` are planning and GoalBuddy prep artifacts only.

Do not implement Phase 6 code, clean unrelated files, stage, commit, push, or open a Phase 6 PR from this planning turn unless the user explicitly asks for those actions.

Phase 6 implementation is approved only when the user runs:

```text
/goal Follow docs/goals/provider-auth-router-phase6/goal.md.
```

---

## Current Source Facts

These facts were checked on 2026-05-20 and must be revalidated by the Phase 6 Scout before implementation:

- Phase 5 is merged into `main` at `ff04dcd`.
- `llm_models` already has `capabilities_json`, `context_window`, `max_output_tokens`, `provider_registry_id`, and `execution_kind`.
- `llm_pricing_snapshots` already stores provider/model pricing with `provider_registry_id` and `execution_kind`.
- `lib/providers/model-sources.ts` refreshes model lists from provider-specific, OpenAI-compatible, local runtime, manual, source-backed static, and fallback sources.
- `lib/providers/model-sources.ts` currently stores sanitized raw model metadata but does not normalize capability fields into a shared contract.
- `lib/providers/pricing-sources.ts` normalizes Portkey Models and LiteLLM pricing, but it does not normalize model capability flags from those sources.
- `lib/llm/router/routing-policy.ts` supports `manual`, `fallback_chain`, `local_first`, and `budget_guarded_manual`.
- `lib/llm/router/routing-policy-store.ts` validates and stores policy candidates, but candidates do not yet carry route eligibility requirements.
- `lib/llm/router/routing-policy-simulation.ts` evaluates local routing and budget behavior without provider calls, but it does not yet return capability/pricing eligibility blockers.
- `components/skill-mall/providers/PolicyControlPanel.tsx` exposes policy controls but not capability/eligibility status.
- `cli/src/commands/provider-policies.ts` exposes policy commands but not capability/eligibility inspection.
- `cheapest_compatible`, `quality_first`, semantic routing, learned routing, and complexity routing remain unsupported.

---

## Current External Source Findings

Phase 6 must use primary/current sources before normalizing capability fields. The implementation Scout must refresh these links and record exact evidence:

- OpenAI Models API lists available models and basic fields such as id, created, object, and owner/availability. It does not by itself prove rich capability support for each model.
  Source: https://developers.openai.com/api/reference/resources/models/methods/list
- Google Gemini Models API exposes useful capability-like fields including input token limit, output token limit, supported generation methods, and thinking support.
  Source: https://ai.google.dev/api/models
- Anthropic model docs expose model IDs, pricing, extended/adaptive thinking, context windows, max output, vision/text modality, and platform availability.
  Source: https://platform.claude.com/docs/en/about-claude/models/overview
- Cohere model detail API exposes compatible endpoints, context length, features, default endpoints, and deprecation state.
  Source: https://docs.cohere.com/reference/get-model
- OpenRouter models endpoint exposes architecture modalities, context length, pricing, supported parameters, and top-provider max completion tokens.
  Source: https://openrouter.ai/docs/api/api-reference/models/get-models
- Portkey Models is an MIT-licensed model/pricing/config data repository with provider pricing JSON, model configuration endpoints, additional billing units, and pricing units in cents per token.
  Source: https://github.com/Portkey-AI/models
- LiteLLM `model_prices_and_context_window.json` carries reference metadata such as mode, max tokens, max input/output tokens, supported regions, and boolean capability flags like function calling, prompt caching, reasoning, response schema, system messages, vision, audio, and web search.
  Source: https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json

Do not infer capability support from marketing copy alone. Use source-specific confidence levels and blockers.

---

## Non-Negotiables

- No hosted gateway/router/proxy/observability product may be required.
- No paid external control plane may become required infrastructure.
- SkillMall remains the provider/settings/model/pricing/policy/budget/cost source of truth.
- Do not accept raw API key values in JSON bodies or config files.
- Do not accept ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, copied credential-file contents, browser session cookies, or credential-file paths.
- Do not widen `ProviderID` by adding one enum value per broad provider registry row.
- Do not store prompt or response bodies in capability checks, simulations, request ledger metadata, or review artifacts.
- Do not implement `quality_first`, semantic routing, learned routing, or complexity routing in Phase 6.
- Do not implement `cheapest_compatible` unless Scout and Judge prove deterministic capability matching, pricing coverage, missing-data blockers, and safe no-provider-request simulation.
- Do not silently treat unknown capability as supported.
- Do not silently treat missing price as free or cheapest.
- Do not present source-backed/reference metadata as live account availability.
- Document blockers, incomplete work, review findings, review fixes, and verification results in GoalBuddy `state.yaml`.
- Do not hand off partial work as complete.

---

## Phase 6 Scope

### In Scope

- Revalidate current source and current official/maintainer capability metadata sources.
- Define a normalized model capability contract for SkillMall.
- Normalize capability metadata from existing model sources and pricing/reference sources where source data supports it.
- Persist normalized capability metadata in existing `llm_models.capabilities_json`, `context_window`, and `max_output_tokens` unless a real schema blocker is proven.
- Add a route eligibility engine that can answer whether a policy candidate can satisfy a requested operation without sending provider requests.
- Add deterministic blockers for missing model metadata, missing pricing, missing capability support, stale/fallback-only metadata, disabled candidates, and unsupported routing modes.
- Extend policy simulation so it can include capability and pricing eligibility results without provider calls.
- Add API/CLI/Provider Center visibility for model capability and route eligibility status.
- Conditionally promote `cheapest_compatible` only if Scout and Judge approve the gate.
- Update docs for capability sources, route eligibility, blockers, and any promoted mode.
- Run focused tests, full tests, TypeScript, lint classification, secret scan, code review, review fixes, final verification, and diff containment.

### Conditionally In Scope

`cheapest_compatible` may be implemented only if the Phase 6 Scout and Judge both prove:

- Each candidate can be checked against the requested operation's required capabilities.
- Each candidate has usable pricing for the relevant cost dimensions.
- Missing capability data blocks the candidate instead of guessing.
- Missing price data blocks the candidate instead of treating it as zero.
- Ties are deterministic and explainable.
- Simulation never calls providers and never stores prompt/response content.
- UI/CLI/API explain why a candidate was chosen or rejected.

If any condition fails, Phase 6 still completes by shipping capability normalization and eligibility blockers, while `cheapest_compatible` remains rejected/future with the exact blocker recorded.

### Out Of Scope

- `quality_first` routing.
- Semantic routing, learned routing, complexity routing, or eval-based routing.
- A hosted gateway dashboard or hosted budget/observability product.
- Keychain integration, OAuth device flow, Codex session auth, Claude Code token auth, or browser session-token handling.
- New provider-family execution unrelated to capability/eligibility metadata.
- Provider Center redesign beyond capability/eligibility surfaces.
- Wizard/preview salvage or cleanup.
- Fixing unrelated lint errors unless the user explicitly approves a separate cleanup slice.

---

## Phase 6 Contracts

### 1. Model Capability Contract

Create or extend a shared TypeScript contract under `lib/llm/router/` or `lib/providers/` that can represent:

- `source`: official API, official docs, Portkey Models, LiteLLM reference, source-backed static, manual, fallback, or unknown.
- `sourceUrl`
- `sourceUpdatedAt` or `fetchedAt`
- `confidence`: `authoritative`, `source_backed`, `reference`, `manual`, `fallback`, or `unknown`
- `capabilities`: text input/output, image input/output, audio input/output, tool/function calling, parallel tool calling, structured output/response schema, prompt caching, reasoning/thinking, web/search, embeddings, rerank, image generation, transcription, speech, video input/output where source data supports them
- `limits`: context window, max input tokens, max output tokens
- `mode` or endpoint family where source data supports it
- `blockers`: missing metadata, stale metadata, account-scoped source, provider-specific source required, unsupported operation, missing price

The contract must not store secrets, prompts, responses, raw auth headers, or credential paths.

### 2. Operation Requirement Contract

Define a small SkillMall operation requirement vocabulary before route eligibility:

- `skill.generate`
- `skill.preview`
- `skill.optimize_prompt`
- `provider.test`
- `chat.text`
- optional `embedding` only if already used by the source

Each requirement must specify required capabilities and optional cost dimensions. Do not create a broad DSL in Phase 6.

### 3. Route Eligibility Contract

The route eligibility engine must return:

- candidate id
- provider registry id
- executable provider id
- model id
- enabled state
- capability status: eligible, blocked, or unknown
- pricing status: available, missing, stale, or not required
- blocker codes
- human-readable explanation
- evidence/source metadata

Unknown is not eligible for automatic cost-aware routing.

### 4. `cheapest_compatible` Contract

If approved, `cheapest_compatible` must:

- Use only eligible candidates.
- Require usable price estimates.
- Block candidates with missing prices.
- Sort by estimated cost, then stable candidate id.
- Return all rejected candidates and reasons.
- Be available in router, store validation, API, UI, CLI, docs, and tests.

If not approved, it must remain rejected and docs must explain the missing blocker.

### 5. API Contract

Expected additions may be new routes or route extensions:

- Capability status for provider/model rows.
- Route eligibility simulation for a policy and operation requirement.
- Optional `cheapest_compatible` support only if approved.

API must use shared validation and must reject raw secret/prompt/response-like fields.

### 6. UI Contract

Provider Center should show capability/eligibility information without becoming a separate router product:

- model capability status
- metadata source/confidence
- missing-data blockers
- route simulation blockers
- pricing availability distinction

### 7. CLI Contract

CLI should expose capability/eligibility visibility using the same local contracts:

- list/show model capabilities where available
- simulate route eligibility by policy and operation
- explain missing capability/pricing blockers

### 8. Docs Contract

Update:

- `docs/reference/api-routes.md`
- `docs/reference/database-schema.md`
- `docs/developer/cli-reference.md`
- `docs/user/configuring-providers.md`
- this Phase 6 plan if implementation discovers a contract change

Docs must preserve auth boundaries and must label source-backed/reference capability data separately from live account availability.

---

## File Ownership Map

Likely implementation files:

- Shared capability normalization: `lib/llm/router/model-capabilities.ts`, `lib/providers/model-sources.ts`, `lib/providers/pricing-sources.ts`
- Route eligibility: `lib/llm/router/route-eligibility.ts`, `lib/llm/router/routing-policy.ts`, `lib/llm/router/routing-policy-simulation.ts`
- Policy store/modes if approved: `lib/llm/router/types.ts`, `lib/llm/router/routing-policy-store.ts`, `lib/llm/router/secret-refs.ts`
- API: `app/api/providers/models/refresh/route.ts`, `app/api/providers/policies/simulate/route.ts`, optional `app/api/providers/capabilities/route.ts`, provider API tests
- UI: `components/skill-mall/providers/ProviderCenter.tsx`, `components/skill-mall/providers/PolicyControlPanel.tsx`, optional `components/skill-mall/providers/ModelCapabilityPanel.tsx`, provider UI tests
- CLI: `cli/src/index.ts`, `cli/src/commands/provider-policies.ts`, optional `cli/src/commands/provider-models.ts`
- Tests: `lib/llm/router/__tests__/model-capabilities.test.ts`, `lib/llm/router/__tests__/route-eligibility.test.ts`, existing policy/store/simulation tests, provider route tests, provider-center tests
- Docs: files listed in the docs contract
- Database: no migration expected unless Scout/Judge prove existing columns cannot represent required metadata

---

## Development Workflow Requirements

Phase 6 implementation must follow this workflow:

- Start from updated `main` containing Phase 5 merge commit `ff04dcd`.
- Create or use a dedicated `codex/` implementation branch.
- Run and record branch/diff/staged-file gate before implementation.
- Revalidate current source and official/maintainer capability sources before writing code.
- Use sub-agent orchestration only for clear ownership and disjoint write sets.
- Do not release Workers until Judge locks capability, operation, eligibility, cheapest-gate, UI/API/CLI, and docs contracts.
- Keep Worker scopes narrow and record allowed files in `state.yaml`.
- Update `state.yaml` after every meaningful task with receipts, commands, blockers, and incomplete work.
- If a task cannot be completed, document exactly what failed, why, and what remains.
- Do not hand off partial work as complete.
- Run focused tests for changed modules.
- Run `npm test` unless an environmental blocker is documented.
- Run `npx tsc --noEmit --pretty false`.
- Run `npm run lint`; classify pre-existing unrelated lint failures separately from Phase 6-owned failures.
- Run a secret-safety scan over changed files.
- Run code review before commit-prep.
- Fix actionable code review findings.
- Run final verification after review fixes.
- Run diff containment before staging.
- Stage/commit/push/open PR only when the user explicitly approves commit-prep or publish.

---

## Sub-Agent Orchestration

Recommended task sequence:

1. PM gate validates branch, mainline, dirty state, and Phase 5 merge presence.
2. Scout maps current source and current official/maintainer capability metadata sources.
3. Judge locks the capability/eligibility contract and decides whether `cheapest_compatible` is in or out.
4. Worker implements shared capability normalization and tests.
5. Worker persists/refreshes capability metadata through existing model refresh surfaces and tests.
6. Worker implements route eligibility and simulation blockers with tests.
7. Conditional Worker implements `cheapest_compatible` only if approved; otherwise records the blocker and keeps it rejected.
8. Worker adds Provider Center/API/CLI visibility for capability and eligibility.
9. Worker updates docs.
10. Judge performs code review, semantic-drift review, auth/secret review, and mode-promotion review.
11. Worker fixes review findings.
12. PM performs final verification, blocker/incomplete-work report, diff containment, and commit-prep readiness.

Workers are not alone in the codebase. They must not revert other work, must respect existing edits, and must coordinate through board receipts.

---

## Verification Commands

Final verification must include:

```bash
npm test -- lib/llm/router app/api/providers components/skill-mall/providers
npm test
npx tsc --noEmit --pretty false
npm run lint
git diff --check
git diff --name-only
git diff --cached --name-only
node /Users/jamesdsizemore/.codex/plugins/cache/goalbuddy/goalbuddy/0.3.7/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/provider-auth-router-phase6/state.yaml
```

Expected lint behavior: `npm run lint` may still fail on pre-existing unrelated lint errors. Phase 6-owned lint failures are blockers.

Secret scan must include changed files and look for raw key/token/session/credential/prompt/response patterns. The receipt must include the command and classification.

---

## Completion Oracle

Phase 6 is complete only when receipts and final verification prove:

- SkillMall has a normalized model capability contract with source/confidence metadata.
- Existing model refresh and source-backed metadata can populate `llm_models.capabilities_json`, `context_window`, and `max_output_tokens` where supported.
- Route eligibility can deterministically accept/block candidates for a named operation without provider calls.
- Simulation returns capability/pricing blockers and chosen/rejected candidates without prompt/response storage.
- `cheapest_compatible` is either safely promoted through the gate or remains rejected with the exact missing blocker documented.
- Provider Center, API, CLI, database docs, and user docs agree.
- No raw secrets, tokens, session cookies, credential files, copied credential contents, credential paths, prompt bodies, or response bodies are accepted or persisted.
- Focused tests, full tests, TypeScript, lint classification, secret scan, code review, review fixes, and diff containment are complete.
- Any incomplete work is documented with exact blockers and next actions.

---

## Likely Misfires

- Implementing `cheapest_compatible` by sorting incomplete price rows.
- Treating fallback/manual model labels as authoritative capability data.
- Treating OpenAI `/models` basic IDs as proof of tool/vision/reasoning support.
- Treating Portkey or LiteLLM reference metadata as live account availability.
- Creating a broad operation/capability DSL before SkillMall needs it.
- Adding a new hosted router/gateway product.
- Adding broad `ProviderID` enum values for every registry row.
- Storing prompt/response bodies to determine operation requirements.
- Skipping docs or CLI parity.
- Calling Phase 6 complete without code review and final blocker/incomplete-work receipts.

---

## Starter Command

```text
/goal Follow docs/goals/provider-auth-router-phase6/goal.md.
```
