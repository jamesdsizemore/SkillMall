# Configuring LLM Providers

SkillMall uses your own provider access through the Provider Center at `/settings/providers`. The Provider Center is the app settings surface for catalog status, configuration references, model refresh, provider tests, and usage/cost summaries.

SkillMall stores secret references, not raw secrets. API providers use environment variable names, OpenAI Codex uses a Codex app-server auth session object, Claude Code can use either its local tool session or an app-managed setup-token secret reference, Ollama uses a local runtime with no credential, and local gateway access uses a gateway virtual-key reference.

Secret-reference names must be environment-variable-style names, not paths. `OPENAI_API_KEY` and `BIFROST_VIRTUAL_KEY` are valid references; `~/.codex/auth.json`, Claude credential-file paths, and copied session-token locations are rejected.

## Provider Center Workflow

The Provider Center is organized around the way a user evaluates a provider row:

- **Provider catalog:** Select a broad catalog row and see whether it is API access, provider account auth, local tool/session access, local runtime, gateway/OpenAI-compatible access, cloud/project scoped, custom endpoint, or source-review only.
- **Selected provider:** Review the selected row's access type, execution boundary, setup state, model source, registry row ID, executable `ProviderID` mapping when one exists, and safe next action.
- **Safe setup:** Configure environment-variable references, gateway virtual-key references, local session/runtime choices, endpoints, model labels, manual model labels, and routing-policy IDs without storing raw provider secrets.
- **Model and status:** Inspect model source, cache freshness, blockers, capability confidence, safe status tests, and refresh availability.
- **Local routing policy:** Edit only currently supported local policy modes. Future cheapest, quality, semantic, learned, complexity, and eval routing modes remain blocked until separately approved.
- **Usage and cost:** Review local ledger summaries. Actual cost is provider/gateway reported; estimated cost is a local SkillMall estimate, not invoice reconciliation.

These sections are workflow labels over the current Provider Center capabilities. They do not widen executable provider support or change provider/router behavior.

## Provider Catalog vs Executable Providers

The Provider Center has a broad `ProviderRegistryID` catalog. It includes OpenAI, OpenAI Codex, Anthropic, Claude Code, Gemini, Groq, Ollama, OpenRouter, Alibaba/DashScope/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock, Azure OpenAI, Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM, Perplexity, DeepInfra, Cerebras, and custom OpenAI-compatible endpoints.

The executable direct/router `ProviderID` set remains narrower: `openai`, `codex`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`. Registry-only rows can appear in Provider Center and CLI status output without becoming direct clients.

OpenAI-compatible registry rows such as OpenRouter, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, xAI, Together AI, Cerebras, DeepInfra, Alibaba/DashScope/Qwen, Z.AI, and custom endpoints execute through a generic SkillMall-owned OpenAI-compatible target. They do not get added as one-off `ProviderID` values.

Planned-source-review rows are visible but not live-callable until official evidence and adapter support are added. Phase 4 promotes Alibaba/DashScope/Qwen and Z.AI as source-backed/configured OpenAI-compatible rows, Perplexity as a source-backed catalog row with execution still gated, and DeepInfra as a provider-specific model-list row with OpenAI-compatible execution profile. Ambiguous managed NVIDIA NIM variants remain out of scope.

## Executable Providers

| Provider | Auth mode | Recommended model |
|---|---|---|
| OpenAI API | `env_key` via `OPENAI_API_KEY` | gpt-4o |
| OpenAI Codex | `codex_app_server` via Codex app-server account auth | gpt-5.4 |
| Claude API | `env_key` via `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| Claude Code CLI | `local_cli_session` or `claude_setup_token` | claude-sonnet-4-6 |
| Google Gemini | `env_key` via `GEMINI_API_KEY` | gemini-2.0-flash-exp |
| Groq | `env_key` via `GROQ_API_KEY` | llama-3.3-70b-versatile |
| Ollama | `none_local` | llama3.1 |

API access is separate from subscription or tool-session auth. ChatGPT Pro/Codex subscription auth is not OpenAI API access, and Claude account/Max auth is not Anthropic API access. SkillMall does not copy Codex or Claude credential files, browser cookies, or session blobs.

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

Provider Center also enforces the selected provider row's allowed auth modes. API providers use API-key references, OpenAI Codex uses `codex_app_server`, Claude Code uses `local_cli_session` or `claude_setup_token`, Ollama uses `none_local`, and gateway virtual-key configuration is available only on rows that explicitly support gateway access.

## OpenAI Codex Account Auth

OpenAI Codex account auth is not an OpenAI API key. In Provider Center, the `openai_codex` row starts a Codex app-server auth session and renders the returned first-class auth object:

- browser login returns an `authUrl`;
- device-code login returns `verificationUrl` plus `userCode`;
- the session is tracked by `flowId` and Codex app-server `loginId`;
- completion is tied to Codex app-server login completion state, not a blind `codex login status` check.

SkillMall starts the Codex app-server with an isolated `CODEX_HOME` under `~/.skill-mall/codex-home` and clears API-key env vars for that process. Do not paste ChatGPT browser tokens, Codex credential-file contents, cookies, or copied session blobs into Provider Center.

