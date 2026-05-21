# T003 IA Contract

**Decision:** Approved for Worker implementation.

**Judge mode:** A Judge subagent was attempted but did not return in a useful window and was shut down. PM recorded this inline Judge contract from the T002 source evidence and the approved Phase 1 implementation plan.

## Approved Phase 1 IA Contract

Phase 1 may reorganize and relabel the existing Provider Center surface around these sections:

1. **Catalog**
   - Keep broad provider groups scanable.
   - Preserve API providers, local tools/sessions, local runtimes, gateway/OpenAI-compatible/custom, cloud/project, and planned/source-review grouping.
   - Clarify direct executable, registry/configurable, metadata/status-only, local runtime, local session/tool, cloud/project, and source-review states.

2. **Selected Provider Context**
   - Add a clearer selected-provider summary near the top of the detail pane.
   - Show provider name, access type, execution boundary, configuration state, model source/cache state, and safe next action.
   - Make clear that broad registry rows are not automatically direct executable providers.

3. **Setup Stage**
   - Keep existing safe reference fields.
   - Improve labels and helper text for API access, local session, local runtime, gateway reference, OpenAI-compatible endpoint, cloud/project row, and source-review row.
   - Do not add guided setup flows or new validation behavior beyond UI labels/states.

4. **Model And Status Stage**
   - Keep existing model refresh/test behavior.
   - Improve empty/loading/disabled/error/blocked/stale/fallback/reference labels.
   - Do not change model refresh strategy or endpoint probing behavior.

5. **Routing Policy Stage**
   - Keep existing supported policy controls visible.
   - Label the stage as an existing local policy surface, not a new policy builder.
   - Do not add candidates, modes, automatic routing, cheapest/quality/semantic routing, or simulation depth.

6. **Usage And Cost Stage**
   - Keep existing usage/cost summary visible.
   - Clarify actual cost versus local estimate.
   - Do not add filters, dashboard expansion, hosted observability, billing claims, or prompt/response storage.

7. **Responsive Layout**
   - Desktop must keep catalog and selected-provider detail usable without overlap.
   - Mobile must stack catalog, selected-provider context, and workflow stages without text clipping.

## Allowed Files For Worker

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderCatalogList.tsx`
- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `components/skill-mall/providers/PolicyControlPanel.tsx`
- `components/skill-mall/providers/UsageCostPanel.tsx`
- `components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `docs/user/configuring-providers.md`
- `docs/reference/provider-catalog.md`
- `docs/goals/provider-center-product-phase1/state.yaml`
- `docs/goals/provider-center-product-phase1/notes/**`

## Stop Conditions

- Any API, router, provider registry, CLI, database, or executable-provider file edit.
- Any new provider, auth mode, routing mode, gateway dependency, OAuth/device flow, credential storage, or executable adapter.
- Any widening of `ProviderID`.
- Any UI that implies raw API keys, copied tokens, browser/session cookies, credential files, credential paths, prompt bodies, or response bodies are accepted or stored.
- Any implementation that treats reference/static/fallback model metadata as live account availability.
- Any implementation that treats missing/stale pricing as free.
- Any implementation that turns Phase 1 into Phase 2 setup guidance, Phase 3 model refresh behavior, Phase 4 dashboard expansion, Phase 5 policy builder/simulation depth, or Phase 6 provider governance.

## Required Worker Proof

- Provider Center tests must cover selected-provider context, workflow stage labels, safe access-mode language, unsupported mode hiding, and no raw secret/token/credential prompts.
- Browser proof must check desktop and mobile layouts for readable provider catalog, selected-provider context, and stage ordering.
- Final verification must classify any scan hits for `raw API key`, `browser token`, `session token`, `credential file`, `credential path`, `prompt body`, and `response body` as constraints only.
