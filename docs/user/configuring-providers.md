# Configuring LLM Providers

SkillMall uses your own provider access through the Provider Center at `/settings/providers`. The Provider Center is the app settings surface for choosing an LLM provider, configuring credentials, testing access, refreshing/selecting models, and using that provider for skill creation.

API-backed providers default to API access. In the web Provider Center, you can enter the provider credential in the primary setup area; SkillMall stores it in encrypted local app-managed storage and returns only redacted status after save. You can also choose an environment-variable reference when you want to keep the credential outside SkillMall. OpenAI Codex Auth Token and Claude Code use local auth/session setup, Ollama uses a local runtime with no credential, and local gateway access uses a gateway virtual-key reference.

Credential entry is explicit and labeled as API access. Forbidden inputs remain forbidden: SkillMall does not scrape browser sessions, silently copy credential files, or ask for random browser/session blobs, cookies, copied browser tokens, credential-file contents, or credential-file paths. Reference names must be environment-variable-style names, not paths. `OPENAI_API_KEY` and `BIFROST_VIRTUAL_KEY` are valid references; `~/.codex/auth.json`, Claude credential-file paths, and copied session-token locations are rejected.

## Provider Center Workflow

The Provider Center is organized around the way a user evaluates a provider row:

- **Provider catalog:** Select a broad catalog row and see whether it is API access, local tool/session access, local runtime, gateway/OpenAI-compatible access, cloud/project scoped, custom endpoint, or source-review only.
- **Selected provider:** Review the selected row's access type, execution boundary, setup state, model source, registry row ID, executable `ProviderID` mapping when one exists, and safe next action.
- **Connect LLM:** Choose the credential type only when needed, enter an API credential or approved reference in the primary setup area, save securely, see redacted status, and follow the safe order for save, status test, and model refresh.
- **Model and status:** Inspect model source, cache freshness, blockers, capability confidence, safe status tests, and refresh availability.
- **Local routing policy:** Edit only currently supported local policy modes. Future cheapest, quality, semantic, learned, complexity, and eval routing modes remain blocked until separately approved.
- **Usage and cost:** Review local ledger summaries. Actual cost is provider/gateway reported; estimated cost is a local SkillMall estimate, not invoice reconciliation.

These sections are workflow labels over the current Provider Center capabilities. They do not widen executable provider support or change provider/router behavior.

## Provider Catalog vs Executable Providers

The Provider Center has a broad `ProviderRegistryID` catalog. It includes OpenAI API, OpenAI Codex Auth Token, Anthropic, Claude Code, Gemini, Groq, Ollama, OpenRouter, Alibaba/DashScope/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock, Azure OpenAI, Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM, Perplexity, DeepInfra, Cerebras, and custom OpenAI-compatible endpoints.

The executable direct/router `ProviderID` set remains narrower: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`. Registry-only rows can appear in Provider Center and CLI status output without becoming direct clients.

OpenAI-compatible registry rows such as OpenRouter, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, xAI, Together AI, Cerebras, DeepInfra, Alibaba/DashScope/Qwen, Z.AI, and custom endpoints execute through a generic SkillMall-owned OpenAI-compatible target. They do not get added as one-off `ProviderID` values.

Planned-source-review rows are visible but not live-callable until official evidence and adapter support are added. Phase 4 promotes Alibaba/DashScope/Qwen and Z.AI as source-backed/configured OpenAI-compatible rows, Perplexity as a source-backed catalog row with execution still gated, and DeepInfra as a provider-specific model-list row with OpenAI-compatible execution profile. Ambiguous managed NVIDIA NIM variants remain out of scope.

## Executable Providers

| Provider | Auth mode | Recommended model |
|---|---|---|
| OpenAI API | `env_key` via `OPENAI_API_KEY` | gpt-4o |
| Claude API | `env_key` via `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| OpenAI Codex Auth Token | `local_cli_session` | codex-local-session |
| Claude Code CLI | `local_cli_session` | claude-sonnet-4-6 |
| Google Gemini | `env_key` via `GEMINI_API_KEY` | gemini-2.0-flash-exp |
| Groq | `env_key` via `GROQ_API_KEY` | llama-3.3-70b-versatile |
| Ollama | `none_local` | llama3.1 |

API access is separate from subscription or tool-session auth. ChatGPT Pro/Codex subscription auth is not OpenAI API access, and Claude account/Max auth is not Anthropic API access. OpenAI Codex Auth Token and Claude Code CLI auth are `local_tool_session`; SkillMall does not copy credential files or ask users to paste credential-file contents.

