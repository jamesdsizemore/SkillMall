# Provider Center Product Phase 0 Goal

Run the Provider Center Product Phase 0 audit described in `docs/recovery/2026-05-21-provider-center-product-phase-0-implementation-plan.md`.

## Owner Outcome

SkillMall has a current-source Provider Center product workflow contract that maps the existing Provider Center, provider APIs, CLI, router, ledger, provider registry, docs, and tests to user workflows and future implementation phases.

## Required Proof

- Branch/main/dirty state and implementation authority are verified before work.
- Scout builds the evidence map from current source, not assumptions.
- Judge validates phase boundaries, semantic drift risks, and completion proof before the audit is called complete.
- The audit report exists at `docs/recovery/2026-05-21-provider-center-product-phase-0-audit-report.md`.
- The audit report maps every required workflow to source, tests, docs, gaps, and future phase ownership.
- No product code, tests, API routes, CLI commands, router files, database files, provider files, or unrelated docs are changed.
- Any incomplete work is documented with exact blocker and next safe action.

## Hard Constraints

- Phase 0 is read-only against product code.
- Do not implement UI, API, router, CLI, database, provider, or test changes.
- Do not create new providers, auth modes, routing modes, or gateway integrations.
- Do not recommend hosted apps, paid hosted dashboards, paid external control planes, or required extra-cost infrastructure.
- Do not recommend raw API key fields, raw token fields, ChatGPT browser/session token use, Claude.ai OAuth token use, Codex credential file use, Claude Code credential file use, browser cookie use, credential-file paths, or provider credential-file contents.
- Do not store prompt or response bodies in notes, reports, receipts, fixtures, or command output.
- Do not stage, commit, push, or open a PR unless the user explicitly approves commit-prep or publish after the final receipt.

## Likely Misfires

- Treating Phase 0 as a UI implementation phase.
- Reopening the whole OSS gateway/router research track.
- Auditing only the visible Provider Center component and skipping API, CLI, router, ledger, docs, and tests.
- Letting an agent make future phase decisions without source-backed evidence.
- Calling the audit complete while gaps, blockers, or phase ownership remain vague.

## Starter Command

```text
/goal Follow docs/goals/provider-center-product-phase0/goal.md.
```
