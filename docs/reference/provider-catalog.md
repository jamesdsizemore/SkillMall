# Provider Catalog

SkillMall now separates the broad Provider Center catalog from executable router
clients.

- `ProviderRegistryID` is the Provider Center row ID. It covers API providers,
  local tools, local runtimes, cloud-project providers, and custom endpoints.
- `ProviderID` remains the narrow executable client ID for current direct/router
  clients: `openai`, `codex`, `anthropic`, `claude-code`, `gemini`, `groq`, and
  `ollama`.
- Registry inclusion does not imply direct router execution.
- Planned-source-review rows are visible in the catalog but are not live-callable.

Provider Center shows each selected row with its access type, execution boundary,
setup state, model source, safe next action, registry row ID, and executable
`ProviderID` only when one exists. These labels are product explanation, not a
runtime expansion. A row marked OpenAI-compatible or registry/configurable still
uses the existing generic execution contract or remains metadata/status-only
according to its registry fields.

The registry lives in `lib/providers/registry.ts`. Shared model-source adapters
live in `lib/providers/model-sources.ts`; `lib/providers/model-discovery.ts`
keeps the older discovery facade aligned with those adapters.

The broad catalog intentionally covers OpenAI, OpenAI Codex, Anthropic, Claude
Code, Gemini, Groq, Ollama, OpenRouter, Alibaba/DashScope/Qwen, Hugging Face,
Z.AI, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock,
Azure OpenAI, Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM,
Perplexity, DeepInfra, Cerebras, and custom OpenAI-compatible endpoints.

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
| `codex` | `openai_codex` | `codex_app_server` provider account auth |
| `anthropic` | `anthropic` | `env_key` API access |
| `claude-code` | `claude_code` | `local_cli_session` or `claude_setup_token` |
| `gemini` | `gemini` | `env_key` API access |
| `groq` | `groq` | `env_key` API access |
| `ollama` | `ollama` | `none_local` |

Do not add a broad Provider Center row to `ProviderID` unless an executable
adapter is implemented and tested for that provider.

OpenAI-compatible registry rows can execute through a generic SkillMall-owned
execution target without becoming `ProviderID` values. The stored config keeps
`provider: "openai"` as the implementation adapter identity, plus
`providerRegistryId` for the broad Provider Center row and
`executionKind: "openai_compatible"`. Request ledger rows store the same
`provider_registry_id` and `execution_kind`, so usage/cost attribution can point
at OpenRouter, DeepSeek, Mistral, custom endpoints, and similar rows without
pretending they are direct `ProviderID` members.

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
| `local_runtime_models` | Requires a configured local runtime endpoint and uses the provider-specific local API. |
| `source_backed_static_models` | Uses source-backed static or manual labels when no durable live model-list endpoint is proven. |
| `manual_custom_models` | Uses manual model labels by default; endpoint probing is optional. |
| `static_fallback_only` | Displays fallback labels only; not authoritative. |
| `planned_provider_source_review` | Visible catalog row; live discovery/test disabled until primary-source evidence is recorded. |

Static fallback models are display labels only. They are not authoritative live
provider catalogs.

Planned-source-review rows are visible so users can see intended coverage, but
they must not become live-callable until official evidence and adapter support
are added. Rows promoted from that state must carry the exact safe behavior:
DeepInfra uses a provider-specific official models-list adapter, while
Alibaba/DashScope/Qwen, Z.AI, and Perplexity use source-backed static/manual
labels unless a durable official live model-list endpoint is proven. Ambiguous
managed NVIDIA NIM variants remain out of scope; the NIM row covers local or
container runtime endpoints only.

## Provider Rows

| Registry ID | Status/classification | Discovery strategy | Executable mapping |
| --- | --- | --- | --- |
| `openai` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | `openai` |
| `openai_codex` | `active_configurable` / `provider_account_auth` | `static_fallback_only` | `codex` |
| `anthropic` | `active_configurable` / `active_configurable` | `official_provider_models` | `anthropic` |
| `claude_code` | `status_only` / `local_tool_session` | `static_fallback_only` | `claude-code` |
| `gemini` | `active_configurable` / `active_configurable` | `official_provider_models` | `gemini` |
| `groq` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | `groq` |
| `ollama` | `active_configurable` / `local_runtime` | `local_runtime_models` | `ollama` |
| `openrouter` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `alibaba_dashscope_qwen` | `active_configurable` / `gateway_configurable_openai_compatible` | `source_backed_static_models` | none |
| `huggingface` | `active_configurable` / `active_configurable` | `official_provider_models` | none |
| `zai` | `active_configurable` / `gateway_configurable_openai_compatible` | `source_backed_static_models` | none |
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
| `perplexity` | `active_configurable` / `active_configurable` | `source_backed_static_models` | none |
| `deepinfra` | `active_configurable` / `gateway_configurable_openai_compatible` | `official_provider_models` | none |
| `cerebras` | `active_configurable` / `gateway_configurable_openai_compatible` | `openai_compatible_models` | none |
| `custom_openai_compatible` | `active_configurable` / `custom_openai_compatible` | `manual_custom_models` | none |

## Model Discovery Behavior

`refreshProviderModelSource()` is the shared adapter layer used by the discovery
facade and later refresh flows. It is intentionally conservative:

- OpenAI-compatible rows call only the configured base URL's `/models` endpoint.
- Official-provider rows call only implemented provider-specific adapters such as
  Anthropic, Gemini, Cohere, Hugging Face, and DeepInfra; unsupported official
  rows return `provider_specific_required`.
- Account-scoped, cloud-project-scoped, local-runtime, manual, static fallback,
  and planned-source-review strategies do not make network calls by default.
- Source-backed static rows return authoritative source-labeled records without
  probing a generic endpoint.
- Planned-source-review rows return `planned_source_review`, `liveCallable:
  false`, and an evidence note.

This prevents the Provider Center from pretending every provider or custom
endpoint supports `/v1/models`.

## Secret And Auth Boundary

SkillMall stores secret references, not raw secrets:

- API providers use env var references such as `OPENAI_API_KEY`.
- OpenAI Codex uses Codex app-server account auth through `codex_app_server`.
  The UI must render the returned `authUrl` or `verificationUrl` plus
  `userCode`; local CLI status alone is not proof that Provider Center auth
  worked.
- Env var and gateway virtual-key reference names must be
  environment-variable-style names, not filesystem paths or credential-file
  locations.
- Local tool/session rows rely on the official local tool authentication.
- Claude Code supports `local_cli_session` and `claude_setup_token`. The
  setup-token path uses an app-managed encrypted stored provider secret ref and
  is not an Anthropic API key.
- Local runtimes such as Ollama do not require a credential.
- Gateway rows use local gateway virtual-key references.
- Cloud rows require project/resource metadata plus safe secret references.
- Claude Code local login, Claude setup-token, Claude account/Max auth, and
  Anthropic API-key access are separate concepts.
- ChatGPT Pro/Codex subscription auth is not OpenAI API-key access.

SkillMall must not ask users to paste raw ChatGPT browser/session tokens,
Claude.ai OAuth tokens, Codex credential files, Claude Code credential files, or
provider credential-file contents.

Provider rows must also enforce auth-mode compatibility. A row that only
declares `api_access` must not accept `local_cli_session`, a local runtime row
must not accept API-key refs, and gateway virtual-key auth is valid only for rows
that declare `gateway_virtual_key`.
