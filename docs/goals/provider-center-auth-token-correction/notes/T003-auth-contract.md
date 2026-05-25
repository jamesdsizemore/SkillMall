# T003 Judge Auth Contract

Date: 2026-05-21

Decision: approved for Worker implementation.

## Contract Summary

The implementation must create first-class provider auth/session objects. It must not revive the prior detached CLI-launch model for OpenAI Codex.

Approved primary path:

- OpenAI Codex account auth uses Codex app-server `account/login/start`.
- SkillMall renders the returned `authUrl` or `verificationUrl` plus `userCode`.
- SkillMall tracks `flowId -> loginId` and updates state from app-server `account/login/completed`.
- SkillMall may use a SkillMall-owned timeout/expiry for UI state because Codex app-server response does not include expiry fields.
- Cancellation calls `account/login/cancel` with the stored `loginId`.

Approved Claude path:

- Claude Code local login remains a local CLI/session path and must be labeled as such.
- Claude setup-token is a separate setup method and secret type.
- Claude setup-token runtime uses scoped env injection for `CLAUDE_CODE_OAUTH_TOKEN`.
- Anthropic API key remains separate from Claude Code subscription/setup-token auth.

Rejected paths:

- Do not implement direct OpenAI device-code endpoints from OpenClaw in this goal.
- Do not scrape browser sessions, read/copy credential files, or ask users for cookies/session blobs.
- Do not return raw access tokens or setup-token values from API routes.
- Do not use `codex login status` as proof that the in-app auth session completed.
- Do not use `claude auth status` as proof that Provider Center rendered a web auth object.

## Approved Schema Direction

Add explicit provider auth concepts rather than forcing everything into `env_key`.

Approved additions:

- Add `codex` to executable `ProviderID` only with the approved `CodexClient` adapter contract.
- Add `openai_codex` to `ProviderRegistryID`.
- Add a provider account/subscription access mode for Codex/Claude account auth if needed by the UI.
- Add `LLMAuthMode` values:
  - `codex_app_server`
  - `claude_setup_token`
- Add `SecretRef` support for stored provider secrets:
  - `type: "stored_provider_secret"`
  - stable id
  - provider registry id
  - secret type, at minimum `setup_token`
- `codex_app_server` uses no raw secret in SkillMall config.
- `claude_setup_token` requires a stored provider secret ref.
- `local_cli_session` and `none_local` continue to reject secret refs except `none`.
- `env_key` and `gateway_virtual_key` behavior must not regress.

## Approved API Contract

Add:

- `POST /api/providers/auth/start`
- `GET /api/providers/auth/[flowId]/status`
- `POST /api/providers/auth/[flowId]/cancel`
- `POST /api/providers/credentials/setup-token`
- `DELETE /api/providers/credentials/setup-token`

Route behavior:

- Auth start rejects raw secret-like fields before parsing.
- For `providerRegistryId: "openai_codex"`, start calls Codex app-server and returns a redacted session object with `flowId`, `loginId`, status, method, and either `authUrl` or `verificationUrl`/`userCode`.
- Status returns only redacted session state.
- Cancel calls app-server cancel by `loginId`.
- Setup-token save accepts only a token-shaped value for the Claude setup-token path, stores it through the secret store, and returns only redacted status.
- Setup-token delete removes the stored secret and clears/updates config as needed.
- `/api/providers/test` prompt-field ambiguity must be resolved: reject prompt/response-like fields instead of accepting them.

## Approved Runtime Contract

Codex:

- Implement `CodexClient` as an executable adapter for `ProviderID: "codex"`.
- Use `codex exec` only if it can run with the same `CODEX_HOME`/auth context established by the app-server auth session.
- If app-server execution is needed instead of `codex exec`, stop and record a blocker before widening the slice.

Claude:

- Add a small controlled env builder for Claude Code execution.
- When `authMode === "claude_setup_token"`, resolve the stored setup-token and inject `CLAUDE_CODE_OAUTH_TOKEN` only into the spawned `claude --print` process.
- Clear conflicting inherited Claude/Anthropic auth env vars for setup-token execution.
- When `authMode === "local_cli_session"`, keep ambient CLI session behavior.

## Approved UI Contract

Provider Center must display provider-specific auth states:

- OpenAI Codex browser flow: `Open authorization page` from returned `authUrl`.
- OpenAI Codex device flow: visible `verificationUrl`, `userCode`, copy/open controls.
- OpenAI Codex pending/completed/failed/cancelled/expired states.
- Claude Code local login: Terminal/local CLI wording only.
- Claude setup-token: secure input, saved/redacted status, rotate/delete behavior.

The UI must not include a generic "auth token" button that claims all providers share the same behavior.

## Approved File Ownership

T004 auth domain/config/secret model may edit:

- `lib/providers/types.ts`
- `lib/providers/registry.ts`
- `lib/providers/defaults.ts`
- `lib/providers/index.ts`
- `lib/providers/secret-store.ts`
- `lib/providers/__tests__/providers.test.ts`
- `lib/providers/__tests__/registry.test.ts`
- `lib/llm/router/types.ts`
- `lib/llm/router/secret-refs.ts`
- `lib/llm/router/config.ts`
- `lib/llm/router/__tests__/config.test.ts`
- `app/api/providers/route.ts`
- `app/api/providers/configure/route.ts`
- `app/api/providers/test/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`

T005 Codex app-server backend may edit:

- `lib/providers/codex.ts`
- `lib/providers/codex-app-server-auth.ts`
- `lib/providers/codex-app-server/**`
- `lib/providers/__tests__/codex-app-server-auth.test.ts`
- `app/api/providers/auth/start/route.ts`
- `app/api/providers/auth/[flowId]/status/route.ts`
- `app/api/providers/auth/[flowId]/cancel/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`

T006 Provider Center UI may edit:

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`

T007 Claude setup-token/runtime may edit:

- `lib/providers/claude-code.ts`
- `lib/providers/claude-code-env.ts`
- `lib/providers/local-cli-auth.ts`
- `lib/providers/secret-store.ts`
- `lib/providers/__tests__/local-cli-auth.test.ts`
- `lib/providers/__tests__/claude-code-auth.test.ts`
- `app/api/providers/credentials/setup-token/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`

T008 docs may edit:

- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`
- `docs/reference/provider-catalog.md`

Any other product-code file requires a new Judge note before editing.

## Dependency/Docs Caveat

The clean worktree currently lacks `node_modules`. Local Next docs required by AGENTS.md are unavailable both in the clean worktree and in the original worktree's installed `next` package. Official Next route handler docs were consulted as fallback evidence:

- `https://nextjs.org/docs/app/api-reference/file-conventions/route`

This is sufficient to proceed with route-handler edits because the route implementation uses standard `app/**/route.ts`, Web `Request`, and `NextResponse` patterns already present in the repo.

## Receipt

Result: done

Decision: pass

Summary: Auth/session/secret/runtime/UI contract is approved. Allowed files were corrected before Worker implementation. Codex app-server is primary; direct OpenClaw device-code endpoints are blocked for this goal.
