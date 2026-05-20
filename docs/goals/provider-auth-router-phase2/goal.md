# Goal: Provider/Auth Router Phase 2

## Charter

**Original request:** Create the Provider/Auth Router Phase 2 implementation plan and GoalBuddy board.

**Interpreted outcome:** After approval, SkillMall can execute Phase 2 through GoalBuddy as a controlled implementation: source revalidation, gateway candidate decision, native router extension, local gateway adapter, model refresh, pricing/cost tracking, routing policy evaluation, sanitized provider API/CLI updates, tests, lint/typecheck, code review, review fixes, docs, blocker reporting, incomplete-work reporting, and final verification.

**Input shape:** `existing_plan` - implementation scope is defined in `docs/recovery/2026-05-20-provider-auth-router-phase-2-implementation-plan.md`.

**Authority:** `needs_approval` - this board prepares execution. It does not approve code implementation.

**Proof type:** `test + review + artifact + source_backed_decision`

**Goal oracle:** The goal is complete only when the implementation plan is approved, current source and maintainer evidence are revalidated, the gateway candidate decision is recorded, all approved board tasks have receipts, focused and repo-level verification has run or blockers are documented, Judge review findings are fixed or explicitly accepted, docs are updated, and final diff containment proves excluded UI/wizard/preview/stash files were not modified by Phase 2 work.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Branch:** `codex/agent-operating-contract-auth-token-skill`

## Non-Negotiables

- No code implementation before user approval.
- No cleanup of unrelated dirty files.
- No staging, committing, or pushing without explicit user approval.
- No hosted gateway/router/proxy/observability service as required SkillMall infrastructure.
- No extra paid gateway app layer.
- No duplicate gateway dashboard as the source of truth for SkillMall settings.
- No implementation of every researched gateway.
- No raw ChatGPT browser/session tokens.
- No raw Claude.ai OAuth tokens.
- No copying Claude Code or Codex credential files into SkillMall config.
- No raw API keys or gateway virtual keys returned by API routes.
- Preserve `resolveProviderConfig()` -> `createLLMClient()` -> `LLMClient.complete()` until a later approved refactor.
- Direct provider execution remains supported.
- Model and pricing refresh must label source, timestamp, and estimated versus exact cost.
- Any selected gateway must be local/self-hosted and integrated through SkillMall's router contract.

## Source Of Truth

- `AGENTS.md`
- `docs/recovery/2026-05-19-provider-recovery-inventory.md`
- `docs/recovery/2026-05-19-skillmall-recovery-auth-token-plan.md`
- `docs/recovery/2026-05-19-provider-auth-supportability-report.md`
- `docs/recovery/2026-05-19-provider-auth-router-architecture-plan.md`
- `docs/recovery/2026-05-19-provider-auth-router-phase-1-implementation-plan.md`
- `docs/recovery/2026-05-20-provider-auth-router-phase-2-implementation-plan.md`
- `docs/reference/provider-catalog.md`
- `docs/reference/database-schema.md`
- Current maintainer docs/repos for Bifrost, GoModel, LiteLLM, TensorZero, Portkey Gateway, QuantumNous/new-api, labring/aiproxy, and GPT-Load.

## Development Process

Implementation must run through this board after approval.

Preferred entrypoint when native Codex goals are enabled:

```bash
/goal Follow docs/goals/provider-auth-router-phase2/goal.md.
```

Fallback entrypoint when native Codex `/goal` is unavailable:

- Use the current Codex thread as PM.
- Keep `docs/goals/provider-auth-router-phase2/state.yaml` as board truth.
- Execute exactly one active task at a time.
- Update receipts in `state.yaml` after each task.
- Follow the same Scout/Worker/Judge responsibilities and verification gates.
- Do not treat native `/goal` runtime unavailability as approval to skip the board.

Required operating steps:

