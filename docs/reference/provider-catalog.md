# Provider Catalog

SkillMall supports 6 direct LLM providers plus the Phase 2 `bifrost_local` gateway backend. All providers implement the same `LLMClient` interface (`lib/providers/types.ts`) and are called through the router wrapper.

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
  operation?: string
  metadata?: Record<string, unknown>
}
```

## Router Auth Contract

The router stores secret references, not raw secrets. API access is separate from subscription, gateway, local runtime, or local tool-session auth:

- `env_key`: API access through an environment variable reference such as `OPENAI_API_KEY`. SkillMall stores the variable name only.
- `local_cli_session`: local provider tooling owns credentials, such as Claude Code CLI auth. SkillMall does not copy Claude Code credential files.
- `none_local`: local runtimes that require no credential, such as Ollama.
- `gateway_virtual_key`: local gateway access through an environment variable reference such as `BIFROST_VIRTUAL_KEY`. SkillMall stores the variable name only.

Executable gateway backends:

- `direct`: direct provider client execution.
- `bifrost_local`: local Bifrost gateway execution through SkillMall's router contract.

GoModel, LiteLLM, Portkey, TensorZero, new-api, aiproxy, GPT-Load, external hosted gateways, `codex_session`, `oauth_device_flow`, `keychain_ref`, and `file_ref` are not implemented runtime behavior in Phase 2.

## Phase 2 Model Refresh Contract

Phase 2 promotes model lists from static defaults to refreshable local metadata:

- Static provider defaults remain fallback labels only.
- Refreshed models are stored in `llm_models` with `provider_id`, `model_id`, `source`, `last_checked_at`, and sanitized raw metadata.
- Direct provider refresh uses official provider model-list endpoints where SkillMall already has API access.
- `bifrost_local` refresh uses the local Bifrost OpenAI-compatible `/v1/models` endpoint through a gateway virtual-key reference.
- Model refresh must not store provider API keys, gateway virtual keys, request headers, prompt bodies, or response bodies.
- Missing live model refresh does not remove static fallback models; it leaves the fallback catalog available with `modelSource: "fallback"`.

## Providers

### openai

- **Implementation:** `lib/providers/openai.ts`
- **SDK:** `openai` npm package
- **JSON mode:** supported via `response_format: { type: 'json_object' }`
- **Default model:** `gpt-5.1`
- **Available models:** `gpt-5.1`, `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1`
- **Auth:** `env_key` API access using `OPENAI_API_KEY`

### anthropic

- **Implementation:** `lib/providers/anthropic.ts`
- **SDK:** direct HTTP call to `https://api.anthropic.com/v1/messages`
- **JSON mode:** prompt-enforced
- **Default model:** `claude-sonnet-4-20250514`
- **Available models:** `claude-sonnet-4-20250514`, `claude-opus-4-1-20250805`
- **Auth:** `env_key` API access using `ANTHROPIC_API_KEY`

### claude-code

- **Implementation:** `lib/providers/claude-code.ts`
- **SDK:** none — invokes `claude` CLI binary as a child process via `execFile`
- **No Anthropic SDK. No HTTP calls to api.anthropic.com.**
- **JSON mode:** not natively supported — system prompt instructs JSON-only output
- **Default model:** `claude-sonnet-4-6`
- **Available models:** `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`
- **Auth:** `local_cli_session`; existing Claude Code CLI authentication owns credentials
- **Implementation detail:** `claude --print --model <model> <prompt>` — system prompt is prepended to user prompt since no separate flag exists

### gemini

- **Implementation:** `lib/providers/gemini.ts`
- **SDK:** `@google/generative-ai`
- **JSON mode:** supported via `responseMimeType: 'application/json'`
- **Default model:** `gemini-2.0-flash-exp`
- **Available models:** `gemini-2.0-flash-exp`, `gemini-1.5-pro`
- **Auth:** `env_key` API access using `GEMINI_API_KEY`

### groq

- **Implementation:** `lib/providers/groq.ts`
- **SDK:** `openai` npm package with Groq's base URL (`https://api.groq.com/openai/v1`)
- **JSON mode:** supported
- **Default model:** `llama-3.3-70b-versatile`
- **Available models:** `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`
- **Auth:** `env_key` API access using `GROQ_API_KEY`

### ollama

- **Implementation:** `lib/providers/ollama.ts`
- **SDK:** `openai` npm package with Ollama's base URL (`http://localhost:11434/v1`)
- **JSON mode:** supported (model-dependent)
- **Default model:** `llama3.1`
- **Available models:** any model pulled via `ollama pull`
- **Auth:** `none_local`; none required

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
  "model": "claude-sonnet-4-6",
  "providers": {
    "claude-code": {
      "model": "claude-sonnet-4-6",
      "authMode": "local_cli_session",
      "secretRef": { "type": "none" },
      "gatewayBackend": "direct"
    }
  }
}
```

With per-provider sections:
```json
{
  "provider": "openai",
  "model": "openai/gpt-4o-mini",
  "providers": {
    "openai": {
      "model": "openai/gpt-4o-mini",
      "authMode": "gateway_virtual_key",
      "secretRef": { "type": "gateway_virtual_key_ref", "name": "BIFROST_VIRTUAL_KEY" },
      "gatewayBackend": "bifrost_local",
      "baseURL": "http://localhost:8080/v1",
      "routingPolicyId": "policy-1"
    },
    "claude-code": {
      "model": "claude-sonnet-4-6",
      "authMode": "local_cli_session",
      "secretRef": { "type": "none" },
      "gatewayBackend": "direct"
    }
  }
}
```

Legacy `apiKey` fields in config JSON are ignored by the router config resolver. Configure API access with an environment variable reference instead.

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
4. Add setup instructions to `FALLBACK_PROVIDER_CATALOG` in `lib/providers/catalog.ts`
5. Choose one implemented router auth mode: `env_key`, `local_cli_session`, `none_local`, or `gateway_virtual_key`

The rest of the system (research engine, prompt engine, pipeline) works unchanged — all LLM calls go through the `LLMClient` interface.

## JSON Mode Handling

The pipeline uses `responseFormat: 'json_object'` for all structured extraction calls (research, framework selection, prompt optimization). Providers that don't natively support JSON mode (like `claude-code`) must handle this via the system prompt — the `ClaudeCodeClient` prepends the system prompt to the user prompt and relies on the prompt instructions to enforce JSON-only output.

If your provider doesn't support JSON mode natively, prepend `"You must return only valid JSON with no markdown fences or explanation."` to the system prompt in your `complete` implementation when `options?.responseFormat === 'json_object'`.

## Error Handling

All providers should throw a native `Error` on failure. The pipeline's retry logic catches these and retries once on JSON/Zod validation failures. For network errors or auth failures, the pipeline surfaces the error to the caller without retry — fix the configuration and retry the whole pipeline call.

Timeouts: the `ClaudeCodeClient` defaults to 120 seconds via `execFile`'s `timeout` option. API-based providers inherit the fetch timeout from the underlying SDK. If your provider consistently times out on large prompts, reduce `maxTokens` in the `CompletionOptions` defaults.
