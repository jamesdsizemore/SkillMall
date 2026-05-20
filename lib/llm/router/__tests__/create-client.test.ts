import { describe, expect, it, vi } from 'vitest'
import { createRouterLLMClient, type RouterLedger } from '../create-client'
import type { LLMClient, ProviderConfig } from '../../../providers/types'
import type { GatewayBackedLLMClient } from '../gateway-client'
import { RoutingPolicyError, type RoutingPolicy } from '../routing-policy'

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

  it('records routing policy selection events when a routing policy id is configured', async () => {
    const ledger = createLedger()
    const directClient: LLMClient = {
      provider: 'openai',
      complete: vi.fn(async () => 'completed text'),
    }

    const client = createRouterLLMClient(
      { ...config, routingPolicyId: 'policy-1' },
      () => directClient,
      ledger
    )
    await client.complete('prompt body')

    expect(ledger.events).toEqual([
      {
        requestId: 'request-1',
        eventType: 'routing.policy.selected',
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        metadata: {
          routingPolicyId: 'policy-1',
          candidateId: 'manual',
          routeBackend: 'direct',
          reason: 'manual',
          mode: 'manual',
        },
      },
    ])
  })

  it('loads fallback policies at runtime and executes the selected candidate config', async () => {
    const ledger = createLedger()
    const directClient: LLMClient = {
      provider: 'anthropic',
      complete: vi.fn(async () => 'fallback text'),
    }
    const selectedConfig: ProviderConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      authMode: 'env_key',
      secretRef: { type: 'env', name: 'ANTHROPIC_API_KEY' },
    }
    const policy: RoutingPolicy = {
      id: 'policy-1',
      mode: 'fallback_chain',
      candidates: [
        { id: 'anthropic-primary', config: selectedConfig },
        { id: 'openai-backup', config },
      ],
    }
    const directFactory = vi.fn(() => directClient)

    const client = createRouterLLMClient(
      { ...config, routingPolicyId: 'policy-1' },
      directFactory,
      ledger,
      undefined,
      () => policy
    )
    const result = await client.complete('prompt body')

    expect(result).toBe('fallback text')
    expect(client.provider).toBe('anthropic')
    expect(directFactory).toHaveBeenCalledWith(selectedConfig)
    expect(ledger.starts).toMatchObject([
      {
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4-20250514',
        authMode: 'env_key',
        routeBackend: 'direct',
        routingPolicyId: 'policy-1',
      },
    ])
    expect(ledger.events).toEqual([
      expect.objectContaining({
        eventType: 'routing.policy.selected',
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4-20250514',
        metadata: expect.objectContaining({
          candidateId: 'anthropic-primary',
          mode: 'fallback_chain',
          reason: 'first_candidate',
        }),
      }),
      expect.objectContaining({
        eventType: 'routing.policy.skipped',
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        metadata: expect.objectContaining({
          candidateId: 'openai-backup',
          mode: 'fallback_chain',
          reason: 'fallback_candidate',
        }),
      }),
    ])
  })

  it('finishes and blocks budget-guarded requests before creating a provider client', async () => {
    const ledger = createLedger()
    const directFactory = vi.fn((): LLMClient => ({
      provider: 'openai',
      complete: vi.fn(async () => 'should not execute'),
    }))
    const gatewayFactory = vi.fn()
    const policy: RoutingPolicy = {
      id: 'policy-1',
      mode: 'budget_guarded_manual',
      budget: { remainingUsd: 0.01 },
      candidates: [{ id: 'manual-openai', config, estimatedCostUsd: 0.02 }],
    }

    const client = createRouterLLMClient(
      { ...config, routingPolicyId: 'policy-1' },
      directFactory,
      ledger,
      gatewayFactory,
      () => policy
    )

    await expect(client.complete('prompt body')).rejects.toThrow(RoutingPolicyError)
    expect(directFactory).not.toHaveBeenCalled()
    expect(gatewayFactory).not.toHaveBeenCalled()
    expect(ledger.finishes).toEqual([
      {
        requestId: 'request-1',
        status: 'failed',
        errorCode: 'RoutingPolicyBlocked',
        metadata: { routingPolicyBlockReason: 'estimated_cost_exceeds_budget:0.02>0.01' },
      },
    ])
    expect(ledger.events).toEqual([
      expect.objectContaining({
        eventType: 'routing.policy.blocked',
        metadata: expect.objectContaining({
          candidateId: 'manual-openai',
          mode: 'budget_guarded_manual',
          reason: 'estimated_cost_exceeds_budget:0.02>0.01',
        }),
      }),
    ])
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

  it('routes bifrost_local requests through a gateway client and records usage/cost metadata', async () => {
    const ledger = createLedger()
    const directFactory = vi.fn(() => {
      throw new Error('direct client should not be created')
    })
    const gatewayClient: GatewayBackedLLMClient = {
      provider: 'openai',
      complete: vi.fn(async () => 'gateway text'),
      completeWithMetadata: vi.fn(async () => ({
        text: 'gateway text',
        usage: {
          inputTokens: 12,
          outputTokens: 24,
          cachedInputTokens: 2,
          reasoningTokens: 3,
        },
        actualCostUsd: 0.0042,
        costSource: 'bifrost',
        metadata: { gatewayBackend: 'bifrost_local', gatewayResponseId: 'response-1' },
      })),
    }
    const gatewayFactory = vi.fn(() => gatewayClient)

    const client = createRouterLLMClient(
      {
        ...config,
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
      },
      directFactory,
      ledger,
      gatewayFactory,
      undefined,
      () => ({
        id: 1,
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        pricing: { inputPerMillion: 1, outputPerMillion: 2 },
        currency: 'USD',
        source: 'manual_test',
        snapshotAt: '2026-05-20T12:00:00.000Z',
        hash: 'hash',
      })
    )

    const result = await client.complete('prompt body', { operation: 'skill.preview' })

    expect(result).toBe('gateway text')
    expect(directFactory).not.toHaveBeenCalled()
    expect(gatewayFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: 'gateway_virtual_key',
        gatewayBackend: 'bifrost_local',
      })
    )
    expect(ledger.starts).toEqual([
      {
        operation: 'skill.preview',
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        authMode: 'gateway_virtual_key',
        routeBackend: 'bifrost_local',
        routingPolicyId: undefined,
        metadata: undefined,
      },
    ])
    expect(ledger.finishes).toEqual([
      {
        requestId: 'request-1',
        status: 'succeeded',
        inputTokens: 12,
        outputTokens: 24,
        cachedInputTokens: 2,
        reasoningTokens: 3,
        actualCostUsd: 0.0042,
        estimatedCostUsd: undefined,
        costSource: 'bifrost',
        metadata: { gatewayBackend: 'bifrost_local', gatewayResponseId: 'response-1' },
      },
    ])
  })

  it('uses pricing snapshots to estimate gateway request cost when provider cost is absent', async () => {
    const ledger = createLedger()
    const gatewayClient: GatewayBackedLLMClient = {
      provider: 'openai',
      complete: vi.fn(async () => 'gateway text'),
      completeWithMetadata: vi.fn(async () => ({
        text: 'gateway text',
        usage: {
          inputTokens: 1_000,
          outputTokens: 2_000,
        },
        metadata: { gatewayBackend: 'bifrost_local' },
      })),
    }

    const client = createRouterLLMClient(
      {
        ...config,
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
      },
      vi.fn(),
      ledger,
      vi.fn(() => gatewayClient),
      undefined,
      () => ({
        id: 1,
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        pricing: { inputPerMillion: 1, outputPerMillion: 2 },
        currency: 'USD',
        source: 'manual_test',
        snapshotAt: '2026-05-20T12:00:00.000Z',
        hash: 'hash',
      })
    )

    await client.complete('prompt body')

    expect(ledger.finishes).toEqual([
      expect.objectContaining({
        status: 'succeeded',
        actualCostUsd: undefined,
        estimatedCostUsd: 0.005,
        costSource: 'manual_test',
      }),
    ])
  })

  it('rejects unapproved gateway backends', () => {
    const directClient: LLMClient = {
      provider: 'openai',
      complete: vi.fn(async () => 'completed text'),
    }

    expect(() =>
      createRouterLLMClient(
        { ...config, gatewayBackend: 'gomodel_local' as never },
        () => directClient,
        createLedger()
      )
    ).toThrow('Unsupported router gateway backend')
  })
})
