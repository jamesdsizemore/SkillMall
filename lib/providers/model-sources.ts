import { resolveEnvSecret } from '../llm/router/secret-refs'
import type { SecretRef } from '../llm/router/types'
import { getProviderRegistryEntry } from './registry'
import { readStoredApiKeySync } from './secret-store'
import type {
  ProviderDiscoveryStrategy,
  ProviderRegistryEntry,
  ProviderRegistryID,
} from './types'

export type ProviderModelSourceLabel = 'live' | 'source_backed_static' | 'manual' | 'fallback'

export type ProviderModelSourceStatus =
  | 'live'
  | 'endpoint_required'
  | 'secret_required'
  | 'account_context_required'
  | 'cloud_project_context_required'
  | 'local_runtime_required'
  | 'source_backed_static'
  | 'manual_models'
  | 'static_fallback'
  | 'planned_source_review'
  | 'provider_specific_required'

export interface ProviderModelSourceInput {
  providerRegistryId: ProviderRegistryID
  baseURL?: string
  secretRef?: SecretRef
  apiKey?: string
  project?: Record<string, string | undefined>
  manualModels?: string[]
  fetchFn?: FetchLike
  now?: () => Date
}

export interface ProviderModelRecord {
  providerRegistryId: ProviderRegistryID
  modelId: string
  displayName?: string
  source: ProviderModelSourceLabel
  authoritative: boolean
  sourceName: string
  sourceUrl?: string
  fetchedAt: string
  raw?: Record<string, unknown>
  blocker?: string
}

export interface ProviderModelSourceResult {
  providerRegistryId: ProviderRegistryID
  strategy: ProviderDiscoveryStrategy
  status: ProviderModelSourceStatus
  source: ProviderModelSourceLabel | 'none'
  authoritative: boolean
  models: ProviderModelRecord[]
  networkCalled: boolean
  blocker?: string
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

type ModelObject = Record<string, unknown>

function isSecretLikeMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase()
  const compact = normalized.replace(/[_-]/g, '')
  if (/api[_-]?key/.test(normalized)) return true
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

const staticModelRecords: Partial<Record<ProviderRegistryID, Array<{ modelId: string; displayName?: string }>>> = {
  alibaba_dashscope_qwen: [
    { modelId: 'qwen-plus', displayName: 'Qwen Plus' },
    { modelId: 'qwen-max', displayName: 'Qwen Max' },
    { modelId: 'qwen-turbo', displayName: 'Qwen Turbo' },
  ],
  zai: [
    { modelId: 'glm-5.1', displayName: 'GLM 5.1' },
    { modelId: 'glm-4.6', displayName: 'GLM 4.6' },
  ],
  perplexity: [
    { modelId: 'perplexity/sonar', displayName: 'Sonar' },
  ],
}

function nowIso(input: ProviderModelSourceInput): string {
  return (input.now?.() ?? new Date()).toISOString()
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function localRuntimeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/v1\/?$/, '')
}

function sanitizeRawMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeRawMetadata)
  if (!value || typeof value !== 'object') return value

  const sanitized: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isSecretLikeMetadataKey(key)) continue
    sanitized[key] = sanitizeRawMetadata(nestedValue)
  }
  return sanitized
}

export function sanitizeProviderModelRaw(raw: Record<string, unknown>): Record<string, unknown> {
  return sanitizeRawMetadata(raw) as Record<string, unknown>
}

function envSecretValue(input: ProviderModelSourceInput): string | undefined {
  if (input.apiKey) return input.apiKey
  if (!input.secretRef || input.secretRef.type === 'none') return undefined
  if (input.secretRef.type === 'stored_api_key') return readStoredApiKeySync(input.secretRef.id)
  return resolveEnvSecret(input.secretRef.name)
}

function blockerResult(
  entry: ProviderRegistryEntry,
  status: ProviderModelSourceStatus,
  blocker: string,
): ProviderModelSourceResult {
  return {
    providerRegistryId: entry.id,
    strategy: entry.discoveryStrategy,
    status,
    source: 'none',
    authoritative: false,
    models: [],
    networkCalled: false,
    blocker,
  }
}

function recordsFromIds({
  entry,
  ids,
  source,
  authoritative,
  sourceName,
  sourceUrl,
  fetchedAt,
  rawById = {},
}: {
  entry: ProviderRegistryEntry
  ids: string[]
  source: ProviderModelSourceLabel
  authoritative: boolean
  sourceName: string
  sourceUrl?: string
  fetchedAt: string
  rawById?: Record<string, Record<string, unknown>>
}): ProviderModelRecord[] {
  return uniqueNonEmpty(ids).map((modelId) => ({
    providerRegistryId: entry.id,
    modelId,
    displayName: rawById[modelId] && typeof rawById[modelId].name === 'string'
      ? rawById[modelId].name
      : modelId,
    source,
    authoritative,
    sourceName,
    sourceUrl,
    fetchedAt,
    raw: rawById[modelId] ? sanitizeProviderModelRaw(rawById[modelId]) : undefined,
  }))
}

