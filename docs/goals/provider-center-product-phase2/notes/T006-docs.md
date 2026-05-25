# T006 Documentation

Decision: superseded by required-credential correction.

Changed files:

- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`

What changed:

- User docs currently describe the original Phase 2 setup guidance: selected setup mode, required fields, readiness state, and safe save/status-test/model-refresh order.
- These docs are incomplete under the corrected contract because API-backed providers need first-class/default in-app credential setup, encrypted local/app-managed storage, redaction, replacement/rotation, delete/revoke-from-SkillMall behavior, and runtime use by SkillMall skill creation.
- User docs now state provider tests do not accept prompts, send prompts, store prompts, store responses, or echo secrets.
- API reference now documents `POST /api/providers/test` as strict status-test input with only `providerRegistryId`.
- API reference now documents unknown fields as `invalid_input` and raw secret-like fields as `raw_secret_field_rejected` first.

Verification:

- `rg -n "safe setup|environment variable|gateway virtual-key|local session|local runtime|status test|prompt|response|credential" docs/user/configuring-providers.md docs/reference/api-routes.md docs/reference/provider-catalog.md` confirms docs cover the safe setup contract.
- A corrected scan must allow approved API/provider credential setup language and reject browser-session blob, cookie, credential-file-content, credential-path, prompt-body, and response-body setup instructions.

Scope check:

- Docs do not claim Phase 3 model polish, Phase 4 usage/cost expansion, Phase 5 policy UX, or Phase 6 catalog governance is newly implemented by Phase 2.
- Docs must not describe credential configuration as optional or forbidden. They must preserve the forbidden boundary around browser-session scraping, silent credential-file copying, random session blobs, cookies, credential-file contents, credential-file paths, hosted dashboards, and prompt/response storage.