## API Providers

In the web Provider Center, select the provider and keep the default **API credential** setup mode. Enter the provider API key or token in the **API access credential** field, save the credential setup, then run **Test status** and **Refresh models**. SkillMall stores the credential in encrypted local app-managed storage, shows redacted `stored_api_key` status, and lets you replace/rotate it by saving a new value or remove it with **Delete stored credential**.

If you prefer environment-managed credentials, choose **Environment variable** and configure SkillMall to reference the variable name:

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

The CLI currently uses environment-variable references. The web Provider Center is the first-class in-app credential setup surface.

Provider Center also enforces the selected provider row's allowed auth modes. API providers use API-key references, Claude Code uses `local_cli_session`, Ollama uses `none_local`, and gateway virtual-key configuration is available only on rows that explicitly support gateway access.

Provider Center setup guidance treats each row by access mode:

- **API access:** enter the provider API credential for encrypted app-managed storage, or choose an environment-variable reference if you want to keep the credential outside SkillMall.
- **Gateway virtual-key access:** enter the local gateway virtual-key reference name and endpoint metadata when the row needs it.
- **Local tool/session access:** use the already-authenticated OpenAI Codex or Claude Code local auth/session. SkillMall stores model/setup metadata only and does not copy credential files.
- **Local runtime access:** enter the local endpoint and model labels needed by the runtime.
- **Custom/OpenAI-compatible access:** enter the compatible endpoint and model labels for the target row.
- **Cloud/project scoped rows:** review the project/account blocker. Phase 2 does not add project credential flows.
- **Source-review rows:** keep live setup blocked until official evidence and adapter support are approved.

## OpenAI-Compatible Registry Providers

For registry providers that expose an OpenAI-compatible chat API, configure an API credential or environment variable reference and a base URL. SkillMall stores the target as `providerRegistryId` plus `executionKind: "openai_compatible"` in `~/.skill-mall/config.json`; it does not add a new `ProviderID` for each provider.

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
      "secretRef": { "type": "stored_api_key", "id": "provider:openrouter:api_key" },
      "gatewayBackend": "direct",
      "baseURL": "https://openrouter.ai/api/v1"
    }
  }
}
```

Provider rows that require user-specific regional/account endpoints, such as Alibaba/DashScope/Qwen and Z.AI, must be configured with an explicit base URL. SkillMall still uses source-backed static/manual model labels unless an official durable model-list endpoint is proven.

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

Provider tests are safe readiness/status checks. They report configuration, secret-reference presence, local runtime/tool availability, or planned-source-review status without accepting prompts, sending prompts, storing prompts, storing responses, or echoing secrets.

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

`npx skill-mall configure` writes non-secret configuration to `~/.skill-mall/config.json`. Web Provider Center API-credential setup stores encrypted credential material in the local SkillMall secret store and writes only a redacted `stored_api_key` reference into config.

```json
{
  "provider": "openai",
  "activeProviderRegistryId": "openai",
  "model": "gpt-4o",
  "providers": {
    "openai": {
      "model": "gpt-4o",
      "authMode": "env_key",
      "secretRef": { "type": "stored_api_key", "id": "provider:openai:api_key" },
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
      "secretRef": { "type": "stored_api_key", "id": "provider:openai:api_key" },
      "gatewayBackend": "direct"
    }
  }
}
```

Top-level `apiKey` is accepted only by the Provider Center configure API when `configMode` is `api_key`; it is immediately encrypted into app-managed storage and never returned. Nested `apiKey`, raw tokens, cookies, browser/session fields, credential-file contents, and credential-file paths are rejected. CLI users should continue using `--key-env` for environment-managed API access.

## Switching Providers

```bash
npx skill-mall configure --provider groq --key-env GROQ_API_KEY --model llama-3.3-70b-versatile
```

The next pipeline run uses the configured provider. Skills already created are static files and are unaffected.

## Troubleshooting

**No LLM provider configured**: Run `npx skill-mall configure`.

**Missing API environment variable**: Set the provider-specific environment variable named in `secretRef.name`, then restart the process.

**Stored API credential missing**: Re-enter the provider credential in Provider Center and save the credential setup, or delete the stored credential and choose another credential type.

**Claude Code CLI times out**: Ensure the `claude` binary is in your PATH and authenticated.

**Ollama not responding**: Ensure `ollama serve` is running. Check with `curl http://localhost:11434/api/version`.
