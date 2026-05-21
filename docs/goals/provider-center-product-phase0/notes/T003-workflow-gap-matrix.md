# T003 Workflow Gap Matrix

Status: current-source workflow map and gap matrix built from `T002-source-evidence-map.md`.

## Summary

The Provider Center substrate is substantially implemented. The main Phase 0 finding is not "missing router/auth infrastructure"; it is that the user-facing product workflow is dense, status-code heavy, and split across UI/API/CLI/docs without a clear guided path.

The next implementation phases should improve comprehension and workflow quality while preserving existing security, provider identity, and local source-of-truth constraints.

## Workflow Map

| Workflow | Current user path | Current substrate | Current proof | Product quality classification |
| --- | --- | --- | --- | --- |
| Provider selection | User opens Provider Center and selects a row from grouped catalog. | `ProviderCatalogList.tsx`, `ProviderCenter.tsx`, `GET /api/providers`, `PROVIDER_REGISTRY`. | Provider Center render tests; provider route catalog tests; provider catalog docs. | Implemented but confusing at scale. |
| Safe configuration | User picks config mode, enters reference/base URL/model/manual labels, saves. | `ProviderConfigPanel.tsx`, configure API, secret refs, config store. | API tests reject raw secrets/path refs and persist valid references. UI tests verify no raw secret fields. | Implemented but too form-like. |
| Provider status/test | User clicks test status or runs CLI test. | `ModelRefreshPanel.tsx`, provider test API, provider CLI. | API tests and CLI safety tests exist; docs describe safe readiness checks. | Implemented but status semantics are terse. |
| Model refresh | User clicks refresh models or runs CLI refresh. | model discovery/source adapters, model refresh route, cached model status. | Refresh route/model-source/model-refresh tests. | Implemented but blocker remediation is unclear. |
| Capability/blocker interpretation | User reads capable model count, confidence, blockers, stale/fallback status. | model capability normalization, route eligibility, provider status aggregation. | capability and route eligibility tests; docs explain reference metadata limits. | Implemented but code/status oriented. |
| Routing policy authoring | User writes policy id/name/mode/budget/current candidate, saves/activates. | policy panel, policy API/store, routing policy evaluator. | policy store/evaluator/API/UI tests. | Implemented but not a real multi-candidate policy builder. |
| Routing simulation | User simulates draft/current policy with estimated cost/operation/require pricing. | simulation body builder, simulation API, route eligibility. | UI simulation body test; simulation tests prove no provider calls or prompt/response storage. | Implemented but explanation depth is thin. |
| Usage/cost/budget review | User reads UsageCostPanel summary. | request ledger, usage summary, costing, pricing snapshots, usage API. | usage-summary, request-ledger, costing, pricing tests; UI cost-label test. | Implemented but dashboard is summary-only. |
| Provider expansion governance | Maintainer edits registry/docs/tests. | registry row contracts, provider catalog docs, model-source behavior. | registry/model-source/catalog tests. | Documented, not yet a guided governance workflow. |
| Security/privacy boundary | User uses references; APIs/CLI reject unsafe inputs; ledger scrubs metadata. | configure/test/policy routes, CLI unsafe flag handling, secret refs, request ledger. | API, CLI, request ledger, Provider Center tests. | Strong substrate; future phases must preserve and make visible. |

## Gap Matrix