function resultFromRecords(
  entry: ProviderRegistryEntry,
  status: ProviderModelSourceStatus,
  source: ProviderModelSourceLabel,
  authoritative: boolean,
  models: ProviderModelRecord[],
  networkCalled: boolean,
): ProviderModelSourceResult {
  return {
    providerRegistryId: entry.id,
    strategy: entry.discoveryStrategy,
    status,
    source,
    authoritative,
    models,
    networkCalled,
  }
}

async function fetchJson(fetchFn: FetchLike, url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetchFn(url, init)
  if (!response.ok) throw new Error(`Model source refresh failed with HTTP ${response.status}`)
  return response.json()
}

function normalizeOpenAICompatible(payload: unknown): { ids: string[]; rawById: Record<string, ModelObject> } {
  const rawById: Record<string, ModelObject> = {}
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
    return { ids: [], rawById }
  }

  const ids = payload.data
    .filter((model): model is ModelObject & { id: string } => (
      typeof model === 'object' && model !== null && typeof model.id === 'string'
    ))
    .map((model) => {
      rawById[model.id] ??= model
      return model.id
    })

  return { ids: uniqueNonEmpty(ids), rawById }
}

function normalizeNamedObjects(
  rows: unknown,
  idKeys: string[],
): { ids: string[]; rawById: Record<string, ModelObject> } {
  const rawById: Record<string, ModelObject> = {}
  const list = Array.isArray(rows) ? rows : []
  const ids = list.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const objectRow = row as ModelObject
    for (const key of idKeys) {
      if (typeof objectRow[key] === 'string') {
        const id = objectRow[key]
        rawById[id] ??= objectRow
        return [id]
      }
    }
    return []
  })
  return { ids: uniqueNonEmpty(ids), rawById }
}

async function openAICompatibleSource(
  entry: ProviderRegistryEntry,
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  if (!input.baseURL && entry.gatewayProfile?.requiresUserEndpoint) {
    return blockerResult(entry, 'endpoint_required', 'A configured OpenAI-compatible base URL is required.')
  }

  const baseURL = input.baseURL
  if (!baseURL) {
    return blockerResult(entry, 'endpoint_required', 'A configured OpenAI-compatible base URL is required.')
  }

  const headers: Record<string, string> = {}
  const secret = envSecretValue(input)
  if (secret) headers.authorization = `Bearer ${secret}`

  const url = joinUrl(baseURL, '/models')
  const payload = await fetchJson(input.fetchFn ?? fetch, url, { headers })
  const { ids, rawById } = normalizeOpenAICompatible(payload)
  const models = recordsFromIds({
    entry,
    ids,
    source: 'live',
    authoritative: true,
    sourceName: `${entry.name} OpenAI-compatible models endpoint`,
    sourceUrl: url,
    fetchedAt: nowIso(input),
    rawById,
  })
  return resultFromRecords(entry, 'live', 'live', true, models, true)
}

async function anthropicSource(
  entry: ProviderRegistryEntry,
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  const secret = envSecretValue(input)
  if (!secret) return blockerResult(entry, 'secret_required', 'Anthropic model listing requires an API-key env reference.')
  const url = 'https://api.anthropic.com/v1/models'
  const payload = await fetchJson(input.fetchFn ?? fetch, url, {
    headers: {
      'x-api-key': secret,
      'anthropic-version': '2023-06-01',
    },
  })
  const data = payload && typeof payload === 'object' && 'data' in payload ? (payload as { data?: unknown }).data : []
  const { ids, rawById } = normalizeNamedObjects(data, ['id'])
  const models = recordsFromIds({
    entry,
    ids,
    source: 'live',
    authoritative: true,
    sourceName: 'Anthropic Models API',
    sourceUrl: url,
    fetchedAt: nowIso(input),
    rawById,
  })
  return resultFromRecords(entry, 'live', 'live', true, models, true)
}

