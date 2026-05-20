import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { refreshPricingSnapshots } from '@/lib/llm/router/pricing-refresh'
import {
  normalizeLiteLLMPricing,
  normalizePortkeyPricing,
  portkeyPricingUrl,
} from '@/lib/providers/pricing-sources'
import { PROVIDER_REGISTRY } from '@/lib/providers/registry'
import type { ProviderRegistryID } from '@/lib/providers/types'

const registryIds = PROVIDER_REGISTRY.map((entry) => entry.id) as [ProviderRegistryID, ...ProviderRegistryID[]]

const RefreshPricingBodySchema = z.object({
  providerRegistryId: z.enum(registryIds).optional(),
  source: z.enum(['portkey_models', 'litellm_model_prices']).default('portkey_models'),
  modelIds: z.array(z.string().min(1)).optional(),
}).strict()

export const dynamic = 'force-dynamic'

async function requestJson(req: NextRequest): Promise<unknown> {
  return req.json().catch(() => ({}))
}

function filterModelIds<T extends { modelId: string }>(records: T[], modelIds: string[] | undefined): T[] {
  if (!modelIds?.length) return records
  const allowed = new Set(modelIds)
  return records.filter((record) => allowed.has(record.modelId))
}

export async function POST(req: NextRequest) {
  const parsed = RefreshPricingBodySchema.safeParse(await requestJson(req))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const sourceUrl =
      (parsed.data.source === 'portkey_models' && parsed.data.providerRegistryId
        ? portkeyPricingUrl(parsed.data.providerRegistryId)
        : undefined) ??
      (parsed.data.source === 'litellm_model_prices'
        ? 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
        : undefined)

    if (!sourceUrl) {
      return NextResponse.json(
        {
          error: 'unsupported_pricing_source',
          message: 'No source-backed pricing file is configured for this provider/source pair.',
        },
        { status: 400 }
      )
    }

    const response = await fetch(sourceUrl)
    if (!response.ok) {
      return NextResponse.json(
        {
          refreshed: false,
          error: 'pricing_source_failed',
          status: response.status,
          source: parsed.data.source,
          sourceUrl,
          providerRegistryId: parsed.data.providerRegistryId ?? null,
          snapshotCount: 0,
          models: [],
        },
        { status: 200 }
      )
    }

    const payload = await response.json()
    const normalized = parsed.data.source === 'portkey_models'
      ? normalizePortkeyPricing(parsed.data.providerRegistryId ?? 'unknown', payload, sourceUrl)
      : normalizeLiteLLMPricing(payload, sourceUrl)
    const records = filterModelIds(normalized, parsed.data.modelIds)
    const snapshots = refreshPricingSnapshots(
      records.map((record) => ({
        providerId: record.providerRegistryId,
        providerRegistryId: record.providerRegistryId,
        executionKind: record.executionKind,
        modelId: record.modelId,
        pricing: record.pricing,
        source: record.source,
        sourceUrl: record.sourceUrl,
        sourceLicense: record.sourceLicense,
        currency: record.currency,
      }))
    )

    return NextResponse.json({
      refreshed: true,
      source: parsed.data.source,
      sourceUrl,
      sourceLicense: records[0]?.sourceLicense ?? null,
      providerRegistryId: parsed.data.providerRegistryId ?? null,
      snapshotCount: snapshots.length,
      models: snapshots.map((snapshot) => ({
        providerRegistryId: snapshot.providerRegistryId ?? snapshot.providerId,
        modelId: snapshot.modelId,
        pricing: snapshot.pricing,
        source: snapshot.source,
        sourceUrl: snapshot.sourceUrl,
        currency: snapshot.currency,
        snapshotAt: snapshot.snapshotAt,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      {
        refreshed: false,
        error: 'pricing_refresh_failed',
        message: error instanceof Error ? error.message : 'Pricing refresh failed',
        snapshotCount: 0,
        models: [],
      },
      { status: 200 }
    )
  }
}
