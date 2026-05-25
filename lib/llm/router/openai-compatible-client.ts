import { ConfigError, type CompletionOptions, type ProviderConfig } from '../../providers/types'
import { readProviderSecret } from '../../providers/secret-store'
import type { GatewayBackedLLMClient } from './gateway-client'
import type { GatewayCompletionResult, GatewayUsageMetadata } from './gateway-adapter'
import { resolveEnvSecret } from './secret-refs'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

type OpenAICompatibleResponse = {
  id?: string
  choices?: Array<{ message?: { content?: string | null }; text?: string | null }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    input_tokens?: number
    output_tokens?: number
    prompt_tokens_details?: { cached_tokens?: number }
    completion_tokens_details?: { reasoning_tokens?: number }
    cost?: number
    total_cost?: number
  }
  cost?: number
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function numeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function textFromResponse(data: OpenAICompatibleResponse): string {
  const choice = data.choices?.[0]
  return choice?.message?.content ?? choice?.text ?? ''
}

function usageFromResponse(data: OpenAICompatibleResponse): GatewayUsageMetadata | undefined {
  const usage = data.usage
  if (!usage) return undefined

  return {
    inputTokens: usage.prompt_tokens ?? usage.input_tokens,
    outputTokens: usage.completion_tokens ?? usage.output_tokens,
    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
  }
}

function costFromResponse(data: OpenAICompatibleResponse, headers: Headers): number | undefined {
  return (
    numeric(data.cost) ??
    numeric(data.usage?.cost) ??
    numeric(data.usage?.total_cost) ??
    numeric(headers.get('x-litellm-response-cost')) ??
    numeric(headers.get('x-openai-compatible-response-cost'))
  )
}

function resolveApiKey(config: ProviderConfig): string {
  if (config.apiKey) return config.apiKey
  if (config.authMode !== 'env_key') {
    throw new ConfigError('OpenAI-compatible registry execution requires env_key auth')
  }

  const value =
    config.secretRef?.type === 'env'
      ? resolveEnvSecret(config.secretRef.name)
      : config.secretRef?.type === 'stored_provider_secret' && config.secretRef.secretType === 'api_key'
        ? readProviderSecret(config.secretRef.id)
        : undefined
  if (!value) throw new ConfigError('Missing API key for OpenAI-compatible provider')
  return value
}

export function createOpenAICompatibleLLMClient(
  config: ProviderConfig,
  fetchFn: FetchLike = fetch
): GatewayBackedLLMClient {
  if (config.executionKind !== 'openai_compatible') {
    throw new ConfigError('OpenAI-compatible client requires executionKind=openai_compatible')
  }
  if (!config.providerRegistryId) {
    throw new ConfigError('OpenAI-compatible client requires providerRegistryId')
  }
  if (!config.baseURL) {
    throw new ConfigError('OpenAI-compatible client requires a configured baseURL')
  }

  const apiKey = resolveApiKey(config)
  const baseURL = trimTrailingSlash(config.baseURL)

  async function completeWithMetadata(prompt: string, options?: CompletionOptions): Promise<GatewayCompletionResult> {
    const response = await fetchFn(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          ...(options?.systemPrompt
            ? [{ role: 'system' as const, content: options.systemPrompt }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.2,
        response_format:
          options?.responseFormat === 'json_object'
            ? { type: 'json_object' as const }
            : undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI-compatible provider request failed: HTTP ${response.status}`)
    }

    const data = (await response.json()) as OpenAICompatibleResponse
    const actualCostUsd = costFromResponse(data, response.headers)

    return {
      text: textFromResponse(data),
      usage: usageFromResponse(data),
      actualCostUsd,
      costSource: actualCostUsd === undefined ? undefined : 'openai_compatible',
      metadata: {
        providerRegistryId: config.providerRegistryId,
        executionKind: 'openai_compatible',
        responseId: data.id,
      },
    }
  }

  return {
    provider: config.provider,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      return (await completeWithMetadata(prompt, options)).text
    },
    completeWithMetadata,
  }
}