async function geminiSource(
  entry: ProviderRegistryEntry,
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  const secret = envSecretValue(input)
  if (!secret) return blockerResult(entry, 'secret_required', 'Gemini model listing requires an API-key env reference.')
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(secret)}`
  const payload = await fetchJson(input.fetchFn ?? fetch, url)
  const modelsPayload = payload && typeof payload === 'object' && 'models' in payload
    ? (payload as { models?: unknown }).models
    : []
  const list = Array.isArray(modelsPayload)
    ? modelsPayload.filter((model) => {
        if (!model || typeof model !== 'object') return false
        const methods = (model as { supportedGenerationMethods?: unknown }).supportedGenerationMethods
        return !Array.isArray(methods) || methods.includes('generateContent')
      })
    : []
  const { ids, rawById } = normalizeNamedObjects(list, ['baseModelId', 'name'])
  const normalizedIds = ids.map((id) => id.replace(/^models\//, ''))
  const normalizedRawById = Object.fromEntries(
    Object.entries(rawById).map(([id, raw]) => [id.replace(/^models\//, ''), raw])
  )
  const models = recordsFromIds({
    entry,
    ids: normalizedIds,
    source: 'live',
    authoritative: true,
    sourceName: 'Google Gemini Models API',
    sourceUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    fetchedAt: nowIso(input),
    rawById: normalizedRawById,
  })
  return resultFromRecords(entry, 'live', 'live', true, models, true)
}

async function cohereSource(
  entry: ProviderRegistryEntry,
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  const secret = envSecretValue(input)
  if (!secret) return blockerResult(entry, 'secret_required', 'Cohere model listing requires an API-key env reference.')
  const url = 'https://api.cohere.com/v1/models'
  const payload = await fetchJson(input.fetchFn ?? fetch, url, {
    headers: { authorization: `Bearer ${secret}` },
  })
  const data = payload && typeof payload === 'object' && 'models' in payload ? (payload as { models?: unknown }).models : []
  const { ids, rawById } = normalizeNamedObjects(data, ['name'])
  const models = recordsFromIds({
    entry,
    ids,
    source: 'live',
    authoritative: true,
    sourceName: 'Cohere Models API',
    sourceUrl: url,
    fetchedAt: nowIso(input),
    rawById,
  })
  return resultFromRecords(entry, 'live', 'live', true, models, true)
}

async function huggingFaceSource(
  entry: ProviderRegistryEntry,
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  const url = input.baseURL
    ? joinUrl(input.baseURL, '/models')
    : 'https://huggingface.co/api/models?inference_provider=all'
  const headers: Record<string, string> = {}
  const secret = envSecretValue(input)
  if (secret) headers.authorization = `Bearer ${secret}`
  const payload = await fetchJson(input.fetchFn ?? fetch, url, { headers })
  const normalized = input.baseURL
    ? normalizeOpenAICompatible(payload)
    : normalizeNamedObjects(payload, ['id', 'modelId'])
  const models = recordsFromIds({
    entry,
    ids: normalized.ids,
    source: 'live',
    authoritative: true,
    sourceName: input.baseURL ? 'Hugging Face router /v1/models' : 'Hugging Face Hub API inference provider filter',
    sourceUrl: url,
    fetchedAt: nowIso(input),
    rawById: normalized.rawById,
  })
  return resultFromRecords(entry, 'live', 'live', true, models, true)
}

async function ollamaSource(
  entry: ProviderRegistryEntry,
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  const baseURL = input.baseURL
  if (!baseURL) return blockerResult(entry, 'local_runtime_required', 'A configured Ollama endpoint is required.')
  const url = joinUrl(localRuntimeBaseUrl(baseURL), '/api/tags')
  const payload = await fetchJson(input.fetchFn ?? fetch, url)
  const data = payload && typeof payload === 'object' && 'models' in payload ? (payload as { models?: unknown }).models : []
  const { ids, rawById } = normalizeNamedObjects(data, ['model', 'name'])
  const models = recordsFromIds({
    entry,
    ids,
    source: 'live',
    authoritative: true,
    sourceName: 'Ollama tags API',
    sourceUrl: url,
    fetchedAt: nowIso(input),
    rawById,
  })
  return resultFromRecords(entry, 'live', 'live', true, models, true)
}

async function deepInfraSource(
  entry: ProviderRegistryEntry,
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  const url = 'https://api.deepinfra.com/models/list'
  const payload = await fetchJson(input.fetchFn ?? fetch, url)
  const { ids, rawById } = normalizeNamedObjects(payload, ['model_name'])
  const models = recordsFromIds({
    entry,
    ids,
    source: 'live',
    authoritative: true,
    sourceName: 'DeepInfra models list API',
    sourceUrl: url,
    fetchedAt: nowIso(input),
    rawById,
  })
  return resultFromRecords(entry, 'live', 'live', true, models, true)
}

async function fireworksSource(
  entry: ProviderRegistryEntry,
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  const accountId = input.project?.accountId
  if (!accountId) {
    return blockerResult(entry, 'account_context_required', 'Fireworks model listing requires accountId context.')
  }
  const secret = envSecretValue(input)
  if (!secret) return blockerResult(entry, 'secret_required', 'Fireworks model listing requires an API-key env reference.')
  const url = `https://api.fireworks.ai/v1/accounts/${encodeURIComponent(accountId)}/models`
  const payload = await fetchJson(input.fetchFn ?? fetch, url, {
    headers: { authorization: `Bearer ${secret}` },
  })
  const data = payload && typeof payload === 'object' && 'models' in payload ? (payload as { models?: unknown }).models : []
  const { ids, rawById } = normalizeNamedObjects(data, ['name'])
  const models = recordsFromIds({
    entry,
    ids,
    source: 'live',
    authoritative: true,
    sourceName: 'Fireworks account models API',
    sourceUrl: url,
    fetchedAt: nowIso(input),
    rawById,
  })
  return resultFromRecords(entry, 'live', 'live', true, models, true)
}

