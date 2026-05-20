# Goal: Provider/Auth Router Phase 1

## Charter

**Original request:** After approval, implement Provider/Auth Router Phase 1 through a controlled GoalBuddy execution process that includes source revalidation, sub-agent orchestration, tests, lint/typecheck, code review, review fixes, documentation, blocker reporting, incomplete-work reporting, and final verification.

**Interpreted outcome:** After approval, SkillMall can execute Phase 1 through GoalBuddy as a controlled implementation: source revalidation, native router/auth core, secret references, request/cost ledger, sanitized provider APIs, tests, lint/typecheck, code review, review fixes, final verification, and documentation.

**Input shape:** `existing_plan` - implementation scope is defined in `docs/recovery/2026-05-19-provider-auth-router-phase-1-implementation-plan.md`.

**Authority:** `needs_approval` - this board prepares execution. It does not approve code implementation.

**Proof type:** `test + review + artifact`

**Goal oracle:** The goal is complete only when the implementation plan is approved, all board tasks have receipts, focused and repo-level verification has run or blockers are documented, Judge review findings are fixed or explicitly accepted, docs are updated, and final diff containment proves excluded UI/wizard/gateway files were not modified by the Phase 1 work.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Branch:** `codex/agent-operating-contract-auth-token-skill`

## Non-Negotiables

- No code implementation before user approval.
- No cleanup of unrelated dirty files.
- No staging, committing, or pushing without explicit user approval.
- No gateway sidecar in Phase 1.
- No Provider Center redesign in Phase 1.
- No broad provider catalog/model-refresh implementation in Phase 1.
- No `.env.local` writes from app configuration.
- No raw API keys in `~/.skill-mall/config.json`.
- No raw ChatGPT browser/session tokens, Claude.ai OAuth tokens, or Claude Code credential files requested from users.
- Preserve existing `resolveProviderConfig()` -> `createLLMClient()` -> `LLMClient.complete()` call surface.
- Phase 1 executable auth modes are only `env_key`, `local_cli_session`, and `none_local`.
- Phase 1 executable gateway backend is only `direct`.
- Phase 1 routing-policy table is metadata only; no runtime policy evaluation.

## Source Of Truth

- `AGENTS.md`
- `docs/recovery/2026-05-19-provider-recovery-inventory.md`
- `docs/recovery/2026-05-19-skillmall-recovery-auth-token-plan.md`
- `docs/recovery/2026-05-19-provider-auth-router-architecture-plan.md`
- `docs/recovery/2026-05-19-provider-auth-router-phase-1-implementation-plan.md`

## Development Process

Implementation must run through this board after approval.

Preferred entrypoint when native Codex goals are enabled:

```bash
/goal Follow docs/goals/provider-auth-router-phase1/goal.md.
```

Fallback entrypoint when native Codex `/goal` is unavailable:

- Use the current Codex thread as PM.
- Keep `docs/goals/provider-auth-router-phase1/state.yaml` as board truth.
- Execute exactly one active task at a time.
- Update receipts in `state.yaml` after each task.
- Follow the same Scout/Worker/Judge responsibilities and verification gates.
- Do not treat native `/goal` runtime unavailability as approval to skip the board.

Required operating steps:

1. Revalidate branch, dirty tree, staged diff, source docs, and allowed files.
2. Execute bounded Worker slices with explicit `allowed_files`.
3. Record command output summaries and failures in `state.yaml` receipts.
4. Run focused tests for each slice.
5. Run shared router/provider verification before Judge review and final verification.
6. Run Judge code review after implementation slices.
7. Convert findings into a bounded review-fix Worker task.
8. Run final tests, typecheck, lint, secret scan, reserved-term classification, and diff containment.
9. Update documentation.
10. Update the implementation plan, board receipts, and reference docs when behavior, blockers, or verification results change.
11. Document anything not completed, why it was not completed, the evidence, and the next safe action.
12. Stop before staging, committing, or pushing unless the user explicitly approves.

## Completion Discipline

- The agent must complete the approved Phase 1 work, not stop after a partial helper layer or planning handoff.
- The agent must continue through the board while safe local work remains.
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
- Prevents research loops and many-repo gateway bakeoffs.
- Keeps execution moving until the approved Phase 1 outcome is complete or explicitly blocked.
- Blocks final completion if plan docs, reference docs, or board receipts are stale.

Scout:

- Performs read-only source and dirty-tree mapping.
- Confirms current source still matches the plan before Worker edits.

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
- Reviews code before final completion.
- Blocks completion for secret leaks, `.env.local` writes, raw-token asks, excluded file changes, missing docs, or missing verification.
- Blocks completion for partial implementation presented as done.
- Blocks completion when incomplete work is not documented with blocker evidence and next action.

Parallelization:

- Parallel Workers are allowed only for disjoint `allowed_files`.
- Shared files such as `lib/providers/index.ts`, `lib/providers/types.ts`, and router tests must not be edited by multiple Workers at the same time.

## Completion Criteria

- Phase 1 implementation is approved by the user before code work begins.
- Router/auth types and secret refs exist and are tested.
- SQLite router/ledger migration exists and is tested.
- Request ledger helpers record started/succeeded/failed events without storing prompt or response bodies by default.
- Config resolution uses explicit auth modes and secret refs.
- CLI and provider API config paths do not store or return raw secrets.
- Existing direct provider clients still construct and `LLMClient.complete()` remains compatible.
- Provider API routes return sanitized status only.
- Reserved future auth modes, gateway backends, and routing policies are rejected or documented as not implemented.
- Reserved-term scan hits are classified as `negative test`, `future/not implemented docs`, or `drift`; `drift` blocks completion.
- Next.js route-handler docs are read before app route edits.
- Docs explain auth modes, secret refs, ledger tables, and Phase 2 gateway boundary.
- Judge code review is complete and findings are fixed or explicitly accepted.
- Final verification receipts include tests, typecheck, lint, secret scan, reserved-term classification, and diff containment.
- The implementation plan, GoalBuddy board, and reference docs are current.
- Any incomplete work is documented with exact blocker evidence and next safe action.
- No partial work is handed off as final completion.
