# Provider Center Auth Token Correction Implementation Plan

> **For agentic workers:** This is an implementation-ready recovery plan, not approval to code. Start implementation only after the user explicitly runs the GoalBuddy command in this document.

**Date:** 2026-05-21

**Workspace:** `/Users/jamesdsizemore/Developer/skill-mall`

**Current branch observed during prep:** `codex/provider-center-product-phase2`

**Recovery plan:** `docs/recovery/2026-05-21-provider-center-auth-token-correction-implementation-plan.md`

**Research source:** `docs/recovery/2026-05-21-codex-claude-auth-token-research-report.md`

**GoalBuddy board:** `docs/goals/provider-center-auth-token-correction/goal.md`

---

## Approval Boundary

This plan and its GoalBuddy board may be created now.

Do not implement product code from this plan until the user explicitly approves implementation by running:

```text
/goal Follow docs/goals/provider-center-auth-token-correction/goal.md.
```

The current branch has extensive Provider Center/provider/router changes already in flight. The first implementation task must classify the dirty state, freeze the changed-file boundary, and decide whether this recovery proceeds on the current branch, a clean branch, or a dedicated worktree.

Do not stage, commit, push, or open a PR for this recovery unless the user explicitly requests it.

---

## Executive Fix

The broken behavior is not a UI copy problem. The current OpenAI Codex and Claude Code buttons are modeled as detached local CLI side effects. The UI never receives a real auth object, so it cannot render a web authorization URL, device URL, user code, login id, timeout, cancel path, or completion status.

The correction is to make auth sessions first-class product objects:

1. OpenAI Codex must use the Codex app-server login protocol as the primary implementation path.
2. Provider Center must render the returned app-server auth object directly.
3. SkillMall must track app auth session state by `flowId` and bridge it to app-server `loginId`.
4. Claude Code must not pretend to have the same app-server web auth object unless verified. It needs an honest split between local CLI login and `claude setup-token`.
5. Runtime/provider execution must consume the configured credential or local account state through explicit, redacted config surfaces.

---

## Non-Negotiables

- Start from the corrected research report, not memory or assumptions.
- Revalidate Codex CLI, Codex app-server generated protocol, Claude CLI help/status, OpenClaw reference implementation, current SkillMall code, and relevant Next.js docs before product-code edits.
- Keep ChatGPT Pro/Codex subscription/account auth separate from normal OpenAI API-key access.
- Keep Claude Code subscription auth, Claude setup-token, and Anthropic API-key access separate.
- Do not use the OpenClaw direct OpenAI device-code endpoint path unless the Judge records Codex app-server as blocked and the user approves that fallback explicitly.
- Do not scrape browser sessions, copy credential files, ask for cookies, ask for browser tokens, or return raw access tokens to UI/API/logs/docs/tests/receipts.
- Do not claim a button opens a web auth flow unless the UI receives and renders `authUrl` or `verificationUrl` plus `userCode`.
- Do not use `codex login status` or `claude auth status` as proof that an in-app auth button worked.
- Do not collapse Provider Center into a single "token" field. Model provider auth method and secret type explicitly.
- Do not mark complete without browser proof of the actual OpenAI Codex auth object rendering and honest Claude Code behavior.

---

## Corrected Architecture

### OpenAI Codex

Primary path: Codex app-server.

SkillMall starts a Codex app-server login request with:

- `{ type: "chatgpt" }` when browser auth is desired.
- `{ type: "chatgptDeviceCode" }` when device-code auth is desired or needed.

The app-server returns one of:

- `{ type: "chatgpt", loginId, authUrl }`
- `{ type: "chatgptDeviceCode", loginId, verificationUrl, userCode }`

SkillMall stores a local session object:

```ts
type ProviderAuthSession = {
  flowId: string;
  providerRegistryId: "openai_codex";
  method: "codex_app_server_chatgpt" | "codex_app_server_device_code";
  status: "pending" | "completed" | "failed" | "cancelled" | "expired";
  loginId: string;
  authUrl?: string;
  verificationUrl?: string;
  userCode?: string;
  expiresAt?: string;
  error?: string;
};
```

`expiresAt` is SkillMall-owned timeout metadata unless the protocol later exposes a server-provided expiry. The corrected report verified that generated Codex app-server response types do not include `expiresAt` or `pollIntervalMs`.

Completion must be driven by app-server `account/login/completed` notification for the matching `loginId`, not by blind polling of `codex login status`.

Cancellation must call the app-server cancel flow when available and update SkillMall session state.

