import { describe, it, expect } from 'vitest'
import { createDirectLLMClient, createLLMClient } from '../index'
import { OpenAIClient } from '../openai'
import { AnthropicClient } from '../anthropic'
import { ClaudeCodeClient } from '../claude-code'
import { GeminiClient } from '../gemini'
import { GroqClient } from '../groq'
import { OllamaClient } from '../ollama'

describe('createLLMClient', () => {
  it('returns router-compatible client for openai provider', () => {
    const client = createLLMClient({ provider: 'openai', apiKey: 'test-key', model: 'gpt-4o' })
    expect(client.provider).toBe('openai')
  })

  it('returns router-compatible client for anthropic provider', () => {
    const client = createLLMClient({ provider: 'anthropic', apiKey: 'anthropic-test-token', model: 'claude-sonnet-4-20250514' })
    expect(client.provider).toBe('anthropic')
  })

  it('returns router-compatible client for claude-code provider (no apiKey required)', () => {
    const client = createLLMClient({ provider: 'claude-code', model: 'claude-sonnet-4-6' })
    expect(client.provider).toBe('claude-code')
  })

  it('returns router-compatible client for gemini provider', () => {
    const client = createLLMClient({ provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.0-flash-exp' })
    expect(client.provider).toBe('gemini')
  })

  it('returns router-compatible client for groq provider', () => {
    const client = createLLMClient({ provider: 'groq', apiKey: 'test-key', model: 'llama-3.3-70b-versatile' })
    expect(client.provider).toBe('groq')
  })

  it('returns router-compatible client for ollama provider (no apiKey required)', () => {
    const client = createLLMClient({ provider: 'ollama', model: 'llama3.1' })
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

describe('createDirectLLMClient', () => {
  it('constructs OpenAIClient for openai provider', () => {
    expect(createDirectLLMClient({ provider: 'openai', apiKey: 'test-key', model: 'gpt-4o' })).toBeInstanceOf(OpenAIClient)
  })

  it('constructs AnthropicClient for anthropic provider', () => {
    expect(createDirectLLMClient({ provider: 'anthropic', apiKey: 'anthropic-test-token', model: 'claude-sonnet-4-20250514' })).toBeInstanceOf(AnthropicClient)
  })

  it('constructs ClaudeCodeClient for claude-code provider', () => {
    expect(createDirectLLMClient({ provider: 'claude-code', model: 'claude-sonnet-4-6' })).toBeInstanceOf(ClaudeCodeClient)
  })

  it('constructs GeminiClient for gemini provider', () => {
    expect(createDirectLLMClient({ provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.0-flash-exp' })).toBeInstanceOf(GeminiClient)
  })

  it('constructs GroqClient for groq provider', () => {
    expect(createDirectLLMClient({ provider: 'groq', apiKey: 'test-key', model: 'llama-3.3-70b-versatile' })).toBeInstanceOf(GroqClient)
  })

  it('constructs OllamaClient for ollama provider', () => {
    expect(createDirectLLMClient({ provider: 'ollama', model: 'llama3.1' })).toBeInstanceOf(OllamaClient)
  })
})
