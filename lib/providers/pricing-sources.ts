import type { ModelPricing } from '../llm/router/costing'

export type PricingSource = 'portkey_models' | 'litellm_model_prices'

export interface NormalizedPricingRecord {
  providerRegistryId: string
  executionKind: string
  modelId: string
  pricing: ModelPricing
  currency: 'USD'
  source: string
  sourceUrl: string
  sourceLicense: string
}

type JsonObject = Record<string, unknown>

const portkeyProviderFiles: Record<string, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  alibaba_dashscope_qwen: 'dashscope',
  deepinfra: 'deepinfra',
  deepseek: 'deepseek',
  kimi_moonshot: 'moonshot',
  openrouter: 'openrouter',
  perplexity: 'perplexity-ai',
  zai: 'z-ai',
}

export function portkeyPricingUrl(providerRegistryId: string): string | undefined {
  const file = portkeyProviderFiles[providerRegistryId]
  return file ? `https://raw.githubusercontent.com/Portkey-AI/models/main/pricing/${file}.json` : undefined
}

function objectValue(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : undefined
}

function numericPrice(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function centsPerTokenToUsdPerMillion(value: unknown): number | undefined {
  const price = numericPrice(value)
  return price === undefined ? undefined : Number((price * 10_000).toFixed(12))
}

function dollarsPerTokenToUsdPerMillion(value: unknown): number | undefined {
  const price = numericPrice(value)
  return price === undefined ? undefined : Number((price * 1_000_000).toFixed(12))
}

function compactPricing(pricing: ModelPricing): ModelPricing | undefined {
  const compact = Object.fromEntries(
    Object.entries(pricing).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
  ) as ModelPricing
  return Object.keys(compact).length > 0 ? compact : undefined
}

export function normalizePortkeyPricing(
  providerRegistryId: string,
  payload: unknown,
  sourceUrl = portkeyPricingUrl(providerRegistryId) ?? 'https://github.com/Portkey-AI/models'
): NormalizedPricingRecord[] {
  const root = objectValue(payload)
  if (!root) return []

  return Object.entries(root).flatMap(([modelId, value]) => {
    if (modelId === 'default') return []
    const row = objectValue(value)
    const pricingConfig = objectValue(row?.pricing_config)
    const payAsYouGo = objectValue(pricingConfig?.pay_as_you_go)
    if (!payAsYouGo) return []

    const pricing = compactPricing({
      inputPerMillion: centsPerTokenToUsdPerMillion(objectValue(payAsYouGo.request_token)?.price),
      outputPerMillion: centsPerTokenToUsdPerMillion(objectValue(payAsYouGo.response_token)?.price),
      cachedInputPerMillion: centsPerTokenToUsdPerMillion(objectValue(payAsYouGo.cache_read_input_token)?.price),
      reasoningOutputPerMillion: centsPerTokenToUsdPerMillion(objectValue(payAsYouGo.response_reasoning_token)?.price),
    })
    if (!pricing) return []

    return [{
      providerRegistryId,
      executionKind: 'pricing_snapshot',
      modelId,
      pricing,
      currency: 'USD' as const,
      source: 'Portkey Models',
      sourceUrl,
      sourceLicense: 'MIT',
    }]
  })
}

export function normalizeLiteLLMPricing(
  payload: unknown,
  sourceUrl = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
): NormalizedPricingRecord[] {
  const root = objectValue(payload)
  if (!root) return []

  return Object.entries(root).flatMap(([modelId, value]) => {
    if (modelId === 'sample_spec') return []
    const row = objectValue(value)
    const providerRegistryId = typeof row?.litellm_provider === 'string' ? row.litellm_provider : 'unknown'
    const pricing = compactPricing({
      inputPerMillion: dollarsPerTokenToUsdPerMillion(row?.input_cost_per_token),
      outputPerMillion: dollarsPerTokenToUsdPerMillion(row?.output_cost_per_token),
      cachedInputPerMillion: dollarsPerTokenToUsdPerMillion(row?.cache_read_input_token_cost),
      reasoningOutputPerMillion: dollarsPerTokenToUsdPerMillion(row?.output_cost_per_reasoning_token),
    })
    if (!pricing) return []

    return [{
      providerRegistryId,
      executionKind: 'pricing_snapshot',
      modelId,
      pricing,
      currency: 'USD' as const,
      source: 'LiteLLM model pricing data',
      sourceUrl,
      sourceLicense: 'Repository license varies; fallback/reference only',
    }]
  })
}
