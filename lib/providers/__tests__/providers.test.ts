import { describe, it, expect } from 'vitest'
import { createLLMClient } from '../index'
import { OpenAIClient } from '../openai'
import { ClaudeCodeClient } from '../claude-code'
import { GeminiClient } from '../gemini'
import { GroqClient } from '../groq'
import { OllamaClient } from '../ollama'

describe('createLLMClient', () => {
  it('returns OpenAIClient for openai provider', () => {
    const client = createLLMClient({ provider: 'openai', apiKey: 'test-key', model: 'gpt-4o' })
    expect(client).toBeInstanceOf(OpenAIClient)
    expect(client.provider).toBe('openai')
  })

  it('returns ClaudeCodeClient for claude-code provider (no apiKey required)', () => {
    const client = createLLMClient({ provider: 'claude-code', model: 'claude-sonnet-4-6' })
    expect(client).toBeInstanceOf(ClaudeCodeClient)
    expect(client.provider).toBe('claude-code')
  })

  it('returns GeminiClient for gemini provider', () => {
    const client = createLLMClient({ provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.0-flash-exp' })
    expect(client).toBeInstanceOf(GeminiClient)
    expect(client.provider).toBe('gemini')
  })

  it('returns GroqClient for groq provider', () => {
    const client = createLLMClient({ provider: 'groq', apiKey: 'test-key', model: 'llama-3.3-70b-versatile' })
    expect(client).toBeInstanceOf(GroqClient)
    expect(client.provider).toBe('groq')
  })

  it('returns OllamaClient for ollama provider (no apiKey required)', () => {
    const client = createLLMClient({ provider: 'ollama', model: 'llama3.1' })
    expect(client).toBeInstanceOf(OllamaClient)
    expect(client.provider).toBe('ollama')
  })

  it('throws for unknown provider', () => {
    expect(() =>
      createLLMClient({ provider: 'unknown' as never, model: 'x' })
    ).toThrow('Unknown provider')
  })

  it('claude-code client has no anthropic import', () => {
    // This is a structural guarantee tested at build time via grep in verify.
    // Here we confirm the instance works without an apiKey.
    const client = createLLMClient({ provider: 'claude-code', model: 'claude-sonnet-4-6' })
    expect(client.provider).toBe('claude-code')
  })
})
