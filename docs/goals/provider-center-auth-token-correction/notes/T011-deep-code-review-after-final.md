# T011 Deep Code Review After Final Receipt

Date: 2026-05-21

Trigger: User requested a hostile deep review after the goal was marked done.

Supersession: A later comprehensive review found additional blockers after this note was written. Treat this note as historical context only; the current blocker/fix receipt is `T012-second-review-blocker-fixes.md`.

## Findings

### Finding 1 - High - `claude_setup_token` config could claim success without a stored setup-token

The configure route accepted a `stored_provider_secret` reference for `claude_setup_token` without proving the encrypted store actually contained the setup-token. That meant the UI could save a setup-token mode config while the runtime would later fail with a missing secret.

Fix:
- `app/api/providers/configure/route.ts` now requires the exact app-managed Claude setup-token ref.
- The route checks `getProviderSecretStatus()` before persisting `claude_setup_token`.
- Configure response status now reports encrypted-store truth instead of unconditional `valuePresent: true`.

Regression proof:
- `configure refuses claude_setup_token when the encrypted setup-token is missing`
- `configure accepts claude_setup_token only when the stored setup-token exists`

### Finding 2 - High - setup-token save/delete could leave config and encrypted store inconsistent

The setup-token POST wrote the encrypted token before writing provider config. If config write failed, the encrypted secret remained orphaned. DELETE deleted the secret before downgrading config, which could leave an active setup-token config pointing at a missing secret.

Fix:
- POST now deletes the newly written secret if provider config write fails.
- DELETE now downgrades provider config to `local_cli_session` before deleting the stored token.

Regression proof:
- `Claude setup-token credential route rolls back the encrypted secret if config write fails`
- `Claude setup-token DELETE downgrades config before deleting the stored token`

### Finding 3 - Medium - model refresh and CLI status misreported stored-provider-secret readiness

The model refresh route and CLI status helpers treated stored secret refs as reference-only or always missing, which could make Provider Center/CLI readiness disagree with the encrypted store.

Fix:
- `app/api/providers/models/refresh/route.ts` now reports stored secret status through `getProviderSecretStatus()`.
- `cli/src/commands/configure.ts` and `cli/src/commands/providers.ts` now report stored secret status from the encrypted store.
- CLI model refresh now preserves stored secret status when the active provider uses a stored secret ref.

Regression proof:
- `model refresh reports stored-provider-secret status from the encrypted store`

### Finding 4 - Medium - direct provider configure call did not pass resolved default auth mode

The direct-provider configure path computed `resolvedAuthMode` but passed the optional raw `authMode` into `writeProviderConfig()`. Config-store defaulting masked this in many cases, but the API should persist the resolved auth mode it already validated.

Fix:
- Direct provider configure now passes `authMode: resolvedAuthMode`.

Regression proof:
- `configure persists default auth mode for direct executable providers`

### Finding 5 - Medium - Codex app-server error redaction missed camelCase token field names

Codex app-server errors were redacted for `access_token` / `refresh_token` but not `accessToken`, `refreshToken`, or `idToken`.

Fix:
- `lib/providers/codex-app-server-auth.ts` now redacts snake_case, kebab/underscore, and camelCase token fields plus `sk-*` token-shaped strings.

Regression proof:
- `redacts app-server errors before returning them to callers`

### Finding 6 - Medium - Claude runtime accepted any stored setup-token ref shape

Runtime env injection required `secretType: setup_token` but did not require the exact Claude setup-token provider/id pair.

Fix:
- `lib/providers/claude-code-env.ts` now rejects non-Claude stored setup-token refs.

Regression proof:
- `rejects setup-token refs that are not the Claude app-managed secret`

### Finding 7 - Low - existing secret/key files were not chmod-normalized

New secret/key files were created with restrictive permissions, but existing files were not re-normalized on read/write.

Fix:
- `lib/providers/secret-store.ts` now chmods the key file on successful read and chmods the store file after write.

## Verification

Focused regression tests:

```bash
npm test -- app/api/providers/__tests__/providers-route.test.ts lib/providers/__tests__/claude-code-auth.test.ts lib/providers/__tests__/codex-app-server-auth.test.ts
```

Result: 3 test files passed, 51 tests passed.

Provider/router/component slice:

```bash
npm test -- lib/providers app/api/providers lib/llm/router components/skill-mall/providers
```

Result: 26 test files passed, 198 tests passed.

Full suite:

```bash
npm test
```

Result: 58 test files passed, 452 tests passed.

Typecheck:

```bash
npx tsc --noEmit --pretty false
```

Result: pass.

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

Result: pass.

Secret scan:

```bash
rg -n "sk-ant-oat01-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{16,}|accessToken\s*[:=]\s*['\"]?[A-Za-z0-9_-]{16,}|refreshToken\s*[:=]\s*['\"]?[A-Za-z0-9_-]{16,}|access_token\s*[:=]\s*['\"]?[A-Za-z0-9_-]{16,}|refresh_token\s*[:=]\s*['\"]?[A-Za-z0-9_-]{16,}" app lib components cli docs/goals/provider-center-auth-token-correction/notes docs/recovery || true
```

Result: no real token-shaped secrets found. Matches were existing review notes and fake redaction fixtures.

## Decision

The deep review found real issues after the earlier final receipt. Those issues are now fixed and covered by regression tests. No remaining blocker found in the reviewed auth/config/status/runtime paths.
