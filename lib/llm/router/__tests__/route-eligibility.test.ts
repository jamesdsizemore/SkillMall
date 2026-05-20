import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { evaluateRouteEligibility } from '../route-eligibility'
import { storePricingSnapshot } from '../pricing-refresh'

const phase1MigrationSql = fs.readFileSync(
  path.join(process.cwd(), 'db/migrations/006_llm_router_core.sql'),
  'utf-8'
)
const phase2MigrationSql = fs.readFileSync(
  path.join(process.cwd(), 'db/migrations/007_llm_router_phase2.sql'),
  'utf-8'
)
const phase4MigrationSql = fs.readFileSync(
  path.join(process.cwd(), 'db/migrations/008_provider_auth_router_phase4.sql'),
  'utf-8'
)
const tempDbs: Array<{ db: Database.Database; file: string }> = []

function createDb(): Database.Database {
  const file = path.join(os.tmpdir(), `skillmall-route-eligibility-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  db.exec(phase4MigrationSql)
  tempDbs.push({ db, file })
  return db
}

function insertModel(db: Database.Database, input: {
  providerRegistryId?: string
  modelId?: string
  capabilities?: Record<string, unknown>
  lastCheckedAt?: string
}) {
  db.prepare(`
    INSERT INTO llm_models (
      id,
      provider_id,
      provider_registry_id,
      execution_kind,
      model_id,
      capabilities_json,
      source,
      last_checked_at,
      raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `${input.providerRegistryId ?? 'openai'}:${input.modelId ?? 'gpt-4o-mini'}`,
    'openai',
    input.providerRegistryId ?? 'openai',
    'direct',
    input.modelId ?? 'gpt-4o-mini',
    JSON.stringify(input.capabilities ?? {
      source: 'official_api',
      confidence: 'authoritative',
      capabilities: { text_input: true, text_output: true },
      limits: { contextWindow: 128000, maxOutputTokens: 16384 },
      blockers: [],
    }),
    'live:direct',
    input.lastCheckedAt ?? '2026-05-20T12:00:00.000Z',
    '{}'
  )
}

afterEach(() => {
  while (tempDbs.length > 0) {
    const entry = tempDbs.pop()
    if (!entry) continue
    entry.db.close()
    for (const suffix of ['', '-shm', '-wal']) {
      try {
        fs.unlinkSync(entry.file + suffix)
      } catch {}
    }
  }
})

describe('evaluateRouteEligibility', () => {
  it('marks a candidate eligible when required capabilities and pricing are present', () => {
    const db = createDb()
    insertModel(db, {})
    storePricingSnapshot({
      providerId: 'openai',
      providerRegistryId: 'openai',
      executionKind: 'direct',
      modelId: 'gpt-4o-mini',
      pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
      source: 'test pricing',
    }, db)

    const result = evaluateRouteEligibility({
      db,
      now: () => new Date('2026-05-20T12:30:00.000Z'),
      operation: 'chat.text',
      requirePricing: true,
      candidate: {
        id: 'api',
        config: {
          provider: 'openai',
          providerRegistryId: 'openai',
          model: 'gpt-4o-mini',
          authMode: 'env_key',
          secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
          gatewayBackend: 'direct',
        },
      },
    })

    expect(result).toMatchObject({
      candidateId: 'api',
      providerRegistryId: 'openai',
      executableProviderId: 'openai',
      modelId: 'gpt-4o-mini',
      enabled: true,
      capabilityStatus: 'eligible',
      pricingStatus: 'available',
      blockerCodes: [],
    })
  })

  it('blocks unknown capability and missing price instead of guessing', () => {
    const db = createDb()

    const result = evaluateRouteEligibility({
      db,
      now: () => new Date('2026-05-20T12:30:00.000Z'),
      operation: 'chat.text',
      requirePricing: true,
      candidate: {
        id: 'api',
        config: {
          provider: 'openai',
          providerRegistryId: 'openai',
          model: 'gpt-missing',
          authMode: 'env_key',
          secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
          gatewayBackend: 'direct',
        },
      },
    })

    expect(result.capabilityStatus).toBe('unknown')
    expect(result.pricingStatus).toBe('missing')
    expect(result.blockerCodes).toEqual(expect.arrayContaining(['missing_metadata', 'missing_price']))
  })

  it('treats fallback-only metadata and stale prices as blockers', () => {
    const db = createDb()
    insertModel(db, {
      capabilities: {
        source: 'fallback',
        confidence: 'fallback',
        capabilities: { text_input: true, text_output: true },
        limits: {},
        blockers: ['fallback_only'],
      },
    })
    db.prepare(`
      INSERT INTO llm_pricing_snapshots (
        provider_id,
        provider_registry_id,
        execution_kind,
        model_id,
        pricing_json,
        currency,
        source,
        snapshot_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'openai',
      'openai',
      'direct',
      'gpt-4o-mini',
      JSON.stringify({ inputPerMillion: 0.15 }),
      'USD',
      'old pricing',
      '2026-05-18T12:00:00.000Z'
    )

    const result = evaluateRouteEligibility({
      db,
      now: () => new Date('2026-05-20T12:30:00.000Z'),
      operation: 'chat.text',
      requirePricing: true,
      candidate: {
        id: 'fallback',
        config: {
          provider: 'openai',
          providerRegistryId: 'openai',
          model: 'gpt-4o-mini',
          authMode: 'env_key',
          secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
          gatewayBackend: 'direct',
        },
      },
    })

    expect(result.capabilityStatus).toBe('unknown')
    expect(result.pricingStatus).toBe('stale')
    expect(result.blockerCodes).toEqual(expect.arrayContaining(['fallback_only', 'stale_price']))
  })

  it('treats reference-only metadata as a blocker for route eligibility', () => {
    const db = createDb()
    insertModel(db, {
      capabilities: {
        source: 'litellm_reference',
        confidence: 'reference',
        capabilities: { text_input: true, text_output: true },
        limits: { contextWindow: 128000 },
        blockers: [],
      },
    })

    const result = evaluateRouteEligibility({
      db,
      now: () => new Date('2026-05-20T12:30:00.000Z'),
      operation: 'chat.text',
      candidate: {
        id: 'reference',
        config: {
          provider: 'openai',
          providerRegistryId: 'openai',
          model: 'gpt-4o-mini',
          authMode: 'env_key',
          secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
          gatewayBackend: 'direct',
        },
      },
    })

    expect(result.capabilityStatus).toBe('unknown')
    expect(result.blockerCodes).toEqual(expect.arrayContaining(['reference_only']))
  })
})
