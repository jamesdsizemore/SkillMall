# T012 Second Review Blocker Fixes

Date: 2026-05-21

Trigger: User rejected handing back a branch with known blockers after the second comprehensive review.

## Blockers Fixed

### Finding 1 - High - configured OpenAI Codex reload selected the wrong draft auth mode

`ProviderCenter` rehydrated a configured OpenAI Codex provider with `secretRef: { type: "none" }` as `none_local` instead of `codex_app_server`.

Fix:
- `draftForProvider()` now preserves `authMode: "codex_app_server"` before applying generic `none` secret fallback behavior.
- Added a regression test for configured OpenAI Codex draft rehydration.

### Finding 2 - High - routing-policy store rejected Codex candidates

Provider Center emits Codex routing candidates with `provider: "codex"`, but `routing-policy-store` did not include `codex` in the supported executable provider set.

Fix:
- Added `codex` to the routing-policy provider allow-list.
- Added a regression test for a Provider Center-style OpenAI Codex policy candidate.

### Finding 3 - High - provider account auth modes leaked across provider rows

The registry allowed provider-specific auth modes by broad `provider_account_auth` category, so OpenAI Codex could accept `claude_setup_token` and Claude Code could accept `codex_app_server`.

Fix:
- `isAuthModeAllowedForProvider()` now handles `codex_app_server` and `claude_setup_token` as exact provider-row matches before generic access-mode fallback.
- Added negative matrix assertions for Codex and Claude Code auth-mode cross-contamination.

### Finding 4 - Medium - Codex status test could report ready without checking app-server account auth

The provider test route treated `secretRef: { type: "none" }` as ready for OpenAI Codex, even though Codex account auth lives in Codex app-server state.

Fix:
- Added `getCodexAppServerAuthStatus()` using Codex app-server `getAuthStatus` with `includeToken: false` and `refreshToken: false`.
- `/api/providers/test` now consults Codex app-server status for active `openai_codex` + `codex_app_server` configs.
- Added a regression test proving the route calls `getAuthStatus` and reports `missing_secret` when OpenAI auth is still required.

## Red/Green Proof

Regression tests were added before production fixes.

Initial focused run result:

```bash
npm test -- components/skill-mall/providers/__tests__/provider-center.test.tsx lib/llm/router/__tests__/routing-policy-store.test.ts lib/providers/__tests__/registry.test.ts app/api/providers/__tests__/providers-route.test.ts
```

Result: failed as expected in four places:
- `draftForProvider is not a function` / Codex rehydration not covered by exported behavior
- `Unsupported routing policy provider: codex`
- `openai_codex` accepted `claude_setup_token`
- provider test route did not call `getAuthStatus`

Post-fix focused run result:

```bash
npm test -- components/skill-mall/providers/__tests__/provider-center.test.tsx lib/llm/router/__tests__/routing-policy-store.test.ts lib/providers/__tests__/registry.test.ts app/api/providers/__tests__/providers-route.test.ts
```

Result: 4 test files passed, 64 tests passed.

## Verification

Provider/router/component/API slice:

```bash
npm test -- components/skill-mall/providers lib/llm/router app/api/providers lib/providers
```

Result: 26 test files passed, 202 tests passed.

Typecheck:

```bash
npx tsc --noEmit --pretty false
```

Result: pass.

Full suite:

```bash
npm test
```

Result: 58 test files passed, 455 tests passed.

Lint:

```bash
npm run lint
```

Result: pass.

Whitespace:

```bash
git diff --check
```

Result: pass.

GoalBuddy checker:

```bash
node /Users/jamesdsizemore/.codex/plugins/cache/goalbuddy/goalbuddy/0.3.7/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/provider-center-auth-token-correction/state.yaml
```

Result: pass, 11 tasks, no errors or warnings.