### Claude Code

Claude Code must be implemented honestly as two user-visible auth methods unless new primary-source evidence proves a true app-server-like web auth object exists:

- **Local Claude login:** launches or guides `claude auth login` and clearly labels it as local CLI login, not an in-app web token authorization flow.
- **Claude setup-token:** stores an operator-provided setup token or provider-generated setup token through the secret store, then injects it into controlled Claude execution environments only.

The setup-token path requires schema and runtime changes:

- Provider auth method must allow a `setup_token` secret type.
- Secret refs must support stored provider secrets beyond generic env-var refs.
- Runtime execution must use a controlled env builder that sets the setup token only for Claude Code execution and clears conflicting Claude/Anthropic variables when appropriate.

### Provider Center UI

Provider Center must render auth sessions as first-class UI state:

- OpenAI Codex browser login: show an "Open authorization page" action backed by `authUrl`.
- OpenAI Codex device login: show `verificationUrl` and `userCode`, with copy/open controls.
- Claude local login: show Terminal/local CLI status with clear wording that no web auth object is available.
- Claude setup-token: show secure setup-token entry, stored/redacted status, rotate/delete controls, and runtime readiness.

The UI may not imply web authorization exists when the backend did not return a URL/code object.

---

## Current Known Blockers

- Current local code appears to model auth as a local CLI launch plus status polling. That must be replaced for Codex.
- Current provider/router schemas may not model `setup_token`, stored provider secret ids, or provider auth methods cleanly.
- Current dirty branch includes broad Provider Center/provider/router changes. Implementation cannot safely continue until the exact changed-file boundary is classified.
- Claude Code does not currently have verified machine-readable web auth output equivalent to Codex app-server. It must be treated as local CLI login plus setup-token unless research proves otherwise.
- Codex app-server integration is larger than shelling out to `codex exec`; it needs a persistent client/session manager capable of receiving completion notifications.

---

## Implementation Phases

### Phase 0: Authority And Dirty-State Containment

Owner: PM

Output:

- A note classifying every dirty/untracked file as current recovery-owned, prior Phase 2-owned, unrelated, or unsafe to touch.
- A branch/worktree recommendation.
- An approved allowed-file map for implementation.

Stop if dirty state cannot be separated without risking user work.

### Phase 1: Source Revalidation

Owner: Scout

Revalidate:

- Corrected research report.
- `codex app-server generate-ts` protocol.
- `codex login --help`, `codex app-server --help`, and local Codex version.
- `claude auth login --help`, `claude auth status --json`, `claude setup-token --help`, and local Claude version.
- OpenClaw Codex provider/device-code/app-server bridge and Anthropic/Claude auth handling.
- Current SkillMall provider center, provider registry, auth/connect routes, secret store, router config, tests, and docs.
- Relevant Next.js docs under `node_modules/next/dist/docs/` before route/component edits.

Output:

- Evidence note with exact command outputs or source pointers.
- No product-code edits.

### Phase 2: Contract Review

Owner: Judge

Approve or block:

- Codex app-server as primary implementation path.
- Whether direct OpenClaw-style device-code fallback is allowed. Default: blocked without explicit user approval.
- Claude method split: local CLI login versus setup-token.
- Provider auth method schema.
- Secret ref/storage model.
- API route contract for start/status/cancel/delete/rotate/test.
- UI state machine and display requirements.
- Runtime env builder contract.
- Exact allowed files for each Worker slice.

No Worker edits until this contract is recorded.

### Phase 3: Auth Domain, Schema, And Secret Store

Owner: Worker

Likely files:

- `lib/providers/types.ts`
- `lib/providers/registry.ts`
- `lib/providers/secret-store.ts`
- `lib/providers/defaults.ts`
- `lib/providers/index.ts`
- `lib/llm/router/types.ts`
- `lib/llm/router/secret-refs.ts`
- `lib/llm/router/config.ts`
- `lib/llm/router/__tests__/config.test.ts`
- `lib/providers/__tests__/providers.test.ts`
- `lib/providers/__tests__/registry.test.ts`

Expected behavior:

- Provider auth method is explicit.
- `setup_token` can be represented without pretending it is an API key.
- Stored provider secret refs can distinguish secret type.
- Redaction rules are uniform.
- Existing API-key/env/gateway/local runtime paths remain intact.

### Phase 4: Codex App-Server Auth Session Backend

Owner: Worker

Likely files:

