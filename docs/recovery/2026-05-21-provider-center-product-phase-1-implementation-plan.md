# Provider Center Product Phase 1 Implementation Plan

> **For agentic workers:** This is a phase implementation plan, not approval to code. Start implementation only after the user explicitly runs the Phase 1 `/goal` command or otherwise approves Phase 1 implementation.

**Phase:** Provider Center Product Phase 1 - Information Architecture

**Owner outcome:** Provider Center becomes navigable and understandable as a user-facing product surface for existing provider/auth/router capabilities, without changing the underlying provider/router contracts.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Planning branch:** `codex/provider-center-product-phase1-plan`

**Plan approval:** Approved by the user after Phase 1 plan/board creation.

**Source roadmap:** `docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md`

**Source audit:** `docs/recovery/2026-05-21-provider-center-product-phase-0-audit-report.md`

**GoalBuddy board:** `docs/goals/provider-center-product-phase1/goal.md`

---

## Current Approval Boundary

This phase plan and GoalBuddy board may be created now.

Do not implement Provider Center code from this document until the user explicitly approves implementation.

Phase 0 publication was completed through PR #15. Phase 1 planning branch has been re-anchored on updated `main` after that merge.

Do not stage, commit, push, or open a PR for Phase 1 artifacts unless the user explicitly requests Phase 1 commit-prep or publish.

---

## Non-Negotiables

- Phase 1 is UI/product information architecture only.
- Do not add providers, auth modes, routing modes, gateway dependencies, OAuth/device flows, credential storage, or executable provider adapters.
- Do not widen `ProviderID`.
- Do not treat broad `ProviderRegistryID` rows as executable providers.
- Do not ask users to paste raw API keys, copied tokens, browser/session tokens, cookies, credential-file contents, or credential-file paths.
- API-key access remains optional and must be labeled as API access.
- Subscription/account/tool-session auth remains separate from API-key access.
- Do not store prompt or response bodies in UI state, fixtures, docs, tests, API payloads, logs, receipts, or screenshots.
- Do not introduce hosted dashboards, paid hosted control planes, or required extra-cost infrastructure.
- Do not promote `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, eval routing, or automatic optimization.
- Do not hand off partial work as complete. Blockers, incomplete items, and final gaps must be documented with exact evidence and next safe action.

---

## Current Source Starting Points

Revalidate before implementation:

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderCatalogList.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `components/skill-mall/providers/PolicyControlPanel.tsx`
- `components/skill-mall/providers/UsageCostPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `app/api/providers/route.ts`
- `app/api/providers/usage/route.ts`
- `lib/providers/registry.ts`
- `lib/providers/types.ts`
- `docs/user/configuring-providers.md`
- `docs/reference/provider-catalog.md`
- relevant Next.js docs under `node_modules/next/dist/docs/` before writing code, per `AGENTS.md`

Phase 1 may update only the Provider Center UI, tests directly covering that UI, and docs needed to reflect changed user-facing structure. Any API/router/provider/CLI change is a stop condition unless a Judge records a source-backed blocker and the user approves scope expansion.

---

## Product Shape To Build

Phase 1 should reorganize the existing Provider Center into a clearer workflow-oriented surface:

1. **Catalog and selection:** The provider catalog stays scanable at broad-provider scale. Users can distinguish executable providers, source-backed/reference rows, local runtimes, local tool/session rows, OpenAI-compatible/gateway rows, and planned/source-review rows.
2. **Selected provider context:** The selected provider remains obvious across the page, including provider name, access type, support status, execution boundary, model-source status, and safe next action.
3. **Workflow stages:** Existing panels are grouped into understandable stages, such as setup, model/status, routing policy, and usage/cost, without adding deeper Phase 2-5 features.
4. **State clarity:** Empty, loading, disabled, blocked, stale, fallback, reference-only, and error states tell users what the app knows and what they can safely do next.
5. **Safety language:** Labels make the difference between API access, local session/tool access, local runtime, gateway/reference access, cloud/project rows, and metadata-only rows clear.
6. **Responsive proof:** Desktop and mobile layouts must show the catalog, selected-provider context, and workflow panels without overlap or text clipping.

---

## Out Of Scope

- Guided setup flows beyond IA labels and stage placement.
- Removing or changing the provider test route optional `prompt` field; that belongs to Phase 2 unless a blocking UI issue appears.
- Model refresh behavior changes; Phase 3 owns deep model/capability polish.
- Usage/cost filtering or dashboard expansion; Phase 4 owns that.
- Policy candidate builder or simulation explainability expansion; Phase 5 owns that.
- Provider evidence workflow and provider promotion tooling; Phase 6 owns that.
- Broad OSS router/gateway research.

---

## Development Workflow Contract

Phase 1 implementation must follow this sequence:

