# Provider/Auth Router Phase 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`, `superpowers:executing-plans`, and GoalBuddy receipts before implementation. Do not implement from this document until the user runs the Phase 7 `/goal` command.

**Phase:** Provider/Auth Router Phase 7 - Final E2E Audit + Hardening

**Goal:** Prove the Provider/Auth Router system works end to end after Phases 1-6, then harden only audited defects and drift risks found by current-source evidence.

**Architecture:** Phase 7 is a stabilization and proof phase. It exercises the existing SkillMall-owned provider registry, auth-mode boundaries, model/pricing/capability refresh, route eligibility, routing policies, request ledger, Provider Center, CLI, API routes, and docs as one connected system. It does not add hosted gateways, paid control planes, duplicate dashboards, new routing modes, raw credential handling, or broad new provider execution.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, local SQLite through `better-sqlite3`, SkillMall Provider Center, CLI, GoalBuddy, optional local browser walkthrough.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Planning branch:** `codex/provider-auth-router-phase7-plan`

**Implementation prerequisite:** Phase 7 implementation must start from updated `main` after Provider/Auth Router Phase 6 PR #12 is merged, unless the user explicitly approves a stacked Phase 7 implementation branch from Phase 6.

---

## Approval Boundary

This document and `docs/goals/provider-auth-router-phase7/` are planning and GoalBuddy prep artifacts only.

Do not implement Phase 7 code, clean unrelated files, stage, commit, push, or open a Phase 7 PR from this planning turn unless the user explicitly asks for those actions.

Phase 7 implementation is approved only when the user runs:

```text
/goal Follow docs/goals/provider-auth-router-phase7/goal.md.
```

---

## Current Source Facts

These facts are current as of 2026-05-20 and must be revalidated by the Phase 7 Scout before implementation:

- Phase 6 PR #12 is open from `codex/provider-auth-router-phase6` to `main`.
- Phase 6 commit `187b71c` adds normalized model capability metadata, route eligibility, Provider Center/API/CLI visibility, docs, and GoalBuddy receipts.
- `cheapest_compatible` remains unsupported by Judge decision.
- `quality_first`, semantic routing, learned routing, and complexity routing remain unsupported.
- `npm test` passed on Phase 6 with 53 files and 403 tests.
- `npx tsc --noEmit --pretty false` passed on Phase 6.
- `npm run lint` still fails on pre-existing unrelated React hook lint errors in `components/skill-mall/skill-detail/SkillTabs.tsx:328` and `components/skill-mall/theme-provider.tsx:42`.
- Provider/auth router work currently spans `lib/llm/router`, `lib/providers`, `app/api/providers`, `components/skill-mall/providers`, `cli/src/commands`, `db/migrations`, and provider/user/developer/reference docs.

Do not trust these facts blindly during implementation. Re-check branch, PR, mainline, code, docs, tests, and dirty state before any Worker writes.

---

## Non-Negotiables

