# T002 Source Evidence Map

Status: current-source evidence map recorded from `/Users/jamesdsizemore/Developer/skill-mall` on 2026-05-20.

## Commands

- `rg --files components/skill-mall/providers app/api/providers lib/providers lib/llm/router cli docs | rg "providers|provider|router|usage|cost|policy|model|configuring-providers|provider-catalog"`
- `rg -n "secretRef|credential|token|prompt|response|routingPolicy|modelStatus|usage|cost|ProviderRegistryID|ProviderID" components/skill-mall/providers app/api/providers lib/providers lib/llm/router cli docs`
- `rg --files cli/src | rg 'provider|policy|test'`
- `rg --files app/api/providers components/skill-mall/providers lib/llm/router lib/providers | rg '__tests__|test'`
- Targeted source scans for Provider Center actions, configure/test routes, registry/provider IDs, model refresh/capability status, routing simulation, usage/cost, CLI command safety, and test coverage.

## Provider Catalog

Source:

- `components/skill-mall/providers/ProviderCenter.tsx`
- `components/skill-mall/providers/ProviderCatalogList.tsx`
- `lib/providers/registry.ts`
- `lib/providers/types.ts`
- `docs/reference/provider-catalog.md`
- `docs/user/configuring-providers.md`

Evidence:

- `ProviderCenter.tsx` imports and renders `ProviderCatalogList`, `ProviderConfigPanel`, `ModelRefreshPanel`, `PolicyControlPanel`, and `UsageCostPanel`.
- `ProviderCatalogList.tsx` groups rows into API providers, local tools/sessions, local runtimes, gateway/OpenAI-compatible/custom, cloud/project providers, and planned/source-review rows.
- `lib/providers/types.ts` keeps executable `ProviderID` narrow: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, `ollama`.
- `lib/providers/registry.ts` contains the broad `PROVIDER_REGISTRY`, including gateway-compatible, cloud/project, source-backed, local runtime, and custom endpoint rows.
- `docs/reference/provider-catalog.md` documents the `ProviderRegistryID` versus `ProviderID` boundary and warns not to add broad rows to `ProviderID` without a real executable adapter.
- `docs/user/configuring-providers.md` documents the broad catalog and the narrow executable set.

Tests/proof:

- `components/skill-mall/providers/__tests__/provider-center.test.tsx` asserts Provider Center renders all catalog group labels.
- `app/api/providers/__tests__/providers-route.test.ts` asserts `GET /api/providers` returns broad sanitized catalog/status output.
- `lib/providers/__tests__/registry.test.ts`, `catalog.test.ts`, and `model-discovery.test.ts` cover provider registry/discovery contracts.

Gaps/unknowns:

- Current catalog grouping is source-backed, but the user workflow for choosing among many providers is not yet product-quality. That belongs to Phase 1/Phase 6, not Phase 0 code.

## Safe Configuration

Source:

