# Provider Center Product Phase 2 Goal

Follow `docs/recovery/2026-05-21-provider-center-product-phase-2-implementation-plan.md`.

## Owner Outcome

Provider Center turns safe provider configuration into a guided, understandable workflow for existing provider/auth/router capabilities, without adding new auth modes, new providers, new routing modes, credential storage, or executable adapters.

## Completion Oracle

The goal is complete only when:

- current source is revalidated after PR #16;
- a Judge-approved setup contract exists before code edits;
- Phase 2-owned setup guidance, validation/readiness explanation, and save/test/refresh sequencing are implemented;
- the provider status-test `prompt` ambiguity is resolved or blocked with exact evidence;
- focused and broad verification commands are run or blocked with exact evidence;
- desktop and mobile browser proof is captured or an exact runtime blocker is recorded;
- code review findings are fixed or documented with exact non-blocking rationale;
- final semantic review proves no auth/secret/provider/router/prompt-response drift;
- final GoalBuddy receipt has `decision: complete`;
- incomplete work, blockers, changed files, and next safe action are documented.

## Hard Constraints

- Do not implement until the user explicitly approves Phase 2 implementation by running this goal.
- Start from updated `main` after PR #16 is merged, unless the user explicitly approves stacked Phase 2 implementation.
- Do not add providers, auth modes, routing modes, gateway dependencies, OAuth/device flows, keychain storage, credential storage, credential-file ingestion, or executable provider adapters.
- Do not widen `ProviderID`.
- Do not accept, store, echo, screenshot, or document raw secrets, tokens, cookies, credential files, credential paths, prompt bodies, or response bodies.
- Do not use hosted dashboards or required extra-cost infrastructure.
- Do not hand off partial work as complete.

## Starter Command

```bash
/goal Follow docs/goals/provider-center-product-phase2/goal.md.
```
