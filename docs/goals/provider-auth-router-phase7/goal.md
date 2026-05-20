# Provider/Auth Router Phase 7 Goal

Run the Provider/Auth Router Final E2E Audit + Hardening phase described in `docs/recovery/2026-05-20-provider-auth-router-phase-7-final-e2e-audit-hardening-plan.md`.

## Owner Outcome

SkillMall's provider/auth router system is proven end to end across Provider Center, API, CLI, local SQLite state, routing policies, capability/eligibility, pricing, ledger metadata, and docs. Any Phase 7-owned defects found by the audit are fixed with regression proof, and remaining blockers are documented exactly.

## Required Proof

- Current branch/main/PR state is verified before implementation.
- Scout produces an E2E audit matrix from current source, not assumptions.
- Judge locks hardening scope before Worker edits.
- Each hardening change is tied to an audit finding and a focused verification command.
- Provider Center, API, CLI, router, database docs, and user/developer docs agree.
- No unsupported auth mechanism, hosted dependency, new provider enum sprawl, prompt/response storage, raw credential storage, or unsupported routing mode is introduced.
- Focused tests, full tests, TypeScript, lint classification, secret scan, code review, review fixes, diff containment, and GoalBuddy checker receipts are complete.

## Hard Constraints

- Phase 7 implementation must start from updated `main` after Phase 6 PR #12 merges unless the user explicitly approves a stacked Phase 7 implementation branch.
- No hosted gateway/router/proxy/observability product may be required.
- SkillMall remains the provider/settings/model/pricing/policy/budget/cost source of truth.
- Do not accept raw API keys, ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, copied credential contents, browser session cookies, or credential-file paths.
- Do not store prompt or response bodies in tests, simulations, capability checks, ledger metadata, Provider Center state, CLI output, docs, or receipts.
- Do not widen `ProviderID` by adding one enum value per broad provider registry row.
- Do not implement `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, eval routing, keychain auth, OAuth device flow, Codex session auth, Claude Code token auth, or browser session-token handling.
- Do not fix unrelated lint errors unless the user explicitly approves a separate cleanup slice.
- Do not stage, commit, push, or open a Phase 7 PR unless the user explicitly approves commit-prep or publish.

## Likely Misfires

- Treating Phase 7 as a new feature phase instead of an E2E proof and hardening phase.
- Promoting `cheapest_compatible` because Phase 6 built eligibility substrate.
- Testing only isolated router functions and missing Provider Center/API/CLI/docs parity.
- Calling provider endpoints or storing prompt/response bodies during tests or walkthroughs.
- Treating reference metadata from LiteLLM/Portkey as live account availability.
- Hiding incomplete work behind a green unit test run.
- Letting a coding agent make its own decisions outside the plan.

## Starter Command

```text
/goal Follow docs/goals/provider-auth-router-phase7/goal.md.
```
