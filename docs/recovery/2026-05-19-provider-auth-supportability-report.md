# SkillMall Provider/Auth Supportability Report

Date: 2026-05-19
Branch: `codex/agent-operating-contract-auth-token-skill`
Status: Decision artifact only

## Scope

This report turns the provider/auth research plan into a supportability matrix and implementation recommendation.

It does not authorize implementation, cleanup, staging, commit, push, or PR creation.

Hard product constraint:

- No hosted gateway, router, proxy, observability, or monitoring service may be required for SkillMall's core provider/auth system.
- No architecture may add an extra paid SaaS layer on top of the user's provider usage.
- Hosted providers/gateways such as OpenRouter or Vercel AI Gateway may appear only as optional user-configured LLM providers, not as mandatory SkillMall infrastructure.
- Open-source router/proxy/gateway projects may be integrated into SkillMall as local/self-contained infrastructure, library code, embedded service, or adapter layer. The restriction is against hosted paid apps, not against using OSS.

## End Condition

This is the decision gate for provider/auth recovery. After user approval, the next provider/auth step should be implementation from this matrix, not another research report.

No more provider/auth planning artifacts are needed unless implementation discovers a new official-doc contradiction or a real technical blocker.

## Verdict Vocabulary

| Verdict | Meaning |
|---|---|
| `SUPPORTED_DIRECT` | SkillMall can call the provider/runtime directly without account-token ambiguity. |
| `SUPPORTED_APP_CONFIGURED` | SkillMall must expose this in the application settings/configuration flow. OAuth/token generation may still be owned by official provider tooling, but the user configures and verifies it from SkillMall. |
| `SUPPORTED_DELEGATED` | SkillMall can support the mode by delegating auth/runtime ownership to official tooling. This is not a reason to omit app-side configuration UI. |
| `API_ONLY` | Supportable as explicit API access, not subscription/account auth. |
| `GATEWAY_ONLY` | Supportable as explicit gateway access, not native provider/account auth. |
| `LOCAL_RUNTIME` | Supportable as a local runtime, with no account credential. |
| `MECHANISM_REVIEW_REQUIRED` | The app-configured product goal remains required, but this exact mechanism needs a focused code/doc review before implementation. |
| `UNSUPPORTED` | Do not build. |
| `UNKNOWN_BLOCKED` | Official evidence is incomplete or future-dated. Treat as unsupported until rechecked. |

## Source Receipts

Sources checked on 2026-05-19:

