import { createHash } from 'crypto'
import type Database from 'better-sqlite3'
import { getDb } from '../../db/client'
import type { ModelPricing } from './costing'

export interface PricingSnapshotInput {
  providerId: string
  modelId: string
  pricing: ModelPricing
  source: string
  sourceUrl?: string
  currency?: string
}

export interface PricingSnapshotRecord extends PricingSnapshotInput {
  id: number
  currency: string
  snapshotAt: string
  hash: string
}

function hashPricing(input: PricingSnapshotInput): string {
  return createHash('sha256')
    .update(JSON.stringify({
      providerId: input.providerId,
      modelId: input.modelId,
      pricing: input.pricing,
      currency: input.currency ?? 'USD',
      source: input.source,
      sourceUrl: input.sourceUrl,
    }))
    .digest('hex')
}

function parseRecord(row: {
  id: number
  provider_id: string
  model_id: string
  pricing_json: string
  currency: string
  source: string
  source_url: string | null
  snapshot_at: string
  hash: string
}): PricingSnapshotRecord {
  return {
    id: row.id,
    providerId: row.provider_id,
    modelId: row.model_id,
    pricing: JSON.parse(row.pricing_json) as ModelPricing,
    currency: row.currency,
    source: row.source,
    sourceUrl: row.source_url ?? undefined,
    snapshotAt: row.snapshot_at,
    hash: row.hash,
  }
}

export function storePricingSnapshot(
  input: PricingSnapshotInput,
  db: Database.Database = getDb()
): PricingSnapshotRecord {
  const hash = hashPricing(input)
  const result = db.prepare(`
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
    JSON.stringify(input.pricing),
    input.currency ?? 'USD',
    input.source,
    input.sourceUrl ?? null,
    hash
  )

  const row = db.prepare('SELECT * FROM llm_pricing_snapshots WHERE id = ?').get(result.lastInsertRowid) as {
    id: number
    provider_id: string
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
  const row = db.prepare(`
    SELECT *
    FROM llm_pricing_snapshots
    WHERE provider_id = ? AND model_id = ?
    ORDER BY snapshot_at DESC, id DESC
    LIMIT 1
  `).get(providerId, modelId) as
    | {
        id: number
        provider_id: string
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
