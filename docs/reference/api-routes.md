# API Routes

All API routes use `Content-Type: application/json`. No authentication is required in the current local-development surface. All routes return structured error responses.

## Common Error Responses

| HTTP Status | `error` value | Meaning |
|---|---|---|
| 400 | `invalid_input` | Request body failed Zod validation |
| 503 | `provider_not_configured` | No LLM provider is configured |
| 422 | `invalid_skill_preview` | Preview generation did not produce a valid `SKILL.md` |
| 422 | `pipeline_failed` | LLM pipeline failed after retry |
| 500 | `internal_error` | Unexpected server error |

---

## GET /api/providers

Returns Provider Center-ready sanitized provider/router status and the broad provider registry catalog. This route returns secret reference display data only; it does not return raw API keys, subscription tokens, browser/session tokens, copied credentials, or local CLI credential file paths.

The returned catalog includes broad `ProviderRegistryID` rows for OpenAI, Anthropic, Claude Code, Gemini, Groq, Ollama, OpenRouter, Alibaba/DashScope/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock, Azure OpenAI, Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM, Perplexity, DeepInfra, Cerebras, and custom OpenAI-compatible endpoints. The configured `activeProvider` remains an executable `ProviderID` from the narrower direct/router set: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, or `ollama`.

Rows with `planned_source_review` status are visible but not live-callable. Phase 4 promotes Alibaba/DashScope/Qwen and Z.AI as configured OpenAI-compatible/source-backed-static rows, promotes Perplexity as a source-backed model/pricing catalog row with execution still gated, and promotes DeepInfra with a provider-specific model-list adapter plus OpenAI-compatible execution profile. Ambiguous managed NVIDIA NIM variants remain out of scope; the NIM row covers local/container runtime endpoints only.

**Response:**

```typescript
{
  configured: boolean          // true if a provider is configured
  activeProvider: string | null // executable ProviderID when configured
  activeProviderRegistryId: string | null
  executionKind: 'direct' | 'openai_compatible' | 'bifrost_local' | null
  activeModel: string | null
  authMode: 'env_key' | 'local_cli_session' | 'none_local' | 'gateway_virtual_key' | null
  gatewayBackend: 'direct' | 'bifrost_local'
  accessLabel: 'api_access' | 'local_tool_session' | 'local_runtime' | 'gateway_access' | null
  secretRef:
    | { type: 'env', name: string }
    | { type: 'gateway_virtual_key_ref', name: string }
    | { type: 'none' }
    | null
  secretStatus:
    | { type: 'env', name: string, valuePresent: boolean, source: 'reference_only' }
    | { type: 'gateway_virtual_key_ref', name: string, valuePresent: boolean, source: 'reference_only' }
    | { type: 'none', valuePresent: true, source: 'no_secret_required' }
    | null
  baseURL: string | null
  routingPolicyId: string | null
  warnings: string[]
  providers: Array<{
    id: string                 // broad ProviderRegistryID
    name: string
    accessModes: string[]
    accessLabel: string
    authLabel: string
    setupUrl: string
    officialSourceUrl: string
    discoveryStrategy: string
    status: 'active_configurable' | 'status_only' | 'planned_source_review'
    classification: string
    liveCallable: boolean
    executableProviderId: string | null
    gatewayProfile: object | null
    configStatus: {
      configured: boolean
      authMode: string | null
      gatewayBackend: string | null
      secretRef: object | null
      secretStatus: object | null
      baseURL: string | null
      routingPolicyId: string | null
    }
    modelStatus: {
      strategy: string
      source: string
      authoritative: boolean
      stale: boolean
      modelCount: number
      lastCheckedAt: string | null
      blocker: string | null
      models: string[]
      refresh: object
    }
    costStatus: {
      actual_cost_usd: null
      estimated_cost_usd: null
      note: string
    }
  }>
}
```

---

## POST /api/providers/configure

