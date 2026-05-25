import type { GatewayBackend, LLMAuthMode, RouterExecutionKind, SecretRef } from '../llm/router/types'

export type ProviderID = 'openai' | 'codex' | 'anthropic' | 'claude-code' | 'gemini' | 'groq' | 'ollama'

export type ProviderRegistryID =
  | 'openai'
  | 'openai_codex'
  | 'anthropic'
  | 'claude_code'
  | 'gemini'
  | 'groq'
  | 'ollama'
  | 'openrouter'
  | 'alibaba_dashscope_qwen'
  | 'huggingface'
  | 'zai'
  | 'minimax'
  | 'kimi_moonshot'
  | 'deepseek'
  | 'mistral'
  | 'cohere'
  | 'xai'
  | 'aws_bedrock'
  | 'azure_openai'
  | 'google_vertex_ai'
  | 'together_ai'
  | 'fireworks'
  | 'replicate'
  | 'nvidia_nim'
  | 'perplexity'
  | 'deepinfra'
  | 'cerebras'
  | 'custom_openai_compatible'

export type ProviderAccessMode =
  | 'api_access'
  | 'provider_account_auth'
  | 'local_tool_session'
  | 'local_runtime'
  | 'gateway_virtual_key'
  | 'cloud_project'
  | 'custom_openai_compatible'

export type ProviderDiscoveryStrategy =
  | 'openai_compatible_models'
  | 'official_provider_models'
  | 'account_scoped_models'
  | 'cloud_project_scoped_models'
  | 'local_runtime_models'
  | 'source_backed_static_models'
  | 'manual_custom_models'
  | 'static_fallback_only'
  | 'planned_provider_source_review'

export type ProviderRegistryStatus =
  | 'active_configurable'
  | 'status_only'
  | 'planned_source_review'

export type ProviderRegistryClassification =
  | 'active_configurable'
  | 'provider_account_auth'
  | 'gateway_configurable_openai_compatible'
  | 'local_tool_session'
  | 'local_runtime'
  | 'cloud_project_required'
  | 'custom_openai_compatible'
  | 'planned_provider_source_review'

export interface ProviderGatewayProfile {
  kind: 'openai_compatible' | 'bifrost_local'
  defaultBaseUrl?: string
  requiresUserEndpoint?: boolean
  note: string
}

export interface ProviderRegistryEntry {
  id: ProviderRegistryID
  name: string
  accessModes: ProviderAccessMode[]
  accessLabel: string
  authLabel: string
  setupUrl: string
  officialSourceUrl: string
  discoveryStrategy: ProviderDiscoveryStrategy
  status: ProviderRegistryStatus
  classification: ProviderRegistryClassification
  liveCallable: boolean
  executableProviderId?: ProviderID
  gatewayProfile?: ProviderGatewayProfile
  fallbackModels: string[]
  registryInclusionNote: string
  evidenceNote: string
}

export interface ProviderConfig {
  provider: ProviderID
  providerRegistryId?: ProviderRegistryID
  executionKind?: RouterExecutionKind
  apiKey?: string
  model: string
  baseURL?: string
  authMode?: LLMAuthMode
  secretRef?: SecretRef
  gatewayBackend?: GatewayBackend
  routingPolicyId?: string
}

export interface CompletionOptions {
  maxTokens?: number
  temperature?: number
  responseFormat?: 'text' | 'json_object'
  systemPrompt?: string
  timeoutMs?: number
  operation?: string
  metadata?: Record<string, unknown>
}

export interface LLMClient {
  complete(prompt: string, options?: CompletionOptions): Promise<string>
  readonly provider: ProviderID
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}
