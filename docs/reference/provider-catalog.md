# Provider Catalog

SkillMall supports 5 LLM providers. All providers implement the same `LLMClient` interface (`lib/providers/types.ts`).

## Interface

```typescript
interface LLMClient {
  complete(prompt: string, options?: CompletionOptions): Promise<string>
  readonly provider: ProviderID
}

interface CompletionOptions {
  maxTokens?: number
  temperature?: number
  responseFormat?: 'text' | 'json_object'
  systemPrompt?: string
  timeoutMs?: number
}
```

## Providers

### openai

- **Implementation:** `lib/providers/openai.ts`
- **SDK:** `openai` npm package
- **JSON mode:** supported via `response_format: { type: 'json_object' }`
- **Default model:** `gpt-4o`
- **Available models:** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- **Auth:** `SKILL_MALL_API_KEY` or `~/.skill-mall/config.json`

### claude-code

- **Implementation:** `lib/providers/claude-code.ts`
- **SDK:** none — invokes `claude` CLI binary as a child process via `execFile`
- **No Anthropic SDK. No HTTP calls to api.anthropic.com.**
- **JSON mode:** not natively supported — system prompt instructs JSON-only output
- **Default model:** `claude-sonnet-4-6`
- **Available models:** `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`
- **Auth:** existing Claude Code CLI authentication (no API key)
- **Implementation detail:** `claude --print --model <model> <prompt>` — system prompt is prepended to user prompt since no separate flag exists

### gemini

- **Implementation:** `lib/providers/gemini.ts`
- **SDK:** `@google/generative-ai`
- **JSON mode:** supported via `responseMimeType: 'application/json'`
- **Default model:** `gemini-2.0-flash-exp`
- **Available models:** `gemini-2.0-flash-exp`, `gemini-1.5-pro`
- **Auth:** `SKILL_MALL_API_KEY` or `~/.skill-mall/config.json`

### groq

- **Implementation:** `lib/providers/groq.ts`
- **SDK:** `openai` npm package with Groq's base URL (`https://api.groq.com/openai/v1`)
- **JSON mode:** supported
- **Default model:** `llama-3.3-70b-versatile`
- **Available models:** `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`
- **Auth:** `SKILL_MALL_API_KEY` or `~/.skill-mall/config.json`

### ollama

- **Implementation:** `lib/providers/ollama.ts`
- **SDK:** `openai` npm package with Ollama's base URL (`http://localhost:11434/v1`)
- **JSON mode:** supported (model-dependent)
- **Default model:** `llama3.1`
- **Available models:** any model pulled via `ollama pull`
- **Auth:** none required

## Config Resolution

```
process.env.SKILL_MALL_PROVIDER  (env var)
  ↓ fallback
~/.skill-mall/config.json         (CLI config file)
  ↓ fallback
ConfigError thrown
```

Config file format:
```json
{
  "provider": "claude-code",
  "model": "claude-sonnet-4-6"
}
```

With per-provider sections:
```json
{
  "provider": "openai",
  "providers": {
    "openai": { "apiKey": "sk-...", "model": "gpt-4o" },
    "claude-code": { "model": "claude-sonnet-4-6" }
  }
}
```

## Adding a New Provider

Implement the `LLMClient` interface in `lib/providers/<name>.ts`:

```typescript
export class MyProviderClient implements LLMClient {
  readonly provider = 'my-provider' as const  // extend ProviderID union

  constructor(config: ProviderConfig) { /* ... */ }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    // Call your provider's API
    // Return the text response as a string
  }
}
```

Then:
1. Add the provider ID to the `ProviderID` union in `lib/providers/types.ts`
2. Add a default model to `DEFAULT_MODELS` in `lib/providers/defaults.ts`
3. Add a case to `createLLMClient` in `lib/providers/index.ts`
4. Add setup instructions to `PROVIDER_CATALOG` in `app/api/providers/route.ts`

The rest of the system (research engine, prompt engine, pipeline) works unchanged — all LLM calls go through the `LLMClient` interface.

## JSON Mode Handling

The pipeline uses `responseFormat: 'json_object'` for all structured extraction calls (research, framework selection, prompt optimization). Providers that don't natively support JSON mode (like `claude-code`) must handle this via the system prompt — the `ClaudeCodeClient` prepends the system prompt to the user prompt and relies on the prompt instructions to enforce JSON-only output.

If your provider doesn't support JSON mode natively, prepend `"You must return only valid JSON with no markdown fences or explanation."` to the system prompt in your `complete` implementation when `options?.responseFormat === 'json_object'`.

## Error Handling

All providers should throw a native `Error` on failure. The pipeline's retry logic catches these and retries once on JSON/Zod validation failures. For network errors or auth failures, the pipeline surfaces the error to the caller without retry — fix the configuration and retry the whole pipeline call.

Timeouts: the `ClaudeCodeClient` defaults to 120 seconds via `execFile`'s `timeout` option. API-based providers inherit the fetch timeout from the underlying SDK. If your provider consistently times out on large prompts, reduce `maxTokens` in the `CompletionOptions` defaults.
