# Provider Center Product Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` with GoalBuddy receipts. This phase is read-only against product code. Do not implement UI, API, router, CLI, database, provider, or test changes from this phase.

**Phase:** Provider Center Product Phase 0 - Product Audit + Workflow Contract

**Goal:** Produce a current-source Provider Center product workflow contract that can guide later implementation phases without letting agents improvise scope.

**Architecture:** Phase 0 audits the already-stabilized provider/auth/router system and turns the approved master roadmap into a concrete product workflow contract. It inspects the current Provider Center, API routes, CLI, router, ledger, provider registry, docs, and tests, then records what the app supports, what is confusing, what is missing, and which future phase owns each gap. Product code remains untouched.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local SQLite with `better-sqlite3`, SkillMall provider registry/router modules, CLI surfaces, docs, GoalBuddy.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Source roadmap:** `docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md`

**GoalBuddy board:** `docs/goals/provider-center-product-phase0/`

---

## Approval Boundary

This document and `docs/goals/provider-center-product-phase0/` are Phase 0 planning and execution artifacts only.

Phase 0 implementation is approved only when the user runs:

```text
/goal Follow docs/goals/provider-center-product-phase0/goal.md.
```

During Phase 0 execution, do not implement product code, clean unrelated files, stage, commit, push, or open a PR unless the user explicitly approves commit-prep or publish after the final receipt.

---

## Current Source Facts

These facts were checked from current source on 2026-05-21 and must be revalidated by the Phase 0 Scout before conclusions are recorded:

- The repo is on `main` and tracks `origin/main`.
- The master roadmap exists at `docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md`.
- Provider Center currently lives in `components/skill-mall/providers/ProviderCenter.tsx`.
- Provider Center currently composes:
  - `components/skill-mall/providers/ProviderCatalogList.tsx`
  - `components/skill-mall/providers/ProviderConfigPanel.tsx`
  - `components/skill-mall/providers/ModelRefreshPanel.tsx`
  - `components/skill-mall/providers/PolicyControlPanel.tsx`
  - `components/skill-mall/providers/UsageCostPanel.tsx`
- Provider API routes currently live under `app/api/providers/`.
- Router/provider implementation currently spans `lib/providers/*` and `lib/llm/router/*`.
- Existing docs already include provider setup and catalog boundaries:
  - `docs/user/configuring-providers.md`
  - `docs/reference/provider-catalog.md`
- Current Provider Center tests exist at `components/skill-mall/providers/__tests__/provider-center.test.tsx`.
- Current provider route tests exist at `app/api/providers/__tests__/providers-route.test.ts`.
- Current router tests exist under `lib/llm/router/__tests__/`.

Do not trust these facts blindly during `/goal`; re-check the source before writing the audit report.

---

## Phase 0 Scope

### In Scope

- Audit the current Provider Center product surface from source.
- Map user workflows for:
  - provider selection
  - safe configuration
  - provider status/test
  - model refresh
  - capability/freshness/blocker interpretation
  - routing policy creation and activation
  - routing simulation
  - usage/cost/budget review
  - provider catalog expansion governance
  - troubleshooting and docs lookup
- Produce a gap matrix that separates:
  - implemented and clear
  - implemented but confusing
  - missing UI
  - missing backend contract
  - missing test proof
  - missing docs
  - future research or approval gate
- Assign each gap to the proposed future phase that should own it.
- Amend the master roadmap only if current source proves a phase boundary is wrong.
- Produce a Phase 0 final receipt with exact evidence, incomplete work, blockers, and next safe phase recommendation.

### Out Of Scope

- Product code changes.
- UI refactors.
- API route changes.
- CLI changes.
- Router/client/ledger/database changes.
- New providers.
- New auth modes.
- New routing modes.
- Test changes.
- Lint cleanup.
- External gateway adoption.
- Commit/push/PR work unless explicitly approved after Phase 0 completion.

---

## Non-Negotiables

