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
import { readStoredApiKeySync } from './secret-store'

export { ConfigError } from './types'
export type { LLMClient, ProviderConfig, ProviderID, CompletionOptions } from './types'

function resolveApiKeyForRouterConfig(config: ProviderConfig): string | undefined {
  if (config.apiKey) return config.apiKey
  if (config.authMode !== 'env_key') return undefined
  if (config.secretRef?.type === 'stored_api_key') {
    const value = readStoredApiKeySync(config.secretRef.id)
    if (!value) throw new ConfigError(`Missing stored API key: ${config.secretRef.id}`)
    return value
  }
  if (config.secretRef?.type === 'env') {
    const value = resolveEnvSecret(config.secretRef.name)
    if (!value) throw new ConfigError(`Missing API key environment variable: ${config.secretRef.name}`)
    return value
  }
  return undefined
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
 * Resolve provider config from ~/.skill-mall/config.json for app runtime.
 * The Provider Center must be able to activate saved credentials even when
 * local development env vars exist as old bootstrap defaults.
 * Throws ConfigError if no provider is configured.
 */
export function resolveProviderConfig(): ProviderConfig {
  const routerConfig = resolveRouterProviderConfig({ preferStoredConfig: true })
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
    apiKey:
      routerConfig.authMode === 'env_key' && routerConfig.secretRef?.type === 'env'
        ? resolveEnvSecret(routerConfig.secretRef.name)
        : routerConfig.authMode === 'env_key' && routerConfig.secretRef?.type === 'stored_api_key'
          ? readStoredApiKeySync(routerConfig.secretRef.id)
        : undefined,
  }
}