| Source | Receipt |
|---|---|
| OpenAI Codex auth docs: https://developers.openai.com/codex/auth | Codex separates ChatGPT subscription sign-in from API-key sign-in. Codex Cloud requires ChatGPT sign-in. CLI/IDE support both. ChatGPT sign-in follows ChatGPT workspace controls; API-key sign-in follows API organization policies. |
| OpenAI Codex auth docs: https://developers.openai.com/codex/auth | ChatGPT login opens a browser and returns an access token to the CLI/IDE. If the environment already provides a ChatGPT access token, the CLI can read it from stdin via `codex login --with-access-token`. API-key usage is billed through OpenAI Platform. |
| OpenAI Codex access tokens: https://developers.openai.com/codex/enterprise/access-tokens | `CODEX_ACCESS_TOKEN` is documented for trusted noninteractive Codex local workflows. Tokens should be stored in a secret manager or CI secret store. Docs warn not to confuse generated access tokens with browser session tokens or Platform API keys. |
| OpenAI Codex app server: https://developers.openai.com/codex/app-server | App-server supports API key login, managed ChatGPT browser/device-code login, and experimental `chatgptAuthTokens`. Managed ChatGPT mode means Codex owns OAuth, persists tokens, and refreshes them. `chatgptAuthTokens` is experimental and intended for host apps that already own the user's ChatGPT auth lifecycle. |
| OpenAI API auth: https://developers.openai.com/api/reference/overview#authentication | OpenAI API uses API keys. Keys are secrets and should be loaded from server-side env vars or key management, not browser/client code. |
| Claude Code auth: https://code.claude.com/docs/en/authentication | Claude Code supports Claude.ai subscription login, API credentials, cloud-provider credentials, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `apiKeyHelper`, and `CLAUDE_CODE_OAUTH_TOKEN`, with explicit precedence. |
| Claude Code auth: https://code.claude.com/docs/en/authentication | `ANTHROPIC_AUTH_TOKEN` is for terminal CLI sessions and is sent as an authorization bearer header, especially for LLM gateways/proxies. |
| Claude Code auth: https://code.claude.com/docs/en/authentication | `claude setup-token` generates a one-year OAuth token for CI/scripts as `CLAUDE_CODE_OAUTH_TOKEN`; it authenticates with a Pro, Max, Team, or Enterprise subscription and is scoped to inference. |
| Claude Code legal/compliance: https://code.claude.com/docs/en/legal-and-compliance | Anthropic says third-party developers should use API keys through Claude Console or supported cloud providers, and does not permit third-party developers to offer Claude.ai login or route requests through Free/Pro/Max plan credentials on behalf of users. |
| Claude Help Center: https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan | If `ANTHROPIC_API_KEY` is set, Claude Code uses API-key auth instead of subscription auth, causing API usage charges instead of subscription usage. |
| Anthropic API auth: https://platform.claude.com/docs/en/manage-claude/authentication | Claude API supports API keys and Workload Identity Federation. API keys are long-lived `sk-ant-api...` secrets. WIF exchanges an IdP token for a short-lived Claude API access token. |
| Gemini API keys: https://ai.google.dev/gemini-api/docs/api-key | Gemini API keys are managed in Google AI Studio. Google recommends server-side API-key use, never committing keys, never exposing keys client-side, restricting keys, auditing, and rotating. |
| Gemini models: https://ai.google.dev/gemini-api/docs/models | Gemini model aliases differ by stable, preview, latest, and experimental status. Preview/experimental models can have stricter limits and deprecation risk. |
| Groq API reference: https://console.groq.com/docs/api-reference | Groq exposes OpenAI-compatible API endpoints and model listing under bearer `GROQ_API_KEY`. |
| Ollama API docs: https://docs.ollama.com/api/tags | Ollama lists local models through `GET /api/tags` on the local runtime. |
| OpenRouter models API: https://openrouter.ai/docs/api/api-reference/models/get-models | OpenRouter exposes `GET /api/v1/models` with bearer token auth and model metadata. |
| Vercel AI Gateway: https://vercel.com/docs/ai-gateway | Vercel AI Gateway is a one-key gateway to multiple providers with unified API, fallbacks, embeddings, monitoring, and OpenAI-compatible base URL. |
| Alibaba Cloud Model Studio / DashScope: https://www.alibabacloud.com/help/doc-detail/3016809.html | Alibaba Cloud exposes DashScope/Model Studio APIs for Qwen and related models. The implementation must include Alicloud/Qwen as an API provider family, not only via OpenRouter/gateways. |
| Hugging Face Inference Providers: https://huggingface.co/docs/inference-providers/index | Hugging Face provides an all-in-one inference-provider API and provider-specific routing. |
| Hugging Face Hub API: https://huggingface.co/docs/inference-providers/en/hub-api | Hugging Face model/provider availability can be queried through Hub APIs, including provider mapping metadata. |
| Z.AI docs: https://docs.z.ai/guides/overview/overview | Z.AI publishes GLM model/API docs and a model matrix. The implementation must include Z.AI/GLM as a native API provider family. |
| MiniMax docs: https://platform.minimax.io/docs | MiniMax publishes API docs and model docs, including OpenAI/Anthropic-compatible usage paths. The implementation must include MiniMax as a native API provider family. |
| Kimi / Moonshot API model list: https://platform.kimi.ai/docs/api/list-models | Kimi exposes `GET https://api.moonshot.ai/v1/models` for current model discovery. |
| DeepSeek model list: https://api-docs.deepseek.com/api/list-models | DeepSeek exposes a List Models API and OpenAI-compatible usage. |
| Mistral models docs: https://docs.mistral.ai/models | Mistral publishes current model documentation; provider implementation must include Mistral and not rely only on generic gateway access. |
| Cohere list models: https://docs.cohere.com/reference/list-models | Cohere exposes a List Models endpoint with endpoint filtering. |
| xAI model list: https://docs.x.ai/developers/rest-api-reference/inference/models | xAI exposes a models endpoint for models available to the authenticating API key. |
| AWS Bedrock ListFoundationModels: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_ListFoundationModels.html | Bedrock exposes model discovery with provider/model metadata, modality support, and deprecation information. |
| Azure OpenAI models/deployments: https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/working-with-models/ | Azure OpenAI model availability is resource/deployment-specific and must be treated differently from OpenAI Platform model discovery. |
| Google Vertex AI Model Garden: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-garden/explore-models | Vertex AI model availability is Cloud/region/project dependent and should be represented as cloud-provider access, not just Gemini API-key access. |
| Together AI models API: https://docs.together.ai/reference/models | Together exposes model listing and runs broad open-model inference through API access. |
| Fireworks AI list models: https://fireworks.ai/docs/api-reference/list-models | Fireworks exposes an account-scoped model listing endpoint and serverless model catalog. |
| Replicate official models/API: https://replicate.com/docs/topics/models/official-models | Replicate exposes official models and model-specific prediction endpoints; model discovery is not the same as OpenAI-style `/models`. |
| NVIDIA NIM API: https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html | Self-hosted NIM exposes OpenAI-compatible `/v1/models` for loaded local/container models. |
| LiteLLM proxy/cost tracking: https://docs.litellm.ai/docs/proxy/cost_tracking | LiteLLM is an open-source proxy/gateway layer with response-cost headers, budget/rate-limit features, and broad provider support. |
| Helicone platform docs: https://docs.helicone.ai/getting-started/platform-overview | Helicone supports proxy-based LLM observability and cost tracking across providers. SkillMall may use open-source/self-hosted/integrated Helicone patterns or code if license and footprint fit; no hosted Helicone dependency. |
| Langfuse token/cost tracking: https://langfuse.com/docs/observability/features/token-and-cost-tracking | Langfuse tracks token and cost usage from provider responses, traces, and model pricing configuration. SkillMall may use open-source/self-hosted/integrated Langfuse patterns or code if license and footprint fit; no hosted Langfuse dependency. |
| Portkey AI Gateway docs: https://portkey.ai/docs/product/ai-gateway | Portkey is an AI gateway with routing, observability, guardrails, and open-source gateway components. SkillMall may use open-source/self-hosted/integrated Portkey gateway pieces if license and footprint fit; no hosted Portkey dependency. |
| Portkey cost management: https://portkey.ai/docs/product/observability/cost-management | Portkey records requests and tracks cost/budget data when pricing is available for a model. Use OSS/integrated pieces or implementation patterns if suitable; no hosted dependency. |
| OpenRouter model pricing docs: https://openrouter.ai/docs/models | OpenRouter model catalog includes pricing metadata and can act as a broad gateway/source of model-price data. |
| OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html | Secrets should not be hardcoded. Environment variables are acceptable only when better options are not possible and can be exposed through process/log/system surfaces. |
| `keytar`: https://github.com/atom/node-keytar | `keytar` maps to macOS Keychain, Linux Secret Service/libsecret, and Windows Credential Vault. It is a candidate for future local secret storage, not required for the first recovery PR. |