## OpenAI-Compatible Registry Providers

For registry providers that expose an OpenAI-compatible chat API, configure an environment variable reference and a base URL. SkillMall stores the target as `providerRegistryId` plus `executionKind: "openai_compatible"` in `~/.skill-mall/config.json`; it does not add a new `ProviderID` for each provider.

```json
{
  "provider": "openai",
  "activeProviderRegistryId": "openrouter",
  "model": "openai/gpt-5-mini",
  "providerTargets": {
    "openrouter": {
      "provider": "openai",
      "providerRegistryId": "openrouter",
      "executionKind": "openai_compatible",
      "model": "openai/gpt-5-mini",
      "authMode": "env_key",
      "secretRef": { "type": "env", "name": "OPENROUTER_API_KEY" },
      "gatewayBackend": "direct",
      "baseURL": "https://openrouter.ai/api/v1"
    }
  }
}
```

Provider rows that require user-specific regional/account endpoints, such as Alibaba/DashScope/Qwen and Z.AI, must be configured with an explicit base URL. SkillMall still uses source-backed static/manual model labels unless an official durable model-list endpoint is proven.

## Claude Code CLI

Claude Code has two supported Provider Center paths:

- `local_cli_session`: use your locally authenticated `claude` CLI. SkillMall does not read or store Claude Code credential files.
- `claude_setup_token`: paste a Claude setup-token into the setup-token control. SkillMall stores it in the app-managed encrypted provider secret store and writes only a stored secret reference into provider config.

The setup-token path is separate from `ANTHROPIC_API_KEY`. During Claude Code execution, SkillMall injects the stored setup-token only into the scoped runtime environment as `CLAUDE_CODE_OAUTH_TOKEN` and clears conflicting Claude/Anthropic auth env vars for that child process.

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

Provider tests are safe readiness/status checks. They report configuration, secret-reference presence, local runtime/tool availability, provider-account-auth state, or planned-source-review status without sending prompts or echoing secrets. The provider test route rejects prompt and response fields.

Model refresh also records capability metadata when the current source exposes it. Provider Center and `npx skill-mall providers status` show capable model count, capability source confidence, and blockers such as missing metadata, fallback-only labels, manual-only labels, reference-only metadata, stale metadata, or missing price. Reference metadata from Portkey or LiteLLM is useful for local explanation and planning, but it is not shown as live account availability and does not by itself make a route candidate eligible.

```bash
npx skill-mall providers list
npx skill-mall providers status --provider openrouter
npx skill-mall providers refresh-models --provider openai --key-env OPENAI_API_KEY
npx skill-mall providers test --provider claude-code
```

## Routing Policies and Budgets

Provider Center includes routing-policy and budget controls. Policies are stored locally in SkillMall's SQLite database and activated by writing the policy id into the current provider config. SkillMall does not require a hosted gateway dashboard for these controls.

Supported policy modes:

- `manual`
- `fallback_chain`
- `local_first`
- `budget_guarded_manual`

`budget_guarded_manual` can block a request from local numeric cost estimates before a provider client is created. Simulation is local-only: it evaluates the selected policy, budget metadata, capability metadata, and pricing availability without sending a provider request and without storing prompts or responses.

Simulation reports selected and rejected candidates with capability and pricing blockers. Unknown capability is not compatible for automatic cost-aware routing. Missing or stale pricing is not free and is not eligible to rank as cheapest.

CLI examples:

```bash
npx skill-mall policies upsert \
  --id budget-openai \
  --name "Budget OpenAI" \
  --mode budget_guarded_manual \
  --candidate-current \
  --remaining-usd 10 \
  --limit-usd 20
```

```bash
npx skill-mall policies activate --id budget-openai
npx skill-mall policies simulate --id budget-openai --estimated-cost-usd 0.02 --operation chat.text --require-pricing
```

Future modes such as `cheapest_compatible`, `quality_first`, semantic routing, learned routing, and complexity routing are not active. `cheapest_compatible` remains blocked until capability matching, usable pricing coverage, deterministic missing-data blockers, deterministic tie-breaks, no-provider-call simulation, and Provider Center/API/CLI/docs parity are all approved in a later Judge gate.

## Optional Local Gateway

Bifrost local is an optional local gateway backend. It is not SkillMall's source of truth and is not required hosted infrastructure. Provider Center stores gateway references and local endpoint metadata while SkillMall keeps provider settings, model status, routing status, and usage/cost summaries in its own app surface.

## Config File

`npx skill-mall configure` writes non-secret configuration to `~/.skill-mall/config.json`.

```json
{
  "provider": "openai",
  "activeProviderRegistryId": "openai",
  "model": "gpt-4o",
  "providers": {
    "openai": {
      "model": "gpt-4o",
      "authMode": "env_key",
      "secretRef": { "type": "env", "name": "OPENAI_API_KEY" },
      "gatewayBackend": "direct"
    }
  },
  "providerTargets": {
    "openai": {
      "provider": "openai",
      "providerRegistryId": "openai",
      "executionKind": "direct",
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
