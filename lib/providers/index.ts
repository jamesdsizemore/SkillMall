import { OpenAIClient } from './openai'
import { CodexClient } from './codex'
import { AnthropicClient } from './anthropic'
import { ClaudeCodeClient } from './claude-code'
import { GeminiClient } from './gemini'
import { GroqClient } from './groq'
import { OllamaClient } from './ollama'
import { ConfigError } from './types'
import type { LLMClient, ProviderConfig } from './types'
import { createRouterLLMClient } from '../llm/router/create-client'
import { resolveRouterProviderConfig } from '../llm/router/config'
import { resolveEnvSecret } from '../llm/router/secret-refs'
import { readProviderSecret } from './secret-store'

export { ConfigError } from './types'
export type { LLMClient, ProviderConfig, ProviderID, CompletionOptions } from './types'

function resolveApiKeyForRouterConfig(config: ProviderConfig): string | undefined {
  if (config.apiKey) return config.apiKey
  if (config.authMode !== 'env_key') return undefined
  const value =
    config.secretRef?.type === 'env'
      ? resolveEnvSecret(config.secretRef.name)
      : config.secretRef?.type === 'stored_provider_secret' && config.secretRef.secretType === 'api_key'
        ? readProviderSecret(config.secretRef.id)
        : undefined
  if (!value) {
    throw new ConfigError('Missing API key for configured provider')
  }
  return value
}

function assertKnownProvider(provider: string): void {
  if (!['openai', 'codex', 'anthropic', 'claude-code', 'gemini', 'groq', 'ollama'].includes(provider)) {
    throw new Error(`Unknown provider: ${provider}`)
  }
}

/** Create a direct LLMClient for the given provider configuration. */
export function createDirectLLMClient(config: ProviderConfig): LLMClient {
  const directConfig = {
    ...config,
    apiKey: resolveApiKeyForRouterConfig(config),
  }

  switch (config.provider) {
    case 'openai':
      return new OpenAIClient(directConfig)
    case 'codex':
      return new CodexClient(directConfig)
    case 'anthropic':
      return new AnthropicClient(directConfig)
    case 'claude-code':
      return new ClaudeCodeClient(directConfig)
    case 'gemini':
      return new GeminiClient(directConfig)
    case 'groq':
      return new GroqClient(directConfig)
    case 'ollama':
      return new OllamaClient(directConfig)
    default: {
      const _exhaustive: never = config.provider
      throw new Error(`Unknown provider: ${_exhaustive}`)
    }
  }
}

/** Create an LLMClient for the given provider configuration. */
export function createLLMClient(config: ProviderConfig): LLMClient {
  assertKnownProvider(config.provider)
  return createRouterLLMClient(config, createDirectLLMClient)
}

/**
 * Resolve provider config from env vars or ~/.skill-mall/config.json.
 * Resolution order: SKILL_MALL_PROVIDER env var → config file.
 * Throws ConfigError if no provider is configured.
 */
export function resolveProviderConfig(): ProviderConfig {
  const routerConfig = resolveRouterProviderConfig()
  return {
    provider: routerConfig.provider,
    providerRegistryId: routerConfig.providerRegistryId,
    executionKind: routerConfig.executionKind,
    model: routerConfig.model,
    baseURL: routerConfig.baseURL,
    authMode: routerConfig.authMode,
    secretRef: routerConfig.secretRef,
    gatewayBackend: routerConfig.gatewayBackend,
    routingPolicyId: routerConfig.routingPolicyId,
    apiKey: resolveApiKeyForRouterConfig(routerConfig as ProviderConfig),
  }
}