## Executive Decision

SkillMall should implement a split provider/auth model with application-configured auth-token support:

1. Support explicit API-key providers as `API_ONLY`.
2. Support OpenAI/Codex auth-token/session setup from the SkillMall application as `SUPPORTED_APP_CONFIGURED`.
3. Support Claude Code Pro/Max auth-token/session setup from the SkillMall application as `SUPPORTED_APP_CONFIGURED`.
4. Where official tooling must own OAuth/token lifecycle, SkillMall still owns the settings flow, status display, and test action.
5. Support Ollama as `LOCAL_RUNTIME`.
6. Support gateways as `GATEWAY_ONLY`.
7. Do not store raw secrets in `~/.skill-mall/config.json`.
8. Do not write provider secrets to `.env.local` from the web UI.
9. Treat missing official proof as a mechanism blocker, not as a reason to remove auth-token setup from the product goal.

This decision also applies to provider breadth:

1. SkillMall must not ship a narrow OpenAI/Anthropic/Gemini/Groq/Ollama-only provider catalog.
2. The provider registry must include the majority of well-known and commonly used LLM APIs as first-class configured providers or explicitly marked planned/provider-source-review rows.
3. Alicloud/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, and DeepSeek are not optional stretch goals.
4. Every provider row must declare a model-discovery strategy because model lists change constantly.
5. Static model defaults are only fallback labels, never the authoritative provider catalog.
6. Broad provider support requires an LLM router/proxy/gateway layer with usage and cost accounting; one-off provider clients are not sufficient.

## Router/Proxy/Gateway Requirement

SkillMall needs an internal LLM routing layer, and it may be built by integrating open-source gateway/router/proxy components directly into the SkillMall system. This is a core architecture requirement, not a nice-to-have.

The router must not require hosted SaaS infrastructure. SkillMall's default must be local/self-contained and must not add extra gateway/observability costs beyond the provider costs the user intentionally configures. Open-source components are allowed and should be evaluated seriously for direct integration.

The router layer must own:

- provider selection
- model selection
- fallback routing
- per-provider credentials references
- provider secret storage boundary
- request normalization
- response normalization
- streaming support where provider supports it
- model-list refresh
- token usage capture
- cost estimation/capture
- per-run/per-feature attribution
- budget guardrails
- request logs with redaction
- latency/error metrics
- provider health checks

Required cost/usage records:

- request ID
- user/session/workflow identifier where available
- feature or pipeline stage, such as research, skill generation, prompt generation, preview, improvement analysis, or RAG
- provider ID
- auth/access mode
- model ID
- gateway/upstream provider if different from provider ID
- prompt/input tokens
- completion/output tokens
- cached/read/write/reasoning tokens when provider exposes them
- provider-reported cost when available
- estimated cost when provider does not report cost
- currency
- pricing source and pricing timestamp
- latency
- retry/fallback path
- error status

The router must prefer provider-reported token/cost usage when available. If not available, it must record an estimate with a clear `estimated` flag. The app must never silently present estimated cost as exact spend.

### Router/Gateway Options To Evaluate For Implementation

| Option | Fit | Why it matters |
|---|---|---|
| Internal SkillMall router + adapters | Required baseline | Keeps SkillMall's product behavior independent from a single gateway dependency and allows local/offline providers. |
| Internal SkillMall router + SQLite cost ledger | Required baseline | Default architecture. No hosted dependency, no extra SaaS cost, full app control. |
| LiteLLM Proxy / OSS components | Strong integration candidate | Broad provider support, proxy/gateway shape, cost tracking, budgets, rate limits, model routing. Evaluate as integrated local service/component or adapted code, not hosted SaaS. |
| Helicone OSS components | Integration/reference candidate | Useful observability/cost patterns and proxy mechanics. Evaluate OSS integration patterns if license/footprint fit. |
| Langfuse OSS components | Integration/reference candidate | Useful tracing/cost patterns and per-user/session metrics. Evaluate OSS integration patterns if license/footprint fit. |
| Portkey Gateway OSS components | Integration/reference candidate | Useful gateway/routing/guardrail patterns. Evaluate OSS integration patterns if license/footprint fit. |
| OpenRouter | Optional user-configured LLM provider only | Broad model gateway with pricing metadata and BYOK options, but not SkillMall infrastructure. User chooses it if they want gateway billing. |
| Vercel AI Gateway | Optional user-configured LLM provider only | Unified gateway/provider option, but not SkillMall infrastructure. User chooses it if they want it. |
| OpenTelemetry/OpenLLMetry | Observability candidate | Useful for vendor-neutral request/latency/token telemetry. |

