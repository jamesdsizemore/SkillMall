import type {
  ProviderDiscoveryStrategy,
  ProviderRegistryEntry,
} from './types'
import { refreshProviderModelSource } from './model-sources'
import type { SecretRef } from '../llm/router/types'

export type ModelDiscoveryStatus =
  | 'live'
  | 'endpoint_required'
  | 'provider_specific_required'
  | 'account_context_required'
  | 'cloud_project_context_required'
  | 'local_runtime_required'
  | 'secret_required'
  | 'source_backed_static'
  | 'manual_models'
  | 'static_fallback'
  | 'planned_source_review'

export type ModelDiscoverySource = 'live' | 'source_backed_static' | 'manual' | 'fallback' | 'none'

export interface ModelDiscoveryOptions {
  baseUrl?: string
  apiKey?: string
  secretRef?: SecretRef
  project?: Record<string, string | undefined>
  manualModels?: string[]
  fetchFn?: (input: string, init?: RequestInit) => Promise<Response>
  now?: () => Date
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
        canRefreshNow: true,
        requiresLocalRuntime: true,
        message: 'Refresh uses the configured local runtime endpoint and provider-specific local API.',
      }
    case 'source_backed_static_models':
      return {
        ...base,
        canRefreshNow: true,
        message: 'Refresh uses source-backed static model labels; no live model-list endpoint is assumed.',
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
  const result = await refreshProviderModelSource({
    providerRegistryId: entry.id,
    baseURL: options.baseUrl,
    apiKey: options.apiKey,
    secretRef: options.secretRef,
    project: options.project,
    manualModels: options.manualModels,
    fetchFn: options.fetchFn,
    now: options.now,
  })

  const discoveryResult: ModelDiscoveryResult = {
    strategy: result.strategy,
    status: result.status,
    source: result.source,
    authoritative: result.authoritative,
    models: result.models.map((model) => model.modelId),
    networkCalled: result.networkCalled,
  }

  if (result.status === 'planned_source_review') discoveryResult.liveCallable = false
  if (result.blocker) discoveryResult.message = result.blocker

  return discoveryResult
}
