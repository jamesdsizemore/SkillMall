import { createHash } from 'crypto'
import type Database from 'better-sqlite3'
import { getDb } from '../../db/client'
import type { ModelPricing } from './costing'

export interface PricingSnapshotInput {
  providerId: string
  providerRegistryId?: string
  executionKind?: string
  modelId: string
  pricing: ModelPricing
  source: string
  sourceUrl?: string
  sourceLicense?: string
  currency?: string
}

export interface PricingSnapshotRecord extends PricingSnapshotInput {
  id: number
  providerRegistryId?: string
  executionKind?: string
  currency: string
  snapshotAt: string
  hash: string
}

function hashPricing(input: PricingSnapshotInput): string {
  return createHash('sha256')
    .update(JSON.stringify({
      providerId: input.providerId,
      providerRegistryId: input.providerRegistryId ?? input.providerId,
      executionKind: input.executionKind,
      modelId: input.modelId,
      pricing: input.pricing,
      currency: input.currency ?? 'USD',
      source: input.source,
      sourceUrl: input.sourceUrl,
      sourceLicense: input.sourceLicense,
    }))
    .digest('hex')
}

function parseRecord(row: {
  id: number
  provider_id: string
  provider_registry_id?: string | null
  execution_kind?: string | null
  model_id: string
  pricing_json: string
  currency: string
  source: string
  source_url: string | null
  snapshot_at: string
  hash: string
}): PricingSnapshotRecord {
  const parsedPricing = JSON.parse(row.pricing_json) as ModelPricing & { sourceLicense?: string }
  const { sourceLicense, ...pricing } = parsedPricing
  return {
    id: row.id,
    providerId: row.provider_id,
    providerRegistryId: row.provider_registry_id ?? undefined,
    executionKind: row.execution_kind ?? undefined,
    modelId: row.model_id,
    pricing,
    currency: row.currency,
    source: row.source,
    sourceLicense,
    sourceUrl: row.source_url ?? undefined,
    snapshotAt: row.snapshot_at,
    hash: row.hash,
  }
}

function tableHasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  return rows.some((row) => row.name === columnName)
}

export function storePricingSnapshot(
  input: PricingSnapshotInput,
  db: Database.Database = getDb()
): PricingSnapshotRecord {
  const hash = hashPricing(input)
  const hasProviderRegistryId = tableHasColumn(db, 'llm_pricing_snapshots', 'provider_registry_id')

  const pricingJson = JSON.stringify({
    ...input.pricing,
    ...(input.sourceLicense ? { sourceLicense: input.sourceLicense } : {}),
  })

  const result = hasProviderRegistryId
    ? db.prepare(`
    INSERT INTO llm_pricing_snapshots (
      provider_id,
      provider_registry_id,
      execution_kind,
      model_id,
      pricing_json,
      currency,
      source,
      source_url,
      hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
      input.providerId,
      input.providerRegistryId ?? input.providerId,
      input.executionKind ?? null,
      input.modelId,
      pricingJson,
      input.currency ?? 'USD',
      input.source,
      input.sourceUrl ?? null,
      hash
    )
    : db.prepare(`
    INSERT INTO llm_pricing_snapshots (
      provider_id,
      model_id,
      pricing_json,
      currency,
      source,
      source_url,
      hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
      input.providerId,
      input.modelId,
      pricingJson,
      input.currency ?? 'USD',
      input.source,
      input.sourceUrl ?? null,
      hash
    )

  const row = db.prepare('SELECT * FROM llm_pricing_snapshots WHERE id = ?').get(result.lastInsertRowid) as {
    id: number
    provider_id: string
    provider_registry_id?: string | null
    execution_kind?: string | null
    model_id: string
    pricing_json: string
    currency: string
    source: string
    source_url: string | null
    snapshot_at: string
    hash: string
  }
  return parseRecord(row)
}

export function getLatestPricingSnapshot(
  providerId: string,
  modelId: string,
  db: Database.Database = getDb()
): PricingSnapshotRecord | undefined {
  const hasProviderRegistryId = tableHasColumn(db, 'llm_pricing_snapshots', 'provider_registry_id')
  const row = hasProviderRegistryId
    ? db.prepare(`
    SELECT *
    FROM llm_pricing_snapshots
    WHERE provider_registry_id = ? AND model_id = ?
    ORDER BY snapshot_at DESC, id DESC
    LIMIT 1
  `).get(providerId, modelId) as
      | {
          id: number
          provider_id: string
          provider_registry_id?: string | null
          execution_kind?: string | null
          model_id: string
          pricing_json: string
          currency: string
          source: string
          source_url: string | null
          snapshot_at: string
          hash: string
        }
      | undefined
    : db.prepare(`
    SELECT *
    FROM llm_pricing_snapshots
    WHERE provider_id = ? AND model_id = ?
    ORDER BY snapshot_at DESC, id DESC
    LIMIT 1
  `).get(providerId, modelId) as
    | {
        id: number
        provider_id: string
        provider_registry_id?: string | null
        execution_kind?: string | null
        model_id: string
        pricing_json: string
        currency: string
        source: string
        source_url: string | null
        snapshot_at: string
        hash: string
      }
    | undefined

  return row ? parseRecord(row) : undefined
}

export function refreshPricingSnapshots(
  inputs: PricingSnapshotInput[],
  db: Database.Database = getDb()
): PricingSnapshotRecord[] {
  return inputs.map((input) => storePricingSnapshot(input, db))
}
