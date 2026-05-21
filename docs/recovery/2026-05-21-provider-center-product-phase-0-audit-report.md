# Provider Center Product Phase 0 Audit Report

**Phase:** Provider Center Product Phase 0 - Product Audit + Workflow Contract

**Status:** Complete draft for review.

**Scope:** Documentation/audit only. No product code, tests, API routes, CLI commands, router files, database files, or provider files were changed.

**Source roadmap:** `docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md`

**Phase plan:** `docs/recovery/2026-05-21-provider-center-product-phase-0-implementation-plan.md`

**GoalBuddy board:** `docs/goals/provider-center-product-phase0/state.yaml`

**Date caveat:** Artifact filenames use `2026-05-21`; local execution timestamps in GoalBuddy receipts use `2026-05-20` America/Los_Angeles. This is a planning artifact label/timezone context issue, not a product blocker.

---

## Executive Summary

The provider/auth/router substrate is real and substantially implemented. The next work should not restart router research or rebuild the architecture. The current problem is product clarity: Provider Center exposes powerful status, configuration, model, policy, simulation, usage, and cost data, but it is dense, terse, and workflow-heavy.

The approved master roadmap still holds. Phase 1 should improve Provider Center information architecture before deeper configuration, model, usage, policy, or provider-governance work begins.

No master roadmap amendment is required from Phase 0.

---

## Source Files Inspected

Primary UI:

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderCatalogList.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `components/skill-mall/providers/PolicyControlPanel.tsx`
- `components/skill-mall/providers/UsageCostPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`

Provider API:

- `app/api/providers/route.ts`
- `app/api/providers/configure/route.ts`
- `app/api/providers/test/route.ts`
- `app/api/providers/models/refresh/route.ts`
- `app/api/providers/policies/route.ts`
- `app/api/providers/policies/simulate/route.ts`
- `app/api/providers/usage/route.ts`
- `app/api/providers/pricing/refresh/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`

Provider/router substrate:

- `lib/providers/types.ts`
- `lib/providers/registry.ts`
- `lib/providers/model-discovery.ts`
- `lib/providers/model-sources.ts`
- `lib/providers/pricing-sources.ts`
- `lib/llm/router/config.ts`
- `lib/llm/router/create-client.ts`
- `lib/llm/router/request-ledger.ts`
- `lib/llm/router/usage-summary.ts`
- `lib/llm/router/costing.ts`
- `lib/llm/router/pricing-refresh.ts`
- `lib/llm/router/model-refresh.ts`
- `lib/llm/router/model-capabilities.ts`
- `lib/llm/router/route-eligibility.ts`
- `lib/llm/router/routing-policy.ts`
- `lib/llm/router/routing-policy-store.ts`
- `lib/llm/router/routing-policy-simulation.ts`
- relevant tests under `lib/providers/**/__tests__` and `lib/llm/router/__tests__`

CLI and docs:

- `cli/src/commands/providers.ts`
- `cli/src/commands/providers.test.ts`
- `cli/src/commands/provider-policies.ts`
- `cli/src/commands/provider-policies.test.ts`
- `docs/user/configuring-providers.md`
- `docs/user/using-the-cli.md`
- `docs/developer/cli-reference.md`
- `docs/reference/provider-catalog.md`
- `docs/reference/api-routes.md`

GoalBuddy evidence:

- `docs/goals/provider-center-product-phase0/notes/T002-source-evidence-map.md`
- `docs/goals/provider-center-product-phase0/notes/T003-workflow-gap-matrix.md`
- `docs/goals/provider-center-product-phase0/notes/T004-judge-review.md`

---

## Workflow Map

