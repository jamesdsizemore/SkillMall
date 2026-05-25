# T005 Allowed-File Amendment

## Decision

Approved after checker audit.

## Added File

- `lib/providers/index.ts`

## Rationale

T005 introduced the Codex app-server auth backend and Codex runtime client. `lib/providers/index.ts` is the provider-client factory boundary that needs to return `CodexClient` for `provider: "codex"` while preserving existing provider resolution behavior. The change belongs to T005's Codex backend objective and should have been listed in the original allowed files.

## Guardrail

This amendment does not approve unrelated provider factory changes or API-key fallback behavior for Codex account auth.
