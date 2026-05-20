# SkillMall Provider Recovery Inventory

Date: 2026-05-19
Branch: `codex/agent-operating-contract-auth-token-skill`
Status: Inventory artifact only

## Purpose

This inventory classifies the dirty SkillMall work created during the prior mistaken implementation attempt. It does not approve, stage, commit, revert, delete, or implement anything.

The approved recovery foundation is:

- inventory and classify dirty work first
- preserve useful work only after review
- rework the API-key-centered provider changes before any auth-token/provider PR
- do not confuse ChatGPT Pro/Codex subscription/account auth with OpenAI Platform API keys
- do not confuse Claude account/Max auth with Anthropic API keys
- keep API-key access as an optional user path, but label it as API access

## Command Receipts

Captured from the workspace root:

`/Users/jamesdsizemore/Developer/skill-mall`

### Branch And Dirty Status

```text
## codex/agent-operating-contract-auth-token-skill
 M app/api/confirm-research/route.ts
 M app/api/create-skill/route.ts
 M app/api/providers/configure/route.ts
 M app/api/providers/route.ts
 M app/settings/providers/page.tsx
 M components/skill-mall/wizard/Step3Metadata.tsx
 M components/skill-mall/wizard/Step4Preview.tsx
 M components/skill-mall/wizard/WizardShell.tsx
 M components/skill-mall/wizard/__tests__/wizard-state.test.ts
 M components/skill-mall/wizard/useWizard.ts
 M components/skill-mall/wizard/wizard-reducer.ts
 M lib/pipeline.ts
 M lib/providers/__tests__/config-resolution.test.ts
 M lib/providers/__tests__/providers.test.ts
 M lib/providers/defaults.ts
 M lib/providers/index.ts
 M lib/providers/types.ts
 M lib/validators.ts
?? .codex/
?? app/api/preview-skill/
?? docs/architecture/
?? docs/recovery/
?? docs/superpowers/plans/2026-05-19-auth-token-provider-selection-recovery.md
?? lib/providers/__tests__/catalog.test.ts
?? lib/providers/anthropic.ts
?? lib/providers/catalog.ts
?? lib/providers/config-store.ts
```

### Tracked Dirty Files

```text
M	app/api/confirm-research/route.ts
M	app/api/create-skill/route.ts
M	app/api/providers/configure/route.ts
M	app/api/providers/route.ts
M	app/settings/providers/page.tsx
M	components/skill-mall/wizard/Step3Metadata.tsx
M	components/skill-mall/wizard/Step4Preview.tsx
M	components/skill-mall/wizard/WizardShell.tsx
M	components/skill-mall/wizard/__tests__/wizard-state.test.ts
M	components/skill-mall/wizard/useWizard.ts
M	components/skill-mall/wizard/wizard-reducer.ts
M	lib/pipeline.ts
M	lib/providers/__tests__/config-resolution.test.ts
M	lib/providers/__tests__/providers.test.ts
M	lib/providers/defaults.ts
M	lib/providers/index.ts
M	lib/providers/types.ts
M	lib/validators.ts
```

### Staged Files

```text
No staged files.
```

### Untracked Files

```text
.codex/hooks.json
.codex/hooks/phase-plan-preflight.sh
.codex/hooks/plan-write-guard.sh
.codex/hooks/stop-process-check.sh
app/api/preview-skill/route.ts
docs/architecture/skill-creation-provider-ux-repair.md
docs/recovery/2026-05-19-skillmall-recovery-auth-token-plan.md
docs/superpowers/plans/2026-05-19-auth-token-provider-selection-recovery.md
lib/providers/__tests__/catalog.test.ts
lib/providers/anthropic.ts
lib/providers/catalog.ts
lib/providers/config-store.ts
```

## Status Definitions

| Status | Meaning |
|---|---|
| KEEP_AS_IS | Can be kept without material change after approval. |
| KEEP_RENAMED | Concept may be useful but name/framing must change before commit. |
| KEEP_AFTER_REVIEW | Candidate useful work, but not approved until reviewed and verified. |
| REWORK | Direction contains meaningful value but implementation/framing is wrong. |
| DROP | Should not be included in a recovery PR; deletion still needs explicit approval. |
| PLAN_ONLY | Planning/recovery artifact, not product implementation. |
| UNKNOWN_NEEDS_REVIEW | Do not decide yet; inspect or ask before touching. |

