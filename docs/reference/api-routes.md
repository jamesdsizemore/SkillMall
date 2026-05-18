# API Routes

All API routes use `Content-Type: application/json`. No authentication is required in Phase 1 (local development). All routes return structured error responses.

## Common Error Responses

| HTTP Status | `error` value | Meaning |
|---|---|---|
| 400 | `invalid_input` | Request body failed Zod validation |
| 503 | `provider_not_configured` | No LLM provider is configured |
| 422 | `pipeline_failed` | LLM pipeline failed after retry |
| 500 | `internal_error` | Unexpected server error |

---

## GET /api/providers

Returns the current provider configuration and the full provider catalog.

**Response:**

```typescript
{
  configured: boolean          // true if a provider is configured
  activeProvider: string | null
  activeModel: string | null
  providers: Array<{
    id: string                 // 'openai' | 'claude-code' | 'gemini' | 'groq' | 'ollama'
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

Write provider configuration to `.env.local` (development only).

**Request body:**

```typescript
{
  provider: string             // provider ID
  apiKey?: string              // omit for claude-code and ollama
  model?: string               // defaults to provider's default model
}
```

**Response:**

```typescript
{
  success: true
  provider: string
  model: string | undefined
}
```

**Note:** in production (`NODE_ENV=production`), returns 400 with `{ error: 'use_env_vars' }` — set environment variables in your hosting dashboard instead.

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
