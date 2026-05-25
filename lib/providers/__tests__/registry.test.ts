import { describe, expect, it } from 'vitest'
import {
  PROVIDER_REGISTRY,
  assertAuthModeAllowedForProvider,
  getLiveCallableProviderRows,
  getPlannedSourceReviewProviderRows,
  getProviderRegistryEntry,
  isAuthModeAllowedForProvider,
} from '../registry'
import type { ProviderID, ProviderRegistryID } from '../types'

const REQUIRED_PROVIDER_IDS: ProviderRegistryID[] = [
  'openai',
  'openai_codex',
  'anthropic',
  'claude_code',
  'gemini',
  'groq',
  'ollama',
  'openrouter',
  'alibaba_dashscope_qwen',
  'huggingface',
  'zai',
  'minimax',
  'kimi_moonshot',
  'deepseek',
  'mistral',
  'cohere',
  'xai',
  'aws_bedrock',
  'azure_openai',
  'google_vertex_ai',
  'together_ai',
  'fireworks',
  'replicate',
  'nvidia_nim',
  'perplexity',
  'deepinfra',
  'cerebras',
  'custom_openai_compatible',
]

describe('provider registry', () => {
  it('contains the required broad provider IDs', () => {
    expect(PROVIDER_REGISTRY.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(REQUIRED_PROVIDER_IDS)
    )
  })

  it('declares required Provider Center metadata for every provider row', () => {
    for (const entry of PROVIDER_REGISTRY) {
      expect(entry.name).toBeTruthy()
      expect(entry.accessLabel).toBeTruthy()
      expect(entry.authLabel).toBeTruthy()
      expect(entry.setupUrl).toMatch(/^https?:\/\//)
      expect(entry.discoveryStrategy).toBeTruthy()
      expect(entry.status).toBeTruthy()
      expect(entry.classification).toBeTruthy()
      expect(entry.registryInclusionNote).toBeTruthy()
      expect(typeof entry.liveCallable).toBe('boolean')
    }
  })

  it('uses registry IDs without widening the executable ProviderID union', () => {
    const executableIds = new Set<ProviderID>([
      'openai',
      'codex',
      'anthropic',
      'claude-code',
      'gemini',
      'groq',
      'ollama',
    ])

    expect(getProviderRegistryEntry('openai_codex')?.executableProviderId).toBe('codex')
    expect(getProviderRegistryEntry('claude_code')?.executableProviderId).toBe('claude-code')
    expect(getProviderRegistryEntry('huggingface')?.executableProviderId).toBeUndefined()
    expect(getProviderRegistryEntry('alibaba_dashscope_qwen')?.executableProviderId).toBeUndefined()

    for (const entry of PROVIDER_REGISTRY) {
      if (entry.executableProviderId) {
        expect(executableIds.has(entry.executableProviderId)).toBe(true)
      }
    }
  })

  it('keeps planned-source-review rows blocked and promotes source-backed rows only with evidence', () => {
    const plannedRows = getPlannedSourceReviewProviderRows()
    expect(plannedRows.every((entry) => entry.liveCallable === false)).toBe(true)
    expect(plannedRows.map((entry) => entry.id)).not.toEqual(
      expect.arrayContaining(['alibaba_dashscope_qwen', 'zai', 'perplexity', 'deepinfra'])
    )
    expect(getProviderRegistryEntry('alibaba_dashscope_qwen')).toMatchObject({
      discoveryStrategy: 'source_backed_static_models',
      classification: 'gateway_configurable_openai_compatible',
      liveCallable: true,
    })
    expect(getProviderRegistryEntry('zai')).toMatchObject({
      discoveryStrategy: 'source_backed_static_models',
      classification: 'gateway_configurable_openai_compatible',
      liveCallable: true,
    })
    expect(getProviderRegistryEntry('perplexity')).toMatchObject({
      discoveryStrategy: 'source_backed_static_models',
      classification: 'active_configurable',
      liveCallable: false,
    })
    expect(getProviderRegistryEntry('deepinfra')).toMatchObject({
      discoveryStrategy: 'official_provider_models',
      classification: 'gateway_configurable_openai_compatible',
      liveCallable: true,
    })
    expect(getLiveCallableProviderRows().map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['alibaba_dashscope_qwen', 'zai', 'deepinfra'])
    )
  })

  it('enforces auth mode compatibility from provider access modes', () => {
    const openai = getProviderRegistryEntry('openai')
    const anthropic = getProviderRegistryEntry('anthropic')
    const openaiCodex = getProviderRegistryEntry('openai_codex')
    const claudeCode = getProviderRegistryEntry('claude_code')
    const ollama = getProviderRegistryEntry('ollama')
    const custom = getProviderRegistryEntry('custom_openai_compatible')

    expect(openai && isAuthModeAllowedForProvider(openai, 'env_key')).toBe(true)
    expect(openai && isAuthModeAllowedForProvider(openai, 'gateway_virtual_key')).toBe(true)
    expect(openai && isAuthModeAllowedForProvider(openai, 'local_cli_session')).toBe(false)
    expect(openaiCodex && isAuthModeAllowedForProvider(openaiCodex, 'local_cli_session')).toBe(true)
    expect(anthropic && isAuthModeAllowedForProvider(anthropic, 'gateway_virtual_key')).toBe(false)
    expect(claudeCode && isAuthModeAllowedForProvider(claudeCode, 'local_cli_session')).toBe(true)
    expect(ollama && isAuthModeAllowedForProvider(ollama, 'none_local')).toBe(true)
    expect(custom && isAuthModeAllowedForProvider(custom, 'env_key')).toBe(true)

    expect(() => {
      if (!anthropic) throw new Error('missing anthropic registry row')
      assertAuthModeAllowedForProvider(anthropic, 'gateway_virtual_key')
    }).toThrow(/not allowed/)
  })
})
