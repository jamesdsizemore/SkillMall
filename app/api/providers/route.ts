import { NextResponse } from 'next/server'
import { ConfigError } from '@/lib/providers'
import { resolveRouterProviderConfig } from '@/lib/llm/router/config'
import { PROVIDER_REGISTRY, providerRegistryIdForExecutableProvider } from '@/lib/providers/registry'
import { modelDiscoveryPlanForEntry } from '@/lib/providers/model-discovery'
import type { SecretRef } from '@/lib/llm/router/types'
import type { ProviderRegistryEntry } from '@/lib/providers/types'

export const dynamic = 'force-dynamic'

function accessLabel(authMode: string | null, gatewayBackend: string | null): string | null {
  if (gatewayBackend && gatewayBackend !== 'direct') return 'gateway_access'
  if (authMode === 'env_key') return 'api_access'
  if (authMode === 'local_cli_session') return 'local_tool_session'
  if (authMode === 'none_local') return 'local_runtime'
  if (authMode === 'gateway_virtual_key') return 'gateway_access'
  return null
}

function sanitizeSecretStatus(secretRef: SecretRef | undefined | null) {
  if (!secretRef) return null
  if (secretRef.type === 'none') {
    return {
      type: 'none',
      valuePresent: true,
      source: 'no_secret_required',
    }
  }

  return {
    type: secretRef.type,
    name: secretRef.name,
    valuePresent: Boolean(process.env[secretRef.name]),
    source: 'reference_only',
  }
}

function sanitizedGatewayProfile(entry: ProviderRegistryEntry) {
  if (!entry.gatewayProfile) return null
  return {
    kind: entry.gatewayProfile.kind,
    defaultBaseUrl: entry.gatewayProfile.defaultBaseUrl ?? null,
    requiresUserEndpoint: Boolean(entry.gatewayProfile.requiresUserEndpoint),
    note: entry.gatewayProfile.note,
  }
}

function providerRow(entry: ProviderRegistryEntry, active: ReturnType<typeof activeStatus> | null) {
  const discoveryPlan = modelDiscoveryPlanForEntry(entry)
  const isConfigured = active?.activeProviderRegistryId === entry.id

  return {
    id: entry.id,
    name: entry.name,
    accessModes: entry.accessModes,
    accessLabel: entry.accessLabel,
    authLabel: entry.authLabel,
    setupUrl: entry.setupUrl,
    officialSourceUrl: entry.officialSourceUrl,
    discoveryStrategy: entry.discoveryStrategy,
    status: entry.status,
    classification: entry.classification,
    liveCallable: entry.liveCallable,
    executableProviderId: entry.executableProviderId ?? null,
    gatewayProfile: sanitizedGatewayProfile(entry),
    registryInclusionNote: entry.registryInclusionNote,
    evidenceNote: entry.evidenceNote,
    configStatus: {
      configured: isConfigured,
      authMode: isConfigured ? active?.authMode : null,
      gatewayBackend: isConfigured ? active?.gatewayBackend : null,
      accessLabel: isConfigured ? active?.accessLabel : null,
      secretRef: isConfigured ? active?.secretRef : null,
      secretStatus: isConfigured ? active?.secretStatus : null,
      baseURL: isConfigured ? active?.baseURL : null,
      routingPolicyId: isConfigured ? active?.routingPolicyId : null,
      activeModel: isConfigured ? active?.activeModel : null,
    },
    modelStatus: {
      strategy: entry.discoveryStrategy,
      source: entry.fallbackModels.length > 0 ? 'fallback' : 'none',
      authoritative: false,
      stale: true,
      models: entry.fallbackModels,
      refresh: discoveryPlan,
    },
    costStatus: {
      actual_cost_usd: null,
      estimated_cost_usd: null,
      note: 'Use /api/providers/usage for ledger-backed usage and cost summaries.',
    },
  }
}

function activeStatus() {
  const config = resolveRouterProviderConfig()
  const activeProviderRegistryId = providerRegistryIdForExecutableProvider(config.provider)
  const activeAccessLabel = accessLabel(config.authMode, config.gatewayBackend)

  return {
    configured: true,
    activeProvider: config.provider,
    activeProviderRegistryId,
    activeModel: config.model,
    authMode: config.authMode,
    gatewayBackend: config.gatewayBackend,
    accessLabel: activeAccessLabel,
    secretRef: config.secretRef ?? null,
    secretStatus: sanitizeSecretStatus(config.secretRef),
    baseURL: config.baseURL ?? null,
    routingPolicyId: config.routingPolicyId ?? null,
    warnings: config.warnings,
  }
}

function emptyStatus() {
  return {
    configured: false,
    activeProvider: null,
    activeProviderRegistryId: null,
    activeModel: null,
    authMode: null,
    gatewayBackend: 'direct',
    accessLabel: null,
    secretRef: null,
    secretStatus: null,
    baseURL: null,
    routingPolicyId: null,
    warnings: [],
  }
}

export async function GET() {
  try {
    const active = activeStatus()
    return NextResponse.json({
      ...active,
      providers: PROVIDER_REGISTRY.map((entry) => providerRow(entry, active)),
    })
  } catch (err) {
    if (err instanceof ConfigError) {
      const active = emptyStatus()
      return NextResponse.json({
        ...active,
        providers: PROVIDER_REGISTRY.map((entry) => providerRow(entry, null)),
      })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
