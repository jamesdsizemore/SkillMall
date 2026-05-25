# T002 Source Revalidation Receipt

Date: 2026-05-21

Worktree:

```text
/Users/jamesdsizemore/Developer/skill-mall-auth-token-correction
branch: codex/provider-center-auth-token-correction
base: b19fa84 Merge pull request #16 from jamesdsizemore/codex/provider-center-product-phase1
```

## Decision

Pass. The corrected research direction still holds on clean `main`.

Proceed to Judge contract approval before Worker edits.

## Revalidated Evidence

### Codex CLI And App-Server

Local Codex:

```text
codex-cli 0.132.0
```

`codex login --help` confirms:

- `--with-api-key`
- `--with-access-token`
- `--device-auth`
- `status`

`codex app-server --help` confirms:

- `daemon`
- `proxy`
- `generate-ts`
- `generate-json-schema`
- `--listen`
- websocket auth options

Generated protocol command:

```bash
rm -rf /tmp/codex-app-protocol && mkdir -p /tmp/codex-app-protocol
codex app-server generate-ts --out /tmp/codex-app-protocol/ts
```

Confirmed generated protocol facts:

- `ClientRequest` includes `account/login/start`.
- `ClientRequest` includes `account/login/cancel`.
- `ServerNotification` includes `account/login/completed`.
- `CancelLoginAccountParams` is `{ loginId: string }`.
- `CancelLoginAccountStatus` is `"canceled" | "notFound"`.
- `LoginAccountParams` includes `apiKey`, `chatgpt`, `chatgptDeviceCode`, and `chatgptAuthTokens`.
- `LoginAccountResponse` includes:
  - `{ type: "chatgpt"; loginId: string; authUrl: string }`
  - `{ type: "chatgptDeviceCode"; loginId: string; verificationUrl: string; userCode: string }`
- `AccountLoginCompletedNotification` is `{ loginId: string | null; success: boolean; error: string | null }`.

No generated `expiresAt` or `pollIntervalMs` exists in app-server login response. Any timeout/expiry display must be SkillMall-owned unless later protocol evidence changes.

### Claude CLI

Local Claude:

```text
2.1.146 (Claude Code)
```

`claude auth login --help` confirms:

- `--claudeai`
- `--console`
- `--email`
- `--sso`

`claude setup-token --help` confirms it sets up a long-lived authentication token and requires a Claude subscription.

`claude auth status --json` confirms this host is logged in with first-party Claude auth. The command did not expose a web auth object, `authUrl`, device code, or machine-readable setup-token.

Receipt note: do not quote user account email/org details in normal final output unless needed for a local debugging receipt. It is not needed for implementation.

### OpenClaw Reference

OpenClaw evidence remains available in `/tmp/openclaw-research`.

OpenAI Codex:

- `extensions/openai/openai-codex-device-code.ts` models device-code login as a real prompt object with `verificationUrl`, `userCode`, and `expiresInMs`.
- It calls OpenAI auth endpoints directly and owns polling/exchange/token persistence, which is why it remains a fallback risk for SkillMall rather than the primary path.
- `extensions/openai/openai-codex-provider.ts` registers distinct Codex auth choices rather than a generic token button.
- `extensions/codex/src/app-server/auth-bridge.ts` treats Codex app-server auth/profile handling as a first-class runtime integration and explicitly controls `CODEX_HOME`, `HOME`, `CODEX_API_KEY`, and `OPENAI_API_KEY` behavior.

Claude/Anthropic:

- `extensions/anthropic/provider-contract-api.ts` exposes distinct `Claude CLI`, `setup-token`, and API-key auth choices.
- `extensions/anthropic/register.runtime.ts` validates/publishes setup-token behavior separately from Claude CLI reuse.
- `src/plugins/provider-auth-token.ts` validates setup-token prefix `sk-ant-oat01-`.
- `extensions/anthropic/cli-shared.ts` explicitly clears conflicting Anthropic/Claude auth env vars including `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`, and `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR` in controlled CLI runs.

### Current SkillMall Source On Clean Main

Clean `main` does not contain the prior dirty-branch auth-connect implementation files:

- no tracked `app/api/providers/connect/route.ts`
- no tracked `lib/providers/local-cli-auth.ts`
- no tracked `lib/providers/codex.ts`
- no tracked `lib/providers/secret-store.ts`

Current Provider Center state:

- `components/skill-mall/providers/ProviderCenter.tsx` owns provider selection, drafts, save/test/refresh/pricing/policy actions.
- `components/skill-mall/providers/ProviderConfigPanel.tsx` is reference/config-mode oriented; it does not render Codex `authUrl`, Codex `verificationUrl`, Codex `userCode`, Claude setup-token input, or auth session state.
- Provider draft modes are only `env_key`, `gateway_virtual_key_ref`, `local_cli_session`, and `none_local`.
- The existing `Claude Code CLI` registry row is `claude_code`, access mode `local_tool_session`, executable provider `claude-code`.
- There is no clean-main Provider Center row for OpenAI Codex account auth.
- Clean-main direct executable `ProviderID` remains `openai | anthropic | claude-code | gemini | groq | ollama`.
- `lib/providers/claude-code.ts` executes `claude --print --model <model> <prompt>` and relies on ambient environment/session.
- `lib/providers/index.ts` only resolves API env secrets for `env_key`; it does not inject a Claude setup-token.
- `lib/llm/router/types.ts` has only `env`, `gateway_virtual_key_ref`, and `none` secret refs.
- `lib/llm/router/secret-refs.ts` rejects all secret ref types except those.
- `/api/providers/configure` rejects generic raw secret names including `token`, `accessToken`, session/browser token fields, and credential-file/path fields.
- `/api/providers/test` still accepts optional `prompt` in clean main via a passthrough schema, although it says prompt/response bodies are not stored or echoed.

### Next.js Docs

AGENTS.md required local docs under `node_modules/next/dist/docs/` before code. In this clean worktree `node_modules` is absent. In the original dirty worktree, `node_modules/next` exists but `node_modules/next/dist/docs` is also absent.

Package version from `package.json`:

```text
next: 16.2.6
```

Fallback source used for T002 only: official Next.js docs at `https://nextjs.org/docs/app/api-reference/file-conventions/route`.

Relevant facts from the official docs:

- Route Handlers are implemented in `route.js|ts` under `app`.
- Supported methods include `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
- Route handlers use the Web `Request`/`Response` APIs and may return `NextResponse`.
- `OPTIONS` can be auto-implemented when not defined.

Judge should decide whether this satisfies the AGENTS.md docs requirement for route edits, given the local docs are unavailable in the installed package.

## Implementation Implications

- Codex must be implemented as app-server auth-session state, not CLI status polling.
- SkillMall must add an OpenAI Codex account-auth concept/row or otherwise expose Codex account auth distinctly from OpenAI API access.
- Claude Code should stay honest: local CLI login/status is one path; setup-token is a separate path.
- The existing router/auth schema must grow before UI implementation because `setup_token` cannot be represented safely today.
- A stored provider secret type is needed; it must not be mislabeled as an env var or API key.
- Runtime execution must use controlled env injection for Claude setup-token instead of ambient process state.
- `/api/providers/test` prompt-field ambiguity remains in clean main and should be corrected during this goal.

## Receipt

Result: done

Decision: pass

Summary: Current source and primary local evidence support the corrected plan. Codex app-server is the primary path. Claude must be split between local CLI login and setup-token. Current clean-main schema/UI/API code cannot represent the required auth objects yet.
