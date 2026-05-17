import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMClient, ProviderConfig, CompletionOptions } from './types'

export class GeminiClient implements LLMClient {
  readonly provider = 'gemini' as const
  private genAI: GoogleGenerativeAI
  private model: string

  constructor(config: ProviderConfig) {
    if (!config.apiKey) throw new Error('Gemini requires an API key')
    this.genAI = new GoogleGenerativeAI(config.apiKey)
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.2,
        ...(options?.responseFormat === 'json_object'
          ? { responseMimeType: 'application/json' }
          : {}),
      },
    })

    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt

    const result = await model.generateContent(fullPrompt)
    return result.response.text()
  }
}
