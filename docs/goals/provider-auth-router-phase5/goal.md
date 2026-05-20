# Provider/Auth Router Phase 5 Goal

## Owner Outcome

Turn Phase 4's provider/model/pricing/request-ledger substrate into a user-manageable routing-policy and budget-control system across Provider Center, API, and CLI while preserving SkillMall-owned config, local SQLite accounting, and strict auth/secret boundaries.

## Required Plan

Follow:

- `docs/recovery/2026-05-20-provider-auth-router-phase-5-implementation-plan.md`

## Hard Constraints

- No implementation starts unless the branch is created from updated `main` containing Phase 4 merge commit `8ad876a`.
- No hosted gateway, hosted router, hosted proxy, hosted observability dashboard, or paid external control plane may become required.
- No raw API keys, ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, copied credential-file contents, browser session cookies, or credential-file paths may be accepted.
- API-key access remains optional and must be labeled API access.
- Do not widen `ProviderID` by adding one enum value per broad provider registry row.
- Do not implement `quality_first`, semantic routing, learned routing, or complexity routing in Phase 5.
- Do not implement `cheapest_compatible` unless Scout and Judge receipts prove pricing coverage, capability matching, deterministic missing-data blockers, and safe no-provider-request simulation.
- Do not store prompt or response bodies in policy simulation, budget checks, ledger metadata, or review artifacts.
- Do not let UI, API, CLI, router, and docs drift into separate policy-mode catalogs.
- Update docs, blockers, incomplete work, code review findings, review fixes, and verification receipts in `state.yaml`.
- Do not hand off partial work as complete.
- Do not stage, commit, push, or open a Phase 5 PR unless the user explicitly approves commit-prep or publish.

## Goal Oracle

The goal is complete only when GoalBuddy receipts plus final verification prove:

- Routing policies can be listed, inspected, created or updated, enabled/disabled, activated, and simulated through approved API, CLI, and Provider Center surfaces.
- Supported modes are consistent in router execution, validation, API responses, CLI output, UI rendering, tests, and docs.
- Budget status and budget blocking are user-manageable without hosted gateway dependency.
- Policy simulation returns route and budget reasoning without sending provider requests or storing prompt/response bodies.
- Unsupported future modes remain rejected or are promoted only through documented Scout/Judge evidence.
- Provider Center, CLI, API, database docs, and user docs agree.
- Auth and secret boundaries are preserved.
- Focused tests, full tests, TypeScript, lint classification, secret scan, code review, review fixes, and diff containment are complete.
- Any incomplete work is documented with exact blockers and next actions.

## Likely Misfires

- Treating the stale original Phase 5 label as permission to rebuild Provider Center instead of productizing policy/budget controls.
- Implementing `quality_first` because it sounds useful despite no evaluation signal.
- Implementing `cheapest_compatible` by sorting incomplete or untrusted prices.
- Adding another dashboard or hosted gateway dependency.
- Duplicating policy-mode lists in app/API/CLI instead of sharing the router contract.
- Simulating policy by sending a real provider request.
- Storing prompt/response bodies in ledger metadata.
- Calling budget visibility complete because `UsageCostPanel` displays existing budget rows.
- Skipping docs, code review, blocker receipts, or final verification.
- Letting a Worker make policy-mode decisions after the Judge gate.

## Starter Command

```text
/goal Follow docs/goals/provider-auth-router-phase5/goal.md.
```