1. Revalidate branch, dirty tree, staged diff, source docs, current code, and allowed files.
2. Revalidate current maintainer evidence before deciding gateway integration.
3. Judge-select one gateway path or block gateway implementation.
4. Execute bounded Worker slices with explicit `allowed_files`.
5. Record command output summaries and failures in `state.yaml` receipts.
6. Run focused tests for each slice.
7. Run shared router/provider/API verification before Judge review and final verification.
8. Run Judge code review after implementation slices.
9. Convert findings into a bounded review-fix Worker task.
10. Run final tests, typecheck, lint, secret scan, and diff containment.
11. Update documentation.
12. Document anything not completed, why it was not completed, the evidence, and the next safe action.
13. Stop before staging, committing, pushing, or opening a PR unless the user explicitly approves.

## Completion Discipline

- The agent must complete the approved Phase 2 work, not stop after a report, spike, helper layer, or planning handoff.
- The agent must continue through the board while safe approved work remains.
- A Worker task is not complete until implementation, focused verification, receipt, and required docs updates are done.
- The overall goal is not complete until all approved tasks are done, Judge review is complete, review fixes are done or explicitly accepted, final verification has run, and docs/receipts are current.
- If anything remains incomplete, the final receipt must say what remains, why, what evidence proves the blocker, and what the next required action is.
- Environmental failures, disabled runtime features, unavailable credentials, and pre-existing failures must be recorded as blockers with exact command evidence.
- Partial work must not be presented as final completion.

## Sub-Agent Orchestration

PM:

- Keeps one active task.
- Enforces approval scope and hard stops.
- Updates receipts.
- Prevents many-gateway bakeoff drift.
- Keeps execution moving until the approved Phase 2 outcome is complete or explicitly blocked.
- Blocks final completion if plan docs, reference docs, or board receipts are stale.

Scout:

- Performs read-only current-source and maintainer-doc mapping.
- Confirms current source still matches the plan before Worker edits.
- Records license/runtime/model/pricing/auth/logging evidence for gateway candidates.

Worker:

- Edits only listed `allowed_files`.
- Runs focused verification.
- Records changed files, commands, failures, and risks.
- Does not revert unrelated dirty files.
- Completes the full assigned slice unless a hard stop applies.
- Documents blockers, incomplete work, and next safe action before returning blocked work.
- Updates docs/receipts when behavior or verification changes.

Judge:

- Validates plan conformance before execution.
- Selects or blocks the gateway integration path.
- Reviews code before final completion.
- Blocks completion for secret leaks, hosted dependencies, duplicate dashboards, raw-token asks, excluded file changes, missing docs, missing verification, or partial implementation presented as done.
- Blocks completion when incomplete work is not documented with blocker evidence and next action.

Parallelization:

- Parallel Workers are allowed only for disjoint `allowed_files`.
- Shared router files must not be edited by multiple Workers at the same time.
- Scout and Judge read-only tasks may run in parallel with non-overlapping Worker implementation only after the board has an approved active task.

## Completion Criteria

- Phase 2 implementation is approved by the user before code work begins.
- Current-source and maintainer-source receipts are recorded.
- Gateway candidate selection is decided by Judge using hard reject criteria.
- Direct backend remains compatible.
- Selected local gateway backend, if approved, integrates through SkillMall's router contract.
- Gateway virtual keys and provider API keys are secret references only.
- Model refresh writes local model metadata and preserves static defaults only as fallbacks.
- Pricing refresh and costing distinguish exact from estimated costs.
- Routing policies support only approved Phase 2 modes.
- Request ledger records provider/model/backend/auth/policy/usage/cost/fallback/error metadata without storing prompt or response bodies by default.
- Provider API and CLI status responses are sanitized.
- Next.js route-handler docs are read before app route edits.
- Docs explain gateway decision, auth modes, model refresh, pricing refresh, routing policies, cost labels, and blockers.
- Judge code review is complete and findings are fixed or explicitly accepted.
- Final verification receipts include tests, typecheck, lint, secret scan, and diff containment.
- Any incomplete work is documented with exact blocker evidence and next safe action.
- No partial work is handed off as final completion.
