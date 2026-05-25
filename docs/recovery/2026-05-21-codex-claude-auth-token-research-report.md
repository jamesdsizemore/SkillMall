# Codex and Claude Auth Token Research Report

Date: 2026-05-21

Branch/worktree inspected: `codex/provider-center-product-phase2` in `/Users/jamesdsizemore/Developer/skill-mall`

Status: Corrected after self-review. This report is research and implementation guidance only; it is not an approval to code until the blockers below are resolved.

## Executive Finding

The current Provider Center implementation is wrong for the product promise.

SkillMall currently treats the OpenAI Codex and Claude Code auth buttons as "launch a local CLI command somewhere else, then poll status." That is why the buttons do not produce a usable web-based auth token authorization page. The web UI receives no auth URL, no user code, no login id, no expiry, and no durable auth-session state.

OpenClaw and Codex app-server model this differently: auth is a first-class flow object that the UI or TTY renders. For Codex app-server, `account/login/start` returns an object such as `{ type: "chatgpt", loginId, authUrl }` or `{ type: "chatgptDeviceCode", loginId, verificationUrl, userCode }`, and completion arrives via `account/login/completed`. SkillMall needs to implement that shape, not keep pretending a detached Terminal command is a web auth flow.

## Current SkillMall Behavior

Relevant local files:

- `lib/providers/local-cli-auth.ts`
- `app/api/providers/connect/route.ts`
- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `lib/providers/codex.ts`
- `lib/providers/claude-code.ts`

Current behavior:

1. `local-cli-auth.ts` maps OpenAI Codex to `codex login --device-auth` and Claude Code to `claude auth login`.
2. `startLocalCliAuthFlow()` launches the command in macOS Terminal via AppleScript.
3. `/api/providers/connect` returns only `auth_flow_started`, command label, and whether Terminal launched.
4. Provider Center polls `/api/providers/test` for up to 120 seconds.
5. The UI never displays an authorization URL or device code.

This is not a web auth/token flow. It is a blind side effect.

The local CLI versions also disprove the current assumptions:

- `codex-cli 0.132.0` supports `codex login --device-auth`, `--with-api-key`, and `--with-access-token`.
- `claude 2.1.146` supports `claude auth login`, `claude auth status --json`, and `claude setup-token`.
- `claude auth login` has `--claudeai`, `--console`, `--email`, and `--sso`, but no documented machine-readable device-code output.
- `claude setup-token` is the documented long-lived token path for subscription auth, but it is TTY-oriented.

## Evidence From OpenClaw

OpenClaw is the right comparison point because it separates provider auth methods and persists auth profiles instead of pretending every provider is an API key.

### OpenAI Codex

OpenClaw's Codex provider exposes multiple auth methods:

- OAuth browser login.
- Device-code login.
- OpenAI API key backup.

The important part is the device-code shape:

- Request device code from OpenAI auth.
- Return/render `verificationUrl`, `userCode`, and expiry.
- Poll the device auth token endpoint.
- Exchange the authorization code for access/refresh credentials.
- Persist an auth profile and config patch.

Concrete implementation inspected:

- `/tmp/openclaw-research/extensions/openai/openai-codex-device-code.ts`
- `/tmp/openclaw-research/extensions/openai/openai-codex-provider.ts`

OpenClaw's device-code implementation calls:

- `https://auth.openai.com/api/accounts/deviceauth/usercode`
- `https://auth.openai.com/codex/device`
- `https://auth.openai.com/api/accounts/deviceauth/token`
- `https://auth.openai.com/oauth/token`

The user-facing callback is `onVerification({ verificationUrl, userCode, expiresInMs })`. That is the core pattern SkillMall is missing.

OpenClaw's provider registration declares `oauth`, `device-code`, and API-key backup as separate auth methods. The Codex device-code method renders the URL and code to the user, opens the URL when local, and logs a manual URL for remote/headless contexts.

Source pointers:

