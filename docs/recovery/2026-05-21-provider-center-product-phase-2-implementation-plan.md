# Provider Center Product Phase 2 Implementation Plan

> **For agentic workers:** This is a phase implementation plan, not approval to code. Start implementation only after the user explicitly runs the Phase 2 `/goal` command or otherwise approves Phase 2 implementation.

**Phase:** Provider Center Product Phase 2 - Configuration UX + Setup Guidance

**Owner outcome:** Provider Center turns safe provider configuration into a guided, understandable workflow for existing provider/auth/router capabilities, without adding new auth modes, new providers, new routing modes, credential storage, or executable adapters.

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Planning branch:** `codex/provider-center-product-phase2-plan`

**Source roadmap:** `docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md`

**Source audit:** `docs/recovery/2026-05-21-provider-center-product-phase-0-audit-report.md`

**Prior phase receipt:** `docs/goals/provider-center-product-phase1/notes/T010-final-receipt.md`

**GoalBuddy board:** `docs/goals/provider-center-product-phase2/goal.md`

---

## Current Approval Boundary

This phase plan and GoalBuddy board may be created now.

Do not implement Provider Center or provider API code from this document until the user explicitly approves implementation by running:

```text
/goal Follow docs/goals/provider-center-product-phase2/goal.md.
```

Provider Center Product Phase 1 was merged through PR #16. Phase 2 planning starts from updated `main` at merge commit `b19fa84`.

Do not stage, commit, push, or open a PR for Phase 2 artifacts unless the user explicitly requests Phase 2 commit-prep or publish.

---

## Non-Negotiables

- Phase 2 is configuration UX and setup guidance only.
- Do not add providers, auth modes, routing modes, gateway dependencies, OAuth/device flows, keychain storage, credential storage, credential-file ingestion, or executable provider adapters.
- Do not widen `ProviderID`.
- Do not treat broad `ProviderRegistryID` rows as direct executable providers.
- Do not ask users to paste raw API keys, copied tokens, browser/session tokens, cookies, credential-file contents, or credential-file paths.
- API-key access remains optional and must be labeled as API access.
- Subscription/account/tool-session auth remains separate from API-key access.
- Claude Code remains local tool/session access. SkillMall must not copy Claude Code credential files.
- Local runtime rows remain endpoint/status workflows, not secret workflows.
- Gateway virtual-key rows remain reference workflows, not raw virtual-key fields.
- Do not store prompt or response bodies in UI state, fixtures, docs, tests, API payloads, logs, receipts, screenshots, or browser proof.
- Do not introduce hosted dashboards, paid hosted control planes, or required extra-cost infrastructure.
- Do not promote `cheapest_compatible`, `quality_first`, semantic routing, learned routing, complexity routing, eval routing, or automatic optimization.
- Do not hand off partial work as complete. Blockers, incomplete items, and final gaps must be documented with exact evidence and next safe action.

---

## Current Source Facts

These facts were checked during Phase 2 planning on 2026-05-21. The `/goal` executor must revalidate them before implementation.

- Phase 1 is merged into `main` through PR #16 at `b19fa84`.
- `ProviderConfigPanel` currently renders safe setup fields, but the experience is still field-centric:
  - config mode buttons: env var ref, gateway ref, local session, no secret ref
  - fields: env ref name, gateway virtual-key ref name, base URL, model label, manual model labels, routing policy
  - a setup source link and terse model-discovery/gateway note
- `ProviderCenter` owns selected provider state, draft construction, save/test/refresh actions, and action-state messages.
- `app/api/providers/configure/route.ts` already rejects raw secret field names before parsing and validates auth/access-mode mismatches.
- `lib/llm/router/secret-refs.ts` already enforces environment-variable-style reference names.
- `lib/providers/config-store.ts` writes non-secret provider config and rejects raw `apiKey`.
- `app/api/providers/test/route.ts` currently accepts an optional `prompt` field even though it does not store or echo prompt/response bodies.
- `docs/user/configuring-providers.md` already explains safe references, Provider Center workflow, provider catalog boundaries, API/local session/local runtime/gateway differences, and safe provider tests.
- `components/skill-mall/providers/__tests__/provider-center.test.tsx` covers Phase 1 labels, unsupported mode hiding, active model behavior, disabled refresh for endpoint-required rows, and absence of raw secret prompts.
- `app/api/providers/__tests__/providers-route.test.ts` covers configure-route secret rejection, path-like secret-ref rejection, auth/access-mode mismatch rejection, safe persistence, registry target persistence, and provider/test safety.

