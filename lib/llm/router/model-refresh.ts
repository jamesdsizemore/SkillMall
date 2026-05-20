import { createHash } from 'crypto'
import type Database from 'better-sqlite3'
import { getDb } from '../../db/client'
import { fetchProviderModels } from '../../providers/catalog'
import { refreshProviderModelSource } from '../../providers/model-sources'
import {
  getProviderRegistryEntry,
  providerRegistryIdForExecutableProvider,
} from '../../providers/registry'
import type { ProviderConfig, ProviderRegistryEntry, ProviderRegistryID } from '../../providers/types'
import type { SecretRef } from './types'
import { resolveEnvSecret } from './secret-refs'
import {
  modelCapabilityContextWindow,
  modelCapabilityMaxOutputTokens,
  normalizeProviderModelCapabilities,
  type ModelCapabilityMetadata,
} from './model-capabilities'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface RefreshedModel {
  providerId: string
  providerRegistryId: ProviderRegistryID
  executionKind: string
  modelId: string
  displayName?: string
  source:
    | 'live:direct'
    | 'live:bifrost_local'
    | 'live:openai_compatible'
    | 'live:provider_specific'
    | 'live:local_runtime'
    | 'source_backed_static'
    | 'manual'
    | 'fallback'
  raw: Record<string, unknown>
  capabilities?: ModelCapabilityMetadata
}

export interface ModelRefreshResult {
  providerId: string
  providerRegistryId: ProviderRegistryID
  executionKind: string
  source: RefreshedModel['source']
  models: RefreshedModel[]
  checkedAt: string
  status?: string
  blocker?: string
  authoritative?: boolean
  networkCalled?: boolean
  persistedCount?: number
}