Writes non-secret provider configuration to `~/.skill-mall/config.json`. Existing executable providers persist as direct/router targets. Registry-only OpenAI-compatible rows can persist as registry execution targets through the shared OpenAI-compatible adapter by storing `provider: "openai"` as the implementation identity plus the broad `providerRegistryId` and `executionKind: "openai_compatible"`. This does not widen executable `ProviderID` support.

It does not write `.env.local`, does not mutate `process.env`, and rejects raw secret fields before writing config. Rejected fields include `apiKey`, `rawKey`, `token`, `sessionToken`, browser-token fields, and credential-file/path fields. Secret-reference names must be environment-variable-style names such as `OPENAI_API_KEY` or `BIFROST_VIRTUAL_KEY`; path-like names such as `~/.codex/auth.json` or `/Users/me/.claude/...` are rejected.

**Request body:**

```typescript
{
  providerRegistryId?: string  // broad ProviderRegistryID
  provider?: string            // executable ProviderID only when currently supported
  model?: string               // defaults to provider's default model
  manualModels?: string[]      // custom/manual metadata rows only
  configMode?: 'env_key' | 'gateway_virtual_key_ref' | 'local_cli_session' | 'none_local'
  authMode?: 'env_key' | 'local_cli_session' | 'none_local' | 'gateway_virtual_key'
  secretRef?:
    | { type: 'env', name: string }
    | { type: 'gateway_virtual_key_ref', name: string }
    | { type: 'none' }
  gatewayBackend?: 'direct' | 'bifrost_local'
  baseURL?: string              // bifrost_local must point to localhost, 127.0.0.1, or ::1
  routingPolicyId?: string
}
```

**Response:**

```typescript
{
  success: true
  persisted: boolean           // true only for executable provider writes
  providerRegistryId: string
  provider: string | null
  executionKind?: 'direct' | 'openai_compatible' | 'bifrost_local'
  model: string | undefined
  authMode: 'env_key' | 'local_cli_session' | 'none_local' | 'gateway_virtual_key'
  gatewayBackend: 'direct' | 'bifrost_local'
  secretRef:
    | { type: 'env', name: string }
    | { type: 'gateway_virtual_key_ref', name: string }
    | { type: 'none' }
    | null
  secretStatus: object | null
  baseURL: string | null
  routingPolicyId: string | null
  modelStatus?: object         // metadata-only registry/custom rows
}
```

API access is configured with `env_key` by storing the environment variable name, for example `{ "type": "env", "name": "OPENAI_API_KEY" }`. OpenAI-compatible registry execution requires an env secret reference and a configured base URL when the row does not have a safe default endpoint. Subscription/tool-session auth, such as Claude Code CLI, uses `local_cli_session` and SkillMall does not copy credential files. The requested `configMode` / `authMode` must match the selected Provider Center row: API providers cannot be configured as local sessions, local runtimes cannot be configured with API-key refs, and provider rows without gateway access cannot be configured with gateway virtual-key auth.

Phase 3 surfaces `bifrost_local` as the only approved optional local gateway backend. It uses `gateway_virtual_key` plus a `gateway_virtual_key_ref` environment-variable name, never a raw virtual key in the request body or config file. `bifrost_local` base URLs are intentionally restricted to localhost-class addresses. Bifrost local is not SkillMall's source of truth and is not a required hosted gateway. GoModel, LiteLLM proxy mode, hosted gateways, `codex_session`, `oauth_device_flow`, `keychain_ref`, `cheapest_compatible`, `quality_first`, and semantic routers remain unimplemented unless a later approved phase changes the contract.

---

## POST /api/providers/models/refresh

Refreshes or reports model discovery status for a provider registry row. The route only performs network discovery for supported/configured strategies. It does not assume every provider or custom endpoint supports `/v1/models`. OpenAI-compatible default endpoints are used only for the active configured row or when the request supplies an explicit `baseURL`; unconfigured registry rows return `endpoint_required` without probing their public default endpoints.

When discovery produces source-backed, manual, fallback, or live records, the route persists sanitized snapshots into `llm_models` with both `provider_registry_id` and `execution_kind`. Rows that are blocked for missing account/project/local/provider context return the blocker and write no snapshots.

