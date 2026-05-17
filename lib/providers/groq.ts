import OpenAI from 'openai'
import type { LLMClient, ProviderConfig, CompletionOptions } from './types'

export class GroqClient implements LLMClient {
  readonly provider = 'groq' as const
  private client: OpenAI
  private model: string

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? 'https://api.groq.com/openai/v1',
    })
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.2,
      response_format:
        options?.responseFormat === 'json_object'
          ? { type: 'json_object' as const }
          : undefined,
    })
    return response.choices[0].message.content ?? ''
  }
}