| Gap ID | Workflow | Gap type | Evidence | Phase ownership | Notes |
| --- | --- | --- | --- | --- | --- |
| G001 | Provider selection | Implemented but confusing | Catalog is grouped, but many providers expose terse access/status labels and evidence notes. | Phase 1 | Improve information architecture, grouping affordances, selected-provider context, and scanability. |
| G002 | Provider selection | Missing UX | No visible source-review checklist or provider readiness explanation beyond notes/status. | Phase 6 | Governance belongs later; Phase 1 can only improve display of existing statuses. |
| G003 | Safe configuration | Implemented but confusing | UI fields are safe but form-like: env var ref, gateway ref, base URL, model labels, routing policy. | Phase 2 | Build guided setup by access mode without adding secret fields or new auth modes. |
| G004 | Safe configuration | Missing UX | Save/test/refresh sequencing is not presented as a guided flow. | Phase 2 | Backend contract exists; product workflow needs order, validation, and next actions. |
| G005 | Provider status/test | Implemented but confusing | Test route returns safe statuses but accepts optional `prompt` field while ignoring/not echoing it. | Phase 2 | Consider removing or documenting the prompt field in a later cleanup if Judge approves. Do not store prompts. |
| G006 | Model refresh | Implemented but confusing | Refresh disablement/blockers are technically correct but terse. | Phase 3 | Add blocker-to-next-action explanations and source/freshness clarity. |
| G007 | Capability/blocker interpretation | Implemented but confusing | Capable count/confidence/blockers exist, but codes require domain knowledge. | Phase 3 | Translate blocker codes into product language without weakening semantics. |
| G008 | Routing policy authoring | Missing UX | Current UI builds one candidate from selected provider draft; multi-candidate policy authoring is not a product workflow. | Phase 5 | Preserve supported modes only; no `cheapest_compatible` or quality/semantic routing promotion. |
| G009 | Routing simulation | Implemented but shallow | Simulation returns eligibility and attempts, but UI displays limited explanatory detail. | Phase 5 | Add selected/skipped/blocked explanations and failure remediation. |
| G010 | Usage/cost/budget | Implemented but shallow | Usage panel is summary-oriented; no richer filtering/exploration workflow. | Phase 4 | Add provider/model/operation/policy views and clearer budget status. |
| G011 | Provider expansion governance | Missing workflow | Registry governance exists in code/docs/tests, not as a formal checklist/reporting flow. | Phase 6 | Create evidence checklist/tooling before adding broad provider execution. |
| G012 | Security/privacy | Future risk | Later UX work could accidentally reintroduce raw secrets, token auth confusion, or prompt/response storage. | All phases | Every phase plan/board must keep raw-secret, token, credential-file, and prompt/response storage stop conditions. |
| G013 | CLI parity | Test confidence gap | CLI source/docs/tests exist and unsafe flag tests were opened, but CLI happy-path workflow proof is less comprehensive than API/router proof. | Phase 0 report, then relevant later phase | Classify as partial proof; later phases touching CLI should add focused CLI parity tests. |
| G014 | Artifact dating | Context/documentation caveat | Plan artifacts use `2026-05-21`; local execution timestamps are `2026-05-20` America/Los_Angeles. | Phase 0 report | Explain as timezone/artifact label context, not product blocker. |

## Phase Ownership

### Phase 1: Provider Center Information Architecture

Owns:

- G001 provider catalog comprehension.
- Displaying existing provider statuses more clearly.
- Layout and state structure for existing panels.

Does not own:

- New provider rows.
- New auth modes.
- New routing modes.
- Deep setup guidance beyond structural IA.

### Phase 2: Configuration UX + Setup Guidance

Owns:

- G003 safe configuration guidance.
- G004 setup/test/refresh sequencing.
- G005 provider status/test clarity.

Does not own:

- OAuth/device flows.
- Raw secret fields.
- Credential-file ingestion.
- New executable providers.

### Phase 3: Model Refresh + Capability Status Polish

Owns:

- G006 model refresh blocker remediation.
- G007 capability/blocker interpretation.

Does not own:

- Unsafe generic model endpoint crawling.
- Treating reference/static metadata as live account availability.

### Phase 4: Usage, Cost, Budget Dashboard

Owns:

- G010 usage/cost/budget exploration.
- Actual versus estimated cost presentation.
- Ledger unavailable/empty states.

Does not own:

- Hosted observability.
- Billing reconciliation claims.
- Prompt/response storage.

### Phase 5: Routing Policy UX + Simulation Explainability

Owns:

- G008 policy authoring UX.
- G009 simulation explainability.

Does not own:

- `cheapest_compatible`.
- `quality_first`.
- Semantic/learned/complexity/eval routing.
- Automatic optimization.

### Phase 6: Provider Catalog Expansion Governance

Owns:

- G002 source-review/readiness explanation.
- G011 evidence checklist and provider promotion governance.

Does not own:

- Mass executable adapter additions.
- Provider expansion from memory or marketing copy.
- Widening `ProviderID` without adapter proof.

### Phase 7: Final Product E2E Audit + Hardening

Owns:

- Final proof after Phases 1-6.
- Phase-owned bug fixes only.
- Docs/API/UI/CLI/router parity.

Does not own:

- New feature expansion.
- New provider/auth/routing scope.

## Recommendations For The Phase 0 Audit Report

- State directly that current substrate is strong and the next roadmap should target product clarity.
- Treat Provider Center as "implemented but confusing," not "missing."
- Preserve Phase 1 as information architecture rather than skipping directly to configuration UX.
- Keep CLI parity as partial-proof unless later audit opens happy-path command tests or runs focused CLI tests.
- Record the provider test optional `prompt` field as safe but potentially confusing.
- Record date-label ambiguity as a non-blocking artifact context note.
