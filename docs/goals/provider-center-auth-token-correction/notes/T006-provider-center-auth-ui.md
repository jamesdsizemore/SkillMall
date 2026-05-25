# T006 Provider Center Auth UI Receipt

Date: 2026-05-21

## Result

Done.

## Changed Files

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ProviderCatalogList.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `docs/goals/provider-center-auth-token-correction/notes/T006-allowed-file-amendment.md`

## What Changed

- Added Provider Center types for Codex auth sessions.
- Added UI state and fetch actions for:
  - `POST /api/providers/auth/start`
  - `GET /api/providers/auth/[flowId]/status`
  - `POST /api/providers/auth/[flowId]/cancel`
- Added OpenAI Codex UI that renders:
  - start browser login
  - start device-code login
  - `authUrl`
  - `verificationUrl`
  - `userCode`
  - `loginId`
  - status/message/cancel
- Added Claude Code UI that separates:
  - local CLI login
  - Claude setup-token
- Updated catalog grouping/labels so `provider_account_auth` rows are visible.

## Verification

Command:

```bash
npm test -- components/skill-mall/providers
```

Result:

```text
Test Files  1 passed (1)
Tests       10 passed (10)
```

Evidence scan:

```bash
rg -n "authUrl|verificationUrl|userCode|setup-token|local CLI|Open authorization|User code|cancel|expired|completed" components/skill-mall/providers
```

Result: expected Codex session rendering and Claude local/setup-token UI hits present.

## Notes

- `ProviderCatalogList.tsx` was added through a Judge amendment because the new `provider_account_auth` access mode must be grouped to make OpenAI Codex visible.
- Claude setup-token persistence is intentionally not complete in this UI receipt. T007 owns the credential route and runtime env injection.

## Receipt

Decision: pass

Summary: Provider Center now renders OpenAI Codex as a first-class app-server auth session object and separates Claude local CLI login from Claude setup-token setup. Continue to T007 for setup-token storage/runtime behavior.
