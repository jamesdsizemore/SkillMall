# Provider Center Product Roadmap Master Plan

> **For agentic workers:** This is a master roadmap, not approval to implement. Do not code from this document alone. Create and approve a dedicated phase implementation plan plus GoalBuddy board before each implementation phase.

**Goal:** Turn the stabilized provider/auth/router foundation into a deliberate, user-facing Provider Center product without repeating the rushed fork pattern.

**Architecture:** Keep SkillMall as the source of truth for provider configuration, model status, routing policy, usage, budgets, and cost visibility. The existing router, registry, secret-reference boundary, local SQLite ledger, Provider Center components, and provider API routes remain the base. Later phases improve the product surface in controlled increments instead of replacing it with an external dashboard, hosted gateway, or broad one-off provider rewrite.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest, local SQLite with `better-sqlite3`, existing SkillMall provider registry/router modules, CLI surfaces, docs, GoalBuddy.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Planning status:** Draft master roadmap for user approval.

---

## Approval Boundary

This document lays out proposed phases only.

Do not implement code, clean files, stage, commit, push, open a PR, or create per-phase GoalBuddy boards from this roadmap unless the user explicitly approves the next planning step.

The intended sequence is:

1. Approve or revise this master roadmap.
2. Create one individual phase implementation plan.
3. Create that phase's GoalBuddy board.
4. Review/fix the plan and board for semantic drift.
5. Start implementation only when the user runs that phase's `/goal` command.
6. Code review, fix, verify, commit-prep, publish, and merge that phase before starting the next phase unless the user explicitly approves stacked work.

---

## Current Source Baseline

These facts were checked from current source on 2026-05-21. Each implementation phase must revalidate them before writing code.

- The repo is clean on `main` and tracks `origin/main`.
- The provider/auth/router Phase 1-7 docs and GoalBuddy boards exist under `docs/recovery/` and `docs/goals/provider-auth-router-phase*/`.
- Provider Center currently lives in `components/skill-mall/providers/ProviderCenter.tsx`.
- Provider Center currently composes:
  - `ProviderCatalogList.tsx`
  - `ProviderConfigPanel.tsx`
  - `ModelRefreshPanel.tsx`
  - `PolicyControlPanel.tsx`
  - `UsageCostPanel.tsx`
- Provider API routes currently live under `app/api/providers/`.
- Router/provider source currently spans:
  - `lib/providers/registry.ts`
  - `lib/providers/model-discovery.ts`
  - `lib/providers/model-sources.ts`
  - `lib/providers/pricing-sources.ts`
  - `lib/llm/router/config.ts`
  - `lib/llm/router/create-client.ts`
  - `lib/llm/router/request-ledger.ts`
  - `lib/llm/router/usage-summary.ts`
  - `lib/llm/router/routing-policy.ts`
  - `lib/llm/router/routing-policy-store.ts`
  - `lib/llm/router/routing-policy-simulation.ts`
  - `lib/llm/router/route-eligibility.ts`