Implementation posture:

- Build an internal router contract first.
- Allow routing through external gateways only as optional user-configured providers.
- Allow observability export/integration later only when embedded/local/open-source or explicitly approved.
- Use LiteLLM/Helicone/Langfuse/Portkey research to avoid reinventing cost tracking badly.
- Do not push cost tracking into leaf provider clients only.
- Do not require any hosted gateway/observability app for core SkillMall operation.
- Do not reject open-source gateway/router/proxy integration merely because it originated as a gateway project; evaluate whether it can be embedded, self-contained, or adapted into SkillMall.

### Secret Boundary Decision

The router/proxy/gateway is also the API-key protection boundary.

SkillMall application code should pass a provider/model request plus a credential reference to the router. It should not pass raw provider secrets through feature code, browser responses, or arbitrary server routes.

Required secret-boundary behavior:

- API keys and auth tokens live in the gateway/credential broker or official provider tool, not in feature code.
- Settings UI may initiate configuration and status checks, but must never echo secret values after entry.
- Provider routes return redacted credential state such as `configured`, `source`, `lastVerifiedAt`, and `expiresAt` when known.
- Feature code calls one router interface, not provider SDKs directly.
- The router attaches the credential at the final outbound call boundary.
- Logs and telemetry record credential source and provider, never credential value.
- Local development may use env vars as secret sources, but the router still treats them as references.
- Future keychain or hosted secret-manager storage plugs into the same credential-reference contract.

This means the router/gateway layer protects API keys and enables cost tracking at the same boundary. Those are not separate systems.

## Supportability Matrix

| Access path | Verdict | SkillMall-owned OAuth/token flow? | Credential owner | Local app | CI | Hosted app | Billing/usage bucket | UI label |
|---|---|---:|---|---:|---:|---:|---|---|
| OpenAI Platform API key | `API_ONLY` | No | User/server secret store | Yes | Yes | Yes | OpenAI Platform API billing | OpenAI API key |
| Codex ChatGPT managed sign-in through official Codex app-server/CLI | `SUPPORTED_APP_CONFIGURED` | SkillMall initiates app settings flow; Codex owns OAuth/token persistence | Codex CLI/app-server auth store | Yes | No, unless access token path is used | No | ChatGPT/Codex subscription/workspace controls | Codex ChatGPT session |
| Codex `CODEX_ACCESS_TOKEN` | `SUPPORTED_APP_CONFIGURED` | SkillMall configures token source; official Codex CLI consumes it | User/CI secret manager, or Codex auth storage after login | Yes | Yes, for trusted private runners | No | ChatGPT Enterprise/Codex workspace entitlement | Codex access token |
| Codex app-server `chatgptAuthTokens` | `MECHANISM_REVIEW_REQUIRED` | Potentially yes, if SkillMall becomes the host auth owner | Host app that already owns ChatGPT auth lifecycle | Candidate only after app-server review | Candidate only after app-server review | No | ChatGPT workspace if officially allowed | Codex external token lifecycle |
| Anthropic API key | `API_ONLY` | No | User/server secret store | Yes | Yes | Yes | Anthropic API billing | Anthropic API key |
| Anthropic Workload Identity Federation | `API_ONLY` | No; cloud identity exchange | Cloud identity provider + Anthropic service account | No, unless local IdP setup exists | Yes | Yes | Anthropic API billing | Anthropic WIF |
| Claude Code interactive Pro/Max/Team/Enterprise login | `SUPPORTED_APP_CONFIGURED` | SkillMall configures/verifies official Claude Code session; Claude Code owns OAuth | Claude Code credential store | Yes | No | No | Claude subscription usage | Claude Code session |
| Claude Code `CLAUDE_CODE_OAUTH_TOKEN` | `SUPPORTED_APP_CONFIGURED` | SkillMall configures token source; generated through official `claude setup-token` flow | User/CI secret manager or future approved app secret store | Yes | Yes | No for hosted shared app | Claude subscription token / future Agent SDK credit rules | Claude Code OAuth token |
| Claude Code `ANTHROPIC_AUTH_TOKEN` | `GATEWAY_ONLY` | No | User/gateway secret store | Yes, through Claude Code/gateway | Yes | Maybe, if gateway policy allows | Gateway/proxy bearer auth, not Claude Pro/Max subscription | Claude gateway bearer token |
| `ANTHROPIC_API_KEY` with Claude Code | `API_ONLY` | No | User/server secret store | Yes | Yes | Yes | Anthropic API billing; overrides subscription in Claude Code once approved | Anthropic API key |
| Claude Agent SDK subscription credit after 2026-06-15 | `UNKNOWN_BLOCKED` | Unknown until effective date and docs recheck | User/Anthropic account | Unknown | Unknown | Unknown | Future Agent SDK credit | Blocked until 2026-06-15 recheck |
| Gemini API key | `API_ONLY` | No | User/server secret store | Yes | Yes | Yes | Gemini API / Google Cloud project billing | Gemini API key |
| Groq API key | `API_ONLY` | No | User/server secret store | Yes | Yes | Yes | Groq API billing | Groq API key |
| Ollama local runtime | `LOCAL_RUNTIME` | No | No credential by default | Yes | Maybe, if runner hosts Ollama | No by default | Local machine resources | Ollama local |
| OpenRouter API key | `GATEWAY_ONLY` | No | User/server secret store | Yes | Yes | Yes | OpenRouter gateway billing/routing | OpenRouter gateway |
| Vercel AI Gateway key | `GATEWAY_ONLY` | No | User/server secret store | Yes | Yes | Yes | Vercel AI Gateway billing/routing | Vercel AI Gateway |
| LiteLLM/self-hosted gateway | `GATEWAY_ONLY` | No, unless gateway owns auth | Gateway operator | Yes | Yes | Yes, if secured | Gateway/operator policy | Custom gateway |
| Generic OpenAI-compatible endpoint | `GATEWAY_ONLY` | No | Endpoint operator/user secret store | Yes | Yes | Yes, if endpoint is trusted | Endpoint-specific | OpenAI-compatible endpoint |

