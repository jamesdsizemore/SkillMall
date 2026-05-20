import { createHash } from 'crypto'
import type Database from 'better-sqlite3'
import { getDb } from '../../db/client'
import { fetchProviderModels } from '../../providers/catalog'
import type { ProviderConfig } from '../../providers/types'
import { resolveEnvSecret } from './secret-refs'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface RefreshedModel {
  providerId: string
  modelId: string
  source: 'live:direct' | 'live:bifrost_local'
  raw: Record<string, unknown>
}

export interface ModelRefreshResult {
  providerId: string
  source: RefreshedModel['source']
  models: RefreshedModel[]
  checkedAt: string
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

function sanitizeRawModel(raw: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const normalized = key.toLowerCase()
    if (normalized.includes('key') || normalized.includes('token') || normalized.includes('secret')) {
      continue
    }
    sanitized[key] = value
  }
  return sanitized
}

function upsertModel(db: Database.Database, model: RefreshedModel, checkedAt: string): void {
  const raw = sanitizeRawModel(model.raw)
  db.prepare(`
    INSERT INTO llm_models (
      id,
      provider_id,
      model_id,
      display_name,
      source,
      last_checked_at,
      raw_json,
      updated_at
    ) VALUES (
      @id,
      @providerId,
      @modelId,
      @displayName,
      @source,
      @checkedAt,
      @rawJson,
      @checkedAt
    )
    ON CONFLICT(provider_id, model_id) DO UPDATE SET
      display_name = excluded.display_name,
      source = excluded.source,
      last_checked_at = excluded.last_checked_at,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at
  `).run({
    id: `${model.providerId}:${model.modelId}:${rawHash(raw)}`,
    providerId: model.providerId,
    modelId: model.modelId,
    displayName: typeof raw.name === 'string' ? raw.name : model.modelId,
    source: model.source,
    checkedAt,
    rawJson: JSON.stringify(raw),
  })
}

function resolveGatewayVirtualKey(config: ProviderConfig): string {
  if (config.authMode !== 'gateway_virtual_key' || config.secretRef?.type !== 'gateway_virtual_key_ref') {
    throw new Error('bifrost_local model refresh requires gateway_virtual_key auth')
  }
  const value = resolveEnvSecret(config.secretRef.name)
  if (!value) throw new Error(`Missing gateway virtual key environment variable: ${config.secretRef.name}`)
  return value
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
    .map((model) => ({
      providerId: config.provider,
      modelId: model.id,
      source: 'live:bifrost_local',
      raw: model,
    }))
}

export async function refreshProviderModels(
  config: ProviderConfig,
  db: Database.Database = getDb(),
  fetchFn: FetchLike = fetch
): Promise<ModelRefreshResult> {
  const checkedAt = nowIso()
  const models =
    config.gatewayBackend === 'bifrost_local'
      ? await fetchBifrostModels(config, fetchFn)
      : (await fetchProviderModels(config)).map((modelId) => ({
          providerId: config.provider,
          modelId,
          source: 'live:direct' as const,
          raw: { id: modelId },
        }))

  for (const model of models) {
    upsertModel(db, model, checkedAt)
  }

  return {
    providerId: config.provider,
    source: config.gatewayBackend === 'bifrost_local' ? 'live:bifrost_local' : 'live:direct',
    models,
    checkedAt,
  }
}