## Inventory Table

| Path | Git state | Area | Status | Why | Approved next action |
|---|---:|---|---|---|---|
| `app/api/confirm-research/route.ts` | Modified | Skill creation preview | KEEP_AFTER_REVIEW | Passes edited `SKILL.md` content into prompt preview. Likely aligns with the broken preview issue, but it was created before an approved implementation plan. | Review with preview route and wizard state in a preview-repair PR plan. Do not stage yet. |
| `app/api/create-skill/route.ts` | Modified | Skill creation preview | KEEP_AFTER_REVIEW | Passes edited `SKILL.md` content into final skill creation. Useful only if the preview artifact contract is accepted. | Review with persistence/final-write tests before any commit. |
| `app/api/providers/configure/route.ts` | Modified | Provider/API config | REWORK | Writes credential-bearing values to local config and `.env.local`, mutates `process.env`, and validates a narrow provider enum before the auth-mode/security design is approved. | Replace with approved credential-storage and auth-mode flow. Preserve only after security review. |
| `app/api/providers/route.ts` | Modified | Provider catalog API | REWORK | Moves to a provider catalog, but the catalog is still API-key-centered and too narrow for the requested comprehensive provider selection. | Rebuild around an approved provider registry with account/subscription, API, local, cloud, and custom endpoint modes. |
| `app/settings/providers/page.tsx` | Modified | Provider UX | REWORK | UI distinguishes API/CLI/local a little better, but still lacks the requested user-centered auth-mode selection and comprehensive provider setup. | Rebuild after UX diagnosis and provider taxonomy approval. |
| `components/skill-mall/wizard/Step3Metadata.tsx` | Modified | Skill creation preview | KEEP_AFTER_REVIEW | Adds loading/error state before preview generation. Plausibly useful for the broken Step 3 to Step 4 transition. | Review in a focused preview-repair PR plan. |
| `components/skill-mall/wizard/Step4Preview.tsx` | Modified | Skill creation preview | KEEP_AFTER_REVIEW | Converts preview editor from local-only state to controlled state. Plausibly fixes edited content loss. | Verify with tests and running app before commit. |
| `components/skill-mall/wizard/WizardShell.tsx` | Modified | Skill creation preview | KEEP_AFTER_REVIEW | Calls a new preview route before Step 4 and forwards edited content downstream. Useful but needs review for API contract, errors, and routing. | Review and test as part of preview-repair slice only. |
| `components/skill-mall/wizard/__tests__/wizard-state.test.ts` | Modified | Skill creation preview tests | KEEP_AFTER_REVIEW | Adds coverage that edited `SKILL.md` content persists into the in-memory preview directory. | Keep only if reducer contract survives review. |
| `components/skill-mall/wizard/useWizard.ts` | Modified | Skill creation preview state | KEEP_AFTER_REVIEW | Adds setter for edited preview content. Small and likely necessary if controlled editor remains. | Review with reducer/action naming. |
| `components/skill-mall/wizard/wizard-reducer.ts` | Modified | Skill creation preview state | KEEP_AFTER_REVIEW | Persists edited `SKILL.md` into preview directory. Useful for final artifact correctness. | Verify reducer behavior and final creation flow. |
| `lib/pipeline.ts` | Modified | Skill creation preview | KEEP_AFTER_REVIEW | Adds `replaceSkillMdContent`, a small helper for carrying reviewed `SKILL.md` content downstream. | Review with route tests for final written artifact. |
| `lib/providers/__tests__/config-resolution.test.ts` | Modified | Provider/API tests | REWORK | Adds Anthropic API config expectations before approved auth taxonomy and secret-store design. | Rewrite under approved provider IDs and credential rules. |
| `lib/providers/__tests__/providers.test.ts` | Modified | Provider/API tests | REWORK | Tests the accidental Anthropic API provider as a first-class provider without clarifying API vs account auth. | Replace with explicit `anthropic-api` or approved equivalent if kept. |
| `lib/providers/defaults.ts` | Modified | Provider/API defaults | REWORK | Adds Anthropic and updates OpenAI default model as static values before current-model strategy is approved. | Move defaults into approved catalog with live/cache/fallback model policy. |
| `lib/providers/index.ts` | Modified | Provider/API runtime | REWORK | Adds Anthropic API client wiring and env fallback logic without the requested auth-mode separation or secure credential decision. | Rebuild after provider registry and credential broker design. |
| `lib/providers/types.ts` | Modified | Provider/API types | REWORK | Adds `anthropic` to the existing provider union instead of introducing a taxonomy that separates account/subscription auth, API keys, local CLI, local runtime, cloud identity, and custom endpoints. | Replace with approved provider/auth-mode types. |
| `lib/validators.ts` | Modified | Skill creation preview | KEEP_AFTER_REVIEW | Adds optional `skillMdContent` to the create/confirm payload. Useful if final artifact accepts reviewed user edits. | Review with route validation tests. |
| `.codex/hooks.json` | Untracked | Local tool state | DROP | Project-local hook config was created during the wrong recovery path and should not be committed as part of SkillMall product recovery. | Do not stage. Delete only after explicit cleanup approval. |
| `.codex/hooks/phase-plan-preflight.sh` | Untracked | Local tool state | DROP | Hook is tool-specific process scaffolding, not part of the approved SkillMall recovery artifact. | Do not stage. Delete only after explicit cleanup approval. |
| `.codex/hooks/plan-write-guard.sh` | Untracked | Local tool state | DROP | Placeholder hook has no product value and should not enter the repo. | Do not stage. Delete only after explicit cleanup approval. |
| `.codex/hooks/stop-process-check.sh` | Untracked | Local tool state | DROP | Hook is local process enforcement scaffolding and should not be mixed into this product branch. | Do not stage. Delete only after explicit cleanup approval. |
| `app/api/preview-skill/route.ts` | Untracked | Skill creation preview | KEEP_AFTER_REVIEW | New route builds the actual in-memory `SKILL.md` before Step 4. This directly targets the blank editable preview defect, but still needs review and tests. | Consider for the first focused preview-repair PR after approval. |
| `docs/architecture/skill-creation-provider-ux-repair.md` | Untracked | Architecture note | REWORK | Captures some useful diagnosis, but it was written after the mistaken implementation and mixes preview repair with API-provider expansion. | Replace or split into approved preview UX note and provider/auth architecture note. |
| `docs/recovery/2026-05-19-skillmall-recovery-auth-token-plan.md` | Untracked | Recovery plan | PLAN_ONLY | Current recovery plan artifact that approved this inventory step. It is not implementation. | Keep as recovery record unless user asks to replace it. |
| `docs/recovery/2026-05-19-provider-recovery-inventory.md` | New in this task | Recovery inventory | PLAN_ONLY | This file is the approved Task 1 artifact and records dirty work classification. | Keep for user review. Do not stage until user approves. |
| `docs/superpowers/plans/2026-05-19-auth-token-provider-selection-recovery.md` | Untracked | Superseded recovery plan | PLAN_ONLY | Contains useful recovery intent and provider taxonomy ideas, but it is not the current approved SkillMall recovery plan and includes unapproved implementation detail. | Treat as superseded reference. Do not stage unless explicitly approved. |
| `lib/providers/__tests__/catalog.test.ts` | Untracked | Provider/API tests | REWORK | Tests a narrow API-oriented catalog with OpenAI/Anthropic model endpoints. Useful patterns may survive, but the catalog must be redesigned first. | Rewrite under approved comprehensive provider registry. |
| `lib/providers/anthropic.ts` | Untracked | Provider/API client | KEEP_RENAMED | Can be useful as optional Anthropic API support, but it must not be framed as Claude account/Max auth. | Rename/reframe as an API-key provider only if approved. |
| `lib/providers/catalog.ts` | Untracked | Provider/API catalog | REWORK | Adds live model discovery and provider metadata, but current structure is too narrow and API-key-biased for the requested comprehensive selection. | Replace with approved provider registry and model-source strategy. |
| `lib/providers/config-store.ts` | Untracked | Provider/API credential storage | REWORK | Writes provider config and optional API keys to `~/.skill-mall/config.json` before secure storage and token handling are approved. | Replace with approved credential broker/secret-storage design. |

