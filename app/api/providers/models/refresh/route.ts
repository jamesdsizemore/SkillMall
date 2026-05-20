import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveRouterProviderConfig } from '@/lib/llm/router/config'
import { refreshRegistryProviderModels } from '@/lib/llm/router/model-refresh'
import { getProviderRegistryEntry, PROVIDER_REGISTRY, providerRegistryIdForExecutableProvider } from '@/lib/providers/registry'
import { resolveEnvSecret } from '@/lib/llm/router/secret-refs'
import type { ProviderRegistryID } from '@/lib/providers/types'

const registryIds = PROVIDER_REGISTRY.map((entry) => entry.id) as [ProviderRegistryID, ...ProviderRegistryID[]]

const RefreshBodySchema = z.object({
  providerRegistryId: z.enum(registryIds).optional(),
  baseURL: z.string().url().optional(),
  manualModels: z.array(z.string().min(1)).optional(),
}).strict()

export const dynamic = 'force-dynamic'

async function requestJson(req: NextRequest): Promise<unknown> {
  return req.json().catch(() => ({}))
}

export async function POST(req: NextRequest) {
  const parsed = RefreshBodySchema.safeParse(await requestJson(req))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  let activeConfig: ReturnType<typeof resolveRouterProviderConfig> | null = null
  try {
    activeConfig = resolveRouterProviderConfig()
  } catch {
    activeConfig = null
  }

  const providerRegistryId =
    parsed.data.providerRegistryId ??
    (activeConfig ? activeConfig.providerRegistryId ?? providerRegistryIdForExecutableProvider(activeConfig.provider) : undefined)
  const entry = providerRegistryId ? getProviderRegistryEntry(providerRegistryId) : undefined

  if (!entry) {
    return NextResponse.json(
      { error: 'unknown_provider_registry_id' },
      { status: 400 }
    )
  }

  const activeMatches = Boolean(
    activeConfig && (activeConfig.providerRegistryId ?? providerRegistryIdForExecutableProvider(activeConfig.provider)) === entry.id
  )
  const secretRef = activeMatches && activeConfig ? activeConfig.secretRef : undefined
  const apiKey = secretRef && 'name' in secretRef ? resolveEnvSecret(secretRef.name) : undefined
  const baseUrl =
    parsed.data.baseURL ??
    (activeMatches && activeConfig ? activeConfig.baseURL : undefined) ??
    (activeMatches ? entry.gatewayProfile?.defaultBaseUrl : undefined)

  try {
    const refreshed = await refreshRegistryProviderModels({
      providerRegistryId: entry.id,
      baseURL: baseUrl,
      secretRef,
      apiKey,
      manualModels: parsed.data.manualModels,
    })

    return NextResponse.json({
      providerRegistryId: entry.id,
      executableProviderId: entry.executableProviderId ?? null,
      configured: Boolean(activeMatches),
      persisted: refreshed.persistedCount ? refreshed.persistedCount > 0 : false,
      modelStatus: {
        modelCount: refreshed.models.length,
        lastCheckedAt: refreshed.checkedAt,
        source: refreshed.source,
        executionKind: refreshed.executionKind,
        blocker: refreshed.blocker ?? null,
      },
      discovery: {
        strategy: entry.discoveryStrategy,
        status: refreshed.status,
        source: refreshed.source.startsWith('live:') ? 'live' : refreshed.source,
        authoritative: Boolean(refreshed.authoritative),
        models: refreshed.models.map((model) => model.modelId),
        networkCalled: Boolean(refreshed.networkCalled),
        ...(refreshed.status === 'planned_source_review' ? { liveCallable: false } : {}),
        ...(refreshed.blocker ? { message: refreshed.blocker } : {}),
      },
      secretStatus: secretRef
        ? {
            type: secretRef.type,
            name: 'name' in secretRef ? secretRef.name : undefined,
            valuePresent: secretRef.type === 'none' ? true : Boolean(apiKey),
            source: secretRef.type === 'none' ? 'no_secret_required' : 'reference_only',
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'model_refresh_failed',
        providerRegistryId: entry.id,
        message: error instanceof Error ? error.message : 'Model refresh failed',
      },
      { status: 502 }
    )
  }
}
