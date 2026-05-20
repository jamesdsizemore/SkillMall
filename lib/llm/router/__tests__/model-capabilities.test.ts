import { describe, expect, it } from 'vitest'
import {
  hasUsablePrice,
  modelCapabilityContextWindow,
  modelCapabilityMaxOutputTokens,
  normalizeProviderModelCapabilities,
  normalizeReferenceModelCapabilities,
} from '../model-capabilities'

describe('model capability normalization', () => {
  it('normalizes Gemini official model metadata into capability and limit fields', () => {
    const metadata = normalizeProviderModelCapabilities({
      providerRegistryId: 'gemini',
      modelId: 'gemini-2.5-pro',
      source: 'live',
      authoritative: true,
      sourceName: 'Google Gemini Models API',
      sourceUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      fetchedAt: '2026-05-20T12:00:00.000Z',
      raw: {
        baseModelId: 'gemini-2.5-pro',
        supportedGenerationMethods: ['generateContent', 'embedContent'],
        inputTokenLimit: 1048576,
        outputTokenLimit: 65536,
        thinking: true,
      },
    })

    expect(metadata).toMatchObject({
      source: 'official_api',
      confidence: 'authoritative',
      capabilities: {
        text_input: true,
        text_output: true,
        embeddings: true,
        reasoning: true,
      },
      limits: {
        contextWindow: 1048576,
        maxInputTokens: 1048576,
        maxOutputTokens: 65536,
      },
      blockers: [],
    })
    expect(modelCapabilityContextWindow(metadata)).toBe(1048576)
    expect(modelCapabilityMaxOutputTokens(metadata)).toBe(65536)
  })

  it('normalizes OpenRouter routed metadata without treating it as direct provider availability', () => {
    const metadata = normalizeProviderModelCapabilities({
      providerRegistryId: 'openrouter',
      modelId: 'openai/gpt-4',
      source: 'live',
      authoritative: true,
      sourceName: 'OpenRouter OpenAI-compatible models endpoint',
      sourceUrl: 'https://openrouter.ai/api/v1/models',
      fetchedAt: '2026-05-20T12:00:00.000Z',
      raw: {
        id: 'openai/gpt-4',
        architecture: {
          input_modalities: ['text', 'image'],
          output_modalities: ['text'],
        },
        context_length: 8192,
        supported_parameters: ['temperature', 'tools', 'response_format'],
        top_provider: { max_completion_tokens: 4096 },
      },
    })

    expect(metadata).toMatchObject({
      source: 'official_api',
      confidence: 'authoritative',
      endpointFamily: 'openrouter',
      capabilities: {
        text_input: true,
        text_output: true,
        image_input: true,
        tool_calling: true,
        structured_output: true,
      },
      limits: {
        contextWindow: 8192,
        maxOutputTokens: 4096,
      },
    })
  })

  it('marks manual and fallback rows with blockers so automatic routing cannot guess', () => {
    const manual = normalizeProviderModelCapabilities({
      providerRegistryId: 'custom_openai_compatible',
      modelId: 'custom/model',
      source: 'manual',
      authoritative: true,
      sourceName: 'User supplied manual model labels',
      fetchedAt: '2026-05-20T12:00:00.000Z',
    })
    const fallback = normalizeProviderModelCapabilities({
      providerRegistryId: 'openai',
      modelId: 'gpt-5',
      source: 'fallback',
      authoritative: false,
      sourceName: 'SkillMall fallback model labels',
      fetchedAt: '2026-05-20T12:00:00.000Z',
    })

    expect(manual.confidence).toBe('manual')
    expect(manual.blockers).toEqual(expect.arrayContaining(['manual_only', 'missing_metadata']))
    expect(fallback.confidence).toBe('fallback')
    expect(fallback.blockers).toEqual(expect.arrayContaining(['fallback_only', 'missing_metadata']))
  })

  it('normalizes LiteLLM reference flags without upgrading confidence to authoritative', () => {
    const metadata = normalizeReferenceModelCapabilities({
      modelId: 'openai/gpt-5-mini',
      source: 'litellm_reference',
      sourceName: 'LiteLLM model pricing data',
      sourceUrl: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
      raw: {
        litellm_provider: 'openai',
        mode: 'chat',
        max_input_tokens: 400000,
        max_output_tokens: 128000,
        supports_function_calling: true,
        supports_response_schema: true,
        supports_reasoning: true,
        supports_vision: true,
      },
    })

    expect(metadata).toMatchObject({
      source: 'litellm_reference',
      confidence: 'reference',
      mode: 'chat',
      capabilities: {
        text_input: true,
        text_output: true,
        tool_calling: true,
        structured_output: true,
        reasoning: true,
        image_input: true,
      },
      limits: {
        contextWindow: 400000,
        maxInputTokens: 400000,
        maxOutputTokens: 128000,
      },
      blockers: ['reference_only'],
    })
  })

  it('detects whether a pricing snapshot has any usable price dimension', () => {
    expect(hasUsablePrice(undefined)).toBe(false)
    expect(hasUsablePrice({})).toBe(false)
    expect(hasUsablePrice({ inputPerMillion: 0.15 })).toBe(true)
    expect(hasUsablePrice({ reasoningOutputPerMillion: 5 })).toBe(true)
  })
})
