import { describe, expect, it, vi } from 'vitest'
import { createRouterLLMClient, type RouterLedger } from '../create-client'
import type { LLMClient, ProviderConfig } from '../../../providers/types'

function createLedger(): RouterLedger & { starts: unknown[]; finishes: unknown[]; events: unknown[] } {
  const starts: unknown[] = []
  const finishes: unknown[] = []
  const events: unknown[] = []

  return {
    starts,
    finishes,
    events,
    start(input) {
      starts.push(input)
      return { requestId: 'request-1', startedAt: '2026-05-19T12:00:00.000Z' }
    },
    finish(input) {
      finishes.push(input)
    },
    event(input) {
      events.push(input)
    },
  }
}

const config: ProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'test-key',
  authMode: 'env_key',
  secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
}

describe('createRouterLLMClient', () => {
  it('preserves provider and delegates complete calls to the direct client', async () => {
    const ledger = createLedger()
    const directClient: LLMClient = {
      provider: 'openai',
      complete: vi.fn(async () => 'completed text'),
    }

    const client = createRouterLLMClient(config, () => directClient, ledger)
    const result = await client.complete('prompt body', {
      operation: 'skill.preview',
      metadata: { step: 'preview' },
    })

    expect(client.provider).toBe('openai')
    expect(result).toBe('completed text')
    expect(directClient.complete).toHaveBeenCalledWith('prompt body', {
      operation: 'skill.preview',
      metadata: { step: 'preview' },
    })
    expect(ledger.starts).toEqual([
      {
        operation: 'skill.preview',
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        authMode: 'env_key',
        routeBackend: 'direct',
        routingPolicyId: undefined,
        metadata: { step: 'preview' },
      },
    ])
    expect(ledger.finishes).toEqual([{ requestId: 'request-1', status: 'succeeded' }])
    expect(ledger.events).toEqual([])
  })

  it('defaults operation metadata to unknown', async () => {
    const ledger = createLedger()
    const directClient: LLMClient = {
      provider: 'openai',
      complete: vi.fn(async () => 'completed text'),
    }

    const client = createRouterLLMClient(config, () => directClient, ledger)
    await client.complete('prompt body')

    expect(ledger.starts).toMatchObject([{ operation: 'unknown' }])
  })

  it('records failed requests and rethrows direct client errors', async () => {
    const ledger = createLedger()
    const error = new Error('provider failed')
    const directClient: LLMClient = {
      provider: 'openai',
      complete: vi.fn(async () => {
        throw error
      }),
    }

    const client = createRouterLLMClient(config, () => directClient, ledger)

    await expect(client.complete('prompt body')).rejects.toThrow('provider failed')
    expect(ledger.finishes).toEqual([
      { requestId: 'request-1', status: 'failed', errorCode: 'Error' },
    ])
    expect(ledger.events).toEqual([
      {
        requestId: 'request-1',
        eventType: 'provider.error',
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        message: 'provider failed',
      },
    ])
  })

  it('rejects non-direct gateway backends', () => {
    const directClient: LLMClient = {
      provider: 'openai',
      complete: vi.fn(async () => 'completed text'),
    }

    expect(() =>
      createRouterLLMClient(
        { ...config, gatewayBackend: 'gomodel' as never },
        () => directClient,
        createLedger()
      )
    ).toThrow('Unsupported Phase 1 gateway backend')
  })
})