- `components/skill-mall/providers/ProviderConfigPanel.tsx`
- `components/skill-mall/providers/ProviderCenter.tsx`
- `app/api/providers/configure/route.ts`
- `lib/llm/router/secret-refs.ts`
- `lib/llm/router/config.ts`
- `lib/providers/config-store.ts`
- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`

Evidence:

- Provider Center builds configuration payloads with `configMode`, `secretRef`, optional `baseURL`, `model`, `manualModels`, and `routingPolicyId`.
- Configure route rejects forbidden raw-secret field names before schema validation.
- Configure route uses strict `ConfigureBodySchema`, `sanitizeSecretRef`, `validateSecretRefForAuthMode`, `assertAuthModeAllowedForProvider`, and `assertLocalBifrostBaseURL`.
- Configure route rejects unsupported executable providers instead of widening `ProviderID`.
- Direct executable providers persist through `writeProviderConfig`; OpenAI-compatible registry rows persist through the generic OpenAI-compatible target when allowed.
- Metadata-only registry rows can return accepted metadata/discovery status without writing an executable provider config.
- User docs state SkillMall stores secret references, not raw secrets, and rejects path-like credential references.

Tests/proof:

- `app/api/providers/__tests__/providers-route.test.ts` covers raw secret rejection, path-like secret reference rejection, auth/access-mode mismatch rejection, env-key config, gateway virtual-key config, local CLI/session and local runtime config, custom OpenAI-compatible config, and registry target config.
- `components/skill-mall/providers/__tests__/provider-center.test.tsx` checks Provider Center does not render raw secret fields or unsafe credential prompts.

Gaps/unknowns:

- Current UI is form-like and label-heavy. Guided setup sequencing and clearer per-access-mode guidance belong to Phase 2.

## Provider Status/Test

Source:

- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `components/skill-mall/providers/ProviderCenter.tsx`
- `app/api/providers/test/route.ts`
- `cli/src/commands/providers.ts`
- `docs/user/configuring-providers.md`
- `docs/developer/cli-reference.md`

Evidence:

- Provider Center exposes a `TEST STATUS` action that calls `/api/providers/test`.
- Test route rejects raw secret fields and returns safe readiness/status data.
- CLI `providers test` exists and is documented as a safe readiness check.
- User docs state provider tests report configuration, secret-reference presence, local runtime/tool availability, or planned-source-review status without sending prompts or echoing secrets.

Tests/proof:

- `app/api/providers/__tests__/providers-route.test.ts` covers provider API behavior.
- `cli/src/commands/providers.test.ts` covers unsafe provider CLI input rejection.

Gaps/unknowns:

- Phase 0 should later verify whether test output is understandable enough for a normal user. If not, Phase 2/3 should own setup/status guidance improvements.

## Model Refresh

Source:

- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `app/api/providers/models/refresh/route.ts`
- `app/api/providers/route.ts`
- `lib/providers/model-discovery.ts`
- `lib/providers/model-sources.ts`
- `lib/llm/router/model-refresh.ts`
- `docs/user/configuring-providers.md`
- `docs/developer/cli-reference.md`

Evidence:

- Provider Center exposes `REFRESH MODELS`, model count, last checked timestamp, cache state, blocker, model labels, source, and authoritative/fallback status.
- `modelDiscoveryPlanForEntry()` marks whether refresh requires endpoint, provider adapter, account/project context, local runtime, manual models, or source review.
- `refreshProviderModelSource()` handles OpenAI-compatible, official-provider, account-scoped, cloud-project-scoped, local-runtime, manual, source-backed static, fallback, and planned-source-review strategies.
- Model refresh route persists normalized model/capability records when refresh succeeds.
- User docs explicitly say SkillMall does not assume universal `/v1/models` support.

Tests/proof:

- `app/api/providers/__tests__/providers-route.test.ts` covers live executable discovery, gateway discovery, cached model status, and registry-row behavior.
- `lib/providers/model-sources/__tests__/model-sources.test.ts`, `lib/providers/__tests__/model-discovery.test.ts`, and `lib/llm/router/__tests__/model-refresh.test.ts` cover model source/refresh behavior.
- `components/skill-mall/providers/__tests__/provider-center.test.tsx` asserts refresh is disabled for unconfigured endpoint-required rows.

Gaps/unknowns:

- The UI presents blockers, source, stale state, and labels, but it is not yet a full user workflow for resolving those blockers. That belongs to Phase 3.

## Capability And Blocker Interpretation

Source:

- `app/api/providers/route.ts`
- `lib/llm/router/model-capabilities.ts`
- `lib/llm/router/route-eligibility.ts`
- `components/skill-mall/providers/ModelRefreshPanel.tsx`
- `docs/user/configuring-providers.md`

Evidence:

- API status aggregates cached model capability sources, confidence labels, capable model count, and blockers.
- Capability metadata produces blockers such as unknown source, fallback-only, manual-only, account-scoped source, provider-specific source required, reference-only, stale metadata, and missing metadata.
- Route eligibility combines capability and pricing blockers.
- Provider Center shows capable models, capability confidence, and capability blockers.
- User docs explain reference metadata is not live account availability and does not by itself make a route candidate eligible.

Tests/proof:

- `lib/llm/router/__tests__/model-capabilities.test.ts` covers capability normalization.
- `lib/llm/router/__tests__/route-eligibility.test.ts` covers eligibility blockers.
- `lib/llm/router/__tests__/routing-policy-simulation.test.ts` covers eligibility blockers in simulations.

Gaps/unknowns:

- The app exposes blockers, but blocker-to-next-action UX is still thin. That belongs to Phase 3 and Phase 5 depending on whether the blocker is model/capability or route/policy related.

## Routing Policy

Source:

- `components/skill-mall/providers/PolicyControlPanel.tsx`
- `app/api/providers/policies/route.ts`
- `lib/llm/router/routing-policy.ts`
- `lib/llm/router/routing-policy-store.ts`
- `lib/llm/router/types.ts`
- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`