## Comprehensive Provider Coverage Matrix

The implementation target is broad provider configuration, not a small provider handful. The first implementation PR does not need every provider fully wired if scope forces sequencing, but the registry contract and settings UX must be designed for this complete set from the start.

| Provider family | Required status | Access type | Model discovery policy | Notes |
|---|---|---|---|---|
| OpenAI Platform | Required | API key | Live `/v1/models` plus source-dated fallback | Distinct from ChatGPT/Codex subscription auth. |
| OpenAI Codex / ChatGPT session | Required | App-configured subscription/token/session | Official Codex status/app-server/CLI source, not generic OpenAI models | Must be configured from SkillMall. |
| Anthropic API | Required | API key / WIF | Official model endpoint/docs fallback | Distinct from Claude Code subscription auth. |
| Claude Code Pro/Max/Team/Enterprise | Required | App-configured subscription/token/session | Official Claude Code status/model source if available, fallback docs | Must be configured from SkillMall. |
| Google Gemini API | Required | API key | Gemini model API/docs with stable/preview labels | Distinct from Vertex AI. |
| Google Vertex AI | Required | Cloud identity/project | Model Garden/project-region availability | Cloud access, not generic Gemini key. |
| Azure OpenAI / Azure AI Foundry | Required | Azure resource/deployment | Azure resource/deployment list, not OpenAI `/v1/models` | Deployment names matter. |
| AWS Bedrock | Required | AWS IAM/cloud identity | `ListFoundationModels` with region/access filtering | Multi-provider cloud catalog. |
| Alibaba Cloud Model Studio / DashScope / Qwen | Required | API key/cloud account | DashScope/Model Studio model docs/API if available; otherwise source-dated fallback plus refresh hook | Must include Alicloud/Qwen. |
| DeepSeek | Required | API key | Official List Models endpoint | OpenAI/Anthropic-compatible API styles. |
| Kimi / Moonshot | Required | API key | Official `/v1/models` list | Include Kimi/Moonshot as native provider, not only gateway route. |
| Z.AI / GLM | Required | API key | Z.AI model matrix/API source; live endpoint if available | Include GLM/Z.AI as native provider. |
| MiniMax | Required | API key | MiniMax model docs/API source; live endpoint if available | Include MiniMax native API and compatibility mode. |
| Hugging Face Inference Providers | Required | HF token / provider routing | Hub `/api/models`, inference provider mapping, and/or `/v1/models` where available | Must support model/provider churn. |
| Mistral | Required | API key | Official models API/docs | Native provider. |
| Cohere | Required | API key | Official List Models endpoint | Native provider. |
| xAI | Required | API key | Official models endpoint | Native provider. |
| Groq | Required | API key | OpenAI-compatible `/models` | Native provider. |
| Together AI | Required | API key | Official models list | Broad open-model provider. |
| Fireworks AI | Required | API key/account | Account-scoped list models endpoint | Broad open-model provider. |
| Replicate | Required | API token | Replicate model API/official models collection | Not purely OpenAI-compatible; needs provider-specific adapter. |
| OpenRouter | Optional provider | Gateway API key | Gateway `/models` | Optional user-configured gateway provider, not SkillMall infrastructure. |
| Vercel AI Gateway | Optional provider | Gateway/API key | Gateway model/provider metadata | Optional user-configured gateway provider, not SkillMall infrastructure. |
| LiteLLM/self-hosted gateway | Required | Gateway/custom | Gateway `/models` or configured list | Useful for teams. |
| NVIDIA NIM | Required | API key/self-hosted/local cloud | `/v1/models` for loaded NIM models | Local/self-hosted/container runtime family. |
| Ollama | Required | Local runtime | `/api/tags` | Local runtime. |
| LM Studio / llama.cpp-compatible local servers | Required | Local runtime/custom OpenAI-compatible | `/v1/models` when available, otherwise manual | Local OpenAI-compatible runtime. |
| Custom OpenAI-compatible endpoint | Required | Custom endpoint/API key | `/models`, then manual fallback | Escape hatch for provider churn. |
| Baidu Qianfan / ERNIE | Planned/source review required | Cloud/API key | Source refresh required before implementation | Should be in registry backlog, not ignored. |
| Tencent Hunyuan | Planned/source review required | Cloud/API key | Source refresh required before implementation | Should be in registry backlog, not ignored. |