## Coverage Check

Count before creating this inventory:

- tracked dirty files: 18
- untracked files: 12
- staged files: 0

Count after creating this inventory:

- expected tracked dirty files: 18
- expected untracked files: 13
- expected staged files: 0

Every tracked dirty file and untracked file from the receipts above is listed exactly once in the inventory table. This inventory file is listed as a new plan-only artifact.

## First-Pass Grouping

### Likely Preview-Repair Slice

These are candidates for a focused PR after review and approval:

- `app/api/preview-skill/route.ts`
- `app/api/confirm-research/route.ts`
- `app/api/create-skill/route.ts`
- `components/skill-mall/wizard/Step3Metadata.tsx`
- `components/skill-mall/wizard/Step4Preview.tsx`
- `components/skill-mall/wizard/WizardShell.tsx`
- `components/skill-mall/wizard/__tests__/wizard-state.test.ts`
- `components/skill-mall/wizard/useWizard.ts`
- `components/skill-mall/wizard/wizard-reducer.ts`
- `lib/pipeline.ts`
- `lib/validators.ts`

Required before any PR:

- inspect exact Step 3 to Step 4 user flow
- test that the editable field shows actual generated `SKILL.md`
- test that edits survive back/next navigation
- test that final skill creation writes reviewed content, not regenerated content
- run typecheck, lint, focused tests, and build
- update user/developer docs touched by the skill creation flow
- code review, fix, and re-review

