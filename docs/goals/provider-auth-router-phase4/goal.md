# Provider/Auth Router Phase 4 Goal

## Owner Outcome

Turn Phase 3's broad Provider Center into a source-backed, executable provider system for major OpenAI-compatible registry providers, provider-specific model refresh, local model/pricing snapshots, and clear cost visibility while preserving SkillMall-owned config, auth boundaries, and local-first operation.

## Required Plan

Follow:

- `docs/recovery/2026-05-20-provider-auth-router-phase-4-implementation-plan.md`

## Hard Constraints

- No implementation starts unless the branch is created from updated `main` after the completed PR queue cleanup through `bb03dc6`.
- No hosted gateway, hosted observability, or paid external control plane may become required.
- No raw API keys, ChatGPT browser/session tokens, Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, copied credential-file contents, or credential-file paths may be accepted.
- Preserve `ProviderRegistryID` as broad catalog identity and do not add one `ProviderID` per broad row.
- Use source-backed model and pricing data only after current official docs or maintainer repos are recorded.
- Provider rows without proven discovery/execution remain visible but blocked with exact reasons.
- Update docs, blockers, incomplete work, code review findings, review fixes, and verification receipts in `state.yaml`.
- Do not hand off partial work as complete.
- Do not stage, commit, push, or open a Phase 4 PR unless the user explicitly approves commit-prep or publish.

## Goal Oracle

The goal is complete only when the GoalBuddy receipts plus final verification prove:

- Source-backed model refresh persists local `llm_models` snapshots for approved provider strategies.
- OpenAI-compatible registry rows can be configured as executable routes through a generic SkillMall-owned adapter without broad-row `ProviderID` drift.
- Pricing refresh populates `llm_pricing_snapshots` from an approved source without hosted gateway credentials.
- Provider Center and CLI display model/pricing source, stale/blocker status, executable status, and actual-vs-estimated cost labels.
- Planned-source-review rows are either promoted with primary-source evidence and tests or remain blocked with exact evidence.
- API/UI/CLI/docs preserve auth and secret boundaries.
- Code review findings are fixed or explicitly blocked.
- Focused tests, full tests, TypeScript, CLI typecheck, lint classification, secret scan, and diff containment are complete.

## Likely Misfires

- Calling Phase 4 complete after only adding more catalog labels.
- Implementing a hosted gateway integration instead of SkillMall-owned local cache and router behavior.
- Adding broad providers directly to `ProviderID` one by one.
- Treating generic `/v1/models` as universal.
- Treating scraped pricing pages as a durable source without repo/API/source review.
- Letting Bifrost, GoModel, LiteLLM, Portkey, or another dashboard become the settings source of truth.
- Skipping review, docs, blocker receipts, or final verification.

## Starter Command

```text
/goal Follow docs/goals/provider-auth-router-phase4/goal.md.
```
