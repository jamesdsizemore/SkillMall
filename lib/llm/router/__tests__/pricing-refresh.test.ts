import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getLatestPricingSnapshot, refreshPricingSnapshots, storePricingSnapshot } from '../pricing-refresh'

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
  const file = path.join(os.tmpdir(), `skillmall-pricing-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  db.exec(phase4MigrationSql)
  tempDbs.push({ db, file })
  return db
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

describe('pricing refresh', () => {
  it('stores pricing snapshots with source URL, timestamp, and hash', () => {
    const db = createDb()

    const snapshot = storePricingSnapshot(
      {
        providerId: 'openai',
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        modelId: 'gpt-4o-mini',
        pricing: {
          inputPerMillion: 0.15,
          outputPerMillion: 0.6,
        },
        source: 'bifrost_model_catalog',
        sourceUrl: 'https://getbifrost.ai/datasheet',
        sourceLicense: 'test-license',
      },
      db
    )

    expect(snapshot.id).toBeGreaterThan(0)
    expect(snapshot.providerRegistryId).toBe('openrouter')
    expect(snapshot.executionKind).toBe('openai_compatible')
    expect(snapshot.sourceLicense).toBe('test-license')
    expect(snapshot.currency).toBe('USD')
    expect(snapshot.snapshotAt).toBeTruthy()
    expect(snapshot.hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns the latest pricing snapshot for a provider/model pair', () => {
    const db = createDb()

    storePricingSnapshot(
      {
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        pricing: { inputPerMillion: 0.1, outputPerMillion: 0.2 },
        source: 'first',
      },
      db
    )
    const latest = storePricingSnapshot(
      {
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
        source: 'second',
      },
      db
    )

    expect(getLatestPricingSnapshot('openai', 'gpt-4o-mini', db)).toEqual(latest)
  })

  it('stores multiple refreshed pricing snapshots', () => {
    const db = createDb()

    const snapshots = refreshPricingSnapshots(
      [
        {
          providerId: 'openai',
          providerRegistryId: 'openai',
          executionKind: 'direct',
          modelId: 'gpt-4o-mini',
          pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
          source: 'bifrost_model_catalog',
        },
        {
          providerId: 'anthropic',
          providerRegistryId: 'anthropic',
          executionKind: 'direct',
          modelId: 'claude-sonnet-4-20250514',
          pricing: { inputPerMillion: 3, outputPerMillion: 15 },
          source: 'bifrost_model_catalog',
        },
      ],
      db
    )

    expect(snapshots).toHaveLength(2)
    expect(db.prepare('SELECT count(*) AS count FROM llm_pricing_snapshots').get()).toEqual({
      count: 2,
    })
    expect(db.prepare('SELECT count(*) AS count FROM llm_pricing_snapshots WHERE provider_registry_id IS NOT NULL AND execution_kind IS NOT NULL').get()).toEqual({
      count: 2,
    })
  })
})
