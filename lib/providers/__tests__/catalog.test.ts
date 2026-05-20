import { describe, it, expect, vi, afterEach } from 'vitest'
import { FALLBACK_PROVIDER_CATALOG, fetchProviderModels } from '../catalog'

describe('provider catalog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('includes separate OpenAI API, Claude API, and Claude Code providers', () => {
    expect(FALLBACK_PROVIDER_CATALOG.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['openai', 'anthropic', 'claude-code'])
    )
  })

  it('loads OpenAI models from the live models endpoint when a key is present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'text-embedding-3-small', created: 1 },
          { id: 'gpt-5.1', created: 3 },
          { id: 'gpt-4.1', created: 2 },
        ],
      }),
    }))

    await expect(fetchProviderModels({
      provider: 'openai',
      apiKey: 'openai-test-token',
      model: 'gpt-5.1',
    })).resolves.toEqual(['gpt-5.1', 'gpt-4.1'])
  })

  it('loads Anthropic models from the live models endpoint when a key is present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'claude-sonnet-4-20250514' },
          { id: 'claude-opus-4-1-20250805' },
        ],
      }),
    }))

    await expect(fetchProviderModels({
      provider: 'anthropic',
      apiKey: 'anthropic-test-token',
      model: 'claude-sonnet-4-20250514',
    })).resolves.toEqual(['claude-sonnet-4-20250514', 'claude-opus-4-1-20250805'])
  })
})
