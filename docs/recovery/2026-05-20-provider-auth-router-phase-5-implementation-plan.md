# Provider/Auth Router Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation. Execute this plan through GoalBuddy task receipts, not through ad hoc coding. Do not treat this document as approval to implement until the user runs the Phase 5 `/goal` command.

**Phase:** Provider/Auth Router Phase 5 - Routing Policy and Budget Control Productization

**Goal:** Turn the Phase 4 provider/model/pricing/request-ledger substrate into a user-manageable routing-policy and budget-control system across Provider Center, API, and CLI while preserving SkillMall-owned config, local SQLite accounting, and strict auth/secret boundaries.

**Why This Is Phase 5:** The original architecture plan labeled Phase 5 as "Provider Center UI and CLI Parity" and Phase 6 as "Routing Policies and Budgets." Actual Phase 3 and Phase 4 work already delivered most of the original Phase 5 surface and some of the original Phase 6 backend substrate. Therefore Phase 5 must not blindly follow the stale label. Phase 5 should productize the remaining policy/budget control gap in the current source.

**Architecture:** SkillMall remains the source of truth for provider config, provider registry, model cache, pricing snapshots, routing policies, budget state, request metadata, and cost summaries. No hosted gateway, hosted observability product, paid external router, duplicate dashboard, raw credential store, or broad `ProviderID` expansion becomes required.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Planning branch:** `codex/provider-auth-router-phase5-plan`

**Implementation prerequisite:** Phase 5 must start from updated `main` after the Phase 4 merge commit `8ad876a`. If `main` no longer contains that merge commit, stop and document the exact state before implementation.

---

## Approval Boundary

This document and `docs/goals/provider-auth-router-phase5/` are planning and GoalBuddy prep artifacts only.

Do not implement Phase 5 code, clean unrelated files, stage, commit, push, or open a Phase 5 PR from this planning turn unless the user explicitly asks for those actions.

Phase 5 implementation is approved only when the user runs:

```text
/goal Follow docs/goals/provider-auth-router-phase5/goal.md.
```

---

## Current Source Facts

These facts were checked during planning on 2026-05-20 and must be revalidated by the Phase 5 Scout before implementation:

- `lib/llm/router/routing-policy.ts` implements `manual`, `fallback_chain`, `local_first`, and `budget_guarded_manual`.
- `budget_guarded_manual` blocks before creating a provider client when estimated cost exceeds remaining budget.
- `quality_first` is explicitly rejected in routing-policy tests because there is no real evaluation signal.
- `cheapest_compatible` is rejected in router/config tests because pricing refresh and capability matching are not yet sufficient for automatic cheapest routing.
- `docs/reference/database-schema.md` allows `manual`, `fallback_chain`, `local_first`, and `budget_guarded_manual` in `llm_routing_policies`.
- `docs/reference/database-schema.md` lists `cheapest_compatible`, `quality_first`, and semantic/eval routing as future/not implemented.
- `lib/llm/router/usage-summary.ts` derives budget status from `budget_json` and local ledger cost fields.
- `components/skill-mall/providers/UsageCostPanel.tsx` can display budget policy status, but it does not provide a full policy authoring/control surface.
- Phase 4 Provider Center, API, CLI, model-source, pricing-source, and executable registry-provider work already cover much of the original "Provider Center UI and CLI parity" roadmap label.

Any implementation agent must refresh these facts from the current source before changing code. If the source has moved, the agent must update `state.yaml` with the new evidence and adjust only within the approved Phase 5 goal.

---

## Non-Negotiables

- No hosted gateway/router/proxy/observability product may be required.
- No paid external control plane may become required infrastructure.
- SkillMall remains the provider/settings/model/pricing/policy/budget/cost source of truth.
- Do not accept raw API key values in JSON bodies or config files.
- Do not accept raw ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, copied credential-file contents, browser session cookies, or credential-file paths.
- API-key access must remain optional and labeled API access.
- Subscription/tool-session auth must not be collapsed into API-key access.
- Do not widen `ProviderID` by adding one enum value per broad provider registry row.
- Do not implement `quality_first` without a real evaluation signal.
- Do not implement `cheapest_compatible` unless capability matching and pricing coverage are explicitly proven inside this phase's receipts.
- Do not store prompt or response bodies in policy simulation, budget checks, ledger metadata, or review artifacts.
- Do not let the UI invent a policy mode that the router cannot execute.
- Do not let CLI commands use a different provider/policy catalog from the app.
- Do not present estimated cost as provider-reported actual cost.
- Document blockers, incomplete work, review findings, review fixes, and verification results in GoalBuddy `state.yaml`.
- Do not hand off partial work as complete.

