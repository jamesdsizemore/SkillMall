import type { ProviderID } from './types'

export const DEFAULT_MODELS: Record<ProviderID, string> = {
  openai: 'gpt-4o',
  'claude-code': 'claude-sonnet-4-6',
  gemini: 'gemini-2.0-flash-exp',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.1',
}
