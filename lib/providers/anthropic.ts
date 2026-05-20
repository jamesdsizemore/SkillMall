import type { LLMClient, ProviderConfig, CompletionOptions } from './types'

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>
  error?: { message?: string }
}

export class AnthropicClient implements LLMClient {
  readonly provider = 'anthropic' as const
  private apiKey: string
  private model: string

  constructor(config: ProviderConfig) {
    if (!config.apiKey) throw new Error('Anthropic requires an API key')
    this.apiKey = config.apiKey
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.2,
        ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = (await res.json().catch(() => ({}))) as AnthropicMessageResponse
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Anthropic API error: HTTP ${res.status}`)
    }

    return data.content
      ?.filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
      .trim() ?? ''
  }
}
