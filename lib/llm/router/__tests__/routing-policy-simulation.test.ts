import { describe, expect, it } from 'vitest'
import { simulateRoutingPolicyDecision } from '../routing-policy-simulation'
import type { ProviderConfig } from '../../../providers/types'

const openaiConfig: ProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  authMode: 'env_key',
  secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
  gatewayBackend: 'direct',
}

const ollamaConfig: ProviderConfig = {
  provider: 'ollama',
  model: 'llama3.1',
  authMode: 'none_local',
  secretRef: { type: 'none' },
  gatewayBackend: 'direct',
}

describe('simulateRoutingPolicyDecision', () => {
  it('evaluates local-first routing without sending or storing provider content', () => {
    const result = simulateRoutingPolicyDecision({
      baseConfig: openaiConfig,
      policy: {
        id: 'local',
        mode: 'local_first',
        rules: {
          candidates: [
            { id: 'api', config: openaiConfig },
            { id: 'local', config: ollamaConfig },
          ],
        },
        budget: {},
        enabled: true,
        name: 'Local first',
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T10:00:00.000Z',
      },
    })

    expect(result).toMatchObject({
      simulation: true,
      providerRequestSent: false,
      promptStored: false,
      responseStored: false,
      mode: 'local_first',
      blocked: false,
      selected: {
        candidateId: 'local',
        providerId: 'ollama',
        modelId: 'llama3.1',
      },
    })
  })

  it('can apply a caller-provided numeric estimate for budget simulation', () => {
    const result = simulateRoutingPolicyDecision({
      baseConfig: openaiConfig,
      estimatedCostUsd: 0.02,
      policy: {
        id: 'budget',
        mode: 'budget_guarded_manual',
        candidates: [{ id: 'api', config: openaiConfig }],
        budget: { remainingUsd: 0.01 },
      },
    })

    expect(result).toMatchObject({
      simulation: true,
      providerRequestSent: false,
      blocked: true,
      selected: null,
      estimatedCostUsd: 0.02,
    })
    expect(result.attempts).toEqual([
      expect.objectContaining({
        candidateId: 'api',
        status: 'blocked',
        reason: 'estimated_cost_exceeds_budget:0.02>0.01',
      }),
    ])
  })
})