## Auto-Updating Model List Requirement

Every configured provider must implement one of these model-source modes:

| Mode | Meaning | Required behavior |
|---|---|---|
| `live` | Provider has a documented model-list endpoint and credentials are configured. | Fetch current models on demand, cache with timestamp, show source as live. |
| `account-scoped-live` | Provider model list depends on account, region, project, deployment, or model access approvals. | Fetch with account context and display account/region/deployment constraints. |
| `gateway-live` | Gateway has a model catalog independent from native provider APIs. | Fetch gateway model IDs and preserve gateway/upstream provider identity. |
| `local-live` | Local runtime lists installed/loaded models. | Query runtime endpoint and show unavailable/offline state when runtime is down. |
| `manual` | Custom endpoint cannot reliably list models. | Require model ID entry and optional test call. |
| `fallback` | No credential or endpoint available yet. | Use source-dated fallback only and mark it as stale-prone. |

Required cache contract:

- cache per provider, auth mode, account/region/project where relevant
- store `fetchedAt`, `source`, `providerVersion` if available, and `staleAfter`
- allow manual refresh from settings
- never treat fallback lists as current
- expose model status in the API response as `live`, `cached`, `stale`, `fallback`, or `manual`
- provider docs must include the model refresh behavior

## Direct Answers

### OpenAI/Codex Auth Token

Supportable as an app-configured auth-token/session provider.

SkillMall must expose a settings flow for Codex/ChatGPT subscription auth. The implementation should prefer official Codex app-server or CLI managed flows where Codex owns OAuth persistence and refresh. SkillMall owns the user-visible configuration flow, status, and connection test.

SkillMall should support:

- Codex managed ChatGPT sign-in through official Codex tooling or app-server from the application settings surface.
- Codex access tokens for trusted Enterprise local/CI workflows through `CODEX_ACCESS_TOKEN` or `codex login --with-access-token`, configured from the application settings surface.

`chatgptAuthTokens` needs mechanism review before implementation because current docs call it experimental and frame it for host apps that already own ChatGPT auth. That is a mechanism question, not a reason to drop app-configured Codex auth-token support.

### Anthropic Auth Token For Claude Code Pro/Max Users

There are two separate Anthropic token paths, and the application must configure the supportable one:

- `CLAUDE_CODE_OAUTH_TOKEN`: supportable as app-configured Claude Code auth. The token is generated by official `claude setup-token`; SkillMall should provide settings UX to detect, configure, validate, and use that token source without storing it in plaintext config.
- `ANTHROPIC_AUTH_TOKEN`: supportable only as a bearer-token/gateway mode for Claude Code terminal sessions. It is not the same thing as Claude Pro/Max subscription auth and should not be marketed as such.

SkillMall should not spoof Claude.ai login or extract Claude Code credential files. But it should absolutely expose application-side configuration for the official Claude Code Pro/Max token/session paths.

## Provider IDs

Use these IDs for the first implementation plan:

| Provider ID | Verdict | User-facing label |
|---|---|---|
| `openai-api` | `API_ONLY` | OpenAI API |
| `codex-chatgpt` | `SUPPORTED_APP_CONFIGURED` | Codex ChatGPT session |
| `codex-access-token` | `SUPPORTED_APP_CONFIGURED` | Codex access token |
| `anthropic-api` | `API_ONLY` | Anthropic API |
| `anthropic-wif` | `API_ONLY` | Anthropic Workload Identity |
| `claude-code-cli` | `SUPPORTED_APP_CONFIGURED` | Claude Code session |
| `claude-code-oauth-token` | `SUPPORTED_APP_CONFIGURED` | Claude Code OAuth token |
| `claude-gateway-bearer` | `GATEWAY_ONLY` | Claude gateway bearer token |
| `gemini-api` | `API_ONLY` | Gemini API |
| `groq-api` | `API_ONLY` | Groq API |
| `ollama-local` | `LOCAL_RUNTIME` | Ollama local |
| `openrouter-gateway` | `GATEWAY_ONLY` | OpenRouter gateway |
| `vercel-ai-gateway` | `GATEWAY_ONLY` | Vercel AI Gateway |
| `custom-openai-compatible` | `GATEWAY_ONLY` | OpenAI-compatible endpoint |
| `alicloud-dashscope` | `API_ONLY` | Alibaba Cloud Model Studio / DashScope |
| `huggingface-inference` | `GATEWAY_ONLY` | Hugging Face Inference Providers |
| `deepseek-api` | `API_ONLY` | DeepSeek API |
| `kimi-moonshot-api` | `API_ONLY` | Kimi / Moonshot API |
| `zai-api` | `API_ONLY` | Z.AI / GLM API |
| `minimax-api` | `API_ONLY` | MiniMax API |
| `mistral-api` | `API_ONLY` | Mistral API |
| `cohere-api` | `API_ONLY` | Cohere API |
| `xai-api` | `API_ONLY` | xAI API |
| `aws-bedrock` | `SUPPORTED_DIRECT` | AWS Bedrock |
| `azure-openai` | `SUPPORTED_DIRECT` | Azure OpenAI / Azure AI Foundry |
| `vertex-ai` | `SUPPORTED_DIRECT` | Google Vertex AI |
| `together-api` | `API_ONLY` | Together AI |
| `fireworks-api` | `API_ONLY` | Fireworks AI |
| `replicate-api` | `API_ONLY` | Replicate |
| `nvidia-nim` | `LOCAL_RUNTIME` | NVIDIA NIM |
| `lmstudio-local` | `LOCAL_RUNTIME` | LM Studio local |
| `baidu-qianfan` | `MECHANISM_REVIEW_REQUIRED` | Baidu Qianfan / ERNIE |
| `tencent-hunyuan` | `MECHANISM_REVIEW_REQUIRED` | Tencent Hunyuan |

