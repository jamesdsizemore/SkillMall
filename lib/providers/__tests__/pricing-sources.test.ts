import { describe, expect, it } from 'vitest'
import {
  normalizeLiteLLMPricing,
  normalizePortkeyPricing,
  portkeyPricingUrl,
} from '../pricing-sources'

describe('pricing sources', () => {
  it('normalizes Portkey Models pricing from cents per token to USD per million tokens', () => {
    const records = normalizePortkeyPricing('openai', {
      default: {},
      'gpt-4o-mini': {
        pricing_config: {
          pay_as_you_go: {
            request_token: { price: 0.000015 },
            response_token: { price: 0.00006 },
            cache_read_input_token: { price: 0.0000075 },
          },
        },
      },
    })

    expect(records).toEqual([
      expect.objectContaining({
        providerRegistryId: 'openai',
        modelId: 'gpt-4o-mini',
        pricing: {
          inputPerMillion: 0.15,
          outputPerMillion: 0.6,
          cachedInputPerMillion: 0.075,
        },
        source: 'Portkey Models',
        sourceLicense: 'MIT',
      }),
    ])
  })

  it('maps ProviderRegistryID values to Portkey repository pricing files without requiring hosted credentials', () => {
    expect(portkeyPricingUrl('openrouter')).toBe(
      'https://raw.githubusercontent.com/Portkey-AI/models/main/pricing/openrouter.json'
    )
    expect(portkeyPricingUrl('zai')).toContain('/pricing/z-ai.json')
    expect(portkeyPricingUrl('unsupported-provider')).toBeUndefined()
  })

  it('normalizes LiteLLM pricing as fallback/reference data in USD per million tokens', () => {
    const records = normalizeLiteLLMPricing({
      sample_spec: {},
      'openai/gpt-4o-mini': {
        litellm_provider: 'openai',
        input_cost_per_token: 0.00000015,
        output_cost_per_token: 0.0000006,
        output_cost_per_reasoning_token: 0.000001,
      },
    })

    expect(records).toEqual([
      expect.objectContaining({
        providerRegistryId: 'openai',
        modelId: 'openai/gpt-4o-mini',
        pricing: {
          inputPerMillion: 0.15,
          outputPerMillion: 0.6,
          reasoningOutputPerMillion: 1,
        },
        source: 'LiteLLM model pricing data',
      }),
    ])
  })
})
