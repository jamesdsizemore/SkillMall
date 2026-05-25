import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  listRoutingPolicies,
  normalizeRoutingPolicyBudget,
  normalizeRoutingPolicyRules,
  RoutingPolicyStoreError,
  setRoutingPolicyEnabled,
  upsertRoutingPolicy,
} from '../routing-policy-store'

const phase1MigrationPath = path.join(process.cwd(), 'db/migrations/006_llm_router_core.sql')
const phase2MigrationPath = path.join(process.cwd(), 'db/migrations/007_llm_router_phase2.sql')
const phase1MigrationSql = fs.readFileSync(phase1MigrationPath, 'utf-8')
const phase2MigrationSql = fs.readFileSync(phase2MigrationPath, 'utf-8')
const tempDbs: Array<{ db: Database.Database; file: string }> = []

function createRouterDb(): Database.Database {
  const file = path.join(os.tmpdir(), `skillmall-policy-store-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  tempDbs.push({ db, file })
  return db
}

const openaiCandidate = {
  id: 'api',
  config: {
    provider: 'openai',
    providerRegistryId: 'openai',
    model: 'gpt-4o-mini',
    authMode: 'env_key',
    secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
    gatewayBackend: 'direct',
  },
  estimatedCostUsd: 0.02,
}

const codexCandidate = {
  id: 'codex-account',
  config: {
    provider: 'codex',
    providerRegistryId: 'openai_codex',
    model: 'gpt-5.4',
    authMode: 'codex_app_server',
    secretRef: { type: 'none' },
    gatewayBackend: 'direct',
  },
  estimatedCostUsd: 0.03,
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

describe('routing policy store', () => {
  it('upserts, lists, and disables supported routing policies', () => {
    const db = createRouterDb()
    const saved = upsertRoutingPolicy(
      {
        id: 'budget-openai',
        name: 'Budget guarded OpenAI',
        mode: 'budget_guarded_manual',
        rules: { candidates: [openaiCandidate] },
        budget: { remaining_usd: 0.01, monthly_budget_usd: 20 },
      },
      db
    )

    expect(saved).toMatchObject({
      id: 'budget-openai',
      name: 'Budget guarded OpenAI',
      mode: 'budget_guarded_manual',
      enabled: true,
      budget: { remainingUsd: 0.01, limitUsd: 20 },
    })
    expect(saved.rules.candidates?.[0]).toMatchObject({
      id: 'api',
      estimatedCostUsd: 0.02,
      config: {
        provider: 'openai',
        providerRegistryId: 'openai',
        model: 'gpt-4o-mini',
        authMode: 'env_key',
        secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
      },
    })

    const disabled = setRoutingPolicyEnabled('budget-openai', false, db)
    expect(disabled.enabled).toBe(false)
    expect(listRoutingPolicies(db)).toHaveLength(1)
  })

  it('accepts OpenAI Codex account-auth candidates emitted by Provider Center', () => {
    const db = createRouterDb()
    const saved = upsertRoutingPolicy(
      {
        id: 'codex-account-policy',
        name: 'Codex account policy',
        mode: 'manual',
        rules: { candidates: [codexCandidate] },
      },
      db
    )

    expect(saved.rules.candidates?.[0]).toMatchObject({
      id: 'codex-account',
      config: {
        provider: 'codex',
        providerRegistryId: 'openai_codex',
        model: 'gpt-5.4',
        authMode: 'codex_app_server',
        secretRef: { type: 'none' },
        gatewayBackend: 'direct',
      },
    })
  })

  it('rejects unsupported future policy modes', () => {
    const db = createRouterDb()
    expect(() =>
      upsertRoutingPolicy(
        {
          id: 'cheap',
          name: 'Cheap first',
          mode: 'cheapest_compatible',
        },
        db
      )
    ).toThrow('Unsupported router routing-policy mode')
  })

  it('rejects raw secrets and prompt or response bodies in shared normalization', () => {
    expect(() =>
      normalizeRoutingPolicyRules({
        candidates: [
          {
            config: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              authMode: 'env_key',
              secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
              api_key: 'sk-raw',
            },
          },
        ],
      })
    ).toThrow(RoutingPolicyStoreError)

    expect(() => normalizeRoutingPolicyBudget({ remainingUsd: 1, prompt: 'do not store me' })).toThrow(
      RoutingPolicyStoreError
    )
  })
})
