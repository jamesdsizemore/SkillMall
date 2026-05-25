# T004 Auth Domain And Secret Model Receipt

Date: 2026-05-21

## Result

Done.

## Changed Files

- `lib/llm/router/types.ts`
- `lib/llm/router/secret-refs.ts`
- `lib/llm/router/config.ts`
- `lib/llm/router/__tests__/config.test.ts`
- `lib/providers/types.ts`
- `lib/providers/registry.ts`
- `lib/providers/defaults.ts`
- `lib/providers/index.ts`
- `lib/providers/config-store.ts`
- `lib/providers/secret-store.ts`
- `lib/providers/__tests__/registry.test.ts`
- `app/api/providers/route.ts`
- `app/api/providers/configure/route.ts`
- `app/api/providers/test/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`

## What Changed

- Added `codex` as an approved executable provider only under the Judge-approved Codex app-server contract.
- Added `openai_codex` as a Provider Center row separate from normal OpenAI API-key access.
- Added `provider_account_auth` as a provider access mode for account/subscription auth.
- Added router auth modes:
  - `codex_app_server`
  - `claude_setup_token`
- Added `stored_provider_secret` refs with explicit `secretType`.
- Added app-managed encrypted local secret storage in `lib/providers/secret-store.ts`.
- Updated provider config resolution/writing to support Codex app-server auth without a SkillMall-managed secret.
- Updated validation so Claude setup-token requires a stored setup-token secret ref.
- Updated provider API sanitization to return redacted stored-secret status only.
- Updated provider test route to reject prompt/response-like fields instead of accepting prompt bodies.

## Verification

Command:

```bash
npm test -- lib/providers lib/llm/router app/api/providers
```

Result:

```text
Test Files  22 passed (22)
Tests       171 passed (171)
```

Evidence scan:

```bash
rg -n "setup_token|stored_provider_secret|provider auth|redact|api_key|codex|claude" lib/providers lib/llm/router app/api/providers
```

Result: expected hits present in schema, registry, config, secret-store, API route sanitization, and tests. Raw secret values are not returned by new stored-secret status paths.

## Notes

The first test attempt failed because the clean worktree temporarily symlinked to an existing `node_modules` whose `better-sqlite3` native binary was compiled for a different Node ABI. I removed the symlink and ran `npm install` in this clean worktree. The second test run is the trusted result.

`lib/providers/index.ts` currently throws a clear `ConfigError` for `codex` until T005 provides the actual Codex client.

## Receipt

Decision: pass

Summary: Auth modes, provider registry, stored secret refs, redacted status output, and prompt-test rejection are in place and verified. Continue to T005 for Codex app-server backend/client implementation.
