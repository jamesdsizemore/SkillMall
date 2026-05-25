# Provider Center Product Phase 2 Goal

Follow `docs/recovery/2026-05-21-provider-center-product-phase-2-implementation-plan.md`.

## Owner Outcome

Provider Center turns LLM access for SkillMall skill creation into a guided, understandable, required credential configuration workflow. The app must be able to configure, securely store, redact, rotate/delete, and use provider credentials for skill-generation workflows.

## Completion Oracle

The goal is complete only when:

- current source is revalidated after PR #16;
- a Judge-approved setup contract exists before code edits;
- Phase 2-owned credential setup, validation/readiness explanation, save/test/refresh sequencing, and redaction behavior are implemented;
- API access is a first-class/default setup path where a provider uses API credentials;
- configured credentials are usable by the app for LLM-backed skill creation and are never returned in UI/API/log/doc/proof output;
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
- Do not treat provider/auth/router as the product; it exists to power SkillMall skill creation.
- API access and app-configured credentials are required product capabilities, not optional extras.
- Do not store credentials in plaintext config, UI state, logs, API responses, screenshots, docs, tests, or GoalBuddy receipts.
- Do not scrape browser sessions, silently copy credential files, or ask users to paste random browser/session blobs, cookies, or copied credential-file contents.
- Do not widen `ProviderID` unless required by an approved executable adapter contract.
- Prompt/response bodies must not be stored in docs, tests, API payloads, logs, receipts, screenshots, or browser proof.
- Do not use hosted dashboards or required extra-cost infrastructure.
- Do not hand off partial work as complete.

## Starter Command

```bash
/goal Follow docs/goals/provider-center-product-phase2/goal.md.
```
