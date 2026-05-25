# T005 Codex App-Server Auth Receipt

Date: 2026-05-21

## Result

Done.

## Changed Files

- `lib/providers/codex-app-server-auth.ts`
- `lib/providers/codex.ts`
- `lib/providers/index.ts`
- `lib/providers/__tests__/codex-app-server-auth.test.ts`
- `app/api/providers/auth/start/route.ts`
- `app/api/providers/auth/[flowId]/status/route.ts`
- `app/api/providers/auth/[flowId]/cancel/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`

## What Changed

- Added a Codex app-server auth session manager.
- Added JSONL app-server transport for `codex app-server --listen stdio://`.
- Added `account/login/start` support for:
  - `chatgpt`
  - `chatgptDeviceCode`
- Added `flowId -> loginId` session tracking.
- Added `account/login/completed` notification handling.
- Added `account/login/cancel` handling.
- Added redacted API routes:
  - `POST /api/providers/auth/start`
  - `GET /api/providers/auth/[flowId]/status`
  - `POST /api/providers/auth/[flowId]/cancel`
- Added `CodexClient`, which runs `codex exec` with SkillMall's isolated `CODEX_HOME`.
- Updated provider factory to construct `CodexClient`.

## Verification

Command:

```bash
npm test -- lib/providers app/api/providers
```

Result:

```text
Test Files  9 passed (9)
Tests       91 passed (91)
```

Evidence scan:

```bash
rg -n "account/login/start|account/login/completed|loginId|authUrl|verificationUrl|userCode|cancel|flowId" lib/providers app/api/providers
```

Result: expected app-server auth flow/session/status/cancel hits present.

## Safety Notes

- API routes reject raw token/credential fields before parsing.
- API route tests verify `authUrl`, `verificationUrl`, and `userCode` are returned while raw tokens are not.
- Completion is modeled from `account/login/completed`, not from `codex login status`.
- Direct OpenClaw-style device-code endpoints were not implemented.
- `CodexClient` clears ambient `OPENAI_API_KEY` and `CODEX_API_KEY` and uses SkillMall's isolated `CODEX_HOME`.

## Receipt

Decision: pass

Summary: Codex app-server auth start/status/cancel and Codex client integration are implemented behind redacted session objects. Continue to T006 for Provider Center UI rendering of these first-class auth objects.
