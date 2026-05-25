# T002 Source Revalidation

Decision: superseded by required-credential correction.

Current source evidence:

- `AGENTS.md` requires reading relevant `node_modules/next/dist/docs/` guidance before code edits because this repo's Next.js version may differ from assumptions.
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` confirms interactive UI entrypoints need `'use client'` and client component props must be serializable. `ProviderCenter.tsx` already owns the client boundary; `ProviderConfigPanel.tsx` is imported beneath that boundary.
- `ProviderConfigPanel.tsx` is still field-centric. It has mode buttons, reference fields, endpoint/model/manual-model/routing-policy fields, setup source, and terse model/gateway copy, but no required first-class API credential setup, encrypted credential lifecycle, per-mode requirement checklist, or readiness preview.
- `ProviderCenter.tsx` owns selected provider, draft state, configure/test/refresh/pricing/policy state, and sends `/api/providers/test` with only `{ providerRegistryId }`.
- `ModelRefreshPanel.tsx` owns status-test and model-refresh buttons. Refresh disabled state is based on `refreshReady`; status test is only disabled while running.
- `app/api/providers/test/route.ts` currently accepts `providerRegistryId` and optional `prompt` via `.passthrough()`, rejects unsafe credential-looking field names before parsing, does not call `fetch`, and returns safe readiness/status metadata.
- `app/api/providers/__tests__/providers-route.test.ts` currently proves prompt is ignored by sending `prompt: 'do not persist me'`; this is the only provider-test dependency found that sends `prompt`.
- `docs/reference/api-routes.md` still documents optional `prompt` on `POST /api/providers/test`.
- `docs/user/configuring-providers.md` already says provider tests do not send prompts or echo secrets.

Prompt-field disposition evidence:

- Product UI does not depend on `prompt` for provider status tests.
- Current route accepts `prompt` only because the schema is passthrough and includes it as optional.
- Current docs expose optional `prompt`, which conflicts with Phase 2's safe status-test-only contract.
- Route can be tightened by keeping raw-secret rejection before parsing, replacing the passthrough schema with a strict schema that only accepts `providerRegistryId`, and updating tests/docs.

Implementation implications for T003:

- Approve required credential setup UX in `ProviderConfigPanel.tsx`, with minimal `ProviderCenter.tsx` prop additions only if sequencing/readiness copy needs current test/refresh state.
- Approve `POST /api/providers/test` strict request contract: no `prompt`, no unknown fields, raw-secret rejection remains first.
- Keep `ModelRefreshPanel.tsx` unchanged unless browser/source evidence shows refresh/test sequencing copy cannot be explained from `ProviderConfigPanel.tsx`.
- Do not treat credential configuration as optional. Add secure app-managed credential storage/use only through the corrected product contract. Continue forbidding browser-session scraping, silent credential-file copying, random session blobs, cookies, credential-file contents, credential-file paths, prompt bodies, and response bodies.