1. **Git and containment:** Start from updated `main` after Phase 0 is merged, or record explicit stacked-branch approval. Create a `codex/` implementation branch. Classify dirty files before edits. Never revert unrelated user changes.
2. **Source revalidation:** Scout reads the current Provider Center UI, tests, API shape, docs, `AGENTS.md`, and relevant Next.js docs before implementation.
3. **IA contract:** Judge approves the exact UI structure, allowed files, non-goals, and stop conditions before Worker code edits.
4. **Implementation:** Worker completes the largest safe useful Phase 1 slice: the Provider Center IA, selected-provider context, workflow grouping, state labels, and responsive structure.
5. **Tests:** Update focused Provider Center tests for the changed IA, labels, selection behavior, safety copy, and state rendering.
6. **Runtime/browser proof:** Run the app when feasible and verify desktop and mobile Provider Center screenshots/walkthroughs. Document any environment blocker separately from code blockers.
7. **Verification:** Run targeted tests first, then broader checks. Required commands:
   - `npm test -- components/skill-mall/providers`
   - `npm test -- app/api/providers lib/providers lib/llm/router`
   - `npm test`
   - `npx tsc --noEmit --pretty false`
   - `npm run lint`
8. **Lint treatment:** If `npm run lint` fails from pre-existing unrelated issues, record exact evidence and confirm no Phase 1-owned lint regression. If Phase 1 creates lint failures, fix them before completion.
9. **Code review:** Run a code-review pass that leads with findings. Fix actionable issues, then rerun affected tests/checks.
10. **Docs and plan receipts:** Update docs/plan/GoalBuddy receipts for behavior changes, blockers, incomplete work, and final verification results.
11. **Commit-prep/publish:** Only after the user explicitly requests commit-prep or publish, stage the Phase 1-owned files, commit, push, and open/update the PR.

---

## Sub-Agent Orchestration

- **PM:** Owns branch hygiene, active-task sequencing, receipts, scope control, final completion, and user-facing blocker calls.
- **Scout:** Reads source and produces evidence maps only. Scout does not implement and does not recommend unsourced UI changes.
- **Judge:** Reviews semantic drift, scope boundaries, IA contract, code review findings, and final completion truth. Judge blocks completion when evidence is incomplete.
- **Worker:** Implements only the Judge-approved, allowed-file slice. Worker must not edit API/router/provider/CLI files unless a recorded blocker and user approval expands scope.

Use sub-agents when they can materially advance non-overlapping work. Do not delegate urgent blocking work whose result is needed for the immediate next local action.

---

## Required Evidence

Completion requires all of the following:

- Source revalidation note with current file paths and code facts.
- Judge-approved IA contract before code edits.
- Provider Center implementation diff limited to Phase 1-owned UI/test/docs files.
- Focused Provider Center tests updated and passing.
- Broader provider/router tests run or blocked with exact evidence.
- TypeScript check run or blocked with exact evidence.
- Lint run with exact pass/fail classification.
- Browser proof for desktop and mobile Provider Center, or exact environment blocker.
- Code review findings and fixes recorded.
- Final receipt listing changed files, commands, blockers, incomplete work, and next safe action.

---

## Success Criteria

Phase 1 is complete when a user can open Provider Center and understand:

- which provider is selected;
- what kind of access/configuration that provider supports;
- whether the provider is executable, reference-backed, local runtime, local session/tool, gateway/OpenAI-compatible, cloud/project, planned, or source-review only;
- where to configure safe references;
- where model/status information lives;
- where routing policy controls live;
- where usage/cost information lives;
- what is empty, disabled, blocked, stale, fallback, or unavailable;
- what safe next action is available.

The implementation must not change provider execution behavior, routing policy semantics, model refresh behavior, cost accounting, or credential-handling contracts.

---

## Known Blocks And Risks

- **Phase 0 merge state:** Resolved. Phase 0 PR #15 is merged; T001 still verifies local branch state before implementation begins.
- **Current app runtime:** Browser proof depends on local app startup. If the dev server cannot run, record the exact command/output and continue only with non-browser verification.
- **Visual regression risk:** Provider Center is dense. The IA change must avoid marketing-page patterns, nested cards, text clipping, and mobile overlap.
- **Scope drift risk:** It will be tempting to improve setup, model refresh, usage dashboard, and policy details while touching the panels. Those are later phases unless needed for Phase 1 IA labels/states.
- **Safety-copy risk:** Labels must clarify access modes without implying raw secret/token/cookie/credential-file handling.

---

## Final Handoff Rule

The coding agent must not declare Phase 1 complete with partial work.

If anything remains incomplete, the final receipt must say:

- what is incomplete;
- why it is incomplete;
- what evidence proves the blocker;
- which phase or next safe action owns it;
- whether product code is in a safe, verified state.