- `lib/providers/codex.ts`
- `lib/providers/codex-app-server-auth.ts` or `lib/providers/codex-app-server/**`
- `app/api/providers/connect/route.ts`
- `app/api/providers/connect/status/route.ts`
- `app/api/providers/connect/cancel/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`
- `lib/providers/__tests__/codex-app-server-auth.test.ts`

Expected behavior:

- Start returns `flowId`, `method`, `loginId`, `authUrl` or `verificationUrl/userCode`, status, and SkillMall timeout.
- Status returns redacted session state.
- Completion follows app-server notification for matching `loginId`.
- Cancel cancels app-server login when possible and updates local state.
- Raw tokens are never returned.

### Phase 5: Provider Center UI

Owner: Worker

Likely files:

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`

Expected behavior:

- OpenAI Codex auth button renders a real returned auth object.
- Browser auth opens `authUrl`.
- Device-code auth displays `verificationUrl` and `userCode`.
- Claude Code does not claim web auth when only local CLI login exists.
- Claude setup-token entry uses secure storage, redacted display, rotate/delete states.
- Loading, failed, cancelled, expired, and completed states are clear.

### Phase 6: Claude Setup-Token And Runtime Env

Owner: Worker

Likely files:

- `lib/providers/claude-code.ts`
- `lib/providers/local-cli-auth.ts`
- `lib/providers/secret-store.ts`
- `lib/llm/router/openai-compatible-client.ts` only if current execution path actually uses it for provider runtime env
- `lib/providers/__tests__/local-cli-auth.test.ts`
- new runtime/env-builder test file if the Judge approves one

Expected behavior:

- Claude local login is labeled as local CLI auth.
- Claude setup-token can be stored as a secret type.
- Runtime code injects setup-token only for Claude Code execution.
- Conflicting Claude/Anthropic env vars are controlled and documented.

### Phase 7: Docs And Operator Guidance

Owner: Worker

Likely files:

- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`
- `docs/reference/provider-catalog.md`
- this plan and GoalBuddy notes only for receipts

Expected behavior:

- Docs explain Codex app-server auth object behavior.
- Docs explain Claude local login versus setup-token honestly.
- Docs do not suggest cookies, copied browser tokens, credential files, or raw token leakage.

### Phase 8: Review, Verification, And Browser Proof

Owner: Judge, then PM

Required proof:

- Focused provider tests pass.
- Focused Provider Center tests pass.
- Router/config tests pass.
- Full test suite passes or blockers are exact and unrelated.
- TypeScript passes.
- Lint passes or unrelated pre-existing failures are classified.
- Diff check passes.
- Secret scan over changed/untracked files finds no raw secrets.
- Browser proof shows the OpenAI Codex auth button rendering `authUrl` or `verificationUrl/userCode`.
- Browser proof shows Claude Code does not pretend to open a web auth object when it only has local CLI login or setup-token.
- Final receipt states changed files, tests, browser proof, blockers, and decision.

---

## Verification Commands

Revalidate commands may change if the Judge records a better exact command. Minimum expected set:

```bash
codex --version
codex login --help
codex app-server --help
rm -rf /tmp/codex-app-protocol && mkdir -p /tmp/codex-app-protocol
codex app-server generate-ts --out /tmp/codex-app-protocol/ts
claude --version
claude auth login --help
claude auth status --json
claude setup-token --help
npm test -- components/skill-mall/providers
npm test -- lib/providers app/api/providers
npm test -- lib/providers app/api/providers lib/llm/router
npm test
npx tsc --noEmit --pretty false
npm run lint
git diff --check
node /Users/jamesdsizemore/.codex/plugins/cache/goalbuddy/goalbuddy/0.3.7/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/provider-center-auth-token-correction/state.yaml
```

Secret scan must inspect changed and untracked files without printing secret values. The receipt should record pass/fail and exact patterns checked, not token contents.

---

## Stop Conditions

Stop and record a blocker if any of these happen:

- Codex app-server cannot be run or cannot generate protocol on the target machine.
- Codex app-server login start does not return `authUrl`, `verificationUrl`, `userCode`, or `loginId` as expected.
- The implementation would require storing raw OpenAI/Claude access tokens in UI-visible state.
- Claude setup-token cannot be represented without unsafe schema shortcuts.
- Current dirty state cannot be separated from this recovery.
- A Worker needs to edit files outside its approved allowed-file set.
- Browser proof cannot demonstrate the actual clicked auth flow.

---

## GoalBuddy Command

```text
/goal Follow docs/goals/provider-center-auth-token-correction/goal.md.
```
