import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProviderRegistryEntry } from '../registry'
import {
  discoverProviderModels,
  modelDiscoveryPlanForEntry,
  normalizeOpenAICompatibleModels,
} from '../model-discovery'

describe('model discovery contracts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('normalizes OpenAI-compatible data[].id responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 'model-a' }, { id: 'model-b' }, { id: 'model-a' }, { object: 'model' }],
        }),
      })
    )

    const result = await discoverProviderModels(getProviderRegistryEntry('openai')!, {
      baseUrl: 'https://api.example.test/v1',
      apiKey: 'test-key',
    })

    expect(result).toEqual({
      strategy: 'openai_compatible_models',
      status: 'live',
      source: 'live',
      authoritative: true,
      models: ['model-a', 'model-b'],
      networkCalled: true,
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.test/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer test-key' }),
      })
    )
    expect(normalizeOpenAICompatibleModels({ data: [{ id: 'x' }, { id: '' }] })).toEqual(['x'])
  })

  it('marks provider-specific, account/project/local/manual/static strategies without unsupported network calls', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await expect(discoverProviderModels(getProviderRegistryEntry('anthropic')!)).resolves.toMatchObject({
      strategy: 'official_provider_models',
      status: 'secret_required',
      networkCalled: false,
    })
    await expect(discoverProviderModels(getProviderRegistryEntry('fireworks')!)).resolves.toMatchObject({
      strategy: 'account_scoped_models',
      status: 'account_context_required',
      networkCalled: false,
    })
    await expect(discoverProviderModels(getProviderRegistryEntry('aws_bedrock')!)).resolves.toMatchObject({
      strategy: 'cloud_project_scoped_models',
      status: 'cloud_project_context_required',
      networkCalled: false,
    })
    await expect(discoverProviderModels(getProviderRegistryEntry('ollama')!)).resolves.toMatchObject({
      strategy: 'local_runtime_models',
      status: 'local_runtime_required',
      networkCalled: false,
    })
    await expect(
      discoverProviderModels(getProviderRegistryEntry('custom_openai_compatible')!, {
        manualModels: ['custom/model-a', 'custom/model-a', 'custom/model-b'],
      })
    ).resolves.toMatchObject({
      strategy: 'manual_custom_models',
      status: 'manual_models',
      source: 'manual',
      models: ['custom/model-a', 'custom/model-b'],
      networkCalled: false,
    })
    await expect(discoverProviderModels(getProviderRegistryEntry('zai')!)).resolves.toMatchObject({
      strategy: 'source_backed_static_models',
      status: 'source_backed_static',
      source: 'source_backed_static',
      authoritative: true,
      models: ['glm-5.1', 'glm-4.6'],
      networkCalled: false,
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('describes discovery strategy behavior for Provider Center status rows', () => {
    expect(modelDiscoveryPlanForEntry(getProviderRegistryEntry('azure_openai')!)).toMatchObject({
      strategy: 'cloud_project_scoped_models',
      canRefreshNow: false,
      requiresProjectContext: true,
    })
    expect(modelDiscoveryPlanForEntry(getProviderRegistryEntry('openrouter')!)).toMatchObject({
      strategy: 'openai_compatible_models',
      canRefreshNow: true,
      requiresEndpoint: true,
    })
    expect(modelDiscoveryPlanForEntry(getProviderRegistryEntry('alibaba_dashscope_qwen')!)).toMatchObject({
      strategy: 'source_backed_static_models',
      canRefreshNow: true,
      liveCallable: true,
    })
  })
})