- Provider Center already exposes broad provider groups, reference-only configuration, model refresh/test controls, routing policy controls, simulation results, pricing refresh, and usage/cost summary cards.
- The broad provider registry already includes OpenAI, Anthropic, Claude Code, Gemini, Groq, Ollama, OpenRouter, Alibaba/DashScope/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock, Azure OpenAI, Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM, Perplexity, DeepInfra, Cerebras, and custom OpenAI-compatible endpoints.
- Direct executable `ProviderID` remains intentionally narrower: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`.
- OpenAI-compatible registry rows can execute through the generic OpenAI-compatible target without becoming direct `ProviderID` values.
- Provider configuration rejects raw secret fields and credential-file paths in `app/api/providers/configure/route.ts`.
- Request ledger metadata is scrubbed in `lib/llm/router/request-ledger.ts`.
- Usage summaries already aggregate by provider, model, operation, auth mode, route backend, routing policy, and budget policy.
- Current user docs already explain safe provider configuration in `docs/user/configuring-providers.md` and provider catalog boundaries in `docs/reference/provider-catalog.md`.

This baseline means the next work is not "invent provider/auth/router again." The next work is making the existing capability usable, trustworthy, inspectable, and hard to misconfigure.

---

## Non-Negotiables For The Whole Roadmap

- No hosted apps, paid hosted dashboards, paid external control planes, or extra-cost infrastructure as required dependencies.
- Open source projects may be used only when integrated into SkillMall's own product surface, not attached as a separate dashboard users must manage.
- SkillMall remains the app-level source of truth for provider settings, routing policies, model status, budget status, and usage/cost summaries.
- Do not ask users to paste raw API keys, ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, browser cookies, credential-file paths, or provider credential-file contents.
- API-key access remains optional and must be labeled as API access.
- Subscription/account/tool-session auth must remain separate from API-key access.
- Claude Code CLI auth remains local tool/session access; SkillMall must not copy Claude Code credential files.
- Do not widen `ProviderID` one row at a time for every broad catalog provider unless a dedicated phase implements and tests a real executable adapter.
- Do not promote unsupported routing modes by implication. `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, and eval routing require explicit future approval gates.
- Do not store prompt or response bodies in tests, provider checks, simulations, request ledger metadata, CLI output, Provider Center state, docs, or GoalBuddy receipts.
- No phase may hand off partial work as complete. Incomplete work must be documented with exact blocker, evidence, and next safe action.
- Plans, docs, and GoalBuddy receipts must be updated when behavior, scope, blockers, or verification results change.

---

## Proposed Phase Map

### Phase 0: Product Audit + Workflow Contract

**Purpose:** Slow down and define the actual Provider Center product workflow before changing implementation.

**Primary outcome:** A source-grounded UX/workflow contract that names what a user should be able to do, what the app already supports, what is confusing, and which gaps belong to later phases.

**Likely deliverables:**

- Current-state audit of Provider Center UI, API routes, CLI commands, docs, and tests.
- User workflow map for provider setup, model refresh, provider testing, policy setup, cost review, and failure diagnosis.
- Gap matrix separating:
  - already implemented but poorly surfaced
  - missing UX
  - missing backend contract
  - missing docs
  - future research
- Explicit acceptance criteria for the rest of this roadmap.

**Out of scope:** New product UI, provider expansion, new routing modes, new auth modes, gateway adoption decisions.

**Required board shape:** Read-only Scout first, Judge review second, PM final roadmap amendment task. No Worker code tasks.

### Phase 1: Provider Center Information Architecture

**Purpose:** Make the Provider Center navigable and understandable without changing the underlying provider/router contracts.

**Primary outcome:** A better UI structure for the current capabilities: provider selection, safe configuration, model status, policy controls, and usage/cost visibility.

**Likely deliverables:**

- Provider Center layout plan and implementation.
- Clear separation of catalog, selected provider setup, live status, model data, routing policy, and usage/cost.
- Better empty/loading/error states.
- Safer labels for API access, local session access, local runtime, gateway reference, cloud project, and metadata-only rows.
- Browser walkthrough proof across desktop and mobile viewports if the dev server can run.

**Out of scope:** New providers, new auth types, new routing algorithms, external dashboards.

**Current source starting points:**

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderCatalogList.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `components/skill-mall/providers/PolicyControlPanel.tsx`
- `components/skill-mall/providers/UsageCostPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`

### Phase 2: Configuration UX + Setup Guidance

**Purpose:** Make safe provider configuration feel like a product workflow instead of a raw form.

**Primary outcome:** A guided configuration experience that helps users set references, endpoints, model labels, and local runtime/session options without accepting secrets.

**Likely deliverables:**

- Per-access-mode setup copy and validation.
- Provider-specific help states for API env refs, local CLI/session, local runtime, OpenAI-compatible endpoints, gateway refs, and cloud/project rows.
- Inline validation for reference names, base URLs, endpoint-required rows, manual model labels, and auth-mode mismatches.
- Save/test/refresh sequencing that prevents misleading status.
- Tests proving raw secrets and credential paths remain rejected.

**Out of scope:** OAuth/device flows, raw token storage, keychain storage, credential-file ingestion, one-off provider adapters.

**Current source starting points:**