**Request body:**

```typescript
{
  providerRegistryId?: string
  baseURL?: string              // optional configured endpoint for OpenAI-compatible rows
  manualModels?: string[]       // custom/manual model labels
}
```

**Response:**

```typescript
{
  providerRegistryId: string
  executableProviderId: string | null
  configured: boolean
  persisted: boolean
  modelStatus: {
    modelCount: number
    lastCheckedAt: string
    source: string
    executionKind: string
    blocker: string | null
  }
  discovery: {
    strategy: string
    status:
      | 'live'
      | 'endpoint_required'
      | 'provider_specific_required'
      | 'account_context_required'
      | 'cloud_project_context_required'
      | 'local_runtime_required'
      | 'secret_required'
      | 'source_backed_static'
      | 'manual_models'
      | 'static_fallback'
      | 'planned_source_review'
    source: 'live' | 'source_backed_static' | 'manual' | 'fallback' | 'none'
    authoritative: boolean
    models: string[]
    networkCalled: boolean
  }
  secretStatus: object | null
}
```

Planned-source-review rows return `planned_source_review` without probing or writing snapshots. Provider-specific, account-scoped, cloud-project-scoped, local-runtime, static fallback, source-backed static, and manual rows return their status contract unless a current adapter/configuration supports live discovery.

---

## POST /api/providers/test

Returns a safe provider configuration/status test. This route checks registry/config/secret-reference readiness and does not persist or echo prompt/response bodies. It rejects raw secret fields using the same secret boundary as `/api/providers/configure`.

**Request body:**

```typescript
{
  providerRegistryId?: string
  prompt?: string               // ignored for storage/response echoing
}
```

**Response:**

```typescript
{
  providerRegistryId: string
  executableProviderId: string | null
  configured: boolean
  status: 'ready' | 'missing_secret' | 'not_configured' | 'metadata_only' | 'planned_source_review'
  checks: Array<{ name: string, status: string }>
  authMode: string | null
  gatewayBackend: string | null
  secretStatus: object | null
}
```

---

## GET /api/providers/usage

Returns ledger-backed usage and cost summaries when the `llm_requests` table is available. The route explicitly labels provider/gateway-reported actual cost separately from locally estimated cost.

**Response:**

```typescript
{
  available: boolean
  summary: {
    request_count: number
    succeeded_count: number
    failed_count: number
    input_tokens: number
    output_tokens: number
    actual_cost_usd: number
    estimated_cost_usd: number
  }
  byProvider: Array<{
    provider_id: string
    request_count: number
    succeeded_count: number
    failed_count: number
    input_tokens: number
    output_tokens: number
    actual_cost_usd: number
    estimated_cost_usd: number
  }>
  costLabels: {
    actual_cost_usd: 'provider_or_gateway_reported_actual_cost'
    estimated_cost_usd: 'locally_estimated_cost'
  }
}
```

If the database or table is unavailable, the route returns `available: false` with zeroed summaries instead of failing the Provider Center.

---

## POST /api/providers/pricing/refresh

Refreshes local pricing snapshots from source-backed public data. The primary source is the MIT-licensed Portkey Models repository/static JSON. LiteLLM model pricing JSON is supported as fallback/reference data. This route does not require Portkey Gateway, LiteLLM proxy mode, hosted gateway credentials, or any paid external app.

**Request body:**

```typescript
{
  providerRegistryId?: string
  source?: 'portkey_models' | 'litellm_model_prices'
  modelIds?: string[]
}
```

**Response:**

```typescript
{
  refreshed: boolean
  source?: 'portkey_models' | 'litellm_model_prices'
  sourceUrl?: string
  sourceLicense?: string | null
  providerRegistryId?: string | null
  snapshotCount: number
  models: Array<{
    providerRegistryId: string
    modelId: string
    pricing: {
      inputPerMillion?: number
      outputPerMillion?: number
      cachedInputPerMillion?: number
      reasoningOutputPerMillion?: number
    }
    source: string
    sourceUrl?: string
    currency: 'USD'
    snapshotAt: string
  }>
}
```