---

## Phase 5 Scope

Phase 5 is the productization phase for routing policies and budget controls that are already partly present as backend substrate.

### In Scope

- Current-source revalidation of routing policy, request ledger, pricing snapshot, usage summary, Provider Center, API, CLI, and docs contracts.
- One shared routing-policy contract for API, router, Provider Center, and CLI.
- Policy CRUD/list/read/update/disable behavior for supported modes.
- Policy test/simulation behavior that estimates route selection and budget blocking without sending prompts to providers.
- Provider Center UI for policy and budget control.
- CLI parity for listing, inspecting, creating/updating, activating, disabling, and simulating policies.
- Budget control behavior for configured policies, including remaining/limit status and block reasons.
- Documentation updates for app, CLI, API, database, and user-facing configuration.
- Focused tests, full tests where practical, TypeScript, lint classification, secret scan, code review, review fixes, final verification, diff containment, and commit-prep only after explicit approval.

### Conditionally In Scope

`cheapest_compatible` may be implemented only if the Phase 5 Scout and Judge both prove all of the following before Worker release:

- Pricing coverage exists for candidate models.
- Capability matching exists for the operation being routed.
- Missing prices or missing capabilities produce deterministic blockers, not guesses.
- Router tests prove no prompt is sent during simulation.
- UI and CLI label the mode clearly and expose why a candidate was chosen or rejected.

If any condition fails, `cheapest_compatible` remains future/not implemented and the board receipt must say why.

### Out Of Scope

- `quality_first` routing without real evaluation data.
- Semantic routing, learned routing, complexity routing, or eval-based routing.
- A hosted gateway dashboard.
- A hosted budget/observability dashboard.
- Keychain integration, OAuth device flow, Codex session auth, Claude Code token auth, or browser session-token handling.
- New provider-family implementation unrelated to policy/budget controls.
- UI redesign beyond the Provider Center controls needed for policy and budget management.
- Wizard/preview salvage or cleanup.

---

## Phase 5 Contracts

### 1. Routing Policy Contract

The supported policy modes at Phase 5 start are:

- `manual`
- `fallback_chain`
- `local_first`
- `budget_guarded_manual`

Every supported mode must have:

- Typed input validation.
- A normalized storage shape.
- API response shape.
- CLI representation.
- Provider Center representation.
- Router execution behavior.
- Simulation behavior.
- Tests for accepted and rejected configurations.
- Documentation that says exactly what the mode can and cannot do.

Unsupported/future modes must remain rejected by validation unless this phase explicitly promotes them through the conditional scope gate.

### 2. Budget Contract

Budget controls must use local state and local price/cost data. They must not require hosted gateway budget features.

Budget configuration may include normalized numeric values such as:

- remaining USD
- limit USD
- reset period or period label if implemented
- warning threshold if implemented

The exact field names may differ, but behavior must be consistent across database, router, API, UI, CLI, and docs.

Budget status labels must distinguish:

- not configured
- within budget
- over budget
- estimated over budget
- unknown because the budget object exists but usable numeric fields are missing

### 3. Simulation Contract

Policy simulation must:

- Use configured provider/model/pricing/policy data.
- Return selected candidate, rejected candidates, block reason, estimated cost, and missing-data reasons when available.
- Never send prompt or response content to a provider.
- Never store prompt or response bodies.
- Work from synthetic token/cost estimates or caller-provided numeric estimates.
- Label output as simulation, not a completed request.

### 4. UI Contract

Provider Center must expose policy and budget controls without becoming a separate router product.

Expected user-facing capabilities:

