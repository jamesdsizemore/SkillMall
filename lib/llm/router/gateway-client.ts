import { ConfigError, type CompletionOptions, type LLMClient, type ProviderConfig } from '../../providers/types'
import { assertLocalBifrostBaseURL, BifrostLocalGatewayAdapter, type GatewayCompletionResult } from './gateway-adapter'
import { resolveEnvSecret } from './secret-refs'

export interface GatewayBackedLLMClient extends LLMClient {
  completeWithMetadata(prompt: string, options?: CompletionOptions): Promise<GatewayCompletionResult>
}

export type GatewayLLMClientFactory = (config: ProviderConfig) => GatewayBackedLLMClient

function resolveGatewayVirtualKey(config: ProviderConfig): string {
  if (config.authMode !== 'gateway_virtual_key' || config.secretRef?.type !== 'gateway_virtual_key_ref') {
    throw new ConfigError('bifrost_local requires gateway_virtual_key auth with a gateway virtual key ref')
  }

  const value = resolveEnvSecret(config.secretRef.name)
  if (!value) {
    throw new ConfigError(`Missing gateway virtual key environment variable: ${config.secretRef.name}`)
  }
  return value
}

export function createGatewayLLMClient(config: ProviderConfig): GatewayBackedLLMClient {
  if (config.gatewayBackend !== 'bifrost_local') {
    throw new ConfigError(`Unsupported gateway backend: ${String(config.gatewayBackend)}`)
  }
  assertLocalBifrostBaseURL(config.baseURL)

  const adapter = new BifrostLocalGatewayAdapter(config, resolveGatewayVirtualKey(config))

  return {
    provider: config.provider,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      const result = await adapter.complete({ prompt, options })
      return result.text
    },
    async completeWithMetadata(prompt: string, options?: CompletionOptions): Promise<GatewayCompletionResult> {
      return adapter.complete({ prompt, options })
    },
  }
}