Do not use `openai`, `anthropic`, or `claude` as ambiguous provider IDs.

## Credential Storage Decision

First provider/auth recovery PR should use this policy:

- `~/.skill-mall/config.json`: non-secret preferences only.
- `.env.local`: may be read by the app, but the web settings UI must not write provider secrets into it.
- API keys/tokens: read from environment variables or from official delegated tools only.
- Official CLI sessions: do not inspect credential files; call the tool or its supported status interface.
- Browser/API responses: never include raw secrets.
- Logs: redact any value matching known key/token shapes and never log request bodies from configure endpoints.

Keychain-backed local storage can be a later enhancement, but it is not required to start recovery. If built later, it needs its own focused implementation PR because native keychain dependencies affect packaging, CI, and CLI/web parity.

## Model Discovery Decision

| Provider type | Discovery policy |
|---|---|
| OpenAI API | Use live `/v1/models` when an API key is present; otherwise source-dated fallback. |
| Codex delegated | Ask official Codex tooling/app-server for account/model state if supported; otherwise source-dated fallback. |
| Anthropic API | Use official API model discovery if available in installed SDK/docs; otherwise source-dated fallback. |
| Claude Code delegated | Prefer official Claude Code model/status commands or app status if available; otherwise source-dated fallback. |
| Gemini API | Use model API/docs with stable/preview/latest/experimental labels preserved. |
| Groq API | Use live OpenAI-compatible `/models` endpoint with `GROQ_API_KEY`. |
| Ollama | Use local `/api/tags`. |
| OpenRouter/Vercel gateways | Use gateway model APIs where available; label gateway and upstream provider distinctly. |
| Custom OpenAI-compatible | Try `/models`; if unavailable, require manual model entry. |

## Usage And Cost Accounting Decision

SkillMall must persist usage and cost telemetry locally for every LLM call made by the app.

Minimum storage target:

- SQLite table for LLM requests
- SQLite table or source registry for model pricing snapshots
- aggregation queries by provider, model, feature, day, and workflow
- UI/API surface to inspect recent spend and token usage

Cost precedence:

1. Provider/gateway-reported exact cost.
2. Provider/gateway-reported token usage plus current pricing snapshot.
3. Router-estimated token usage plus current pricing snapshot.
4. Unknown cost with reason, never silently zero.

Pricing source precedence:

1. Provider/gateway pricing returned by API for the exact model/request.
2. Provider official pricing/model endpoint.
3. Gateway model catalog pricing, clearly labeled as gateway pricing.
4. Source-dated manual pricing fallback.
5. Unknown.

Hard requirement:

No LLM request should leave the router without a usage record unless the app is in an explicit test/mock mode.

## Credential Broker Contract

The provider/auth implementation must introduce a credential broker abstraction.

Credential reference examples:

- `env:OPENAI_API_KEY`
- `env:ANTHROPIC_API_KEY`
- `env:CODEX_ACCESS_TOKEN`
- `env:CLAUDE_CODE_OAUTH_TOKEN`
- `official-tool:codex`
- `official-tool:claude-code`
- `keychain:<provider-id>`
- `gateway:<gateway-id>:<virtual-key-id>`
- `manual:none` for local runtimes

The broker must answer:

- is a credential configured?
- where is it sourced from?
- is it expired or unverifiable?
- when was it last verified?
- which provider/auth mode can use it?
- can it be used in local, CI, or hosted mode?

The broker must not expose:

- raw API keys
- raw OAuth tokens
- provider credential-file contents
- browser/session cookies

First implementation can use env and official-tool credential references only if keychain/gateway-backed secrets are too large for the first PR, but the contract must be broker-shaped from the start.

All model lists in UI must show one of:

- `live`
- `cached`
- `fallback`
- `manual`

## UX Contract

Settings must group access types:

1. Subscription/token/session tools
   - Codex ChatGPT session
   - Codex access token
   - Claude Code session
   - Claude Code OAuth token
2. API access
   - OpenAI API
   - Anthropic API
   - Gemini API
   - Groq API
3. Gateways/endpoints
   - OpenRouter
   - Vercel AI Gateway
   - Claude gateway bearer
   - custom OpenAI-compatible endpoint
4. Local runtime
   - Ollama
