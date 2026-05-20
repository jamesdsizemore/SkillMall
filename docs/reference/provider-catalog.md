# Provider Catalog

SkillMall now separates the broad Provider Center catalog from executable router
clients.

- `ProviderRegistryID` is the Provider Center row ID. It covers API providers,
  local tools, local runtimes, cloud-project providers, and custom endpoints.
- `ProviderID` remains the narrow executable client ID for current direct/router
  clients: `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`.
- Registry inclusion does not imply direct router execution.
- Planned-source-review rows are visible in the catalog but are not live-callable.

The registry lives in `lib/providers/registry.ts`. Model discovery contracts live
in `lib/providers/model-discovery.ts`.

The broad catalog intentionally covers OpenAI, Anthropic, Claude Code, Gemini,
Groq, Ollama, OpenRouter, Alibaba/DashScope/Qwen, Hugging Face, Z.AI, MiniMax,
Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock, Azure OpenAI,
Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM, Perplexity,
DeepInfra, Cerebras, and custom OpenAI-compatible endpoints.

## Executable Client Contract

```typescript
interface LLMClient {
  complete(prompt: string, options?: CompletionOptions): Promise<string>
  readonly provider: ProviderID
}
```

Current executable providers:

| ProviderID | Registry row | Auth mode |
| --- | --- | --- |
| `openai` | `openai` | `env_key` API access |
| `anthropic` | `anthropic` | `env_key` API access |
| `claude-code` | `claude_code` | `local_cli_session` |
| `gemini` | `gemini` | `env_key` API access |
| `groq` | `groq` | `env_key` API access |
| `ollama` | `ollama` | `none_local` |

Do not add a broad Provider Center row to `ProviderID` unless an executable
adapter is implemented and tested for that provider.

## Registry Row Contract

Every provider row declares:

- `id`: broad `ProviderRegistryID`.
- `accessLabel` and `authLabel`: user-facing access/auth labels.
- `setupUrl`: provider setup or documentation URL.
- `discoveryStrategy`: how model refresh behaves.
- `status` and `classification`: Provider Center state.
- `liveCallable`: whether SkillMall may attempt live discovery/test actions.
- `executableProviderId`: optional current direct/router mapping.
- `gatewayProfile`: optional OpenAI-compatible or local Bifrost execution hint.

Discovery strategies:

| Strategy | Meaning |
| --- | --- |
| `openai_compatible_models` | Probe the configured OpenAI-compatible models endpoint and normalize `data[].id`. |
| `official_provider_models` | Requires a provider-specific official models adapter. |
| `account_scoped_models` | Requires account/provider context before discovery. |
| `cloud_project_scoped_models` | Requires project, resource, region, or deployment context before discovery. |
| `local_runtime_models` | Requires a configured local runtime endpoint. |
| `manual_custom_models` | Uses manual model labels by default; endpoint probing is optional. |
| `static_fallback_only` | Displays fallback labels only; not authoritative. |
| `planned_provider_source_review` | Visible catalog row; live discovery/test disabled until primary-source evidence is recorded. |

Static fallback models are display labels only. They are not authoritative live
provider catalogs.

Planned-source-review rows are visible so users can see intended coverage, but
they must not become live-callable until official evidence and adapter support
are added. This covers Alibaba/DashScope/Qwen, Z.AI, Perplexity, DeepInfra
until primary-source evidence is recorded, and ambiguous managed NVIDIA NIM
variants.

## Provider Rows

| Registry ID | Status/classification | Discovery strategy | Executable mapping |
| --- | --- | --- | --- |
| `openai` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | `openai` |
| `anthropic` | `active_configurable` / `active_configurable` | `official_provider_models` | `anthropic` |
| `claude_code` | `status_only` / `local_tool_session` | `static_fallback_only` | `claude-code` |
| `gemini` | `active_configurable` / `active_configurable` | `official_provider_models` | `gemini` |
| `groq` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | `groq` |
| `ollama` | `active_configurable` / `local_runtime` | `local_runtime_models` | `ollama` |
| `openrouter` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `alibaba_dashscope_qwen` | `planned_source_review` / `planned_provider_source_review` | `planned_provider_source_review` | none |
| `huggingface` | `active_configurable` / `active_configurable` | `official_provider_models` | none |
| `zai` | `planned_source_review` / `planned_provider_source_review` | `planned_provider_source_review` | none |
| `minimax` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `kimi_moonshot` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `deepseek` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `mistral` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `cohere` | `active_configurable` / `active_configurable` | `official_provider_models` | none |
| `xai` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `aws_bedrock` | `active_configurable` / `cloud_project_required` | `cloud_project_scoped_models` | none |
| `azure_openai` | `active_configurable` / `cloud_project_required` | `cloud_project_scoped_models` | none |
| `google_vertex_ai` | `active_configurable` / `cloud_project_required` | `cloud_project_scoped_models` | none |
| `together_ai` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `fireworks` | `active_configurable` / `active_configurable` | `account_scoped_models` | none |
| `replicate` | `active_configurable` / `active_configurable` | `official_provider_models` | none |
| `nvidia_nim` | `status_only` / `local_runtime` | `local_runtime_models` | none |
| `perplexity` | `planned_source_review` / `planned_provider_source_review` | `planned_provider_source_review` | none |
| `deepinfra` | `planned_source_review` / `planned_provider_source_review` | `planned_provider_source_review` | none |
| `cerebras` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `custom_openai_compatible` | `active_configurable` / `custom_openai_compatible` | `manual_custom_models` | none |

## Model Discovery Behavior

`discoverProviderModels()` is intentionally conservative:

- OpenAI-compatible rows call only the configured base URL's `/models` endpoint.
- Official-provider rows return `provider_specific_required` until a dedicated
  adapter is implemented.
- Account-scoped, cloud-project-scoped, local-runtime, manual, static fallback,
  and planned-source-review strategies do not make network calls by default.
- Planned-source-review rows return `planned_source_review`, `liveCallable:
  false`, and an evidence note.

This prevents the Provider Center from pretending every provider or custom
endpoint supports `/v1/models`.

## Secret And Auth Boundary

SkillMall stores secret references, not raw secrets:

- API providers use env var references such as `OPENAI_API_KEY`.
- Env var and gateway virtual-key reference names must be
  environment-variable-style names, not filesystem paths or credential-file
  locations.
- Local tool/session rows rely on the official local tool authentication.
- Local runtimes such as Ollama do not require a credential.
- Gateway rows use local gateway virtual-key references.
- Cloud rows require project/resource metadata plus safe secret references.
- Claude Code is `local_tool_session`; Claude account/Max auth is not
  Anthropic API-key access.
- ChatGPT Pro/Codex subscription auth is not OpenAI API-key access.

SkillMall must not ask users to paste raw ChatGPT browser/session tokens,
Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, or
provider credential-file contents.

Provider rows must also enforce auth-mode compatibility. A row that only
declares `api_access` must not accept `local_cli_session`, a local runtime row
must not accept API-key refs, and gateway virtual-key auth is valid only for rows
that declare `gateway_virtual_key`.
