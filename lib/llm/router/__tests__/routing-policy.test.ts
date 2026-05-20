import { describe, expect, it } from 'vitest'
import { evaluateRoutingPolicy, RoutingPolicyError } from '../routing-policy'
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

describe('evaluateRoutingPolicy', () => {
  it('defaults to manual selection of the base config', () => {
    expect(evaluateRoutingPolicy(openaiConfig)).toEqual({
      config: openaiConfig,
      mode: 'manual',
      attempts: [
        {
          candidateId: 'manual',
          providerId: 'openai',
          modelId: 'gpt-4o-mini',
          routeBackend: 'direct',
          status: 'selected',
          reason: 'manual',
        },
      ],
    })
  })

  it('selects the first fallback_chain candidate and records later candidates', () => {
    const decision = evaluateRoutingPolicy(openaiConfig, {
      id: 'fallback',
      mode: 'fallback_chain',
      candidates: [
        { id: 'primary', config: openaiConfig },
        { id: 'backup-local', config: ollamaConfig },
      ],
    })

    expect(decision.config).toBe(openaiConfig)
    expect(decision.attempts).toEqual([
      expect.objectContaining({ candidateId: 'primary', status: 'selected' }),
      expect.objectContaining({ candidateId: 'backup-local', status: 'skipped' }),
    ])
  })

  it('selects local candidates first for local_first', () => {
    const decision = evaluateRoutingPolicy(openaiConfig, {
      id: 'local-first',
      mode: 'local_first',
      candidates: [
        { id: 'api', config: openaiConfig },
        { id: 'local', config: ollamaConfig },
      ],
    })

    expect(decision.config).toBe(ollamaConfig)
    expect(decision.attempts).toEqual([
      expect.objectContaining({ candidateId: 'api', status: 'skipped' }),
      expect.objectContaining({ candidateId: 'local', status: 'selected' }),
    ])
  })

  it('blocks budget_guarded_manual when estimated cost exceeds remaining budget', () => {
    const decision = evaluateRoutingPolicy(openaiConfig, {
      id: 'budget',
      mode: 'budget_guarded_manual',
      budget: { remainingUsd: 0.01 },
      candidates: [{ id: 'api', config: openaiConfig, estimatedCostUsd: 0.02 }],
    })

    expect(decision.attempts).toEqual([
      expect.objectContaining({
        candidateId: 'api',
        status: 'blocked',
        reason: 'estimated_cost_exceeds_budget:0.02>0.01',
      }),
    ])
  })

  it('rejects unapproved policy modes', () => {
    expect(() =>
      evaluateRoutingPolicy(openaiConfig, {
        id: 'quality',
        mode: 'quality_first' as never,
      })
    ).toThrow('Unsupported router routing-policy mode')
  })

  it('throws when fallback_chain has no enabled candidates', () => {
    expect(() =>
      evaluateRoutingPolicy(openaiConfig, {
        id: 'fallback',
        mode: 'fallback_chain',
        candidates: [{ id: 'disabled', config: openaiConfig, enabled: false }],
      })
    ).toThrow(RoutingPolicyError)
  })
})