Portkey prices are normalized from cents per token into USD per million tokens. LiteLLM prices are normalized from USD per token into USD per million tokens. Source failures return `refreshed: false` with an empty model list rather than breaking the Provider Center.

---

## POST /api/research

Run the Research Engine for a topic with optional source URLs.

**Request body:**

```typescript
{
  topic: string                // max 500 chars
  sourceUrls: string[]         // max 10 URLs; empty array uses training knowledge
}
```

**Response:** `ResearchResult` — see [research-result-schema.md](research-result-schema.md) for full schema.

**Error responses:**

```typescript
// 503 — provider not configured
{ error: 'provider_not_configured', setupUrl: '/settings/providers' }

// 422 — pipeline failed
{ error: 'pipeline_failed', message: string }
```

---

## POST /api/confirm-research

Run Stages 3–4 (Skill Builder + Prompt Engine) without writing to disk. Returns the preview.

**Request body:**

```typescript
{
  researchResult: ResearchResult      // from /api/research
  metadata: {
    slug: string                      // kebab-case, max 64 chars
    title?: string
    author?: string
    category: string
    tags: string[]
    targetAgents: string[]
  }
  selectedToolNames?: string[]        // subset of tool names; omit to include all
  selectedMetaTypes?: string[]        // subset of meta prompt IDs; omit to include all 5
  skillMdContent?: string             // reviewed SKILL.md content from /api/preview-skill
}
```

**Response:**

```typescript
{
  skillDirectory: InMemorySkillDirectory
  promptCount: number
  fileCount: number
  validation: {
    valid: boolean
    errors: Array<{ field: string; message: string; value?: string }>
    warnings: Array<{ field: string; message: string }>
  }
}
```

---

## POST /api/preview-skill

Run Stage 3 (Skill Builder) without prompt generation or disk write. Returns the generated in-memory skill directory so the wizard can show and edit the actual `SKILL.md` before prompt selection.

**Request body:** same as `/api/confirm-research`, except `selectedMetaTypes` is ignored and prompt files are not generated.

**Response:**

```typescript
{
  skillDirectory: InMemorySkillDirectory
  fileCount: number
  validation: {
    valid: boolean
    errors: Array<{ field: string; message: string; value?: string }>
    warnings: Array<{ field: string; message: string }>
  }
}
```

**Error responses:**

```typescript
// 422 — generated preview did not include a valid SKILL.md
{ error: 'invalid_skill_preview', message: string, validation: ValidationResult }

// 422 — pipeline error
{ error: 'pipeline_failed', message: string }
```

---

## POST /api/create-skill

Run Stages 3–5 and write the skill to disk. Same body as `/api/confirm-research`.

**Response:**

```typescript
{
  slug: string
  path: string          // absolute path to the written skill directory
  fileCount: number
  promptCount: number
}
```

**Error responses:**

```typescript
// 422 — validation failed (before disk write)
{ error: 'validation_failed', details: Array<{ field: string; message: string }> }

// 422 — pipeline error
{ error: 'pipeline_failed', message: string }
```

---

## POST /api/optimize-prompt

Audit any prompt text across 4 quality dimensions.

**Request body:**

```typescript
{
  prompt: string    // max 10,000 chars
}
```

**Response:** `PromptAudit`

```typescript
{
  tokenCountBefore: number
  tokenCountAfter: number
  tokenReductionPercent: number
  tokenEfficiencyScore: number          // 0-100
  intentDimensionsPresent: string[]
  intentDimensionsMissing: string[]
  intentSuggestions: Record<string, string>
  intentCompletenessScore: number       // 0-100
  outputClarityScore: number            // 0-100
  outputClarityIssues: string[]
  outputClarityPasses: boolean
  triggerSharpnessScore: number         // 0-100
  triggerSharpnessPasses: boolean
  triggerSuggestion: string | null
  optimizedPrompt: string
  optimizationFailed?: boolean          // true if LLM audit failed; unoptimized prompt returned
}
```