---

## Phase 2 Scope

### In Scope

- Make safe setup feel like a product workflow rather than a raw form.
- Add per-access-mode setup guidance for:
  - API env-var references
  - gateway virtual-key references
  - local CLI/session access
  - local runtime endpoints
  - custom/OpenAI-compatible endpoints
  - cloud/project scoped rows
  - metadata-only/source-review rows
- Add setup requirement/readiness labels that explain:
  - which inputs are required for the selected provider/config mode
  - what SkillMall stores
  - what SkillMall does not store
  - why save/test/refresh is enabled, disabled, blocked, or likely to fail
- Improve inline validation and copy for:
  - reference names
  - base URLs
  - endpoint-required rows
  - manual model labels
  - auth/access-mode mismatches
  - source-review and metadata-only rows
- Clarify save/test/refresh sequencing after Phase 1:
  - save safe references or metadata
  - run safe status test
  - refresh models only when the selected row/endpoint supports it
  - route/policy work stays later unless the existing routing-policy id field needs safer context
- Resolve the `POST /api/providers/test` optional `prompt` ambiguity:
  - default Phase 2 direction is to remove `prompt` from the accepted request contract and make the route a strict safe status check;
  - stop and document a blocker if current source proves an existing product path still depends on sending `prompt`.
- Update focused Provider Center and provider route tests for the changed setup guidance and prompt-contract behavior.
- Update docs to match the Phase 2 setup guidance and safe status-test contract.

### Out Of Scope

- OAuth/device-code flows.
- Raw token/session configuration.
- Keychain integration.
- Credential-file ingestion or credential-file path references.
- Provider-specific executable adapters.
- New provider rows or provider promotion.
- New routing policy modes or policy-builder expansion.
- Deep model/capability polish; Phase 3 owns that.
- Usage/cost dashboard expansion; Phase 4 owns that.
- Candidate routing UX or simulation explainability; Phase 5 owns that.
- Provider catalog governance tooling; Phase 6 owns that.
- External hosted dashboards or required paid infrastructure.

---

## Product Shape To Build

Phase 2 should keep the Phase 1 IA and make Stage 1 useful:

1. **Setup mode explanation:** When a user selects a config mode, the panel explains what that mode means, what is required, and what will be saved.
2. **Provider-specific requirements:** The selected provider row should show a small requirements/checklist surface for the current access mode instead of forcing the user to infer from labels.
3. **Safe input hints:** Reference-name, endpoint, model, and manual-model fields should explain valid examples and unsafe examples without rendering raw-secret prompts.
4. **Readiness preview:** Before save, the UI should say whether the selected draft looks ready to save, metadata-only, blocked, or requires a local/runtime/account/project step.
5. **Save/test/refresh order:** The UI should guide the user toward the next safe action after setup, and it should not imply model refresh can work for rows that need endpoint/account/project/local runtime context.
6. **Safe status test:** Provider tests remain readiness checks only. They should not accept, store, echo, or imply prompt/response testing.

---

## Exact File Map

Revalidate before implementation.

### Likely Product Files

- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ModelRefreshPanel.tsx` only if setup sequencing requires clearer refresh-disabled context
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `app/api/providers/test/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`
- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`
- `docs/reference/provider-catalog.md` only if setup terminology changes provider-catalog interpretation
- `docs/goals/provider-center-product-phase2/state.yaml`
- `docs/goals/provider-center-product-phase2/notes/**`

### Read-Only Reference Files

- `AGENTS.md`
- `docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md`
- `docs/recovery/2026-05-21-provider-center-product-phase-0-audit-report.md`
- `docs/recovery/2026-05-21-provider-center-product-phase-1-implementation-plan.md`
- `docs/goals/provider-center-product-phase1/notes/T010-final-receipt.md`
- `app/api/providers/configure/route.ts`
- `lib/llm/router/secret-refs.ts`
- `lib/providers/config-store.ts`
- `lib/providers/registry.ts`
- `lib/providers/model-discovery.ts`
- relevant Next.js docs under `node_modules/next/dist/docs/`

