# T004 Allowed-File Amendment

## Decision

Approved after checker audit.

## Added File

- `lib/providers/config-store.ts`

## Rationale

T004 added new auth modes and secret-ref behavior. The provider config store is the persistence boundary that normalizes `codex_app_server`, `claude_setup_token`, and stored provider secret refs into durable provider config without writing raw credentials. The change belongs to T004's auth-domain/config-store objective and should have been listed in the original allowed files.

## Guardrail

This amendment does not approve unrelated config-store refactors or raw-secret persistence.
