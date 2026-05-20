# SkillMall Recovery And Auth-Token Support Plan

Date: 2026-05-19
Status: Draft for user approval
Branch: `codex/agent-operating-contract-auth-token-skill`
Contract: `/Users/jamesdsizemore/.agents/contracts/codex-operating-contract.md`
Foundation brief: `/Users/jamesdsizemore/.agents/plans/2026-05-19-foundation-decision-brief-skillmall-recovery-auth-token.md`
Foundation approval: Approved by user in chat on 2026-05-19 with message: `APPROVED`

## Approval State

This plan is not approved.

No implementation, cleanup, revert, staging, commit, push, or PR is authorized by this plan being written.

The next approved implementation action, if this plan is approved, is Task 1: create a recovery inventory artifact.

## Request Mode

Mode: plan-only.

Allowed in this turn:

- write this recovery plan
- inspect current git status/diff names
- preserve current state

Forbidden in this turn:

- code edits
- cleanup
- revert
- staging
- commit
- push
- PR
- auth-token implementation
- provider implementation
- wizard implementation
- docs edits beyond this recovery plan

## Contract Receipt

Contract path:

`/Users/jamesdsizemore/.agents/contracts/codex-operating-contract.md`

Current SkillMall contract state:

- no `.codex/contract-state.json`
- advisory mode only
- implementation/stage/commit/push blocked

## Foundation Decision

Approved foundation decision:

Inventory and classify dirty work first, then split into approved PR-sized paths.

This plan must not start with auth-token implementation.

## Source Of Truth

Files and commands used:

```bash
git status --short --branch
git diff --name-status
find . -maxdepth 3 -path './.git' -prune -o -path './node_modules' -prune -o -type f -print | rg '^\\./(docs/recovery|docs/superpowers/plans|docs/architecture|\\.codex)' || true
```

Important project instruction surface:

- `/Users/jamesdsizemore/Developer/skill-mall/AGENTS.md`

Known global process artifacts:

- `/Users/jamesdsizemore/.agents/contracts/codex-operating-contract.md`
- `/Users/jamesdsizemore/.agents/scripts/contract-status.sh`
- `/Users/jamesdsizemore/.agents/plans/2026-05-19-foundation-decision-brief-skillmall-recovery-auth-token.md`

## Current State

Current branch:

`codex/agent-operating-contract-auth-token-skill`

Current dirty tracked files:

```text
app/api/confirm-research/route.ts
app/api/create-skill/route.ts
app/api/providers/configure/route.ts
app/api/providers/route.ts
app/settings/providers/page.tsx
components/skill-mall/wizard/Step3Metadata.tsx
components/skill-mall/wizard/Step4Preview.tsx
components/skill-mall/wizard/WizardShell.tsx
components/skill-mall/wizard/__tests__/wizard-state.test.ts
components/skill-mall/wizard/useWizard.ts
components/skill-mall/wizard/wizard-reducer.ts
lib/pipeline.ts
lib/providers/__tests__/config-resolution.test.ts
lib/providers/__tests__/providers.test.ts
lib/providers/defaults.ts
lib/providers/index.ts
lib/providers/types.ts
lib/validators.ts
```

Current untracked files/directories:

```text
.codex/
app/api/preview-skill/
docs/architecture/
docs/superpowers/plans/2026-05-19-auth-token-provider-selection-recovery.md
lib/providers/__tests__/catalog.test.ts
lib/providers/anthropic.ts
lib/providers/catalog.ts
lib/providers/config-store.ts
```

Known local tool-state files under `.codex/`:

```text
.codex/hooks/stop-process-check.sh
.codex/hooks/plan-write-guard.sh
.codex/hooks/phase-plan-preflight.sh
.codex/hooks.json
```

## Assumptions And Uncertainties

Assumptions:

- Dirty files are from the prior accidental implementation attempt unless proven otherwise.
- The user does not want silent cleanup or revert.
- Some wizard preview work may be useful but must be reviewed and approved separately.
- API-key provider support may still be useful for other users, but must be clearly separated from subscription/account auth.
- OpenAI/ChatGPT Pro/Codex subscription auth and Claude account/Max auth must be researched and designed as first-class auth modes, not renamed API keys.

Uncertainties:

- Whether the current branch name should be kept for recovery or replaced with a cleaner branch after inventory.
- Whether the accidental `.codex/` project hooks should be preserved, dropped, or moved.
- Whether the preview repair should become its own PR before provider/auth recovery.
- Whether Anthropic API support should be kept as optional `anthropic-api` work or dropped.
- Which external provider/auth sources will be official enough for implementation.

Resolution:

- Do not decide these during planning.
- Task 1 inventory records them.
- User approves classification before any code movement.