type OpenAICompatibleModelList = {
  data?: Array<Record<string, unknown> & { id?: string }>
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function nowIso(): string {
  return new Date().toISOString()
}

function rawHash(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function isSecretLikeRawKey(key: string): boolean {
  const normalized = key.toLowerCase()
  const compact = normalized.replace(/[_-]/g, '')
  if (normalized.includes('key')) return true
  if (/(authorization|bearer|credential|secret|session)/.test(normalized)) return true
  if (compact.includes('token')) {
    return !new Set([
      'inputtokenlimit',
      'outputtokenlimit',
      'maxtokens',
      'maxinputtokens',
      'maxoutputtokens',
      'inputtokens',
      'outputtokens',
      'prompttokens',
      'completiontokens',
      'cachedinputtokens',
      'reasoningtokens',
      'tokenizerurl',
    ]).has(compact)
  }
  return false
}

function sanitizeRawModel(raw: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (isSecretLikeRawKey(key)) continue
    sanitized[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? sanitizeRawModel(value as Record<string, unknown>)
      : value
  }
  return sanitized
}

function upsertModel(db: Database.Database, model: RefreshedModel, checkedAt: string): void {
  const raw = sanitizeRawModel(model.raw)
  const capabilitiesJson = JSON.stringify(model.capabilities ?? {})
  const contextWindow = model.capabilities ? modelCapabilityContextWindow(model.capabilities) : undefined
  const maxOutputTokens = model.capabilities ? modelCapabilityMaxOutputTokens(model.capabilities) : undefined
  db.prepare(`
    INSERT INTO llm_models (
      id,
      provider_id,
      provider_registry_id,
      execution_kind,
      model_id,
      display_name,
      source,
      capabilities_json,
      context_window,
      max_output_tokens,
      last_checked_at,
      raw_json,
      updated_at
    ) VALUES (
      @id,
      @providerId,
      @providerRegistryId,
      @executionKind,
      @modelId,
      @displayName,
      @source,
      @capabilitiesJson,
      @contextWindow,
      @maxOutputTokens,
      @checkedAt,
      @rawJson,
      @checkedAt
    )
    ON CONFLICT(provider_registry_id, model_id) DO UPDATE SET
      provider_id = excluded.provider_id,
      execution_kind = excluded.execution_kind,
      display_name = excluded.display_name,
      source = excluded.source,
      capabilities_json = excluded.capabilities_json,
      context_window = excluded.context_window,
      max_output_tokens = excluded.max_output_tokens,
      last_checked_at = excluded.last_checked_at,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at
  `).run({
    id: `${model.providerId}:${model.modelId}:${rawHash(raw)}`,
    providerId: model.providerId,
    providerRegistryId: model.providerRegistryId,
    executionKind: model.executionKind,
    modelId: model.modelId,
    displayName: model.displayName ?? (typeof raw.name === 'string' ? raw.name : model.modelId),
    source: model.source,
    capabilitiesJson,
    contextWindow: contextWindow ?? null,
    maxOutputTokens: maxOutputTokens ?? null,
    checkedAt,
    rawJson: JSON.stringify(raw),
  })
}

function modelSourceLabel(source: RefreshedModel['source']): 'live' | 'source_backed_static' | 'manual' | 'fallback' {
  if (source === 'source_backed_static') return 'source_backed_static'
  if (source === 'manual') return 'manual'
  if (source === 'fallback') return 'fallback'
  return 'live'
}

function withCapabilities(
  model: Omit<RefreshedModel, 'capabilities'>,
  input: {
    sourceName: string
    sourceUrl?: string
    fetchedAt: string
    authoritative: boolean
    blocker?: string
  }
): RefreshedModel {
  return {
    ...model,
    capabilities: normalizeProviderModelCapabilities({
      providerRegistryId: model.providerRegistryId,
      modelId: model.modelId,
      source: modelSourceLabel(model.source),
      authoritative: input.authoritative,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      fetchedAt: input.fetchedAt,
      raw: model.raw,
      blocker: input.blocker,
    }),
  }
}

function resolveGatewayVirtualKey(config: ProviderConfig): string {
  if (config.authMode !== 'gateway_virtual_key' || config.secretRef?.type !== 'gateway_virtual_key_ref') {
    throw new Error('bifrost_local model refresh requires gateway_virtual_key auth')
  }
  const value = resolveEnvSecret(config.secretRef.name)
  if (!value) throw new Error(`Missing gateway virtual key environment variable: ${config.secretRef.name}`)
  return value
}

function directExecutionKind(config: ProviderConfig): string {
  return config.gatewayBackend === 'bifrost_local' ? 'bifrost_local' : 'direct'
}

function sourceExecutionKind(
  entry: ProviderRegistryEntry,
  source: RefreshedModel['source'],
): string {
  if (source === 'live:openai_compatible') return 'openai_compatible'
  if (source === 'live:provider_specific') return 'provider_specific'
  if (source === 'live:local_runtime') return 'local_runtime'
  if (source === 'source_backed_static') return 'source_backed_static'
  if (source === 'manual') return 'manual'
  if (source === 'fallback') return 'fallback'
  if (entry.gatewayProfile?.kind === 'openai_compatible') return 'openai_compatible'
  return 'provider_specific'
}

function registrySource(entry: ProviderRegistryEntry, source: 'live' | 'source_backed_static' | 'manual' | 'fallback'): RefreshedModel['source'] {
  if (source === 'source_backed_static') return 'source_backed_static'
  if (source === 'manual') return 'manual'
  if (source === 'fallback') return 'fallback'
  if (entry.discoveryStrategy === 'local_runtime_models') return 'live:local_runtime'
  if (entry.discoveryStrategy === 'openai_compatible_models') return 'live:openai_compatible'
  if (entry.gatewayProfile?.kind === 'openai_compatible' && entry.discoveryStrategy !== 'official_provider_models') {
    return 'live:openai_compatible'
  }
  return 'live:provider_specific'
}

export async function fetchBifrostModels(
  config: ProviderConfig,
  fetchFn: FetchLike = fetch
): Promise<RefreshedModel[]> {
  const virtualKey = resolveGatewayVirtualKey(config)
  const baseURL = trimTrailingSlash(config.baseURL ?? 'http://localhost:8080/v1')
  const response = await fetchFn(`${baseURL}/models`, {
    headers: {
      Authorization: `Bearer ${virtualKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Bifrost model refresh failed: HTTP ${response.status}`)
  }

  const data = (await response.json()) as OpenAICompatibleModelList
  return (data.data ?? [])
    .filter((model): model is Record<string, unknown> & { id: string } => typeof model.id === 'string')
    .map((model) =>
      withCapabilities(
        {
          providerId: config.provider,
          providerRegistryId: providerRegistryIdForExecutableProvider(config.provider),
          executionKind: 'bifrost_local',
          modelId: model.id,
          source: 'live:bifrost_local',
          raw: model,
        },
        {
          sourceName: 'Bifrost local OpenAI-compatible models endpoint',
          sourceUrl: `${baseURL}/models`,
          fetchedAt: nowIso(),
          authoritative: true,
        }
      )
    )
}

export async function refreshProviderModels(
  config: ProviderConfig,
  db: Database.Database = getDb(),
  fetchFn: FetchLike = fetch
): Promise<ModelRefreshResult> {
  const checkedAt = nowIso()
  const providerRegistryId = providerRegistryIdForExecutableProvider(config.provider)
  const executionKind = directExecutionKind(config)
  const models =
    config.gatewayBackend === 'bifrost_local'
      ? await fetchBifrostModels(config, fetchFn)
      : (await fetchProviderModels(config)).map((modelId) =>
          withCapabilities(
            {
              providerId: config.provider,
              providerRegistryId,
              executionKind,
              modelId,
              source: 'live:direct' as const,
              raw: { id: modelId },
            },
            {
              sourceName: `${config.provider} direct model list`,
              fetchedAt: checkedAt,
              authoritative: true,
            }
          )
        )

  for (const model of models) {
    upsertModel(db, model, checkedAt)
  }

  return {
    providerId: config.provider,
    providerRegistryId,
    executionKind,
    source: config.gatewayBackend === 'bifrost_local' ? 'live:bifrost_local' : 'live:direct',
    models,
    checkedAt,
    persistedCount: models.length,
  }
}

export async function refreshRegistryProviderModels(
  input: {
    providerRegistryId: ProviderRegistryID
    baseURL?: string
    secretRef?: SecretRef
    apiKey?: string
    project?: Record<string, string | undefined>
    manualModels?: string[]
    fetchFn?: FetchLike
    now?: () => Date
  },
  db: Database.Database = getDb(),
): Promise<ModelRefreshResult> {
  const entry = getProviderRegistryEntry(input.providerRegistryId)
  if (!entry) throw new Error(`Unknown provider registry id: ${input.providerRegistryId}`)

  const checkedAt = nowIso()
  const result = await refreshProviderModelSource({
    providerRegistryId: entry.id,
    baseURL: input.baseURL,
    secretRef: input.secretRef,
    apiKey: input.apiKey,
    project: input.project,
    manualModels: input.manualModels,
    fetchFn: input.fetchFn,
    now: input.now,
  })

  const source = result.source === 'none'
    ? 'fallback'
    : registrySource(entry, result.source)
  const executionKind = sourceExecutionKind(entry, source)
  const providerId = entry.executableProviderId ?? entry.id
  const models = result.models.map((model) => ({
    ...withCapabilities(
      {
        providerId,
        providerRegistryId: entry.id,
        executionKind,
        modelId: model.modelId,
        displayName: model.displayName,
        source,
        raw: {
          id: model.modelId,
          displayName: model.displayName,
          sourceName: model.sourceName,
          sourceUrl: model.sourceUrl,
          ...(model.raw ?? {}),
        },
      },
      {
        sourceName: model.sourceName,
        sourceUrl: model.sourceUrl,
        fetchedAt: model.fetchedAt,
        authoritative: model.authoritative,
        blocker: model.blocker,
      }
    ),
  }))

  for (const model of models) {
    upsertModel(db, model, checkedAt)
  }

  return {
    providerId,
    providerRegistryId: entry.id,
    executionKind,
    source,
    models,
    checkedAt,
    status: result.status,
    blocker: result.blocker,
    authoritative: result.authoritative,
    networkCalled: result.networkCalled,
    persistedCount: models.length,
  }
}
