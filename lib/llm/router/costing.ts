export interface TokenUsageForCost {
  inputTokens?: number
  outputTokens?: number
  cachedInputTokens?: number
  reasoningTokens?: number
}

export interface ModelPricing {
  inputPerMillion?: number
  outputPerMillion?: number
  cachedInputPerMillion?: number
  reasoningOutputPerMillion?: number
}

export interface RequestCostInput {
  providerReportedCostUsd?: number
  usage?: TokenUsageForCost
  pricing?: ModelPricing
  pricingSource?: string
}

export interface RequestCostResult {
  actualCostUsd?: number
  estimatedCostUsd?: number
  costSource?: string
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function perMillion(tokens: number | undefined, rate: number | undefined): number {
  if (!isFiniteNumber(tokens) || !isFiniteNumber(rate)) return 0
  return (tokens / 1_000_000) * rate
}

export function estimateCostUsd(usage: TokenUsageForCost, pricing: ModelPricing): number | undefined {
  const cost =
    perMillion(usage.inputTokens, pricing.inputPerMillion) +
    perMillion(usage.outputTokens, pricing.outputPerMillion) +
    perMillion(usage.cachedInputTokens, pricing.cachedInputPerMillion) +
    perMillion(usage.reasoningTokens, pricing.reasoningOutputPerMillion)

  if (cost <= 0) return undefined
  return Number(cost.toFixed(12))
}

export function resolveRequestCost(input: RequestCostInput): RequestCostResult {
  if (isFiniteNumber(input.providerReportedCostUsd)) {
    return {
      actualCostUsd: input.providerReportedCostUsd,
      costSource: 'provider_reported',
    }
  }

  if (input.usage && input.pricing) {
    const estimatedCostUsd = estimateCostUsd(input.usage, input.pricing)
    if (estimatedCostUsd !== undefined) {
      return {
        estimatedCostUsd,
        costSource: input.pricingSource ?? 'pricing_snapshot',
      }
    }
  }

  return {}
}
