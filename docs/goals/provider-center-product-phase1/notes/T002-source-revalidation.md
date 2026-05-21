# T002 Source Revalidation

**Decision:** Source revalidation complete. Proceed to Judge IA contract.

## Current Source Facts

- `AGENTS.md` requires reading relevant Next.js docs under `node_modules/next/dist/docs/` before writing code.
- `ProviderCenter.tsx` is already a client component with `"use client"` and owns state, effects, provider selection, draft config, refresh, pricing, test, policy, and simulation actions.
- Current visible structure is two-column: `ProviderCatalogList` on the left and `ProviderConfigPanel`, `ModelRefreshPanel`, `PolicyControlPanel`, and `UsageCostPanel` on the right.
- `ProviderCatalogList.tsx` already groups broad catalog rows into API providers, local tools/sessions, local runtimes, gateway/OpenAI-compatible/custom, cloud/project providers, and planned/source-review rows.
- `ProviderConfigPanel.tsx` exposes safe reference-only configuration controls: env var ref, gateway virtual-key ref, local session, no-secret local mode, base URL, model label, manual model labels, and routing policy id.
- `ModelRefreshPanel.tsx` exposes source/fallback status, active model, model count, secret-reference status, last checked, cache state, blocker, capability confidence, capability blockers, model labels, refresh, and safe status test actions.
- `PolicyControlPanel.tsx` exposes only supported policy modes and maps OpenAI-compatible registry rows through the generic `openai` executable adapter with `executionKind: openai_compatible` when applicable.
- `UsageCostPanel.tsx` exposes pricing refresh, actual versus estimated cost, selected provider health, top operations, and budget-policy status.
- `ProviderID` remains narrow in `lib/providers/types.ts`: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`.
- `ProviderRegistryID` is broader and includes registry rows that must not be treated as direct executable providers.
- `docs/user/configuring-providers.md` and `docs/reference/provider-catalog.md` preserve the catalog-vs-executable split and safe secret-reference boundary.

## Next.js Docs Read

- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
  - Interactive UI with state/effects/events belongs behind a `'use client'` boundary.
  - The directive only needs to exist at client entry points; current `ProviderCenter.tsx` is the entry point.
  - Client-component props must be serializable across the server/client boundary.
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
  - Tailwind utility classes are supported; this phase should continue local Tailwind styling instead of adding styling frameworks.

## Safety And Privacy Constraints

- API access is reference-only. The UI may name environment variable references but must not accept raw API key values.
- Claude Code remains local tool/session access; SkillMall must not read or store credential files.
- ChatGPT Pro/Codex subscription auth is not OpenAI API access.
- Claude account/Max auth is not Anthropic API access.
- Provider tests are safe status checks, not prompt execution surfaces.
- No prompt or response bodies may be stored, echoed, screenshotted, or added to receipts.

## IA Risks For Judge

- Existing policy, pricing, and usage controls are visible. Phase 1 may reorganize and label them as existing surfaces, but must not deepen them into Phase 4/5 feature delivery.
- Cloud/project rows can be selected, but Phase 1 must not invent a project/resource setup flow.
- OpenAI-compatible/gateway rows can be clarified, but Phase 1 must not widen `ProviderID`.
- Many non-executable registry rows are active/configurable through generic or metadata/status behavior; IA language must distinguish registry/configurable from direct executable.

## Commands

- `sed -n '1,260p' AGENTS.md`
- `rg --files components/skill-mall/providers app/api/providers lib/providers docs/user docs/reference node_modules/next/dist/docs | rg 'Provider|provider|providers|next'`
- `rg -n "ProviderCenter|ProviderCatalogList|ProviderConfigPanel|ModelRefreshPanel|PolicyControlPanel|UsageCostPanel|secretRef|ProviderRegistryID|ProviderID|prompt|response" components/skill-mall/providers app/api/providers lib/providers docs`
- `sed -n '1,260p' components/skill-mall/providers/ProviderCenter.tsx`
- `sed -n '260,780p' components/skill-mall/providers/ProviderCenter.tsx`
- `sed -n '1,280p' components/skill-mall/providers/ProviderCatalogList.tsx`
- `sed -n '1,320p' components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `sed -n '320,640p' components/skill-mall/providers/__tests__/provider-center.test.tsx`
- `sed -n '1,260p' components/skill-mall/providers/ProviderConfigPanel.tsx`
- `sed -n '1,260p' components/skill-mall/providers/ModelRefreshPanel.tsx`
- `sed -n '1,320p' components/skill-mall/providers/PolicyControlPanel.tsx`
- `sed -n '320,700p' components/skill-mall/providers/PolicyControlPanel.tsx`
- `sed -n '1,260p' components/skill-mall/providers/UsageCostPanel.tsx`
- `sed -n '1,220p' lib/providers/types.ts`
- `sed -n '1,220p' docs/user/configuring-providers.md`
- `sed -n '1,220p' docs/reference/provider-catalog.md`
- `sed -n '1,120p' node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
- `sed -n '1,120p' node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