Any other product-code file requires Judge approval with exact rationale before editing.

---

## Implementation Slices

### Slice A: Current-Source Setup Contract

Scout maps current setup modes, provider access modes, validation behavior, save/test/refresh actions, docs, and tests.

Judge approves a concrete setup contract before Worker edits. The contract must name:

- setup modes and user-facing meaning;
- required fields per mode;
- disabled/blocker states;
- safe next actions;
- `POST /api/providers/test` prompt-field disposition;
- exact allowed files.

### Slice B: Guided Setup UI

Worker updates `ProviderConfigPanel` and, if needed, `ProviderCenter` to add:

- config-mode explanation and requirements;
- input examples and validation guidance;
- safe readiness preview;
- metadata-only/source-review/cloud/project/local-runtime guidance;
- save/test/refresh sequencing copy that does not deepen Phase 3-5 features.

### Slice C: Safe Status-Test Contract

Worker updates `app/api/providers/test/route.ts` only if the Judge-approved setup contract confirms no current product path depends on `prompt`.

Default target:

- remove optional `prompt` from accepted schema;
- reject unknown request fields with `invalid_input`;
- keep raw-secret rejection before parsing so unsafe raw secret field names still return `raw_secret_field_rejected`;
- keep response body prompt-free and response-body-free.

### Slice D: Tests And Docs

Worker updates tests and docs for:

- setup guidance labels and requirements;
- no raw secret/token/cookie/credential fields;
- prompt field no longer accepted by provider status test, or documented blocker if not removed;
- safe reference naming;
- save/test/refresh sequencing.

---

## Test Map

Required verification commands:

```bash
npm test -- components/skill-mall/providers
npm test -- app/api/providers
npm test -- app/api/providers lib/providers lib/llm/router
npm test
npx tsc --noEmit --pretty false
npm run lint
git diff --check
```

Focused expected test coverage:

- Provider Center renders setup guidance for each supported config mode.
- Provider Center does not render raw secret, token, browser/session, cookie, credential-file, credential-path, prompt-body, or response-body prompts.
- Provider Center explains disabled/blocked save/test/refresh states for source-review, metadata-only, endpoint-required, local-runtime, and local-session rows.
- Provider route tests prove `POST /api/providers/test` rejects raw secret fields before parsing.
- Provider route tests prove `POST /api/providers/test` does not accept `prompt` unless the Judge records a compatibility blocker and explicitly keeps it documented as ignored.
- Configure route tests remain green for raw secret rejection, path-like secret refs, auth/access-mode mismatch, and safe persistence.

---

## UI And Browser Proof Map

Because Phase 2 changes visible UI, browser proof is required unless an exact runtime blocker is recorded.

Required walkthrough:

- Desktop `/settings/providers`
  - selected API provider setup guidance;
  - selected local session row guidance;
  - selected local runtime row guidance;
  - selected custom/OpenAI-compatible or gateway row guidance;
  - save/test/refresh sequencing visible and not misleading.
- Mobile `/settings/providers`
  - no horizontal overflow;
  - setup guidance remains readable;
  - no text clipping inside buttons/labels/panels.

Browser proof must not retain protected-route HTML if it serializes session data. Prefer text proof plus screenshots, and run a secret-artifact scan before completion.

---

## Documentation Update Requirements

Update docs only where behavior or user-facing setup guidance changes:

- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md` if the provider test request contract changes
- `docs/reference/provider-catalog.md` only if setup labels change registry interpretation

Docs must preserve:

- reference-only secret handling;
- optional API access label;
- subscription/tool-session separation;
- no credential-file/path handling;
- no prompt/response storage;
- no `ProviderID` widening.

---

## Development Workflow Contract

Phase 2 implementation must follow this sequence:

1. **Git and containment:** Start from updated `main` after PR #16 is merged. Create a `codex/` implementation branch. Classify dirty files before edits. Never revert unrelated user changes.
2. **Source revalidation:** Scout reads the current Provider Center config UI, configure/test API routes, provider tests, docs, `AGENTS.md`, prior phase receipts, and relevant Next.js docs before implementation.
3. **Setup contract:** Judge approves exact setup guidance, allowed files, prompt-field disposition, non-goals, and stop conditions before Worker code edits.
4. **Implementation:** Worker completes the largest safe useful Phase 2 slice: setup guidance, validation/readiness explanation, save/test/refresh sequencing, prompt-contract cleanup if approved, focused tests, and docs.
5. **Focused tests:** Run targeted Provider Center and provider API tests after each meaningful code slice.
6. **Runtime/browser proof:** Run the app when feasible and verify desktop and mobile setup guidance. Document any environment blocker separately from code blockers.
7. **Verification:** Run all commands in the Test Map.
8. **Lint treatment:** If `npm run lint` fails from pre-existing unrelated issues, record exact evidence and confirm no Phase 2-owned lint regression. If Phase 2 creates lint failures, fix them before completion.
9. **Code review:** Run a code-review pass that leads with findings. Fix actionable issues, then rerun affected checks.
10. **Semantic drift review:** Judge checks for auth/secret, provider, routing, hosted-dependency, prompt/response, and phase-boundary drift.
11. **Docs and GoalBuddy receipts:** Update docs/plan/GoalBuddy receipts for behavior changes, blockers, incomplete work, and final verification results.
12. **Commit-prep/publish:** Only after the user explicitly requests commit-prep or publish, stage the Phase 2-owned files, commit, push, and open/update the PR.

---

## Sub-Agent Orchestration

- **PM:** Owns branch hygiene, active-task sequencing, receipts, scope control, final completion, and user-facing blocker calls.
- **Scout:** Read-only source mapper. Produces the setup contract evidence map and does not implement.
- **Judge:** Reviews the setup contract, prompt-field disposition, semantic drift, code review findings, and final completion truth.
- **Worker:** Implements only the Judge-approved, allowed-file slice. Worker must not edit provider registry, router execution, CLI, database, gateway, or model/cost/policy behavior unless a recorded blocker and user approval expands scope.

Use sub-agents when they materially advance non-overlapping work. Do not delegate urgent blocking work whose result is needed for the immediate next local action.

---

## Known Blocks And Risks

- **Prompt-field ambiguity:** The provider test route currently accepts `prompt` but does not use, store, or echo it. Default Phase 2 action is to remove that request field. Stop if current source proves compatibility dependence.
- **Setup-vs-auth drift:** Better setup guidance must not become OAuth/device flow, raw token flow, credential-file flow, or keychain support.
- **Setup-vs-model drift:** Guidance can explain when refresh is available, but Phase 3 owns deep model/capability UX.
- **Setup-vs-policy drift:** Guidance can preserve the routing policy id field context, but Phase 5 owns policy builder and simulation explainability.
- **Cloud/project rows:** Phase 2 may explain that project/region/deployment context is required, but must not implement cloud project credential flows.
- **Protected-route proof:** Browser proof must avoid retaining development HTML that serializes session data.

---

## Completion Criteria

Phase 2 is complete only when:

- Current source has been revalidated after PR #16.
- A Judge-approved setup contract exists before code edits.
- Provider Center setup guidance is implemented without widening provider/auth/router behavior.
- Provider status-test prompt ambiguity is resolved or recorded with exact blocker and next safe action.
- Focused Provider Center and provider API tests are updated and passing.
- Broader provider/router tests, full tests, TypeScript, lint, and diff checks pass or have exact unrelated blockers.
- Desktop/mobile browser proof is captured or exact runtime blocker is recorded.
- Code review findings are fixed or documented with exact non-blocking rationale.
- Final semantic review proves no raw secret/token/cookie/credential/path/prompt/response drift.
- GoalBuddy final receipt lists changed files, verification, blockers, incomplete work, docs updates, and next safe action.

---

## Commit-Prep / Publish Criteria

Do not commit, push, or open a PR until the user explicitly asks.

When approved, commit-prep must:

- stage only Phase 2-owned files;
- run `git diff --cached --check`;
- confirm no untracked unsafe proof artifacts remain;
- commit with a clear Phase 2 message;
- push `codex/provider-center-product-phase2`;
- open a ready PR against `main` with summary, verification, safety/scope notes, and remaining blockers if any.

---

## Starter Command

```text
/goal Follow docs/goals/provider-center-product-phase2/goal.md.
```