function manualSource(entry: ProviderRegistryEntry, input: ProviderModelSourceInput): ProviderModelSourceResult {
  const models = recordsFromIds({
    entry,
    ids: input.manualModels ?? [],
    source: 'manual',
    authoritative: true,
    sourceName: 'User supplied manual model labels',
    fetchedAt: nowIso(input),
  })
  return resultFromRecords(entry, 'manual_models', 'manual', true, models, false)
}

function sourceBackedStaticSource(entry: ProviderRegistryEntry, input: ProviderModelSourceInput): ProviderModelSourceResult {
  if (input.manualModels?.length) return manualSource(entry, input)

  const models = (staticModelRecords[entry.id] ?? []).map((model) => ({
    providerRegistryId: entry.id,
    modelId: model.modelId,
    displayName: model.displayName ?? model.modelId,
    source: 'source_backed_static' as const,
    authoritative: true,
    sourceName: `${entry.name} official documentation`,
    sourceUrl: entry.officialSourceUrl,
    fetchedAt: nowIso(input),
    raw: { id: model.modelId, displayName: model.displayName },
  }))
  if (models.length === 0) {
    return blockerResult(entry, 'provider_specific_required', 'No source-backed static model list is implemented for this provider.')
  }
  return resultFromRecords(entry, 'source_backed_static', 'source_backed_static', true, models, false)
}

function fallbackSource(entry: ProviderRegistryEntry, input: ProviderModelSourceInput): ProviderModelSourceResult {
  const models = recordsFromIds({
    entry,
    ids: entry.fallbackModels,
    source: 'fallback',
    authoritative: false,
    sourceName: 'SkillMall fallback model labels',
    sourceUrl: entry.officialSourceUrl,
    fetchedAt: nowIso(input),
  })
  return resultFromRecords(entry, 'static_fallback', 'fallback', false, models, false)
}

export async function refreshProviderModelSource(
  input: ProviderModelSourceInput,
): Promise<ProviderModelSourceResult> {
  const entry = getProviderRegistryEntry(input.providerRegistryId)
  if (!entry) throw new Error(`Unknown provider registry id: ${input.providerRegistryId}`)

  if (entry.discoveryStrategy === 'planned_provider_source_review') {
    return blockerResult(entry, 'planned_source_review', entry.evidenceNote)
  }

  if (input.manualModels?.length && entry.discoveryStrategy === 'manual_custom_models') {
    return manualSource(entry, input)
  }

  switch (entry.id) {
    case 'anthropic':
      return anthropicSource(entry, input)
    case 'gemini':
      return geminiSource(entry, input)
    case 'cohere':
      return cohereSource(entry, input)
    case 'huggingface':
      return huggingFaceSource(entry, input)
    case 'ollama':
      return ollamaSource(entry, input)
    case 'deepinfra':
      return deepInfraSource(entry, input)
    case 'fireworks':
      return fireworksSource(entry, input)
    case 'alibaba_dashscope_qwen':
    case 'zai':
    case 'perplexity':
      return sourceBackedStaticSource(entry, input)
  }

  switch (entry.discoveryStrategy) {
    case 'openai_compatible_models':
      return openAICompatibleSource(entry, input)
    case 'manual_custom_models':
      return input.baseURL ? openAICompatibleSource(entry, input) : manualSource(entry, input)
    case 'source_backed_static_models':
      return sourceBackedStaticSource(entry, input)
    case 'static_fallback_only':
      return fallbackSource(entry, input)
    case 'account_scoped_models':
      return blockerResult(entry, 'account_context_required', 'Account context is required before model discovery.')
    case 'cloud_project_scoped_models':
      return blockerResult(entry, 'cloud_project_context_required', 'Cloud project/resource/region/deployment context is required before model discovery.')
    case 'local_runtime_models':
      return blockerResult(entry, 'local_runtime_required', 'A configured local runtime endpoint is required before model discovery.')
    case 'official_provider_models':
      return blockerResult(entry, 'provider_specific_required', 'Provider-specific model discovery adapter required.')
    default:
      return blockerResult(entry, 'planned_source_review', entry.evidenceNote)
  }
}
