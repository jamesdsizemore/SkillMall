# Provider Center Product Phase 1 Goal

Follow `docs/recovery/2026-05-21-provider-center-product-phase-1-implementation-plan.md`.

## Owner Outcome

Provider Center becomes navigable and understandable as a user-facing product surface for existing provider/auth/router capabilities, without changing underlying provider/router contracts.

## Completion Oracle

The goal is complete only when:

- current source is revalidated;
- a Judge-approved information architecture contract exists before code edits;
- Phase 1-owned Provider Center UI/test/docs changes are implemented;
- targeted and broad verification commands are run or blocked with exact evidence;
- desktop and mobile browser proof is captured or an exact runtime blocker is recorded;
- code review findings are fixed or documented with exact non-blocking rationale;
- final GoalBuddy receipt has `decision: complete`;
- incomplete work, blockers, changed files, and next safe action are documented.

## Hard Constraints

- Do not implement until the user explicitly approves Phase 1 implementation by running this goal.
- Start from updated `main` after Phase 0 PR #15 is merged, unless the user explicitly approves stacked Phase 1 implementation.
- Do not add providers, auth modes, routing modes, gateway dependencies, OAuth/device flows, credential storage, or executable adapters.
- Do not widen `ProviderID`.
- Do not accept, store, echo, screenshot, or document raw secrets, tokens, cookies, credential files, credential paths, prompt bodies, or response bodies.
- Do not use hosted dashboards or required extra-cost infrastructure.
- Do not hand off partial work as complete.

## Starter Command

```bash
/goal Follow docs/goals/provider-center-product-phase1/goal.md.
```

