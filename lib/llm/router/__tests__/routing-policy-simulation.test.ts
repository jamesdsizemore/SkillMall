import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { simulateRoutingPolicyDecision } from '../routing-policy-simulation'
import type { ProviderConfig } from '../../../providers/types'

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

const openaiConfig: ProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  authMode: 'env_key',
  secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
  gatewayBackend: 'direct',
}

const ollamaConfig: ProviderConfig = {
  provider: 'ollama',
  model: 'llama3.1',
  authMode: 'none_local',
  secretRef: { type: 'none' },
  gatewayBackend: 'direct',
}

function createDb(): Database.Database {
  const file = path.join(os.tmpdir(), `skillmall-policy-sim-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  db.exec(phase4MigrationSql)
  tempDbs.push({ db, file })
  return db
}

function insertCapability(db: Database.Database, providerRegistryId: string, providerId: string, modelId: string): void {
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
    `${providerRegistryId}:${modelId}`,
    providerId,
    providerRegistryId,
    'direct',
    modelId,
    JSON.stringify({
      source: 'official_api',
      confidence: 'authoritative',
      capabilities: { text_input: true, text_output: true },
      limits: {},
      blockers: [],
    }),
    'live:direct',
    '2026-05-20T10:00:00.000Z',
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

describe('simulateRoutingPolicyDecision', () => {
  it('evaluates local-first routing without sending or storing provider content', () => {
    const db = createDb()
    insertCapability(db, 'openai', 'openai', 'gpt-4o-mini')
    insertCapability(db, 'ollama', 'ollama', 'llama3.1')

    const result = simulateRoutingPolicyDecision({
      baseConfig: openaiConfig,
      db,
      now: () => new Date('2026-05-20T10:30:00.000Z'),
      policy: {
        id: 'local',
        mode: 'local_first',
        rules: {
          candidates: [
            { id: 'api', config: openaiConfig },
            { id: 'local', config: ollamaConfig },
          ],
        },
        budget: {},
        enabled: true,
        name: 'Local first',
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T10:00:00.000Z',
      },
    })

    expect(result).toMatchObject({
      simulation: true,
      providerRequestSent: false,
      promptStored: false,
      responseStored: false,
      mode: 'local_first',
      blocked: false,
      selected: {
        candidateId: 'local',
        providerId: 'ollama',
        modelId: 'llama3.1',
      },
    })
    expect(result.eligibility).toHaveLength(2)
    expect(result.eligibility.find((item) => item.candidateId === 'local')).toMatchObject({
      capabilityStatus: 'eligible',
      pricingStatus: 'not_required',
      blockerCodes: [],
    })
  })

  it('can apply a caller-provided numeric estimate for budget simulation', () => {
    const db = createDb()
    insertCapability(db, 'openai', 'openai', 'gpt-4o-mini')

    const result = simulateRoutingPolicyDecision({
      baseConfig: openaiConfig,
      db,
      now: () => new Date('2026-05-20T10:30:00.000Z'),
      estimatedCostUsd: 0.02,
      policy: {
        id: 'budget',
        mode: 'budget_guarded_manual',
        candidates: [{ id: 'api', config: openaiConfig }],
        budget: { remainingUsd: 0.01 },
      },
    })

    expect(result).toMatchObject({
      simulation: true,
      providerRequestSent: false,
      blocked: true,
      selected: null,
      estimatedCostUsd: 0.02,
    })
    expect(result.attempts).toEqual([
      expect.objectContaining({
        candidateId: 'api',
        status: 'blocked',
        reason: 'estimated_cost_exceeds_budget:0.02>0.01',
      }),
    ])
  })

  it('returns capability and pricing eligibility blockers without provider calls', () => {
    const db = createDb()
    const result = simulateRoutingPolicyDecision({
      baseConfig: openaiConfig,
      db,
      now: () => new Date('2026-05-20T10:30:00.000Z'),
      requirePricing: true,
      policy: {
        id: 'missing-metadata',
        mode: 'manual',
        candidates: [{ id: 'api', config: openaiConfig }],
      },
    })

    expect(result).toMatchObject({
      simulation: true,
      providerRequestSent: false,
      promptStored: false,
      responseStored: false,
      blocked: true,
      selected: null,
    })
    expect(result.attempts[0]).toMatchObject({
      candidateId: 'api',
      status: 'blocked',
      reason: 'route_eligibility_blocked:missing_metadata,missing_price',
    })
    expect(result.eligibility[0]).toMatchObject({
      capabilityStatus: 'unknown',
      pricingStatus: 'missing',
      blockerCodes: expect.arrayContaining(['missing_metadata', 'missing_price']),
    })
  })
})