- SkillMall remains the app-level source of truth for provider settings, routing policies, model status, budget status, and usage/cost summaries.
- Do not recommend a hosted app, paid hosted dashboard, paid control plane, or extra-cost required dependency.
- Open source projects may be referenced only as possible integrated inputs, not as separate dashboards users must manage.
- Do not recommend raw API key fields, raw token fields, ChatGPT browser/session token use, Claude.ai OAuth token use, Codex credential file use, Claude Code credential file use, browser cookie use, credential-file paths, or provider credential-file contents.
- API-key access must remain optional and labeled as API access.
- Subscription/account/tool-session auth must remain separate from API-key access.
- Claude Code CLI auth remains local tool/session access.
- Do not recommend widening `ProviderID` for broad provider rows unless a future dedicated adapter phase is explicitly approved.
- Do not promote `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, or eval routing.
- Do not store prompt or response bodies in any Phase 0 note, report, receipt, fixture, or command output.
- Do not present partial audit coverage as complete.

---

## Deliverables

Phase 0 must create or update only these files unless the Judge approves another documentation-only file:

- `docs/recovery/2026-05-21-provider-center-product-phase-0-audit-report.md`
- `docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md` only if the audit proves a phase-map correction is required
- `docs/goals/provider-center-product-phase0/state.yaml`
- `docs/goals/provider-center-product-phase0/notes/**`

The audit report must include:

- source files inspected
- current workflow map
- source-backed capability inventory
- gap matrix
- risk/drift matrix
- recommended phase ownership
- blockers and unknowns
- next phase recommendation

---

## Required Evidence Map

The Phase 0 Scout must map each workflow to current source, tests, docs, and gaps:

| Workflow | Required Evidence |
| --- | --- |
| Provider catalog | UI grouping, registry rows, docs catalog, tests. |
| Safe configuration | ProviderConfigPanel, configure API, secret-ref validation, docs, tests. |
| Provider status/test | Provider Center action, test API route, CLI if present, docs, tests. |
| Model refresh | ModelRefreshPanel, refresh API, model discovery/source modules, docs, tests. |
| Capability/blocker interpretation | capability metadata, route eligibility, UI labels, docs, tests. |
| Routing policy | PolicyControlPanel, policy API/store, docs, tests. |
| Routing simulation | simulation API, simulation module, UI result display, docs, tests. |
| Usage/cost/budget | UsageCostPanel, usage API, request ledger, usage summary, docs, tests. |
| Provider expansion governance | registry, provider docs, source-review boundaries, docs/tests. |
| Security/privacy | raw-secret rejection, metadata scrubbing, no prompt/response storage, docs/tests. |

---

## Development Workflow

The `/goal` executor must follow this sequence:

1. Verify branch, mainline, dirty state, and implementation authority.
2. Read `AGENTS.md`, the master roadmap, this Phase 0 plan, `goal.md`, and `state.yaml`.
3. Revalidate current source facts.
4. Run Scout to build the evidence map from current source.
5. Run Judge to validate the evidence map and prevent semantic drift.
6. Produce the audit report with no product code changes.
7. Run documentation-only review.
8. Fix audit/report/roadmap issues if the Judge finds them.
9. Run final verification:
   - `git status --short`
   - `rg -n "T""BD|TO""DO|implement later|fill in" docs/recovery/2026-05-21-provider-center-product-phase-0-audit-report.md docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md docs/goals/provider-center-product-phase0`
   - `rg -n "raw API key|browser token|session token|credential file|credential path|prompt body|response body" docs/recovery/2026-05-21-provider-center-product-phase-0-audit-report.md docs/goals/provider-center-product-phase0`
   - `node /Users/jamesdsizemore/.codex/plugins/cache/goalbuddy/goalbuddy/0.3.7/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/provider-center-product-phase0/state.yaml`
10. Record final receipt with:
    - complete work
    - incomplete work and why
    - blockers
    - exact commands and results
    - files changed
    - next safe phase recommendation
11. Stop before stage/commit/push/open PR unless the user explicitly approves commit-prep or publish.

---

## Sub-Agent Orchestration

- **PM main thread:** Owns board truth, branch/dirty-state containment, final readiness, and user-facing summary.
- **Scout:** Read-only source mapper. Inspects current code/docs/tests and records evidence.
- **Judge:** Validates scope, semantic drift, phase ownership, and completion proof.
- **Worker:** Only a documentation worker may write the audit report or update the roadmap if Judge approves. No product-code Worker is allowed in Phase 0.

Do not run multiple write-capable Workers. Phase 0 documentation writes are small enough for one bounded write path.

---

## Known Drift Risks

- A coding agent treats Phase 0 as permission to redesign Provider Center UI.
- A coding agent turns the audit into another OSS gateway bakeoff.
- A coding agent recommends hosted dashboards despite the roadmap constraints.
- A coding agent promotes unsupported routing modes because route eligibility substrate exists.
- A coding agent treats broad registry rows as direct executable providers.
- A coding agent records opinions instead of file-backed evidence.
- A coding agent says "complete" after inspecting only Provider Center UI and skipping API/CLI/router/docs/tests.

---

## Completion Criteria

Phase 0 is complete only when:

- The audit report exists and is source-backed.
- Every required workflow has evidence or an explicit blocker.
- Every gap is assigned to a future phase or marked out of scope with reason.
- The master roadmap is either confirmed unchanged or amended with exact rationale.
- No product code files are changed.
- GoalBuddy receipts record complete work, incomplete work, blockers, commands, and next safe action.
- Final answer clearly recommends the next phase to plan.

---

## Starter Command

```text
/goal Follow docs/goals/provider-center-product-phase0/goal.md.
```