- `app/api/providers/configure/route.ts`
- `lib/llm/router/secret-refs.ts`
- `lib/llm/router/config.ts`
- `lib/providers/config-store.ts`
- `docs/user/configuring-providers.md`

### Phase 3: Model Refresh + Capability Status Polish

**Purpose:** Make model availability, freshness, capability confidence, and blockers understandable enough for users to act on.

**Primary outcome:** Provider Center clearly explains whether models came from live provider APIs, local runtime, source-backed static metadata, manual labels, fallback labels, reference metadata, or blocked sources.

**Likely deliverables:**

- Model status UX with freshness, source, confidence, and blocker details.
- Refresh controls that explain why refresh is enabled or disabled.
- Manual model management polish for custom or source-backed rows.
- Tests for stale/fallback/manual/reference/blocker presentation.
- Docs parity for model refresh behavior.

**Out of scope:** Automatic provider-wide crawling, unsafe generic `/v1/models` probing, treating reference metadata as live account availability.

**Current source starting points:**

- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `app/api/providers/models/refresh/route.ts`
- `lib/providers/model-discovery.ts`
- `lib/providers/model-sources.ts`
- `lib/llm/router/model-refresh.ts`
- `lib/llm/router/model-capabilities.ts`

### Phase 4: Usage, Cost, Budget Dashboard

**Purpose:** Turn the existing ledger and summaries into an actionable local cost/usage dashboard.

**Primary outcome:** Users can see what SkillMall used, what succeeded or failed, token totals, latency, estimated versus actual cost, provider/model/operation breakdowns, and budget policy status.

**Likely deliverables:**

- Usage/cost dashboard improvements in Provider Center.
- Filters or views for provider, model, operation, auth mode, route backend, and routing policy.
- Clear "actual cost" versus "estimated cost" treatment.
- Empty-state and unavailable-ledger behavior.
- Budget policy status surfaced with actionable labels.
- Tests for aggregation display and no prompt/response/secret leakage.

**Out of scope:** Hosted observability, billing reconciliation claims, exact invoice replacement, storing prompt/response content.

**Current source starting points:**

- `components/skill-mall/providers/UsageCostPanel.tsx`
- `app/api/providers/usage/route.ts`
- `lib/llm/router/usage-summary.ts`
- `lib/llm/router/request-ledger.ts`
- `lib/llm/router/costing.ts`
- `lib/llm/router/pricing-refresh.ts`

### Phase 5: Routing Policy UX + Simulation Explainability

**Purpose:** Make routing policies understandable, safe to edit, and explainable before they affect real requests.

**Primary outcome:** Users can create, activate, disable, and simulate supported policies with clear route eligibility, budget, capability, and pricing blockers.

**Likely deliverables:**

- Policy editor improvements for supported modes only.
- Candidate list UX instead of a single fragile current-provider candidate.
- Simulation result details with selected/skipped/blocked candidates.
- Budget guardrail explanations.
- Tests for no-provider-call simulation, top-level operation/requirePricing preservation, unsupported mode hiding, and blocker explanations.

**Out of scope:** `cheapest_compatible`, `quality_first`, semantic routing, learned routing, eval routing, or automatic optimization unless a later phase explicitly approves them.

**Current source starting points:**

- `components/skill-mall/providers/PolicyControlPanel.tsx`
- `app/api/providers/policies/route.ts`
- `app/api/providers/policies/simulate/route.ts`
- `lib/llm/router/routing-policy.ts`
- `lib/llm/router/routing-policy-store.ts`
- `lib/llm/router/routing-policy-simulation.ts`
- `lib/llm/router/route-eligibility.ts`

### Phase 6: Provider Catalog Expansion Governance

**Purpose:** Add a disciplined path for broad provider coverage without turning every provider into an improvised adapter.

**Primary outcome:** A provider catalog governance system that records evidence, supportability, discovery strategy, executable mapping, docs, and blockers before a provider row changes status.

**Likely deliverables:**

- Provider row evidence checklist.
- Registry status/review tooling or tests.
- Catalog docs generated or verified from `lib/providers/registry.ts`.
- Clear flow for promoting planned/source-backed/provider-specific rows.
- Research packet requirements for new providers or changed official APIs.
- Optional provider additions only after source-backed evidence and approval.