## Non-Goals

This plan does not:

- implement auth-token support
- implement provider registry
- redesign UI
- fix the wizard
- clean up accidental work
- revert accidental work
- create commits
- create PRs
- install hooks
- store secrets
- update production docs beyond approved recovery artifacts

## Success Criteria

This recovery sequence succeeds when:

1. Every dirty file is inventoried exactly once.
2. Each dirty file is classified with an approved status.
3. Useful preview repair work is separated from provider/auth work.
4. Wrong API-key/auth-token assumptions are explicitly marked REWORK or DROP.
5. No secrets are introduced or stored.
6. No file is staged before user approves its classification and task.
7. Follow-up work is split into PR-sized paths.
8. Auth-token implementation is preceded by current authoritative research.
9. Documentation updates are planned as part of done for each implementation PR.
10. Tests/lint/typecheck/build/review/fix/re-review are included in every implementation PR plan.

## Simplicity Constraints

- First implementation task is inventory only.
- No code changes in inventory task.
- No branch cleanup in inventory task.
- No provider/auth code before research.
- No UI overhaul before UX diagnosis and plan.
- No hooks before user approves project-specific activation.
- Keep recovery artifacts readable and local to `docs/recovery/`.

## Surgical Change Boundary

Allowed for Task 1 after approval:

- create `docs/recovery/2026-05-19-provider-recovery-inventory.md`

Forbidden for Task 1:

- app code edits
- lib code edits
- component code edits
- test edits
- provider edits
- docs outside `docs/recovery/`
- deleting files
- moving files
- staging files
- committing

## Change Effect Test

| Proposed item | Decision changed | Process changed | Action required or blocked | Proof produced | Enforcement path | Failure mode prevented |
|---|---|---|---|---|---|---|
| Recovery inventory | User decides keep/rework/drop per dirty file before edits | Recovery starts with classification instead of coding | Blocks cleanup/revert/stage before inventory approval | Inventory table | Contract + this plan | Accidental work silently kept or destroyed |
| PR-split recovery | User decides sequence by coherent slices | Work moves from one dirty pile into reviewed PR-sized paths | Blocks giant mixed recovery PR | Follow-up PR map | Approved inventory | Preview fix and auth architecture mixed together |
| Auth-token research gate | User decides auth mode from evidence | Auth work starts with current authoritative research | Blocks API-key substitution | Research receipts and auth-mode matrix | Auth-token follow-up plan | ChatGPT/Claude subscription auth mistaken for APIs |
| Docs-as-done gate | User decides docs affected by actual diff | Each PR audits durable docs | Blocks done without docs audit | Docs audit table | Implementation plan template | App behavior changes with stale docs |

## Task 1: Recovery Inventory

Create:

`docs/recovery/2026-05-19-provider-recovery-inventory.md`

The inventory must include:

- branch and status receipt
- tracked dirty files
- untracked dirty files
- each file classified exactly once
- reason for classification
- approved next action
- whether file belongs to preview repair, provider/API work, auth-token recovery, docs/plans, local tool state, or unknown

Required statuses:

- KEEP_AS_IS
- KEEP_RENAMED
- KEEP_AFTER_REVIEW
- REWORK
- DROP
- PLAN_ONLY
- UNKNOWN_NEEDS_REVIEW

Expected first-pass classification:

| File/group | Likely status | Reason |
|---|---|---|
| `app/api/preview-skill/route.ts` | KEEP_AFTER_REVIEW | Candidate fix for blank SKILL.md preview |
| `components/skill-mall/wizard/*` | KEEP_AFTER_REVIEW | Candidate preview/editor persistence work |
| `lib/pipeline.ts`, `lib/validators.ts`, create/confirm routes | KEEP_AFTER_REVIEW | Candidate reviewed SKILL.md content flow |
| `lib/providers/anthropic.ts` | KEEP_RENAMED or REWORK | Optional API provider, not Claude account auth |
| `lib/providers/catalog.ts` | REWORK | Too narrow/API-biased |
| `lib/providers/config-store.ts` | REWORK | Credential storage design not approved |
| provider settings/routes/tests | REWORK | Wrong auth taxonomy and storage model |
| `docs/architecture/skill-creation-provider-ux-repair.md` | REWORK or DROP | Contains unapproved framing |
| `docs/superpowers/plans/2026-05-19-auth-token-provider-selection-recovery.md` | PLAN_ONLY | Prior plan artifact, superseded/needs review |
| `.codex/` | UNKNOWN_NEEDS_REVIEW | Local tool/project hook state; do not stage |

Verification:

```bash
git status --short --branch
git diff --name-status
rg -n "Codex Enterprise|Business access token|CLAUDE\\.md" docs/recovery/2026-05-19-provider-recovery-inventory.md || true
```

Approval gate:

- user must approve inventory before Task 2.

## Task 2: Follow-Up PR Map

After inventory approval, create a follow-up map with proposed PRs.

Likely PRs:

1. Preview repair PR
   - only actual SKILL.md preview/edit persistence
   - tests for Step 3 to Step 4 preview and edited content persistence

2. Provider/auth architecture docs PR
   - ADRs/context docs only
   - provider auth taxonomy
   - credential storage policy
   - gateway/BFF boundary
   - model discovery policy

3. Auth-token implementation PR
   - only after current authoritative research
   - ChatGPT Pro/Codex subscription/account auth path
   - Claude account/Max path only if support is verified
   - API-key providers preserved separately

4. Provider settings UX PR
   - grouped auth modes
   - test connection
   - model source labels
   - secure credential UX

5. Documentation completion PR
   - user/provider docs
   - developer/security docs
   - API route docs
   - troubleshooting docs

Each PR must get its own Foundation Decision Brief if the core decision is not already settled.

## Task 3: Auth-Token Research Gate

Before auth implementation, research:

- official OpenAI Codex/ChatGPT account auth docs
- official OpenAI Codex CLI/app-server auth behavior
- official Claude account/Max/Code auth docs
- serious implementation references such as OpenClaw/opencode where official docs are incomplete
- secure credential storage options
- gateway/BFF/proxy options
- model discovery APIs and limitations

Output:

- research receipt
- auth-mode matrix
- supported/unsupported mode list
- implementation risk list

No code before research approval.

## Task 4: Documentation Plan

Every implementation PR must audit and update durable docs.

Likely docs:

- `docs/user/configuring-providers.md`
- `docs/developer/architecture.md`
- `docs/developer/security.md`
- `docs/reference/provider-catalog.md`
- `docs/reference/api-routes.md`
- `docs/reference/pipeline-architecture.md`
- `docs/user/using-the-wizard.md`
- new ADRs under `docs/adr/` or `docs/architecture/`

Docs audit table required:

| Changed area | Docs checked | Docs updated | Reason |
|---|---|---|---|

## Testing Plan

Task 1 inventory:

- no app tests required
- verify inventory covers every dirty file exactly once

Future preview repair PR:

- wizard reducer tests
- preview route tests if route retained
- create/confirm route tests for edited SKILL.md content
- `npm test`
- `npx tsc --noEmit`
- `npm run lint`

Future provider/auth PRs:

- provider registry unit tests
- credential storage tests with fake secrets
- redaction tests
- model discovery tests with mocked fetch
- connection test route tests
- settings UI tests where feasible
- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- build if routes/config changed

Known previous verification context:

- Prior accidental work once had `npm test` and `npx tsc --noEmit` passing after `.next` cleanup.
- `npm run lint` had pre-existing failures unrelated to the preview patch.
- These results are not current proof; rerun in approved PRs.

## Lint Typecheck Build Plan

No lint/typecheck/build for writing the inventory.

Every implementation PR must include:

- targeted tests
- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- build where relevant

Pre-existing failures must be separated from PR-owned failures.

## Error Logging And Observability

Inventory task:

- no runtime logging changes

Future auth/provider work:

- define safe user-facing errors
- define redacted developer diagnostics
- never log raw tokens, refresh tokens, API keys, cookies, or auth headers
- test redaction paths

## Security Review

Inventory task:

- no secrets should be read or printed
- no `.env` values should be displayed
- no credential files should be inspected

Future auth work:

- no `.env` as default user-facing secret store
- secure local storage or vault/KMS as appropriate
- browser never receives raw tokens
- gateway/BFF owns credential use
- no cookie extraction
- no secrets in logs/docs/tests

## Git Plan

Current plan:

- do not stage
- do not commit
- do not push

After inventory approval:

- user decides whether to keep current branch or create a clean recovery branch
- stage only approved recovery inventory if requested
- no implementation commit until PR-specific plan approval

## Code Review Plan

Inventory review:

- verify every dirty file appears once
- verify statuses are honest
- verify auth-token/API-key mistake is explicitly marked
- verify no file cleanup is performed
- verify no unrelated docs are edited

Future PR review:

- findings-first review
- fix pass
- second review
- final verification

## Handoff Plan

After Task 1, handoff must include:

- inventory path
- number of files classified
- unknowns
- recommended PR split
- explicit statement that no code cleanup/revert/stage/commit occurred

## Approval Gate

This recovery plan is not approved.

Approval phrase can be:

`Approved for Task 1 inventory only.`

Without that approval, no inventory artifact is created.