- Phase 7 is final E2E audit and hardening, not a new feature phase.
- No hosted gateway/router/proxy/observability product may be required.
- No paid external control plane may become required infrastructure.
- SkillMall remains the provider/settings/model/pricing/policy/budget/cost source of truth.
- Do not accept raw API keys, ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, copied credential contents, browser session cookies, or credential-file paths.
- Do not store prompt or response bodies in provider tests, simulations, capability checks, request ledger metadata, CLI output, Provider Center state, test fixtures, docs, or receipts.
- Do not widen `ProviderID` by adding one enum value per broad provider registry row.
- Do not implement `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, eval routing, keychain auth, OAuth device flow, Codex session auth, Claude Code token auth, or browser session-token handling.
- Do not add broad provider-family execution under the cover of hardening.
- Do not fix unrelated lint errors unless the user explicitly approves a separate lint cleanup slice.
- Document blockers, incomplete work, review findings, review fixes, verification results, skipped checks, and why anything remains incomplete.
- Do complete work for the approved Phase 7 scope. Do not hand off partial work as complete.
- Do not stage, commit, push, or open a Phase 7 PR unless the user explicitly approves commit-prep or publish.

---

## Phase 7 Scope

### In Scope

- Revalidate current source, current PR/branch state, and current provider/auth router contracts.
- Build a current E2E coverage map from user-visible workflows to code paths and tests.
- Audit and, where needed, add or harden tests for:
  - Provider Center status/configure/model refresh/pricing refresh/provider test flows.
  - API routes under `app/api/providers`.
  - CLI provider and policy commands.
  - Router config, auth-mode validation, secret-reference boundaries, routing policy store, simulation, request ledger, model refresh, pricing refresh, capability metadata, and route eligibility.
  - Database migration/schema expectations for provider registry identity, execution kind, models, pricing snapshots, policies, requests, and request events.
  - Docs parity across user, developer, API, database, architecture, and provider catalog references.
- Run a no-secret local browser walkthrough of Provider Center if a dev server can be started cleanly.
- Fix only Phase 7 audit findings with bounded, receipt-backed Worker slices.
- Add docs/runbook updates for final provider/auth router behavior, known unsupported modes, and remaining blockers.
- Run focused tests, full tests, TypeScript, lint classification, secret scan, code review, review fixes, final verification, diff containment, and GoalBuddy checker.

### Out Of Scope

- Promoting `cheapest_compatible`.
- Adding quality-first, semantic, learned, complexity, or eval routing.
- Adding new auth modes or credential storage types.
- Adding hosted gateway dashboards or paid services.
- Adding one `ProviderID` per provider registry row.
- Reworking Provider Center visual design beyond fixes required to prove E2E behavior.
- Preview/wizard salvage.
- Unrelated lint cleanup.
- Broad provider catalog expansion that is not required to verify existing contracts.

---

## Required E2E Audit Matrix

The Phase 7 Scout must produce or update a matrix that maps each row to source files, tests, commands, and any missing proof:

| Flow | Required Proof |
| --- | --- |
| Provider catalog/status | GET `/api/providers`, Provider Center render, CLI status, docs agree on access/auth/model/cost/capability labels. |
| Env API access | Configure stores env secret references only; never raw keys; status reports reference presence without echoing values. |
| Local CLI/session access | Claude Code remains `local_cli_session`/`none` without copied credential files or tokens. |
| Local runtime access | Ollama remains `none_local`; no API key or session storage. |
| Local gateway access | Bifrost local remains optional, localhost-bound, virtual-key-reference-only, and not a SkillMall source-of-truth replacement. |
| Model refresh | Source strategy prevents unsafe generic probing; sanitized metadata persists normalized capability fields when source supports them. |
| Pricing refresh | Source-backed snapshots distinguish actual/estimated costs and never treat missing price as free. |
| Capability/eligibility | Unknown/manual/fallback/reference/stale/missing-price candidates produce blockers; eligible candidates require trusted capability proof. |
| Policy store/simulation | Supported modes only; simulations are local-only, preserve operation and require-pricing fields, and never store prompts/responses. |
| Runtime routing/ledger | Router selection records safe metadata only; no prompt/response bodies or raw secrets enter request ledger/event metadata. |
| Provider Center | UI exposes the same safe statuses/blockers as API/CLI without implying reference metadata is live account availability. |
| CLI | CLI rejects raw keys/tokens/prompts/responses/credential paths and prints capability/eligibility/cost status consistently. |
| Docs | User/developer/reference docs match implemented behavior and unsupported modes. |

---

## Hardening Rules

Every hardening change must be tied to an audit finding. The Worker receipt must name:

- finding id
- affected files
- why the finding is Phase 7-owned
- exact fix
- regression test or verification command
- remaining risk, if any

If a finding requires new scope, new auth modes, new routing modes, hosted services, provider expansion, or unrelated cleanup, mark it blocked/future and continue all local Phase 7 work that remains safe.

---

## Development Workflow Contract

The coding agent must follow this sequence:

1. Start from the correct branch state:
   - fetch origin
   - verify PR #12 merge status
   - verify whether implementation is from updated `main` after PR #12 merge or from an explicitly approved stacked branch
   - verify staged diff is empty
   - classify any dirty files before implementation
2. Read the Phase 7 plan, `goal.md`, `state.yaml`, and Phase 6 receipts.
3. Run Scout to build the E2E audit matrix from current source, not assumptions.
4. Run Judge to lock the hardening contract and allowed-file slices before Worker edits.
5. Execute bounded Worker slices.
6. After each Worker slice:
   - run its focused verification
   - record changed files
   - record blockers/incomplete work
   - update docs or board receipts if behavior changes
7. Run code review and semantic-drift review before commit-prep.
8. Fix review findings with bounded Worker slices.
9. Run final verification:
   - focused Phase 7 tests
   - full `npm test`
   - `npx tsc --noEmit --pretty false`
   - `npm run lint` with Phase 7-owned vs pre-existing failure classification
   - `git diff --check`
   - staged diff check
   - secret scan over changed and untracked files
   - GoalBuddy checker
10. Record final receipt with:
   - completed work
   - incomplete work and why
   - blockers
   - exact commands and results
   - lint classification
   - secret-scan result
   - diff containment
   - next safe action
11. Only stage/commit/push/open PR after explicit user approval for commit-prep/publish.

---

## Sub-Agent Orchestration

Use sub-agents only for concrete GoalBuddy tasks and keep write scopes explicit.

- **PM main thread:** owns board truth, branch state, dirty-state containment, final readiness, and commit-prep.
- **Scout:** read-only E2E audit matrix, source map, current PR/main status, missing proof list.
- **Judge:** scope gate, semantic drift review, security/auth review, route-mode review, final completion decision.
- **Worker:** bounded implementation/hardening slices with explicit allowed files. Workers are not alone in the codebase and must not revert others' edits.

Do not run multiple write-capable Workers unless their allowed files are disjoint and the board records that proof.

---

## Completion Criteria

Phase 7 is complete only when:

- The E2E audit matrix maps all provider/auth router flows to current source and proof.
- Any Phase 7-owned defects found by the audit are fixed or explicitly blocked with reason.
- No unsupported mode or auth mechanism was promoted.
- Provider Center, API, CLI, router, database docs, and user/developer docs agree.
- Tests and TypeScript pass, or any blocker is exact and not Phase 7-owned.
- Lint failures are fixed if Phase 7-owned or classified if pre-existing/unrelated.
- Secret scan finds no raw credential material.
- GoalBuddy checker passes.
- Final receipt records complete work, incomplete work, blockers, verification, review fixes, and next safe action.

---

## Known Starting Blockers

- Phase 7 implementation should not start from `main` until Phase 6 PR #12 is merged, unless the user explicitly approves a stacked implementation branch.
- Repo-level lint has pre-existing unrelated failures in:
  - `components/skill-mall/skill-detail/SkillTabs.tsx:328`
  - `components/skill-mall/theme-provider.tsx:42`

These blockers do not prevent Phase 7 planning, but they must be documented during implementation.

---

## Starter Command

```text
/goal Follow docs/goals/provider-auth-router-phase7/goal.md.
```
