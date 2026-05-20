import type { CompletionOptions, ProviderConfig, ProviderID } from '../../providers/types'

export interface GatewayUsageMetadata {
  inputTokens?: number
  outputTokens?: number
  cachedInputTokens?: number
  reasoningTokens?: number
}

export interface GatewayCompletionResult {
  text: string
  usage?: GatewayUsageMetadata
  actualCostUsd?: number
  estimatedCostUsd?: number
  costSource?: string
  metadata?: Record<string, unknown>
}

export interface GatewayCompletionInput {
  prompt: string
  options?: CompletionOptions
}

export interface GatewayAdapter {
  readonly provider: ProviderID
  complete(input: GatewayCompletionInput): Promise<GatewayCompletionResult>
}

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
  bifrost?: { cost?: number }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function assertLocalBifrostBaseURL(value: string | undefined): string | undefined {
  if (!value) return undefined
  const parsed = new URL(value)
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
  if (!localHosts.has(parsed.hostname)) {
    throw new Error('bifrost_local baseURL must point to localhost, 127.0.0.1, or ::1')
  }
  return value
}

function numeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function costFromResponse(data: OpenAICompatibleResponse, headers: Headers): number | undefined {
  return (
    numeric(data.cost) ??
    numeric(data.bifrost?.cost) ??
    numeric(data.usage?.cost) ??
    numeric(data.usage?.total_cost) ??
    numeric(headers.get('x-bifrost-response-cost')) ??
    numeric(headers.get('x-litellm-response-cost'))
  )
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

export class BifrostLocalGatewayAdapter implements GatewayAdapter {
  readonly provider: ProviderID
  private readonly model: string
  private readonly baseURL: string
  private readonly virtualKey: string
  private readonly fetchFn: FetchLike

  constructor(config: ProviderConfig, virtualKey: string, fetchFn: FetchLike = fetch) {
    if (!virtualKey.trim()) throw new Error('Bifrost virtual key is required')
    this.provider = config.provider
    this.model = config.model
    this.baseURL = trimTrailingSlash(assertLocalBifrostBaseURL(config.baseURL) ?? 'http://localhost:8080/v1')
    this.virtualKey = virtualKey
    this.fetchFn = fetchFn
  }

  async complete(input: GatewayCompletionInput): Promise<GatewayCompletionResult> {
    const response = await this.fetchFn(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.virtualKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(input.options?.systemPrompt
            ? [{ role: 'system' as const, content: input.options.systemPrompt }]
            : []),
          { role: 'user' as const, content: input.prompt },
        ],
        max_tokens: input.options?.maxTokens ?? 4096,
        temperature: input.options?.temperature ?? 0.2,
        response_format:
          input.options?.responseFormat === 'json_object'
            ? { type: 'json_object' as const }
            : undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(`Bifrost gateway request failed: HTTP ${response.status}`)
    }

    const data = (await response.json()) as OpenAICompatibleResponse
    const actualCostUsd = costFromResponse(data, response.headers)

    return {
      text: textFromResponse(data),
      usage: usageFromResponse(data),
      actualCostUsd,
      costSource: actualCostUsd === undefined ? undefined : 'bifrost',
      metadata: {
        gatewayResponseId: data.id,
        gatewayBackend: 'bifrost_local',
      },
    }
  }
}
