# T003 Setup Contract

Decision: superseded by user correction.

This original setup contract incorrectly treated credential storage and API-key entry as forbidden. That is not the product requirement. SkillMall is a skill creator and needs configured LLM credentials to create skills. The corrected contract below is now authoritative for Phase 2.

## Approved Setup Modes

- `api_key`: Required first-class/default API access path for API-backed providers. Required field: API/provider credential value. SkillMall stores the value only in encrypted local/app-managed credential storage and returns only redacted status.
- `env_key`: Advanced/developer API access through an environment-variable reference. Required field: env var reference name. SkillMall stores only the reference name and metadata.
- `gateway_virtual_key_ref`: Optional local gateway virtual-key reference or app-managed gateway credential, only when clearly labeled as gateway access. Required fields: gateway credential/ref and, for local gateway/custom rows, endpoint/base URL.
- `local_cli_session`: Local tool/session access. Required field: model label when the row supports it. SkillMall must not silently copy credential files or ask users to paste credential-file contents.
- `none_local`: Local runtime/no-secret setup. Required fields: local endpoint when the row requires a runtime endpoint, plus model/manual model labels as appropriate.

## Required Field / Readiness Rules

- Planned-source-review rows are blocked for save and should say source review is required before live setup.
- API-backed provider rows default to `api_key` setup and need an app-managed credential before save is considered ready.
- API env-var rows remain available as an advanced/developer setup path and need an environment-variable-style reference name before save is considered ready.
- Gateway rows need a gateway virtual-key reference name; local Bifrost gateway rows also need a local endpoint.
- Local runtime rows need a local endpoint when the discovery plan requires one.
- Custom/OpenAI-compatible rows need a base URL and at least one model label/manual model label.
- Cloud/project scoped rows remain context-required; Phase 2 may explain the blocker but must not add project credential flows.
- Metadata-only rows may be accepted only as metadata/status guidance, not as direct executable providers.

## Save / Test / Refresh Sequencing

- Save credential setup first: encrypted app-managed credentials, reference names, endpoint metadata, model labels, and routing policy id as appropriate.
- Never return saved credential values after save; show only redacted status and source.
- Provide replace/rotate and delete/revoke-from-SkillMall actions as part of the credential lifecycle.
- Run safe status test after save or while inspecting a row; status tests are readiness checks, not prompt tests.
- Refresh models only when the selected provider row and draft/configured endpoint make refresh plausible.
- If refresh is disabled, explain the exact class of missing context: endpoint, account/project context, source review, local runtime, manual labels, or unsupported adapter.

## Prompt-Field Disposition

- `POST /api/providers/test` must become a strict safe status-test route.
- Approved route request body: `{ providerRegistryId?: string }`.
- Remove optional `prompt` from the schema.
- Reject unknown non-secret fields with `invalid_input`.
- Keep unsafe credential-source rejection before schema parsing so browser/session tokens, cookies, copied credential-file contents, credential-file paths, and nested variants still return `raw_secret_field_rejected`.
- Do not reject a clearly labeled top-level API/provider credential field when `configMode` is the approved API credential setup path.
- The route must not accept, store, echo, log, screenshot, or document prompt or response bodies.

## Allowed Product Files

- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ProviderCenter.tsx` only if required to pass current action/refresh/test state into setup guidance
- `components/skill-mall/providers/ModelRefreshPanel.tsx` only if required for clear sequencing copy
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `app/api/providers/test/route.ts`
- `app/api/providers/__tests__/providers-route.test.ts`
- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`
- `docs/reference/provider-catalog.md` only if provider-catalog terminology changes
- GoalBuddy state/notes for receipts

## Stop Conditions

- Stop if implementation treats "no credential storage" as the product goal.
- Stop if API access is not a first-class/default setup path for API-backed providers.
- Stop if credentials are stored in plaintext config, UI state, logs, API responses, screenshots, docs, tests, or GoalBuddy receipts.
- Stop before silently copying credential files, scraping browser sessions, or asking users to paste random browser/session blobs, cookies, copied browser tokens, credential-file contents, credential-file paths, prompt bodies, or response bodies.
- Stop before adding hosted dashboards or required extra-cost infrastructure.
- Stop if implementation reaches Phase 3 model polish, Phase 4 usage/cost expansion, Phase 5 policy UX, or Phase 6 catalog governance.
