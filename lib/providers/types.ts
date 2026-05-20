import type { GatewayBackend, LLMAuthMode, SecretRef } from '../llm/router/types'

export type ProviderID = 'openai' | 'anthropic' | 'claude-code' | 'gemini' | 'groq' | 'ollama'

export interface ProviderConfig {
  provider: ProviderID
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