| Workflow | Current user path | Current substrate | Current proof | Product quality classification |
| --- | --- | --- | --- | --- |
| Provider catalog | User opens Provider Center and selects a grouped provider row. | Provider Center catalog UI, sanitized provider API, broad registry. | UI render tests, API catalog tests, registry tests, provider catalog docs. | Implemented but confusing at scale. |
| Safe configuration | User picks config mode, reference/base URL/model/manual labels, and saves. | Config panel, configure API, secret refs, auth-mode validation, config store. | API tests reject raw secrets/path refs and persist valid references; UI tests reject raw secret prompts. | Implemented but too form-like. |
| Provider status/test | User clicks test status or runs CLI test. | Test action, provider test API, provider CLI. | API safety tests, CLI safety tests, user/developer docs. | Implemented but status semantics are terse. |
| Model refresh | User refreshes model labels or inspects cached source status. | Model refresh UI/API, model discovery/source adapters, cached model table. | Refresh route tests, model-source tests, model-refresh tests. | Implemented but blocker remediation is unclear. |
| Capability/blocker interpretation | User reads capable count, confidence, blockers, stale/fallback state. | Capability normalization, API aggregation, route eligibility. | Capability tests, route eligibility tests, docs. | Implemented but code/status oriented. |
| Routing policy authoring | User edits id/name/mode/budget/current candidate and saves/activates. | Policy UI/API/store/evaluator. | UI policy tests, API policy tests, routing policy/store tests. | Implemented but not a real multi-candidate policy builder. |
| Routing simulation | User simulates policy with operation, pricing requirement, and estimated cost. | Local simulation API, route eligibility, no-provider-call simulation. | Simulation tests prove no provider request and no prompt/response storage. | Implemented but explanation depth is thin. |
| Usage/cost/budget review | User reads usage and cost summary cards. | Request ledger, usage summary, costing, pricing snapshots, usage API. | Usage-summary, request-ledger, costing, pricing, and UI cost-label tests. | Implemented but dashboard is summary-only. |
| Provider expansion governance | Maintainer reviews registry rows and docs/tests. | Registry row contract, source/evidence notes, provider catalog docs. | Registry, catalog, model-discovery, model-source tests. | Documented, not yet a guided governance workflow. |
| Security/privacy boundary | User uses references; app rejects raw unsafe inputs and scrubs metadata. | Configure/test/policy routes, CLI unsafe flag handling, secret refs, ledger scrubbing. | API, CLI, request-ledger, model-source, and UI tests. | Strong substrate; must remain visible in later UX. |

---

## Capability Inventory

Current Provider Center already supports:

- Broad provider catalog display across API, local tool/session, local runtime, gateway/OpenAI-compatible/custom, cloud/project, and planned/source-review groups.
- Narrow executable `ProviderID` contract: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, `ollama`.
- Broad `ProviderRegistryID` catalog without direct-provider enum sprawl.
- Secret-reference configuration with env refs, gateway virtual-key refs, local CLI/session mode, and no-secret local runtime mode.
- Raw secret, token, session, browser cookie, and credential-path rejection across API/CLI boundaries.
- OpenAI-compatible registry target execution through a shared generic execution path when allowed.
- Safe provider status/test checks.
- Model refresh according to declared discovery strategy.
- Cached model freshness, source, capability, confidence, and blocker status.
- Routing policy save/activate/enable/disable for supported modes only.
- Local-only routing simulation with capability/pricing blockers and no provider request.
- Request ledger with metadata scrubbing.
- Usage/cost summaries by provider, model, operation, auth mode, route backend, routing policy, and budget policy.
- Actual versus estimated cost labeling.
- Source-backed pricing refresh without requiring a hosted external dashboard or paid external app.

---

## Gap Matrix

| Gap ID | Workflow | Gap type | Evidence | Phase ownership |
| --- | --- | --- | --- | --- |
| G001 | Provider selection | Implemented but confusing | Catalog is grouped, but many providers expose terse access/status labels and evidence notes. | Phase 1 |
| G002 | Provider selection | Missing UX | No visible source-review checklist or provider readiness explanation beyond notes/status. | Phase 6 |
| G003 | Safe configuration | Implemented but confusing | UI fields are safe but form-like: env var ref, gateway ref, base URL, model labels, routing policy. | Phase 2 |
| G004 | Safe configuration | Missing UX | Save/test/refresh sequencing is not presented as a guided flow. | Phase 2 |
| G005 | Provider status/test | Implemented but confusing | Test route returns safe statuses but accepts optional `prompt` field while ignoring/not echoing it. | Phase 2 |
| G006 | Model refresh | Implemented but confusing | Refresh disablement/blockers are technically correct but terse. | Phase 3 |
| G007 | Capability/blocker interpretation | Implemented but confusing | Capable count/confidence/blockers exist, but codes require domain knowledge. | Phase 3 |
| G008 | Routing policy authoring | Missing UX | Current UI builds one candidate from selected provider draft; multi-candidate policy authoring is not a product workflow. | Phase 5 |
| G009 | Routing simulation | Implemented but shallow | Simulation returns eligibility and attempts, but UI displays limited explanatory detail. | Phase 5 |
| G010 | Usage/cost/budget | Implemented but shallow | Usage panel is summary-oriented; no richer filtering/exploration workflow. | Phase 4 |
| G011 | Provider expansion governance | Missing workflow | Registry governance exists in code/docs/tests, not as a formal checklist/reporting flow. | Phase 6 |
| G012 | Security/privacy | Future risk | Later UX work could accidentally reintroduce raw secrets, token auth confusion, or prompt/response storage. | All phases |
| G013 | CLI parity | Partial proof | CLI source/docs and unsafe-input tests exist; happy-path CLI proof is less comprehensive than API/router proof. | Relevant future phase |
| G014 | Artifact dating | Documentation caveat | Artifact names use `2026-05-21`; local execution timestamps use `2026-05-20` America/Los_Angeles. | Phase 0 report only |