5. Advanced/cloud identity
   - Anthropic WIF

Required warning copy:

- OpenAI API: "Uses OpenAI Platform API billing, not your ChatGPT/Codex subscription."
- Codex ChatGPT session: "Uses official Codex ChatGPT sign-in/session. Configure and verify this from SkillMall."
- Codex access token: "For trusted private automation with Codex access-token permission. Configure and verify this from SkillMall. Not a Platform API key."
- Anthropic API: "Uses Anthropic API billing, not your Claude Pro/Max subscription."
- Claude Code session: "Uses official Claude Code auth. Configure and verify this from SkillMall. If `ANTHROPIC_API_KEY` is active, Claude Code may use API billing instead."
- Claude Code OAuth token: "Generated by `claude setup-token`; configure and verify this from SkillMall without plaintext local config storage."
- Claude gateway bearer: "Bearer token for a gateway/proxy. Not Claude Pro/Max subscription auth."
- Gateways: "Uses gateway billing/routing and gateway data policy."
- Ollama: "Uses local runtime and locally installed models."

## Dirty File Disposition

Provider/auth dirty files remain `REWORK`.

| File | Disposition |
|---|---|
| `app/api/providers/configure/route.ts` | Replace with contract that stores non-secret preferences and validates env/delegated status. |
| `app/api/providers/route.ts` | Replace around the new registry and supportability statuses. |
| `app/settings/providers/page.tsx` | Rebuild around grouped access types and billing/auth warnings. |
| `lib/providers/__tests__/config-resolution.test.ts` | Rewrite under provider IDs and credential-source policy. |
| `lib/providers/__tests__/providers.test.ts` | Rewrite for explicit API/delegated/gateway/local providers. |
| `lib/providers/__tests__/catalog.test.ts` | Rewrite after registry contract. |
| `lib/providers/defaults.ts` | Replace static provider defaults with source-dated fallback models. |
| `lib/providers/index.ts` | Rework resolver/client factory around auth modes. |
| `lib/providers/types.ts` | Replace ambiguous provider union with explicit provider/auth/model-source types. |
| `lib/providers/anthropic.ts` | Keep concept only as `anthropic-api`; do not frame as Claude account auth. |
| `lib/providers/catalog.ts` | Replace with explicit registry and model-source policy. |
| `lib/providers/config-store.ts` | Replace or narrow to non-secret preferences only. |

## Implementation Recommendation

After approval, implement one focused provider/auth PR with these constraints:

Allowed first PR scope:

- provider/auth type taxonomy
- broad provider registry that includes the comprehensive provider matrix above
- non-secret config resolver
- app-side configuration flows for Codex ChatGPT session/access-token paths using official Codex mechanisms
- app-side configuration flows for Claude Code session/`CLAUDE_CODE_OAUTH_TOKEN` paths using official Claude Code mechanisms
- status checks and connection tests for Codex and Claude Code auth-token/session paths
- explicit API/gateway/local provider labels
- per-provider model-source contract with live/cached/fallback/manual status
- settings API response contract
- router/proxy/gateway architecture contract
- usage/cost event schema
- credential broker contract and redacted credential-status API
- tests for supportability decisions and credential-source precedence
- docs updates for provider setup and billing labels

Not in first PR:

- unsupported or experimental `chatgptAuthTokens` until mechanism review proves it fits SkillMall
- spoofed Claude.ai login or direct Claude credential-file extraction
- raw token storage
- keychain storage
- hosted production secrets UI
- hosted gateway/observability dependency
- any required extra-cost SaaS layer
- rejecting useful open-source router/proxy/gateway code instead of evaluating integration
- cleanup of unrelated preview-repair files
- pretending a narrow five-provider catalog satisfies the provider requirement
- bypassing the router with direct provider calls that cannot be measured

## Hard Stop Rules

- If implementation requires SkillMall to read `~/.codex/auth.json` or Claude credential files, stop.
- If implementation requires SkillMall to store raw ChatGPT, Claude, Codex, or API secrets in `~/.skill-mall/config.json`, stop.
- If implementation tries to market API-key access as subscription access, stop.
- If implementation tries to use `ANTHROPIC_AUTH_TOKEN` as Claude Pro/Max subscription auth, stop.
- If implementation omits app-side configuration for Codex auth tokens or Claude Code Pro/Max token/session paths, stop.
- If implementation tries to build `chatgptAuthTokens` before mechanism review proves SkillMall can be an official host app for that flow, stop.
- If implementation omits Alicloud/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, or DeepSeek from the provider registry target, stop.
- If implementation treats static hardcoded model lists as current provider catalogs, stop.
- If implementation does not define an LLM router/proxy/gateway layer, stop.
- If implementation cannot record token and cost usage per LLM request, stop.
- If implementation routes provider calls directly from feature code in a way that bypasses usage/cost accounting, stop.
- If implementation routes raw API keys or auth tokens through feature code instead of a credential broker/gateway boundary, stop.
- If implementation requires a hosted gateway, hosted observability app, or extra paid SaaS layer for core provider/auth operation, stop.
- If implementation refuses to evaluate OSS router/proxy/gateway integration and instead hand-rolls everything without justification, stop.
- If implementation discovers official docs have changed, update this report once and continue from the updated decision.