**Out of scope:** Mass-adding executable adapters, expanding provider status from memory, promoting providers from marketing copy, or bypassing official docs/maintainer source review.

**Current source starting points:**

- `lib/providers/registry.ts`
- `docs/reference/provider-catalog.md`
- `docs/user/configuring-providers.md`
- `lib/providers/__tests__/registry.test.ts`
- `lib/providers/__tests__/model-discovery.test.ts`

### Phase 7: Final Product E2E Audit + Hardening

**Purpose:** Prove the Provider Center product track works end to end after the UX/dashboard/policy/catalog phases.

**Primary outcome:** A final evidence-backed pass that fixes only current-source defects, records remaining blockers, and proves docs/API/UI/CLI/router behavior agree.

**Likely deliverables:**

- End-to-end workflow matrix from user actions to API routes, router modules, database rows, tests, docs, and browser proof.
- Phase-owned bug fixes only.
- Final docs parity updates.
- Secret scan and prompt/response leakage scan.
- Browser walkthrough proof if environment allows.
- Final readiness report.

**Out of scope:** New feature expansion, new auth modes, new routing modes, new provider families, unrelated cleanup.

---

## Cross-Phase Development Workflow

Every individual implementation phase must include this workflow in its phase plan and GoalBuddy board:

1. Verify branch, PR, mainline, and dirty state before work.
2. Read `AGENTS.md`, the master roadmap, the phase plan, the GoalBuddy board, relevant prior receipts, and current source.
3. Update the phase plan if current source invalidates an assumption before coding.
4. Use Scout for read-only source mapping and gap evidence.
5. Use Judge for scope, semantic drift, auth/secret, testing, and final completion gates.
6. Use Worker only for bounded implementation slices with explicit allowed files and disjoint write scopes.
7. After every Worker slice, run focused verification and update board receipts with changed files, commands, blockers, and incomplete work.
8. Keep docs current when behavior, scope, blockers, or verification results change.
9. Run code review before commit-prep.
10. Fix actionable review findings.
11. Run final verification:
    - focused phase tests
    - `npm test`
    - `npx tsc --noEmit --pretty false`
    - `npm run lint`
    - `git diff --check`
    - secret scan over changed and untracked files
    - GoalBuddy board checker
    - browser proof when the phase changes visible UI
12. Document skipped checks with exact blockers and next safe action.
13. Stop before stage/commit/push/open PR unless the user explicitly asks for commit-prep or publish.

---

## Required Phase Plan Contents

Each individual phase plan must include:

- Approval boundary.
- Current source facts verified that day.
- In-scope and out-of-scope lists.
- Non-negotiables inherited from this master roadmap.
- Exact file map.
- Test map.
- UI/browser proof map if user-facing UI changes.
- Documentation update requirements.
- Sub-agent orchestration.
- Semantic drift risks and explicit guardrails.
- Known blockers.
- Completion criteria.
- Commit-prep/publish criteria.
- Starter `/goal` command.

If a phase plan cannot name the exact files, tests, and proof it expects, that phase is not ready for a GoalBuddy board.

---

## Required GoalBuddy Board Contents

Each phase GoalBuddy board must include:

- One active task at a time.
- A read-only Scout task before Worker code.
- A Judge plan/scope gate before Worker code.
- Worker tasks with explicit allowed files.
- Review task before final verification.
- Review-fix task if findings exist.
- Final verification task.
- Final receipt task with complete work, incomplete work, blockers, exact commands/results, and next safe action.
- Stop conditions for raw-secret handling, unsupported auth, unsupported routing modes, hosted dependency drift, duplicate dashboard drift, provider-catalog overreach, and partial handoff.

The board must not ask a coding agent to "improve the Provider Center" generically. Every Worker card must name the behavior, files, tests, and proof.

---

## Recommended Next Step

Do not create all phase boards yet.

First approve or revise this master roadmap. Then create Phase 0 as the first individual phase plan and GoalBuddy board:

```text
Provider Center Product Phase 0: Product Audit + Workflow Contract
```

Phase 0 should be read-only and should turn this roadmap into a verified product workflow contract before any new implementation starts.
