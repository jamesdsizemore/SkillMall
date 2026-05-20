# T702 E2E Audit Matrix

Scout result: current-source audit completed.

## Summary

Core backend guardrails exist for secret references, supported auth/mode lists, local policy simulation, route eligibility blockers, safe request-ledger body metadata scrubbing, schema constraints, and docs parity.

Main proof gaps:

- `GAP-001`: Scout did not execute verification commands; current green tests/TypeScript/lint classification still need PM/Worker proof.
- `GAP-002`: Provider Center has static render tests but no current browser walkthrough proof.
- `GAP-003`: CLI provider/policy command behavior has limited located automated regression coverage.

## Matrix

| ID | Flow | Status | Evidence |
| --- | --- | --- | --- |
| MATRIX-001 | Provider catalog/status | implemented source path | Provider Center loads `/api/providers`, `/api/providers/usage`, and `/api/providers/policies`; provider route tests assert sanitized catalog rows. |
| MATRIX-002 | Env API access | guarded | Configure route rejects raw secret field names and stores secret references only. |
| MATRIX-003 | Local CLI/session access | guarded by registry/config contract | Claude Code registry row is local tool session with no credential copying. |
| MATRIX-004 | Local runtime access | guarded by registry/config contract | Ollama registry row is local runtime/no credential. |
| MATRIX-005 | Local gateway access | bounded | `bifrost_local` and `gateway_virtual_key_ref` are the only approved local gateway additions. |
| MATRIX-006 | Model/pricing refresh | implemented with source distinctions | Provider CLI refresh uses model discovery plan and source-backed pricing. |
| MATRIX-007 | Capability/eligibility | implemented blockers | Route eligibility handles missing, reference, stale, unsupported capability, and missing/stale price blockers. |
| MATRIX-008 | Policy store/simulation | implemented local-only simulation | Simulation returns `providerRequestSent: false`, `promptStored: false`, and `responseStored: false`; API simulation rejects forbidden fields. |
| MATRIX-009 | Runtime routing/ledger | body metadata scrub exists | Request ledger strips prompt/response/body/message-like metadata keys before writes. |
| MATRIX-010 | Provider Center | static render tests exist; browser proof missing | Provider Center tests assert access groups, no raw secret prompts, no unsupported modes, and distinct cost labels. |
| MATRIX-011 | CLI | policy CLI guarded; provider CLI partial gap | Policy CLI rejects unsafe flags; provider CLI only explicitly rejects `--key`. |
| MATRIX-012 | Docs parity | mostly aligned | API/user/CLI docs describe narrow executable provider IDs, env refs, local session/runtime, Bifrost optionality, unsupported modes, simulation safety, and reference metadata limits. |

## Hardening Findings

### HF-001 High - Provider CLI Unsafe Input Boundary

Provider CLI unsafe input boundary is narrower than docs/Phase 7 expectation.

Evidence:

- `cli/src/commands/providers.ts` parses/rejects `--key`, but not `--token`, `--session-token`, `--credential-path`, `--prompt`, `--response`, or `--output`.
- Policy CLI already has broader unsafe flag rejection.
- CLI docs say provider commands do not echo prompts/responses/raw secrets/browser tokens/session tokens/credential files.

Recommended hardening:

- Add provider-command unsafe flag rejection equivalent to policy CLI.
- Add focused tests for token/session/credential/prompt/response/output flags.

### HF-002 Medium - Provider Center Browser Proof

Provider Center proof is static-render only, not E2E browser proof.

Evidence:

- Existing Provider Center tests cover static rendered output and helper behavior.
- No inspected evidence proves a no-secret browser configure/refresh/simulate walkthrough.

Recommended hardening:

- Add a no-secret browser or interaction-level Provider Center walkthrough receipt/test for load, configure with env ref, policy simulate, pricing/model status display, and unsupported-mode absence.

### HF-003 Medium - CLI Regression Coverage

CLI parity lacks located automated regression coverage.

Evidence:

- Scout did not find `cli/src/**/*.test.ts` coverage for providers or provider-policies commands.
- Policy CLI source has guards; provider CLI source has partial guard.

Recommended hardening:

- Add focused CLI tests for provider list/status/refresh/test output safety and policy unsafe flag/simulation output parity.

### HF-004 Medium - Ledger Secret-Like Metadata Scrubbing

Request ledger scrubs body-like metadata keys but not secret-like metadata keys.

Evidence:

- `lib/llm/router/request-ledger.ts` strips prompt/response/body/message-like keys.
- It does not strip `apiKey`, `token`, `sessionToken`, `credentialPath`, or related secret-like metadata names.

Recommended hardening:

- Either prove ledger metadata callers never pass secret-like metadata or extend ledger scrubber/test coverage to drop raw secret-like keys too.

## Judge Ambiguities

- Whether provider CLI should reject only parsed unsafe flags or fail on any unknown unsafe-looking flag passed to provider commands.
- Whether Phase 7 should require Playwright/browser walkthrough proof or accept component render tests plus API/CLI integration tests.
- Whether ledger metadata secret-like key scrubbing is Phase 7-owned hardening or already guaranteed by upstream caller contracts.

## Stop-If Risks

- Stop if hardening starts before Judge accepts which findings are Phase 7-owned.
- Stop if any fix adds unsupported routing modes, auth modes, hosted gateway requirements, or one `ProviderID` per registry row.
- Stop if tests, CLI output, docs, receipts, ledger metadata, or Provider Center state include prompt/response bodies or raw credential material.
- Stop if provider CLI hardening requires broad CLI refactor beyond unsafe input rejection and focused tests.
- Stop if browser walkthrough requires real provider secrets or live provider calls.
