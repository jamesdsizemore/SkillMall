import type {
  ProviderDiscoveryStrategy,
  ProviderRegistryEntry,
} from './types'

export type ModelDiscoveryStatus =
  | 'live'
  | 'endpoint_required'
  | 'provider_specific_required'
  | 'account_context_required'
  | 'cloud_project_context_required'
  | 'local_runtime_required'
  | 'manual_models'
  | 'static_fallback'
  | 'planned_source_review'

export type ModelDiscoverySource = 'live' | 'manual' | 'fallback' | 'none'

export interface ModelDiscoveryOptions {
  baseUrl?: string
  apiKey?: string
  manualModels?: string[]
}

export interface ModelDiscoveryResult {
  strategy: ProviderDiscoveryStrategy
  status: ModelDiscoveryStatus
  source: ModelDiscoverySource
  authoritative: boolean
  models: string[]
  networkCalled: boolean
  liveCallable?: boolean
  message?: string
}

export interface ModelDiscoveryPlan {
  strategy: ProviderDiscoveryStrategy
  canRefreshNow: boolean
  liveCallable: boolean
  requiresEndpoint: boolean
  requiresProviderAdapter: boolean
  requiresAccountContext: boolean
  requiresProjectContext: boolean
  requiresLocalRuntime: boolean
  requiresManualModels: boolean
  message: string
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function isModelObject(value: unknown): value is { id: string } {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string'
}

export function normalizeOpenAICompatibleModels(payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null || !('data' in payload) || !Array.isArray(payload.data)) {
    return []
  }

  return uniqueNonEmpty(payload.data.filter(isModelObject).map((model) => model.id))
}

export function modelDiscoveryPlanForEntry(entry: ProviderRegistryEntry): ModelDiscoveryPlan {
  const base = {
    strategy: entry.discoveryStrategy,
    liveCallable: entry.liveCallable,
    requiresEndpoint: false,
    requiresProviderAdapter: false,
    requiresAccountContext: false,
    requiresProjectContext: false,
    requiresLocalRuntime: false,
    requiresManualModels: false,
  }

  switch (entry.discoveryStrategy) {
    case 'openai_compatible_models':
      return {
        ...base,
        canRefreshNow: true,
        requiresEndpoint: true,
        message: 'Refresh by probing the configured OpenAI-compatible models endpoint.',
      }
    case 'official_provider_models':
      return {
        ...base,
        canRefreshNow: false,
        requiresProviderAdapter: true,
        message: 'Refresh requires a provider-specific official models adapter.',
      }
    case 'account_scoped_models':
      return {
        ...base,
        canRefreshNow: false,
        requiresAccountContext: true,
        message: 'Refresh requires account-scoped provider context before any network call.',
      }
    case 'cloud_project_scoped_models':
      return {
        ...base,
        canRefreshNow: false,
        requiresProjectContext: true,
        message: 'Refresh requires cloud project/resource/region/deployment context.',
      }
    case 'local_runtime_models':
      return {
        ...base,
        canRefreshNow: false,
        requiresLocalRuntime: true,
        message: 'Refresh requires a configured local runtime endpoint.',
      }
    case 'manual_custom_models':
      return {
        ...base,
        canRefreshNow: false,
        requiresEndpoint: true,
        requiresManualModels: true,
        message: 'Manual model labels are authoritative only for the user configuration; endpoint probing is optional.',
      }
    case 'static_fallback_only':
      return {
        ...base,
        canRefreshNow: false,
        message: 'Static fallback labels are display-only and non-authoritative.',
      }
    case 'planned_provider_source_review':
      return {
        ...base,
        canRefreshNow: false,
        message: 'Provider is visible but live discovery is disabled until primary-source evidence is recorded.',
      }
  }
}

export async function discoverProviderModels(
  entry: ProviderRegistryEntry,
  options: ModelDiscoveryOptions = {}
): Promise<ModelDiscoveryResult> {
  switch (entry.discoveryStrategy) {
    case 'openai_compatible_models': {
      if (!options.baseUrl) {
        return {
          strategy: entry.discoveryStrategy,
          status: 'endpoint_required',
          source: 'none',
          authoritative: false,
          models: [],
          networkCalled: false,
          message: 'A configured OpenAI-compatible base URL is required before probing models.',
        }
      }

      const headers: Record<string, string> = {}
      if (options.apiKey) headers.authorization = `Bearer ${options.apiKey}`
      const response = await fetch(joinUrl(options.baseUrl, '/models'), { headers })
      if (!response.ok) throw new Error(`Model discovery failed with HTTP ${response.status}`)

      return {
        strategy: entry.discoveryStrategy,
        status: 'live',
        source: 'live',
        authoritative: true,
        models: normalizeOpenAICompatibleModels(await response.json()),
        networkCalled: true,
      }
    }
    case 'official_provider_models':
      return {
        strategy: entry.discoveryStrategy,
        status: 'provider_specific_required',
        source: 'none',
        authoritative: false,
        models: [],
        networkCalled: false,
        message: 'Provider-specific model discovery adapter required; no generic /v1/models call attempted.',
      }
    case 'account_scoped_models':
      return {
        strategy: entry.discoveryStrategy,
        status: 'account_context_required',
        source: 'none',
        authoritative: false,
        models: [],
        networkCalled: false,
        message: 'Account context is required before model discovery.',
      }
    case 'cloud_project_scoped_models':
      return {
        strategy: entry.discoveryStrategy,
        status: 'cloud_project_context_required',
        source: 'none',
        authoritative: false,
        models: [],
        networkCalled: false,
        message: 'Cloud project/resource/region/deployment context is required before model discovery.',
      }
    case 'local_runtime_models':
      return {
        strategy: entry.discoveryStrategy,
        status: 'local_runtime_required',
        source: 'none',
        authoritative: false,
        models: [],
        networkCalled: false,
        message: 'A configured local runtime endpoint is required before model discovery.',
      }
    case 'manual_custom_models':
      return {
        strategy: entry.discoveryStrategy,
        status: 'manual_models',
        source: 'manual',
        authoritative: true,
        models: uniqueNonEmpty(options.manualModels ?? []),
        networkCalled: false,
        message: 'Manual model labels are used unless the user explicitly probes the configured endpoint.',
      }
    case 'static_fallback_only':
      return {
        strategy: entry.discoveryStrategy,
        status: 'static_fallback',
        source: 'fallback',
        authoritative: false,
        models: entry.fallbackModels,
        networkCalled: false,
        message: 'Static fallback labels are not authoritative live provider catalogs.',
      }
    case 'planned_provider_source_review':
      return {
        strategy: entry.discoveryStrategy,
        status: 'planned_source_review',
        source: 'none',
        authoritative: false,
        models: [],
        networkCalled: false,
        liveCallable: false,
        message: entry.evidenceNote,
      }
  }
}
