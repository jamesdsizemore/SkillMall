# Configuring LLM Providers

SkillMall uses your own provider access through the Provider Center at `/settings/providers`. The Provider Center is the app settings surface for catalog status, configuration references, model refresh, provider tests, and usage/cost summaries.

SkillMall stores secret references, not raw secrets. API providers use environment variable names, Claude Code uses its local tool session, Ollama uses a local runtime with no credential, and local gateway access uses a gateway virtual-key reference.

Secret-reference names must be environment-variable-style names, not paths. `OPENAI_API_KEY` and `BIFROST_VIRTUAL_KEY` are valid references; `~/.codex/auth.json`, Claude credential-file paths, and copied session-token locations are rejected.

## Provider Catalog vs Executable Providers

The Provider Center has a broad `ProviderRegistryID` catalog. It includes OpenAI, Anthropic, Claude Code, Gemini, Groq, Ollama, OpenRouter, Alibaba/DashScope/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock, Azure OpenAI, Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM, Perplexity, DeepInfra, Cerebras, and custom OpenAI-compatible endpoints.

The executable direct/router `ProviderID` set remains narrower: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`. Registry-only rows can appear in Provider Center and CLI status output without becoming live direct clients.

Planned-source-review rows are visible but not live-callable until official evidence and adapter support are added. This currently includes Alibaba/DashScope/Qwen, Z.AI, Perplexity, DeepInfra until primary-source evidence is recorded, and ambiguous managed NVIDIA NIM variants.

## Executable Providers

| Provider | Auth mode | Recommended model |
|---|---|---|
| OpenAI API | `env_key` via `OPENAI_API_KEY` | gpt-4o |
| Claude API | `env_key` via `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| Claude Code CLI | `local_cli_session` | claude-sonnet-4-6 |
| Google Gemini | `env_key` via `GEMINI_API_KEY` | gemini-2.0-flash-exp |
| Groq | `env_key` via `GROQ_API_KEY` | llama-3.3-70b-versatile |
| Ollama | `none_local` | llama3.1 |

API access is separate from subscription or tool-session auth. ChatGPT Pro/Codex subscription auth is not OpenAI API access, and Claude account/Max auth is not Anthropic API access. Claude Code CLI auth is `local_tool_session`; SkillMall does not copy credential files.

## API Providers

Set the provider-specific API key in your shell or hosting environment, then configure SkillMall to reference that variable:

```bash
export OPENAI_API_KEY="your-openai-api-key"
npx skill-mall configure --provider openai --key-env OPENAI_API_KEY --model gpt-4o
```

```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
npx skill-mall configure --provider anthropic --key-env ANTHROPIC_API_KEY --model claude-sonnet-4-20250514
```

```bash
export GEMINI_API_KEY="your-gemini-api-key"
npx skill-mall configure --provider gemini --key-env GEMINI_API_KEY --model gemini-2.0-flash-exp
```

```bash
export GROQ_API_KEY="your-groq-api-key"
npx skill-mall configure --provider groq --key-env GROQ_API_KEY --model llama-3.3-70b-versatile
```

The web Provider Center uses the same contract: it records the environment variable name and status, never the API key value.

Provider Center also enforces the selected provider row's allowed auth modes. API providers use API-key references, Claude Code uses `local_cli_session`, Ollama uses `none_local`, and gateway virtual-key configuration is available only on rows that explicitly support gateway access.

## Claude Code CLI

Claude Code uses your locally authenticated `claude` CLI. SkillMall does not read or store Claude Code credential files.

```bash
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6
```

## Ollama

Ollama runs locally and does not require a credential.

```bash
ollama pull llama3.1
ollama serve
npx skill-mall configure --provider ollama --model llama3.1
```

## Provider Model Refresh and Tests

Model refresh follows each provider row's declared `discoveryStrategy`. SkillMall does not assume every provider has universal `/v1/models` support. OpenAI-compatible rows can probe the active configured endpoint or an explicitly supplied endpoint; unconfigured registry rows return `endpoint_required` instead of probing a default public endpoint. Provider-specific/cloud/local rows return the appropriate required-context status, manual rows use manual labels, and planned-source-review rows remain non-callable.

Provider tests are safe readiness/status checks. They report configuration, secret-reference presence, local runtime/tool availability, or planned-source-review status without sending prompts or echoing secrets.

```bash
npx skill-mall providers list
npx skill-mall providers status --provider openrouter
npx skill-mall providers refresh-models --provider openai --key-env OPENAI_API_KEY
npx skill-mall providers test --provider claude-code
```

## Optional Local Gateway

Bifrost local is an optional local gateway backend. It is not SkillMall's source of truth and is not required hosted infrastructure. Provider Center stores gateway references and local endpoint metadata while SkillMall keeps provider settings, model status, routing status, and usage/cost summaries in its own app surface.

## Config File

`npx skill-mall configure` writes non-secret configuration to `~/.skill-mall/config.json`.

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "providers": {
    "openai": {
      "model": "gpt-4o",
      "authMode": "env_key",
      "secretRef": { "type": "env", "name": "OPENAI_API_KEY" },
      "gatewayBackend": "direct"
    }
  }
}
```

Legacy `apiKey` fields are rejected or ignored by the Phase 3 Provider Center contracts. Use `--key-env` for API access.

## Switching Providers

```bash
npx skill-mall configure --provider groq --key-env GROQ_API_KEY --model llama-3.3-70b-versatile
```

The next pipeline run uses the configured provider. Skills already created are static files and are unaffected.

## Troubleshooting

**No LLM provider configured**: Run `npx skill-mall configure`.

**Missing API environment variable**: Set the provider-specific environment variable named in `secretRef.name`, then restart the process.

**Claude Code CLI times out**: Ensure the `claude` binary is in your PATH and authenticated.

**Ollama not responding**: Ensure `ollama serve` is running. Check with `curl http://localhost:11434/api/version`.