---

## Phase Ownership

Phase 1, Provider Center Information Architecture:

- Owns provider catalog comprehension, selected-provider context, panel structure, scanning, loading/error/empty states, and existing-status display clarity.
- Does not own new provider rows, new auth modes, new routing modes, or deep provider setup workflows.

Phase 2, Configuration UX + Setup Guidance:

- Owns safe configuration guidance, setup/test/refresh sequencing, auth-mode explanations, reference-name/base-URL validation UX, and provider status/test clarity.
- Should decide whether the provider test route's optional `prompt` field should be removed, documented, or otherwise made less confusing.
- Does not own OAuth/device flows, raw secret fields, credential-file ingestion, or new executable providers.

Phase 3, Model Refresh + Capability Status Polish:

- Owns model freshness/source clarity, blocker-to-next-action explanations, capability confidence display, manual/source-backed/fallback/reference metadata explanations.
- Does not own unsafe generic endpoint crawling or treating reference metadata as live availability.

Phase 4, Usage, Cost, Budget Dashboard:

- Owns richer usage/cost exploration, provider/model/operation/policy views, actual versus estimated cost clarity, budget status interpretation, and ledger unavailable/empty states.
- Does not own hosted observability, billing reconciliation claims, or prompt/response storage.

Phase 5, Routing Policy UX + Simulation Explainability:

- Owns policy authoring workflow, candidate UX, selected/skipped/blocked explanations, and simulation remediation.
- Does not own `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, eval routing, or automatic optimization.

Phase 6, Provider Catalog Expansion Governance:

- Owns provider evidence checklist, source-review readiness, provider promotion workflow, catalog docs/tooling, and registry governance.
- Does not own mass executable adapter additions, provider expansion from memory/marketing copy, or `ProviderID` widening without adapter proof.

Phase 7, Final Product E2E Audit + Hardening:

- Owns end-to-end proof after Phases 1-6, parity review, docs/API/UI/CLI/router alignment, and Phase-owned hardening only.
- Does not own new product expansion.

---

## Blockers And Unknowns

No blockers prevent moving to Phase 1 planning.

Known unknowns to carry forward:

- CLI happy-path parity is less deeply proven than CLI unsafe-input rejection. Later phases that touch CLI should add focused CLI tests for those behaviors.
- Provider status/test route accepts an optional `prompt` field but intentionally does not use, store, or echo prompt/response bodies. This is safe by current evidence, but it is product-confusing and should be clarified in Phase 2.
- Browser walkthrough proof was not part of Phase 0. Any later visible UI phase should require desktop and mobile browser proof.
- The current UI is status-rich but not guidance-rich. Later phases should avoid adding more raw status without better explanation.

---

## Semantic Drift Guardrails

Future phase plans and boards must preserve these constraints:

- Do not treat a broad `ProviderRegistryID` as a direct executable `ProviderID`.
- Do not treat reference, static, fallback, or stale model metadata as live account availability.
- Do not treat missing or stale price as free.
- Do not treat local simulation as a provider request.
- Do not ask for raw API keys, copied tokens, browser/session cookies, credential files, or credential paths.
- Do not store prompt or response bodies.
- Do not require hosted dashboards, paid external control planes, or extra-cost app dependencies.
- Do not promote `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, or eval routing without a separately approved phase.
- Do not reopen broad OSS router/gateway research as a substitute for Provider Center product work.

---

## Next Phase Recommendation

Proceed to:

```text
Provider Center Product Phase 1: Provider Center Information Architecture
```

Phase 1 should be planned as a UI/product-structure phase that reorganizes and clarifies the existing Provider Center surface. It should not add new providers, auth modes, routing modes, gateway dependencies, or deep setup/policy/cost features.

Recommended Phase 1 planning focus:

- Rework Provider Center layout around user workflow stages.
- Make selected provider context obvious.
- Keep catalog scanability high despite broad provider count.
- Preserve safe secret-reference language.
- Improve loading, empty, disabled, error, and blocked states.
- Add browser proof requirements for desktop and mobile.

---

## Final Decision

The master roadmap is confirmed unchanged.

Phase 0 found no reason to skip Phase 1 or collapse later phases. The correct next step is to create the individual Phase 1 implementation plan and GoalBuddy board, then review that plan for semantic drift before any product-code implementation.