- List routing policies.
- Inspect enabled/disabled state.
- See policy mode, selected/fallback/local candidates, budget status, and last use summary when available.
- Create or edit supported policy modes.
- Activate a policy as the current route policy where the current config supports it.
- Disable a policy without deleting local history.
- Simulate a policy decision without sending a provider request.
- Surface exact blockers for unsupported modes, missing model prices, missing model capabilities, missing provider config, or disabled providers.

The UI must preserve the Phase 4 Provider Center information architecture and avoid a broad redesign.

### 5. API Contract

API routes must share validation and policy contracts with the router and CLI. They must not duplicate catalogs, mode lists, or provider ID arrays.

Expected API capability may be implemented as route extensions or new routes, but must cover:

- list/read policies
- create/update policy
- enable/disable policy
- activate current policy
- simulate policy decision
- expose budget status and blockers

### 6. CLI Contract

CLI commands must operate on the same local config/database contracts as the app.

Expected commands or subcommands must cover:

- list policies
- show policy
- create or update supported policy modes
- enable/disable policy
- activate current policy
- simulate policy decision
- show budget status

CLI output must redact secrets and must not write raw secret values into JSON.

### 7. Docs Contract

Documentation must be updated in the same phase, not deferred:

- `docs/reference/api-routes.md`
- `docs/reference/database-schema.md`
- `docs/developer/cli-reference.md`
- `docs/user/configuring-providers.md`
- any Provider Center docs touched by the implementation

Docs must preserve the difference between API access, local gateway refs, account/tool auth boundaries, and unsupported token/session mechanisms.

---

## Development Workflow Requirements

Phase 5 implementation must follow this workflow:

- Start from updated `main` containing Phase 4 merge commit `8ad876a`.
- Create or use a dedicated `codex/` implementation branch.
- Run and record a clean branch/diff/staged-file gate before implementation.
- Revalidate current source facts before writing code.
- Use sub-agent orchestration only where tasks have clear ownership and disjoint write sets.
- Do not release Workers until the Judge locks mode, budget, simulation, UI/API/CLI, and docs contracts.
- Keep worker scopes narrow and record allowed files in `state.yaml`.
- Update `state.yaml` after every meaningful task with receipts, commands, blockers, and incomplete work.
- If a task cannot be completed, document exactly what failed, why it failed, and what remains.
- Do not hand off partial work as complete.
- Run focused tests for changed modules.
- Run `npm test` unless an environmental blocker is documented.
- Run `npx tsc --noEmit --pretty false`.
- Run `npm run lint`; classify pre-existing unrelated lint failures separately from Phase 5-owned failures.
- Run a secret-safety scan over changed files.
- Run code review before commit-prep.
- Fix actionable code review findings.
- Run final verification after review fixes.
- Run diff containment before staging.
- Stage/commit/push/open PR only when the user explicitly approves commit-prep or publish.

---

## Sub-Agent Orchestration

Phase 5 should not be a single unbounded coding pass.

Recommended task sequence:

1. PM gate validates branch, mainline, dirty state, and Phase 4 merge presence.
2. Scout maps current routing, budget, Provider Center, API, CLI, docs, and stale roadmap evidence.
3. Judge locks the exact Phase 5 contract and decides whether `cheapest_compatible` is in or out.
4. Worker implements shared policy/budget service and validation.
5. Worker implements API routes and tests.
6. Worker implements Provider Center policy/budget controls and tests.
7. Worker implements CLI parity and tests.
8. Worker updates docs.
9. Judge performs code review and semantic-drift review.
10. Workers fix review findings.
11. PM performs final verification, blocker/incomplete-work report, diff containment, and commit-prep readiness.

Workers are not alone in the codebase. They must not revert other work, must respect existing edits, and must coordinate through the board receipts.

---

## T103 Locked Implementation Contract

The Phase 5 Judge locks this contract before Worker release:

- Phase 5 implements product controls for existing supported modes only: `manual`, `fallback_chain`, `local_first`, and `budget_guarded_manual`.
- `cheapest_compatible` remains future/not implemented in Phase 5. Current source has pricing snapshots but no complete capability-matching contract for automatic cheapest routing. Implementing it now would invite unsafe guesses.
- `quality_first`, semantic routing, learned routing, and complexity routing remain out of scope.
- Policy simulation must be local-only. It may evaluate stored policy rules, candidates, configured provider/model metadata, budget fields, and caller-provided numeric estimated cost. It must not call provider clients.
- Policy simulation inputs must not include prompt or response text. Numeric estimates are allowed; raw prompt/response bodies are not.
- API, CLI, UI, docs, and router must use one shared supported-mode list from `lib/llm/router/types.ts` or a helper derived from it.
- Policy CRUD stores `rules_json` and `budget_json` in `llm_routing_policies`; no schema migration is required unless implementation discovers a real missing field and records the reason in `state.yaml`.
- Provider activation remains the existing provider-config `routingPolicyId` field; Phase 5 may add an activation helper but must not create a second active-policy store.
- Budget status must continue to distinguish actual provider/gateway costs from local estimates.
- UI changes are limited to Provider Center policy/budget controls and must preserve the existing Provider Center structure.
- CLI changes should add a policy-focused command path under the existing CLI instead of replacing provider configuration.
- Documentation updates are part of completion, not follow-up work.

Worker ownership is locked as follows:

- Shared policy/budget service: `lib/llm/router/routing-policy.ts`, `lib/llm/router/types.ts`, `lib/llm/router/config.ts`, `lib/llm/router/usage-summary.ts`, optional new `lib/llm/router/routing-policy-store.ts`, optional new `lib/llm/router/routing-policy-simulation.ts`, and focused router tests.
- API management surface: `app/api/providers/policies/**`, `app/api/providers/configure/route.ts` only if activation requires tightening, provider route tests, and API docs.
- Provider Center controls: `components/skill-mall/providers/**` only.
- CLI parity: `cli/src/index.ts`, `cli/src/commands/providers.ts`, optional new `cli/src/commands/provider-policies.ts`, and CLI docs.
- Docs: API, database, CLI, user configuration docs, and this plan only.

Any Worker that needs files outside its allowed set must stop, record the need, and return to PM/Judge instead of widening scope silently.

---

## Verification Commands

The implementation agent must refine these to exact changed-file scopes, but the final verification set must include:

```bash
npm test -- lib/llm/router app/api/providers components/skill-mall/providers
npm test
npx tsc --noEmit --pretty false
npm run lint
git diff --check
git diff --name-only
git diff --cached --name-only
```

Expected lint behavior: `npm run lint` may still fail on pre-existing unrelated lint errors. Phase 5-owned lint failures are blockers.

Secret scan should include changed files and must look for raw key/token/session/credential patterns. The exact command may vary, but the receipt must include the command and result.

---

## Completion Oracle

Phase 5 is complete only when the GoalBuddy receipts and final verification prove:

- Routing policies can be listed, inspected, created or updated, enabled/disabled, activated, and simulated through approved API/CLI/UI surfaces.
- Supported modes behave consistently in router, API, CLI, UI, tests, and docs.
- Budget status and budget blocking are user-manageable without hosted gateway dependency.
- Simulation returns route and budget reasoning without sending provider requests or storing prompt/response bodies.
- Unsupported future modes remain rejected or are promoted only through documented Scout/Judge evidence.
- Provider Center, CLI, API, database docs, and user docs agree.
- No raw secrets, tokens, session cookies, credential files, copied credential contents, or credential paths are accepted or persisted.
- Focused tests, full tests, TypeScript, lint classification, secret scan, code review, review fixes, and diff containment are complete.
- Any incomplete work is documented with exact blockers and next actions.

---

## Likely Misfires

- Treating the stale original Phase 5 label as permission to rebuild the Provider Center instead of productizing policy/budget controls.
- Implementing `quality_first` because it sounds useful despite no evaluation signal.
- Implementing `cheapest_compatible` by sorting incomplete or untrusted prices.
- Adding another dashboard or hosted gateway dependency.
- Duplicating policy-mode lists in app/API/CLI instead of sharing the router contract.
- Simulating policy by sending a real provider request.
- Storing prompt/response bodies in ledger metadata.
- Calling budget visibility complete because `UsageCostPanel` displays existing budget rows.
- Skipping docs and pretending CLI parity is optional.
- Letting a Worker make mode/policy decisions after the Judge gate.

---

## Starter Command

```text
/goal Follow docs/goals/provider-auth-router-phase5/goal.md.
```
