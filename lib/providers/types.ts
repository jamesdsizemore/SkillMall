export type ProviderID = 'openai' | 'claude-code' | 'gemini' | 'groq' | 'ollama'

export interface ProviderConfig {
  provider: ProviderID
  apiKey?: string
  model: string
  baseURL?: string
}

export interface CompletionOptions {
  maxTokens?: number
  temperature?: number
  responseFormat?: 'text' | 'json_object'
  systemPrompt?: string
  timeoutMs?: number
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
