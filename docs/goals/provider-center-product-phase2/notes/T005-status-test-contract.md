# T005 Safe Status-Test Contract

Decision: pass.

Changed files:

- `app/api/providers/test/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`

What changed:

- `POST /api/providers/test` now accepts only `{ providerRegistryId?: string }`.
- Removed optional `prompt` from the accepted request schema.
- Changed schema from passthrough to strict so unknown non-secret fields return `invalid_input`.
- Preserved raw-secret rejection before schema parsing so raw secret-like inputs still return `raw_secret_field_rejected`.
- Updated the success message to state prompt/response bodies are not accepted, stored, or echoed.
- Added tests proving status tests still return safe readiness metadata, prompt fields are rejected, and raw-secret rejection wins before strict parsing.

Verification:

- `npm test -- app/api/providers` passed: 1 file, 35 tests.
- `rg -n "prompt|response|raw_secret_field_rejected|invalid_input" app/api/providers/test/route.ts app/api/providers/__tests__/providers-route.test.ts` shows only the strict status-test contract, safety assertions, and unrelated policy prompt/response safety tests.

Scope check:

- No configure-route behavior changed.
- No prompt body or response body is accepted, stored, echoed, logged, or snapshotted by the status-test route.
- No raw-secret rejection was weakened.
