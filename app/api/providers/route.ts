import { NextResponse } from 'next/server'
import { ConfigError } from '@/lib/providers'
import { getDb } from '@/lib/db/client'
import { resolveRouterProviderConfig } from '@/lib/llm/router/config'
import { PROVIDER_REGISTRY, providerRegistryIdForExecutableProvider } from '@/lib/providers/registry'
import { modelDiscoveryPlanForEntry } from '@/lib/providers/model-discovery'
import { getProviderSecretStatus } from '@/lib/providers/secret-store'
import type { SecretRef } from '@/lib/llm/router/types'
import type { ProviderRegistryEntry, ProviderRegistryID } from '@/lib/providers/types'

export const dynamic = 'force-dynamic'

function accessLabel(authMode: string | null, gatewayBackend: string | null): string | null {
  if (gatewayBackend && gatewayBackend !== 'direct') return 'gateway_access'
  if (authMode === 'env_key') return 'api_access'
  if (authMode === 'local_cli_session') return 'local_tool_session'
  if (authMode === 'none_local') return 'local_runtime'
  if (authMode === 'gateway_virtual_key') return 'gateway_access'
  if (authMode === 'codex_app_server' || authMode === 'claude_setup_token') return 'provider_account_auth'
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

  if (secretRef.type === 'stored_provider_secret') {
    return getProviderSecretStatus(secretRef.id)
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

type CachedModelStatus = {
  source: string
  models: string[]
  modelCount: number
  lastCheckedAt: string | null
  stale: boolean
  capabilityStatus: {
    capableModelCount: number
    sources: string[]
    confidences: string[]
    blockers: string[]
  }
}

function isStale(lastCheckedAt: string | null): boolean {
  if (!lastCheckedAt) return true
  const checked = Date.parse(lastCheckedAt)
  if (!Number.isFinite(checked)) return true
  return Date.now() - checked > 24 * 60 * 60 * 1000
}

const blockingCapabilityStatusCodes = new Set([
  'account_scoped_source',
  'fallback_only',
  'manual_only',
  'missing_metadata',
  'provider_specific_source_required',
  'reference_only',
  'stale_metadata',
  'unknown_source',
])

function hasEligibleCapabilityMetadata(parsed: {
  capabilities?: Record<string, unknown>
  blockers?: string[]
}): boolean {
  if (!parsed.capabilities || Object.keys(parsed.capabilities).length === 0) return false
  const blockers = Array.isArray(parsed.blockers) ? parsed.blockers : []
  return !blockers.some((blocker) => blockingCapabilityStatusCodes.has(blocker))
}

function loadCachedModelStatuses(): Map<ProviderRegistryID, CachedModelStatus> {
  try {
    const rows = getDb().prepare(`
      SELECT provider_registry_id, model_id, source, last_checked_at
        , capabilities_json
      FROM llm_models
      WHERE provider_registry_id IS NOT NULL
      ORDER BY provider_registry_id, model_id
    `).all() as Array<{
      provider_registry_id: ProviderRegistryID
      model_id: string
      source: string
      last_checked_at: string | null
      capabilities_json: string
    }>

    const statuses = new Map<ProviderRegistryID, CachedModelStatus>()
    for (const row of rows) {
      const current = statuses.get(row.provider_registry_id) ?? {
        source: row.source,
        models: [],
        modelCount: 0,
        lastCheckedAt: row.last_checked_at,
        stale: isStale(row.last_checked_at),
        capabilityStatus: {
          capableModelCount: 0,
          sources: [],
          confidences: [],
          blockers: [],
        },
      }
      current.models.push(row.model_id)
      current.modelCount = current.models.length
      try {
        const parsed = JSON.parse(row.capabilities_json) as {
          source?: string
          confidence?: string
          capabilities?: Record<string, unknown>
          blockers?: string[]
        }
        if (hasEligibleCapabilityMetadata(parsed)) {
          current.capabilityStatus.capableModelCount += 1
        }
        if (parsed.source) current.capabilityStatus.sources.push(parsed.source)
        if (parsed.confidence) current.capabilityStatus.confidences.push(parsed.confidence)
        if (Array.isArray(parsed.blockers)) current.capabilityStatus.blockers.push(...parsed.blockers)
      } catch {}
      if (
        row.last_checked_at &&
        (!current.lastCheckedAt || Date.parse(row.last_checked_at) > Date.parse(current.lastCheckedAt))
      ) {
        current.lastCheckedAt = row.last_checked_at
        current.source = row.source
        current.stale = isStale(row.last_checked_at)
      }
      current.capabilityStatus.sources = [...new Set(current.capabilityStatus.sources)]
      current.capabilityStatus.confidences = [...new Set(current.capabilityStatus.confidences)]
      current.capabilityStatus.blockers = [...new Set(current.capabilityStatus.blockers)]
      statuses.set(row.provider_registry_id, current)
    }
    return statuses
  } catch {
    return new Map()
  }
}

function providerRow(
  entry: ProviderRegistryEntry,
  active: ReturnType<typeof activeStatus> | null,
  cachedModels: Map<ProviderRegistryID, CachedModelStatus>
) {
  const discoveryPlan = modelDiscoveryPlanForEntry(entry)
  const isConfigured = active?.activeProviderRegistryId === entry.id
  const cachedModelStatus = cachedModels.get(entry.id)
  const fallbackSource = entry.fallbackModels.length > 0 ? 'fallback' : 'none'

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
      source: cachedModelStatus?.source ?? fallbackSource,
      authoritative: Boolean(cachedModelStatus),
      stale: cachedModelStatus?.stale ?? true,
      modelCount: cachedModelStatus?.modelCount ?? entry.fallbackModels.length,
      lastCheckedAt: cachedModelStatus?.lastCheckedAt ?? null,
      blocker: cachedModelStatus ? null : discoveryPlan.message,
      models: cachedModelStatus?.models ?? entry.fallbackModels,
      capabilityStatus: cachedModelStatus?.capabilityStatus ?? {
        capableModelCount: 0,
        sources: fallbackSource === 'fallback' ? ['fallback'] : [],
        confidences: fallbackSource === 'fallback' ? ['fallback'] : [],
        blockers: fallbackSource === 'fallback' ? ['fallback_only', 'missing_metadata'] : ['missing_metadata'],
      },
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
  const activeProviderRegistryId = config.providerRegistryId ?? providerRegistryIdForExecutableProvider(config.provider)
  const activeAccessLabel = accessLabel(config.authMode, config.gatewayBackend)

  return {
    configured: true,
    activeProvider: config.provider,
    activeProviderRegistryId,
    executionKind: config.executionKind,
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
  const cachedModels = loadCachedModelStatuses()
  try {
    const active = activeStatus()
    return NextResponse.json({
      ...active,
      providers: PROVIDER_REGISTRY.map((entry) => providerRow(entry, active, cachedModels)),
    })
  } catch (err) {
    if (err instanceof ConfigError) {
      const active = emptyStatus()
      return NextResponse.json({
        ...active,
        providers: PROVIDER_REGISTRY.map((entry) => providerRow(entry, null, cachedModels)),
      })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
