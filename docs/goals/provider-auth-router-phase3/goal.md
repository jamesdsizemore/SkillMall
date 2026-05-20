# Provider/Auth Router Phase 3 Goal

## Original Request

Start Provider/Auth Router Phase 3 after Phase 2 was committed, pushed, and added to PR #8.

## Interpreted Outcome

Prepare an approval-grade Phase 3 implementation plan and GoalBuddy board for the user-facing Provider Center, broad provider catalog, model refresh/status/test actions, and usage/cost visibility on top of the Phase 1/2 router.

## Authority

Planning and board prep are requested.

Implementation is not approved until the user explicitly starts:

```text
/goal Follow docs/goals/provider-auth-router-phase3/goal.md.
```

## Hard Constraints

- Do not implement Phase 3 code during plan prep.
- Do not stage, commit, push, or open a PR during plan prep unless explicitly requested.
- Do not stack Phase 3 implementation onto the open Phase 1/2 PR branch.
- PR #8 must be merged into main or implementation must explicitly use a user-approved stacked branch from `ff37711`.
- Do not require hosted gateway/router/proxy/observability services.
- Do not require extra paid gateway apps.
- Do not ask users to paste raw ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, or Claude Code credential files.
- API access, subscription/tool-session access, local runtime access, and gateway access must be labeled separately.
- Model lists must be refreshable per provider where official APIs support discovery.
- Cost/usage must distinguish provider-reported actual cost from estimated cost.
- The agent must update docs, record blockers, document incomplete work, run review, fix review findings, and not hand off partial work as complete.

## Plan File

`docs/recovery/2026-05-20-provider-auth-router-phase-3-implementation-plan.md`

## Goal Oracle

The phase is complete only when GoalBuddy receipts plus final verification prove:

- PR #8 dependency is resolved or explicitly stacked with user approval.
- Provider Center works as the app configuration surface.
- Broad provider registry includes the named major provider families.
- Provider API and CLI expose sanitized configure/list/status/test/model-refresh flows.
- Usage/cost summary works with actual-vs-estimated labeling.
- Docs are current.
- Code review and review fixes are complete.
- Final verification, diff containment, and secret scan are complete or blockers are documented with exact evidence.

## Starter Command

```text
/goal Follow docs/goals/provider-auth-router-phase3/goal.md.
```
