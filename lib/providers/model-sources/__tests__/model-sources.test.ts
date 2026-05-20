import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  refreshProviderModelSource,
  sanitizeProviderModelRaw,
} from '../../model-sources'

const fixedNow = () => new Date('2026-05-20T12:00:00.000Z')

describe('provider model sources', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refreshes OpenAI-compatible rows only through the configured models endpoint and redacts raw metadata', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'model-a',
            object: 'model',
            inputTokenLimit: 1048576,
            outputTokenLimit: 8192,
            apiKey: 'redacted-test-key',
            refreshToken: 'redacted-refresh-token',
            id_token: 'redacted-id-token',
            jwtToken: 'redacted-jwt-token',
            nested: { authorization: 'Bearer redacted-test-token', visible: true },
          },
          { id: 'model-b', token: 'redacted-token' },
          { id: 'model-a' },
          { object: 'model' },
        ],
      }),
    })

    const result = await refreshProviderModelSource({
      providerRegistryId: 'openrouter',
      baseURL: 'https://openrouter.example/api/v1',
      apiKey: 'test-key',
      fetchFn,
      now: fixedNow,
    })

    expect(result).toMatchObject({
      providerRegistryId: 'openrouter',
      strategy: 'openai_compatible_models',
      status: 'live',
      source: 'live',
      authoritative: true,
      networkCalled: true,
    })
    expect(result.models.map((model) => model.modelId)).toEqual(['model-a', 'model-b'])
    expect(result.models[0]).toMatchObject({
      sourceName: 'OpenRouter OpenAI-compatible models endpoint',
      sourceUrl: 'https://openrouter.example/api/v1/models',
      fetchedAt: '2026-05-20T12:00:00.000Z',
    })
    expect(result.models[0].raw).toEqual({
      id: 'model-a',
      object: 'model',
      inputTokenLimit: 1048576,
      outputTokenLimit: 8192,
      nested: { visible: true },
    })
    expect(fetchFn).toHaveBeenCalledWith(
      'https://openrouter.example/api/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer test-key' }),
      })
    )
  })

  it('returns source-backed static records without making a network call', async () => {
    const fetchFn = vi.fn()

    const result = await refreshProviderModelSource({
      providerRegistryId: 'zai',
      fetchFn,
      now: fixedNow,
    })

    expect(result).toMatchObject({
      providerRegistryId: 'zai',
      strategy: 'source_backed_static_models',
      status: 'source_backed_static',
      source: 'source_backed_static',
      authoritative: true,
      networkCalled: false,
    })
    expect(result.models.map((model) => model.modelId)).toEqual(['glm-5.1', 'glm-4.6'])
    expect(result.models.every((model) => model.sourceUrl === 'https://docs.z.ai/api-reference/')).toBe(true)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('uses manual labels for custom endpoints without probing the endpoint by default', async () => {
    const fetchFn = vi.fn()

    const result = await refreshProviderModelSource({
      providerRegistryId: 'custom_openai_compatible',
      manualModels: ['custom/model-a', 'custom/model-a', 'custom/model-b'],
      fetchFn,
      now: fixedNow,
    })

    expect(result).toMatchObject({
      strategy: 'manual_custom_models',
      status: 'manual_models',
      source: 'manual',
      authoritative: true,
      networkCalled: false,
    })
    expect(result.models.map((model) => model.modelId)).toEqual(['custom/model-a', 'custom/model-b'])
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('keeps account-scoped and cloud-scoped rows blocked until required context exists', async () => {
    const fetchFn = vi.fn()

    await expect(refreshProviderModelSource({
      providerRegistryId: 'fireworks',
      fetchFn,
    })).resolves.toMatchObject({
      strategy: 'account_scoped_models',
      status: 'account_context_required',
      source: 'none',
      networkCalled: false,
    })

    await expect(refreshProviderModelSource({
      providerRegistryId: 'aws_bedrock',
      fetchFn,
    })).resolves.toMatchObject({
      strategy: 'cloud_project_scoped_models',
      status: 'cloud_project_context_required',
      source: 'none',
      networkCalled: false,
    })

    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('redacts secret-like fields from arbitrary raw model metadata', () => {
    expect(sanitizeProviderModelRaw({
      id: 'model-a',
      api_key: 'redacted',
      sessionToken: 'redacted',
      credentials: { secret: 'redacted' },
      visible: { label: 'kept' },
    })).toEqual({
      id: 'model-a',
      visible: { label: 'kept' },
    })
  })
})