Evidence:

- Provider Center exposes policy ID, name, mode, operation, require-pricing, budget fields, save, activate, enable/disable, and simulate actions.
- API route exposes supported modes from `PHASE2_ROUTING_POLICY_MODES` and explicitly returns unsupported modes including `cheapest_compatible`, `quality_first`, and `semantic_router`.
- Routing policy store rejects forbidden raw-secret and prompt/response-like fields.
- Activation writes the selected policy id into current provider config instead of creating a separate active-policy source of truth.
- Docs describe supported policy modes and future unsupported modes.

Tests/proof:

- `app/api/providers/__tests__/providers-route.test.ts` covers policy route upsert/list/disable and rejection of prompt/raw-secret fields.
- `lib/llm/router/__tests__/routing-policy-store.test.ts` and `routing-policy.test.ts` cover policy store/evaluation.
- `components/skill-mall/providers/__tests__/provider-center.test.tsx` asserts unsupported modes are not rendered.

Gaps/unknowns:

- Current policy editor appears candidate-light and likely insufficient for multi-candidate user workflows. That belongs to Phase 5.

## Routing Simulation

Source:

- `components/skill-mall/providers/PolicyControlPanel.tsx`
- `components/skill-mall/providers/ProviderCenter.tsx`
- `app/api/providers/policies/simulate/route.ts`
- `lib/llm/router/routing-policy-simulation.ts`
- `lib/llm/router/route-eligibility.ts`
- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`

Evidence:

- Provider Center keeps `operation`, `requirePricing`, and `estimatedCostUsd` as top-level simulation fields.
- Simulation API rejects forbidden raw-secret/prompt-response fields and calls local `simulateRoutingPolicyDecision()`.
- Simulation result explicitly reports `providerRequestSent: false`, `promptStored: false`, and `responseStored: false`.
- Simulation includes selected/skipped/blocked attempts and route eligibility blockers.
- Docs state simulation is local-only and does not send provider requests or store prompts/responses.

Tests/proof:

- `components/skill-mall/providers/__tests__/provider-center.test.tsx` verifies operation and requirePricing stay top-level in simulation body.
- `lib/llm/router/__tests__/routing-policy-simulation.test.ts` verifies no provider request is sent, no prompt/response is stored, budget estimates can block, and capability/pricing blockers are returned.

Gaps/unknowns:

- Provider Center renders route eligibility text but does not yet provide a richer explainable policy simulation experience. That belongs to Phase 5.

## Usage, Cost, And Budget

Source:

- `components/skill-mall/providers/UsageCostPanel.tsx`
- `app/api/providers/usage/route.ts`
- `lib/llm/router/usage-summary.ts`
- `lib/llm/router/request-ledger.ts`
- `lib/llm/router/costing.ts`
- `lib/llm/router/pricing-refresh.ts`
- `docs/user/configuring-providers.md`
- `docs/reference/api-routes.md`

Evidence:

- Usage panel displays request counts, success/failure counts, token totals, actual cost, estimated cost, cost labels, selected provider health, top operations, and budget policy status.
- Usage API returns `getUsageSummary()` or safe unavailable summary.
- Usage summary aggregates by provider, model, operation, auth mode, route backend, routing policy, and budget policy.
- Cost labels distinguish provider/gateway-reported actual cost from local estimate.
- Request ledger starts, finishes, and records request events with scrubbed metadata.

Tests/proof:

- `components/skill-mall/providers/__tests__/provider-center.test.tsx` verifies actual and estimated usage cost labels are rendered distinctly.
- `lib/llm/router/__tests__/usage-summary.test.ts` covers aggregation behavior.
- `lib/llm/router/__tests__/request-ledger.test.ts` covers metadata scrubbing and ledger behavior.
- `lib/llm/router/__tests__/costing.test.ts` and `pricing-refresh.test.ts` cover costing/pricing.

Gaps/unknowns:

- Dashboard is summary-oriented and not yet a full usage/cost exploration surface. Filters/views and richer budget interpretation belong to Phase 4.

## Provider Expansion Governance

Source:

- `lib/providers/registry.ts`
- `lib/providers/types.ts`
- `docs/reference/provider-catalog.md`
- `docs/user/configuring-providers.md`
- `docs/recovery/2026-05-21-provider-center-product-roadmap-master-plan.md`

Evidence:

- Registry rows declare access modes, auth labels, setup URLs, official source URLs, discovery strategy, status, classification, live-callable state, optional executable provider id, gateway profile, fallback models, inclusion note, and evidence note.
- Docs define discovery strategies and require planned/source-review rows to remain non-callable until evidence and adapter support exist.
- The approved master roadmap assigns provider catalog expansion governance to Phase 6.

Tests/proof:

- `lib/providers/__tests__/registry.test.ts`, `catalog.test.ts`, and `model-discovery.test.ts` cover registry and discovery invariants.

Gaps/unknowns:

- Governance is documented but not yet a formal workflow/checklist/tooling surface. That belongs to Phase 6.

## Security And Privacy

Source:

- `app/api/providers/configure/route.ts`
- `app/api/providers/test/route.ts`
- `app/api/providers/policies/route.ts`
- `app/api/providers/policies/simulate/route.ts`
- `lib/llm/router/request-ledger.ts`
- `cli/src/commands/providers.ts`
- `cli/src/commands/provider-policies.ts`
- `docs/user/configuring-providers.md`
- `docs/developer/cli-reference.md`
- `docs/reference/api-routes.md`

Evidence:

- Configure/test routes reject raw secret fields before writing or returning status.
- Policy routes reject raw secret-like fields and prompt/response-like fields before policy operations.
- Request ledger metadata removes body/prompt/response/message-like keys, sensitive keys, and credential-like values.
- Provider and policy CLI commands reject raw keys, tokens, browser/session cookies, credential paths, prompts, messages, responses, and outputs.
- Docs preserve the boundary between API access, local tool/session auth, and subscription/account auth.

Tests/proof:

- `app/api/providers/__tests__/providers-route.test.ts` covers API rejection and no secret echo.
- `cli/src/commands/providers.test.ts` and `cli/src/commands/provider-policies.test.ts` cover unsafe CLI input rejection.
- `lib/llm/router/__tests__/request-ledger.test.ts` covers metadata scrubbing.
- Provider Center test verifies no raw secret fields or unsafe credential prompts render.

Gaps/unknowns:

- No Phase 0 product-code gap. Later UX phases must keep these boundaries visible and must not degrade them.

## Semantic Drift Risks

- Treating a broad `ProviderRegistryID` row as a direct executable `ProviderID`.
- Treating reference/static/fallback model metadata as live account availability.
- Treating missing or stale price as free.
- Treating local simulation as a provider request.
- Treating Phase 0 as permission to redesign the Provider Center.
- Reopening broad OSS gateway research instead of auditing the current SkillMall-owned product surface.
- Turning Bifrost, LiteLLM, Portkey, or any other open-source project into a separate required dashboard rather than an integrated optional input/backend.

## Scout Additions

- All ten required workflows have current-source evidence.
- Main gaps are product clarity and partial UI proof, not missing provider/auth/router substrate.
- CLI parity source/docs/tests exist, but detailed CLI test-body proof should be verified before the audit report treats CLI coverage as high confidence.
- Provider status/test route accepts an optional prompt-shaped field while intentionally not using or echoing it; the final audit should decide whether this is merely safe-but-confusing or a later UX/API cleanup candidate.
- Artifact names use `2026-05-21`; local execution timestamps in this run are still `2026-05-20` America/Los_Angeles. Final report should treat that as timezone/artifact-label context rather than a product blocker.