- [OpenClaw Codex device-code implementation](https://github.com/openclaw/openclaw/blob/main/extensions/openai/openai-codex-device-code.ts)
- [OpenClaw Codex provider auth methods](https://github.com/openclaw/openclaw/blob/main/extensions/openai/openai-codex-provider.ts)

### Codex app-server

Codex itself has an app-server protocol intended for UI integrations. OpenClaw bridges its auth profiles into the Codex app-server runtime instead of treating Codex auth as a generic OpenAI API key.

Concrete implementation inspected:

- `/tmp/openclaw-research/extensions/codex/src/app-server/auth-bridge.ts`
- generated local Codex protocol from `codex app-server generate-ts --out /tmp/codex-app-protocol/ts`

The actual generated app-server auth protocol matters:

```ts
type LoginAccountParams =
  | { type: "apiKey"; apiKey: string }
  | { type: "chatgpt"; codexStreamlinedLogin?: boolean }
  | { type: "chatgptDeviceCode" }
  | {
      type: "chatgptAuthTokens";
      accessToken: string;
      chatgptAccountId: string;
      chatgptPlanType?: string | null;
    };

type LoginAccountResponse =
  | { type: "apiKey" }
  | { type: "chatgpt"; loginId: string; authUrl: string }
  | { type: "chatgptDeviceCode"; loginId: string; verificationUrl: string; userCode: string }
  | { type: "chatgptAuthTokens" };

type AccountLoginCompletedNotification = {
  loginId: string | null;
  success: boolean;
  error: string | null;
};
```

The key lesson for SkillMall is not to scrape `~/.codex/auth.json` or accept browser tokens. Use Codex's supported app-server login surface when building a web UI flow, or delegate to the Codex CLI session explicitly and honestly.

Important correction: app-server does not return `expiresAt` or `pollIntervalMs` in the generated `LoginAccountResponse`. Those fields only belong to a direct OpenAI device-code implementation such as OpenClaw's provider code. A SkillMall app-server integration must track timeout/polling state itself and listen for `account/login/completed`.

Source pointer:

- [OpenAI Codex app-server README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
- [OpenClaw Codex app-server auth bridge](https://github.com/openclaw/openclaw/blob/main/extensions/codex/src/app-server/auth-bridge.ts)

### Claude Code

OpenClaw does not treat Claude Code as "click a fake web auth button." It has separate concepts:

- Reuse an existing Claude CLI login when available.
- Migrate/read Claude CLI credentials through a provider-auth seam.
- Support Anthropic setup-token as a token auth method.
- Support Anthropic API key as a different method.

Concrete implementation inspected:

- `/tmp/openclaw-research/extensions/anthropic/cli-auth-seam.ts`
- `/tmp/openclaw-research/extensions/anthropic/cli-migration.ts`
- `/tmp/openclaw-research/extensions/anthropic/register.runtime.ts`
- `/tmp/openclaw-research/src/plugins/provider-auth-token.ts`

The `setup-token` path validates tokens beginning with `sk-ant-oat01-`. The CLI reuse path reads Claude CLI credentials and maps them to a Claude CLI runtime/auth profile. Those are distinct flows.

Source pointers:

- [OpenClaw Anthropic extension](https://github.com/openclaw/openclaw/tree/main/extensions/anthropic)
- [Claude Code CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-reference)
- [Claude Code setup docs](https://docs.anthropic.com/en/docs/claude-code/setup)

## Options Considered

### Option A: Keep launching `codex login --device-auth` and `claude auth login` in Terminal

Reject.

This is the current broken behavior. It can work by accident for a user already watching Terminal, but the Provider Center button cannot render a web auth page because the API returns no `verificationUrl`, no `userCode`, and no session state. It also gives bad feedback: the UI says an auth flow started even when the useful interaction happened out of band.

### Option B: Parse stdout from detached CLI commands

Reject as primary.

This is brittle. SkillMall would need a PTY, stream parsing, and provider/version-specific output handling. It still would not give a durable auth-session contract, and it risks capturing secret/token output from `claude setup-token`.

### Option C: Implement direct OpenAI Codex device-code auth in SkillMall

Technically viable for OpenAI Codex, but not the preferred first implementation.

This follows OpenClaw's proven model: request device code, return `{ verificationUrl, userCode, expiresAt, intervalMs, flowId }` to the web UI, poll, exchange, then store/activate safely. It gives the user the auth page they expected.

Blocker/risk: SkillMall would own OpenAI Codex OAuth credential storage and refresh behavior, including refresh failures, expiry, encrypted storage, account identity, and token redaction. This also depends on OpenAI auth endpoints and a public client id observed in OpenClaw, not on SkillMall's own first-party app-server contract. Do not implement this path unless app-server login is blocked and the user explicitly accepts the supportability risk.

### Option D: Use Codex app-server for OpenAI Codex auth and execution

Recommended for OpenAI Codex.

This aligns with the first-party Codex UI integration path and avoids copying browser/session credentials. SkillMall should start or connect to Codex app-server, call `account/login/start` with either `{ type: "chatgpt" }` or `{ type: "chatgptDeviceCode" }`, return the response object to Provider Center, listen for `account/login/completed`, then configure SkillMall to execute Codex through the authenticated Codex runtime.

Blocker/risk: this is more than a shell-command change. SkillMall needs an app-server client/daemon lifecycle, JSON-RPC request/notification handling, login session storage keyed by `loginId`, timeout/cancel handling, and a decision about whether `CodexClient` continues to use `codex exec` or migrates to app-server execution. Without that plumbing, app-server login will be another half-built button.

### Option E: Treat Claude Code CLI auth as a local-session check only; add separate setup-token flow

Recommended for Claude.

Claude does not expose the same documented device-code object in the CLI surface inspected. The honest implementation is:

1. `Claude Code local login`: status check plus an explicit "Open Claude login in Terminal" action. This button must say it opens Terminal, not a web auth token page.
2. `Claude setup-token`: run or instruct `claude setup-token` as a TTY step, then provide a secure paste field for the generated `sk-ant-oat01-...` token. Store encrypted, redact, rotate/delete, and pass it to runtime as `CLAUDE_CODE_OAUTH_TOKEN` only for SkillMall-owned Claude execution.
3. `Anthropic API key`: keep separate from Claude Code subscription auth.

This matches OpenClaw's split between Claude CLI reuse, setup-token, and API key.

Blocker/risk: current SkillMall schemas do not support `setup_token` auth yet. `/api/providers/configure` currently accepts only `api_key`, `env_key`, `gateway_virtual_key_ref`, `local_cli_session`, and `none_local`, and generic connect/configure routes reject raw fields named `token`. The router auth-mode union and `SecretRef` types also do not have a setup-token credential type. This must be modeled before a paste field can work.

## Recommendation

Implement Provider Center auth as explicit auth flow state, not as background CLI launch state.

### OpenAI Codex

Replace the current `openai_codex` connect implementation with a Codex auth-session route. Preferred implementation:

1. Add `POST /api/providers/auth/start`.
2. For `providerRegistryId: "openai_codex"`, start/connect Codex app-server and call `account/login/start` with `{ type: "chatgpt" }` or `{ type: "chatgptDeviceCode" }`.
3. Return a sanitized auth session derived from the actual app-server response:

```ts
type ProviderAuthSession = {
  providerRegistryId: "openai_codex";
  method: "chatgpt" | "chatgpt_device_code";
  status: "authorization_required" | "pending" | "ready" | "cancelled" | "expired" | "failed";
  flowId: string;
  loginId: string;
  authUrl?: string;
  verificationUrl?: string;
  userCode?: string;
  expiresAt?: string; // SkillMall-owned timeout, not returned by app-server.
  message: string;
};
```

4. Store `flowId -> { loginId, appServerClient/session, providerRegistryId, startedAt, timeoutAt }` server-side.
5. Listen for app-server `account/login/completed` notifications and update the SkillMall auth session.
6. Add `GET /api/providers/auth/:flowId/status` only as a SkillMall status wrapper around the app-server notification state.
7. Add `POST /api/providers/auth/:flowId/cancel`, which calls app-server `account/login/cancel` with `{ loginId }`.
8. Configure `openai_codex` only after the app-server status confirms login.
9. Provider Center renders the URL/code in the page and includes an "Open authorization page" button.
10. `CodexClient` must use the same configured Codex runtime/home/auth context as the auth session. Do not store raw OpenAI browser/session tokens in SkillMall config.

Fallback if Codex app-server cannot be integrated quickly:

Do not silently fall back to current Terminal launch behavior. Either:

- temporarily mark OpenAI Codex as "requires external `codex login`" with honest UI copy, or
- implement OpenClaw-style direct device-code only after explicitly accepting the supportability and token-refresh ownership risk.

### Claude Code

Split the current single "Claude Code CLI Auth Token" row into two visible setup paths:

1. `Claude Code local login`
   - Checks `claude auth status --json`.
   - If inactive, launches `claude auth login` in Terminal.
   - UI copy must say Terminal is required.
   - It must not claim a web auth page was opened in Provider Center.

2. `Claude setup-token`
   - Runs `claude setup-token` only in an explicit Terminal/TTY handoff or tells the user the command to run.
   - Provides a secure token paste input for `sk-ant-oat01-...`.
   - Stores the token in app-managed encrypted storage.
   - Configures `ClaudeCodeClient` to run with a controlled environment that injects `CLAUDE_CODE_OAUTH_TOKEN` for the subprocess instead of relying on ambient host login.
   - Clears or overrides conflicting Anthropic/Claude environment variables before spawning, so inherited shell state cannot silently steer the run to the wrong provider or credential.

3. `Anthropic API key`
   - Remains the normal API-key provider.
   - Must not be collapsed into Claude Code subscription auth.

## Required Code Changes

### Auth domain model

Add auth flow types in `lib/providers`:

- `ProviderAuthMethod`: `api_key`, `env_key`, `codex_app_server`, `codex_device_code`, `claude_cli_login`, `claude_setup_token`, `local_runtime`.
- `ProviderAuthSession`: the session object returned to the UI.
- `ProviderAuthSessionStatus`: authorization_required/pending/ready/cancelled/expired/failed.

Add router/config credential support before UI work:

- Extend `LLMAuthMode` or add a provider-specific auth method layer for `claude_setup_token`.
- Extend `SecretRefType` beyond `stored_api_key`, or generalize the secret store so a stored setup-token is not mislabeled as an API key.
- Add a secret id helper such as `storedProviderSecretId(providerRegistryId, "setup_token")`.
- Update `writeProviderConfig`, `resolveRouterProviderConfig`, `/api/providers`, `/api/providers/test`, and docs so setup-token config is redacted and executable.
- Decide whether Claude setup-token is a separate registry row or a selectable auth method under `claude_code`. A single `claude_code` row with internal auth-method selection is probably cleaner, but the decision must be explicit.

### API routes

Replace or narrow `/api/providers/connect`:

- Keep it only for `claude_cli_login` Terminal handoff.
- Do not use it for Codex web/device auth.

Add:

- `POST /api/providers/auth/start`
- `GET /api/providers/auth/:flowId/status`
- `POST /api/providers/auth/:flowId/cancel`

For app-server login:

- `POST /api/providers/auth/start` returns either app-server `authUrl` or `verificationUrl`/`userCode`.
- `GET /api/providers/auth/:flowId/status` returns SkillMall's current view of the app-server `account/login/completed` notification.
- Status cannot be implemented by guessing from `codex login status`; that only proves CLI login, not that this app-server login session completed.

For token paste:

- Either extend `/api/providers/configure` with a dedicated `configMode: "setup_token"` that accepts only the expected setup-token shape, or add `POST /api/providers/credentials/setup-token`.
- Keep the existing raw-secret rejection on generic connect/status routes.

### UI

Provider Center must render auth-state objects:

- OpenAI Codex: show authorization URL, user code, expiry countdown, copy code, open page, polling status, retry.
- Claude local login: show "opens Terminal" and polling status.
- Claude setup-token: show token paste field, validation, save, delete/rotate.

The current `[ AUTH TOKEN ]` label is too vague and actively misleading. It should become provider-specific:

- `OpenAI Codex device login`
- `Claude Code local login`
- `Claude setup-token`

### Runtime execution

OpenAI Codex:

- Prefer Codex app-server execution if auth is established through app-server.
- If staying with `codex exec`, ensure the same `CODEX_HOME` or auth profile is used. This may require explicit `CODEX_HOME` process env and is not proven by `codex login status`.
- Treat app-server execution as a separate implementation slice if it cannot be safely completed in the auth-flow slice.

Claude Code:

- If using local CLI login, keep ambient CLI session.
- If using stored setup-token, inject `CLAUDE_CODE_OAUTH_TOKEN` into the `claude --print` subprocess environment through a controlled env builder.
- Clear conflicting inherited auth/provider env vars before spawn.
- Never mix Anthropic API key with Claude Code subscription token config.

## Verification Plan

Unit tests:

- OpenAI Codex app-server start returns `flowId`, `loginId`, and either `authUrl` or `verificationUrl`/`userCode`, with no raw tokens.
- OpenAI Codex status transitions from pending to ready/expired/failure.
- OpenAI Codex status is driven by `account/login/completed`, not by `codex login status`.
- OpenAI Codex failure bodies are sanitized.
- Claude local-login connect response explicitly says Terminal handoff.
- Claude setup-token accepts `sk-ant-oat01-...`, rejects malformed tokens, and never returns the token.
- `ClaudeCodeClient` injects `CLAUDE_CODE_OAUTH_TOKEN` only when the stored setup-token auth mode is selected.
- `ClaudeCodeClient` clears inherited conflicting Claude/Anthropic auth env vars for controlled setup-token execution.

API tests:

- `/api/providers/auth/start` rejects raw secret fields.
- `/api/providers/connect` rejects `openai_codex` after Codex moves to auth-session flow.
- `/api/providers/configure` keeps `anthropic`, `claude_code`, and `openai_codex` auth modes separate.
- `/api/providers/auth/:flowId/cancel` calls app-server `account/login/cancel` with the stored `loginId`.

UI tests:

- Selecting OpenAI Codex renders "Open authorization page" and a visible user code after auth start.
- Selecting Claude Code local login renders Terminal-handoff copy, not fake web-auth copy.
- Selecting Claude setup-token renders a password/token input and delete/rotate status.

Browser proof:

- Desktop and mobile screenshots of Provider Center showing:
  - OpenAI Codex auth URL/code visible after click.
  - Claude local login copy accurately says Terminal.
  - Claude setup-token secure input.
  - No text clipping or overlap.

Manual smoke:

- Codex app-server: call `account/login/start`, open/render the returned URL/code, observe `account/login/completed`, then verify `getAuthStatus` or `account/read`.
- CLI fallback only: `codex login status` before/after external CLI auth.
- `claude auth status --json` before/after local login.
- Stored Claude setup-token route runs a harmless `claude --print` test with injected env.

## Non-Negotiables

- Do not claim either button opens a web auth/token authorization page unless the UI actually receives and renders a URL/code/session object.
- Do not scrape browser session cookies.
- Do not store raw browser/session credentials in config.
- Do not collapse Claude Code subscription auth into Anthropic API key auth.
- Do not call "auth verified" from screenshot proof that only shows row labels.
- Do not mark the GoalBuddy task done until a browser proof shows the actual flow state after clicking.

## Final Implementation Direction

OpenAI Codex should become a real in-page authorization flow using Codex app-server first. OpenClaw-style direct device-code is only a fallback if app-server is blocked and the supportability/token-refresh ownership risk is explicitly accepted.

Claude Code should be split into honest paths: local CLI login via Terminal handoff, and setup-token via secure paste/storage/runtime injection. A single "Claude Code Auth Token" button cannot truthfully represent both.
