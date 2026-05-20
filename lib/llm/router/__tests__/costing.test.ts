import { describe, expect, it } from 'vitest'
import { estimateCostUsd, resolveRequestCost } from '../costing'

describe('router costing', () => {
  it('prefers provider-reported cost as actual spend', () => {
    expect(
      resolveRequestCost({
        providerReportedCostUsd: 0.123,
        usage: { inputTokens: 1000, outputTokens: 1000 },
        pricing: { inputPerMillion: 1, outputPerMillion: 10 },
      })
    ).toEqual({
      actualCostUsd: 0.123,
      costSource: 'provider_reported',
    })
  })

  it('estimates cost from local pricing snapshots when provider cost is absent', () => {
    expect(
      resolveRequestCost({
        usage: {
          inputTokens: 1_000_000,
          outputTokens: 500_000,
          cachedInputTokens: 100_000,
          reasoningTokens: 50_000,
        },
        pricing: {
          inputPerMillion: 2,
          outputPerMillion: 8,
          cachedInputPerMillion: 0.2,
          reasoningOutputPerMillion: 4,
        },
        pricingSource: 'bifrost_pricing_snapshot',
      })
    ).toEqual({
      estimatedCostUsd: 6.22,
      costSource: 'bifrost_pricing_snapshot',
    })
  })

  it('returns no cost when usage or pricing is insufficient', () => {
    expect(estimateCostUsd({}, { inputPerMillion: 1 })).toBeUndefined()
    expect(resolveRequestCost({ usage: { inputTokens: 10 } })).toEqual({})
  })
})
