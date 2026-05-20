# Provider/Auth Router Phase 6 Goal

Build the Provider/Auth Router Phase 6 capability-metadata and route-eligibility substrate described in `docs/recovery/2026-05-20-provider-auth-router-phase-6-implementation-plan.md`.

## Owner Outcome

SkillMall can determine whether a routing-policy candidate is compatible with a requested operation before routing, using local capability/pricing metadata with explicit source confidence and deterministic blockers.

## Required Proof

- Current source and current official/maintainer capability sources are revalidated before code.
- Shared model capability contract exists and is used by model refresh, route eligibility, API/CLI/UI, simulation, and docs.
- Route eligibility reports chosen and rejected candidates with capability/pricing blockers without provider calls.
- `cheapest_compatible` is either safely promoted through Scout/Judge proof or remains rejected with exact blockers documented.
- Provider Center, API, CLI, database docs, and user docs agree.
- Focused tests, full tests, TypeScript, lint classification, secret scan, code review, review fixes, diff containment, and GoalBuddy checker receipts are complete.

## Hard Constraints

- Start from updated `main` containing Phase 5 merge commit `ff04dcd`.
- No hosted gateway/router/proxy/observability product may be required.
- SkillMall remains the provider/settings/model/pricing/policy/budget/cost source of truth.
- Do not accept raw API keys, ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, copied credential contents, browser session cookies, or credential-file paths.
- Do not store prompt or response bodies in capability checks, simulations, ledger metadata, or review artifacts.
- Do not widen `ProviderID` by adding one enum value per broad provider registry row.
- Do not implement `quality_first`, semantic routing, learned routing, or complexity routing.
- Do not implement `cheapest_compatible` unless Scout and Judge receipts prove the Phase 6 conditional gate.
- Unknown capability is not eligible for automatic cost-aware routing.
- Missing price is not free and is not cheapest.
- Do not stage, commit, push, or open a Phase 6 PR unless the user explicitly approves commit-prep or publish.

## Likely Misfires

- Sorting by price without proving model capability compatibility.
- Treating manual/fallback/static model labels as authoritative.
- Treating OpenAI `/models` basic identifiers as rich capability proof.
- Treating Portkey or LiteLLM reference metadata as live account availability.
- Adding a hosted or duplicate gateway dashboard.
- Skipping CLI or docs parity.
- Letting a coding agent make its own mode-promotion decision after the Judge gate.

## Starter Command

```text
/goal Follow docs/goals/provider-auth-router-phase6/goal.md.
```
