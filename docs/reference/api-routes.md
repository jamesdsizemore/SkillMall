# API Routes

All API routes use `Content-Type: application/json`. No authentication is required in the current local-development surface. All routes return structured error responses.

## Common Error Responses

| HTTP Status | `error` value | Meaning |
|---|---|---|
| 400 | `invalid_input` | Request body failed Zod validation |
| 503 | `provider_not_configured` | No LLM provider is configured |
| 422 | `pipeline_failed` | LLM pipeline failed after retry |
| 500 | `internal_error` | Unexpected server error |

---

## GET /api/providers

Returns sanitized provider/router status and the full provider catalog. This route returns secret reference display data only; it does not return raw API keys, subscription tokens, browser/session tokens, or local CLI credential files.

**Response:**

```typescript
{
  configured: boolean          // true if a provider is configured
  activeProvider: string | null
  activeModel: string | null
  authMode: 'env_key' | 'local_cli_session' | 'none_local' | 'gateway_virtual_key' | null
  gatewayBackend: 'direct' | 'bifrost_local'
  accessLabel: 'api_access' | 'local_cli_session' | 'local_no_auth' | 'gateway_virtual_key'
  secretRef:
    | { type: 'env', name: string }
    | { type: 'gateway_virtual_key_ref', name: string }
    | { type: 'none' }
    | null
  baseURL: string | null
  routingPolicyId: string | null
  warnings: string[]
  providers: Array<{
    id: string                 // 'openai' | 'anthropic' | 'claude-code' | 'gemini' | 'groq' | 'ollama'
    name: string
    requiresApiKey: boolean
    defaultModel: string
    availableModels: string[]
    setupUrl: string
    setupInstructions: string
  }>
}
```

---

## POST /api/providers/configure

Writes non-secret provider configuration to `~/.skill-mall/config.json`. It does not write `.env.local`, does not mutate `process.env`, and does not accept raw API key request bodies.

**Request body:**

```typescript
{
  provider: string             // provider ID
  model?: string               // defaults to provider's default model
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
  provider: string
  model: string | undefined
  authMode: 'env_key' | 'local_cli_session' | 'none_local' | 'gateway_virtual_key'
  gatewayBackend: 'direct' | 'bifrost_local'
  secretRef:
    | { type: 'env', name: string }
    | { type: 'gateway_virtual_key_ref', name: string }
    | { type: 'none' }
    | null
  baseURL: string | null
  routingPolicyId: string | null
}
```

API access is configured with `env_key` by storing the environment variable name, for example `{ "type": "env", "name": "OPENAI_API_KEY" }`. Subscription/tool-session auth, such as Claude Code CLI, uses `local_cli_session` and SkillMall does not copy credential files.

Phase 2 supports `bifrost_local` as the only approved gateway backend. It uses `gateway_virtual_key` plus a `gateway_virtual_key_ref` environment-variable name, never a raw virtual key in the request body or config file. `bifrost_local` base URLs are intentionally restricted to localhost-class addresses. GoModel, LiteLLM proxy mode, hosted gateways, `codex_session`, `oauth_device_flow`, `keychain_ref`, `cheapest_compatible`, `quality_first`, and semantic routers remain unimplemented unless a later approved phase changes the contract.

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
