import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fetchBifrostModels, refreshProviderModels, refreshRegistryProviderModels } from '../model-refresh'

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
  const file = path.join(os.tmpdir(), `skillmall-model-refresh-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  db.exec(phase4MigrationSql)
  tempDbs.push({ db, file })
  return db
}

afterEach(() => {
  delete process.env.BIFROST_VIRTUAL_KEY
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

describe('fetchBifrostModels', () => {
  it('fetches models from the local Bifrost OpenAI-compatible models endpoint', async () => {
    process.env.BIFROST_VIRTUAL_KEY = 'redacted-virtual-key'
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const fetchFn = async (url: string, init?: RequestInit) => {
      requests.push({ url, init })
      return new Response(
        JSON.stringify({
          data: [
            { id: 'openai/gpt-4o-mini', owned_by: 'openai', api_key: 'must-not-store' },
            { id: 'anthropic/claude-sonnet-4-20250514', owned_by: 'anthropic' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const models = await fetchBifrostModels(
      {
        provider: 'openai',
        model: 'openai/gpt-4o-mini',
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
        baseURL: 'http://localhost:8080/v1/',
      },
      fetchFn
    )

    expect(requests[0].url).toBe('http://localhost:8080/v1/models')
    expect(requests[0].init?.headers).toEqual({
      Authorization: 'Bearer redacted-virtual-key',
    })
    expect(models.map((model) => model.modelId)).toEqual([
      'openai/gpt-4o-mini',
      'anthropic/claude-sonnet-4-20250514',
    ])
  })
})

describe('refreshProviderModels', () => {
  it('stores gateway models in llm_models with source, timestamp, and sanitized raw metadata', async () => {
    process.env.BIFROST_VIRTUAL_KEY = 'redacted-virtual-key'
    const db = createDb()
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'openai/gpt-4o-mini',
              object: 'model',
              secret_token: 'must-not-store',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    const result = await refreshProviderModels(
      {
        provider: 'openai',
        model: 'openai/gpt-4o-mini',
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
      },
      db,
      fetchFn
    )

    const row = db.prepare('SELECT provider_id, provider_registry_id, execution_kind, model_id, source, last_checked_at, raw_json FROM llm_models').get() as {
      provider_id: string
      provider_registry_id: string
      execution_kind: string
      model_id: string
      source: string
      last_checked_at: string
      raw_json: string
    }

    expect(result.source).toBe('live:bifrost_local')
    expect(row.provider_id).toBe('openai')
    expect(row.provider_registry_id).toBe('openai')
    expect(row.execution_kind).toBe('bifrost_local')
    expect(row.model_id).toBe('openai/gpt-4o-mini')
    expect(row.source).toBe('live:bifrost_local')
    expect(row.last_checked_at).toBeTruthy()
    expect(row.raw_json).toContain('openai/gpt-4o-mini')
    expect(row.raw_json).not.toContain('must-not-store')
  })

  it('stores source-backed registry models with provider registry identity and sanitized raw metadata', async () => {
    const db = createDb()

    const result = await refreshRegistryProviderModels(
      {
        providerRegistryId: 'zai',
        now: () => new Date('2026-05-20T12:00:00.000Z'),
      },
      db
    )

    const rows = db.prepare(`
      SELECT provider_id, provider_registry_id, execution_kind, model_id, source, raw_json
      FROM llm_models
      ORDER BY model_id
    `).all() as Array<{
      provider_id: string
      provider_registry_id: string
      execution_kind: string
      model_id: string
      source: string
      raw_json: string
    }>

    expect(result).toMatchObject({
      providerId: 'zai',
      providerRegistryId: 'zai',
      executionKind: 'source_backed_static',
      status: 'source_backed_static',
      source: 'source_backed_static',
      networkCalled: false,
      persistedCount: 2,
    })
    expect(rows.map((row) => row.model_id)).toEqual(['glm-4.6', 'glm-5.1'])
    expect(rows.every((row) => row.provider_registry_id === 'zai')).toBe(true)
    expect(rows.every((row) => row.execution_kind === 'source_backed_static')).toBe(true)
    expect(rows.every((row) => row.source === 'source_backed_static')).toBe(true)
    expect(rows.map((row) => row.raw_json).join('\n')).not.toMatch(/secret|token|credential|authorization/i)
  })

  it('returns blockers without writing snapshots for registry rows that lack required context', async () => {
    const db = createDb()
    const fetchFn = async () => {
      throw new Error('must not call network')
    }

    const result = await refreshRegistryProviderModels(
      {
        providerRegistryId: 'fireworks',
        fetchFn,
      },
      db
    )

    const count = db.prepare('SELECT COUNT(*) as count FROM llm_models').get() as { count: number }

    expect(result).toMatchObject({
      providerRegistryId: 'fireworks',
      status: 'account_context_required',
      networkCalled: false,
      persistedCount: 0,
    })
    expect(result.blocker).toContain('accountId')
    expect(count.count).toBe(0)
  })
})