### Provider/Auth Recovery Slice

These must not be committed as-is:

- `app/api/providers/configure/route.ts`
- `app/api/providers/route.ts`
- `app/settings/providers/page.tsx`
- `lib/providers/__tests__/config-resolution.test.ts`
- `lib/providers/__tests__/providers.test.ts`
- `lib/providers/__tests__/catalog.test.ts`
- `lib/providers/defaults.ts`
- `lib/providers/index.ts`
- `lib/providers/types.ts`
- `lib/providers/anthropic.ts`
- `lib/providers/catalog.ts`
- `lib/providers/config-store.ts`

Required before any PR:

- current official-doc research for each supported auth mode
- separate ChatGPT Pro/Codex subscription/account auth from OpenAI Platform API-key access
- separate Claude account/Max auth from Anthropic API-key access
- decide whether an LLM proxy/gateway or credential broker is required
- decide local secret storage policy before storing credentials
- define comprehensive provider taxonomy and provider IDs
- define live/cached/fallback model refresh behavior
- update provider docs as part of done
- code review, fix, and re-review

### Local Tool State To Exclude

These should stay out of SkillMall product recovery unless a separate explicit tool-state task approves them:

- `.codex/hooks.json`
- `.codex/hooks/phase-plan-preflight.sh`
- `.codex/hooks/plan-write-guard.sh`
- `.codex/hooks/stop-process-check.sh`

### Plan-Only Artifacts

These are recovery records, not product implementation:

- `docs/recovery/2026-05-19-skillmall-recovery-auth-token-plan.md`
- `docs/recovery/2026-05-19-provider-recovery-inventory.md`
- `docs/superpowers/plans/2026-05-19-auth-token-provider-selection-recovery.md`

The superseded plan should not be treated as approved execution authority.

## Immediate Blockers

- No provider/auth implementation can proceed from the current dirty provider files because they encode the wrong API-key-centered design.
- No credential persistence can proceed until the secure local storage/proxy/gateway decision is made.
- No Claude account/Max auth implementation should be promised until supported mechanisms are verified from current sources.
- No ChatGPT Pro/Codex subscription/account auth implementation should proceed until the exact supported token acquisition and refresh flow is verified from current sources and/or maintained implementation references.
- No files should be staged until the user approves this inventory and the next task plan.

## Recommended Next Approval Gate

Choose the next executable slice:

1. Preview repair PR plan: salvage the Step 3 to Step 4 `SKILL.md` preview/editor work as a small, testable branch.
2. Provider/auth research plan: research and design the comprehensive provider/auth architecture before touching provider code.
3. Cleanup plan: remove or quarantine dropped local tool-state files and superseded plan artifacts.

No code edits are approved by this inventory.
