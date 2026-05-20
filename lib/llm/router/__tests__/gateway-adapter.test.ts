import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { BifrostLocalGatewayAdapter } from '../gateway-adapter'

const phase1MigrationPath = path.join(process.cwd(), 'db/migrations/006_llm_router_core.sql')
const phase2MigrationPath = path.join(process.cwd(), 'db/migrations/007_llm_router_phase2.sql')
const phase1MigrationSql = fs.readFileSync(phase1MigrationPath, 'utf-8')
const phase2MigrationSql = fs.readFileSync(phase2MigrationPath, 'utf-8')
const tempDbs: Array<{ db: Database.Database; file: string }> = []

function createPhase2RouterDb(): Database.Database {
  const file = path.join(os.tmpdir(), `skillmall-router-phase2-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  tempDbs.push({ db, file })
  return db
}

function insertProviderConfig(db: Database.Database, overrides: Record<string, unknown> = {}) {
  db.prepare(`
    INSERT INTO llm_provider_configs (
      id,
      provider_id,
      auth_mode,
      secret_ref_type,
      secret_ref,
      gateway_backend
    ) VALUES (
      @id,
      @providerId,
      @authMode,
      @secretRefType,
      @secretRef,
      @gatewayBackend
    )
  `).run({
    id: 'provider-bifrost',
    providerId: 'bifrost',
    authMode: 'gateway_virtual_key',
    secretRefType: 'gateway_virtual_key_ref',
    secretRef: 'BIFROST_VIRTUAL_KEY',
    gatewayBackend: 'bifrost_local',
    ...overrides,
  })
}

function insertRequest(db: Database.Database, overrides: Record<string, unknown> = {}) {
  db.prepare(`
    INSERT INTO llm_requests (
      id,
      operation,
      provider_id,
      model_id,
      route_backend,
      auth_mode,
      status,
      started_at
    ) VALUES (
      @id,
      @operation,
      @providerId,
      @modelId,
      @routeBackend,
      @authMode,
      @status,
      @startedAt
    )
  `).run({
    id: 'request-bifrost',
    operation: 'skill.preview',
    providerId: 'openai',
    modelId: 'openai/gpt-4o-mini',
    routeBackend: 'bifrost_local',
    authMode: 'gateway_virtual_key',
    status: 'started',
    startedAt: '2026-05-20T12:00:00.000Z',
    ...overrides,
  })
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

describe('router Phase 2 migration contract', () => {
  it('allows bifrost_local provider configs with gateway virtual key refs', () => {
    const db = createPhase2RouterDb()

    insertProviderConfig(db)

    const row = db
      .prepare('SELECT auth_mode, secret_ref_type, gateway_backend FROM llm_provider_configs')
      .get()
    expect(row).toEqual({
      auth_mode: 'gateway_virtual_key',
      secret_ref_type: 'gateway_virtual_key_ref',
      gateway_backend: 'bifrost_local',
    })
  })

  it('preserves existing direct provider rows while expanding constraints', () => {
    const file = path.join(os.tmpdir(), `skillmall-router-phase2-copy-${Date.now()}-${Math.random()}.db`)
    const db = new Database(file)
    db.pragma('foreign_keys = ON')
    db.exec(phase1MigrationSql)
    db.prepare(`
      INSERT INTO llm_provider_configs (
        id,
        provider_id,
        auth_mode,
        secret_ref_type,
        secret_ref,
        gateway_backend
      ) VALUES ('provider-openai', 'openai', 'env_key', 'env', 'OPENAI_API_KEY', 'direct')
    `).run()

    db.exec(phase2MigrationSql)
    tempDbs.push({ db, file })

    const rows = db
      .prepare('SELECT provider_id, auth_mode, secret_ref_type, secret_ref, gateway_backend FROM llm_provider_configs')
      .all()
    expect(rows).toEqual([
      {
        provider_id: 'openai',
        auth_mode: 'env_key',
        secret_ref_type: 'env',
        secret_ref: 'OPENAI_API_KEY',
        gateway_backend: 'direct',
      },
    ])
  })

  it('rejects unapproved gateway backends and reserved auth modes', () => {
    const db = createPhase2RouterDb()

    for (const gatewayBackend of ['gomodel_local', 'litellm_proxy', 'external_openai_compatible']) {
      expect(() =>
        insertProviderConfig(db, { id: `provider-${gatewayBackend}`, gatewayBackend })
      ).toThrow()
    }

    for (const authMode of ['api_key', 'keychain_ref', 'codex_session', 'oauth_device_flow']) {
      expect(() => insertProviderConfig(db, { id: `provider-${authMode}`, authMode })).toThrow()
    }
  })

  it('requires gateway virtual-key auth to use a gateway virtual key ref', () => {
    const db = createPhase2RouterDb()

    expect(() =>
      insertProviderConfig(db, {
        id: 'provider-missing-vk-ref',
        secretRefType: 'env',
        secretRef: 'OPENAI_API_KEY',
      })
    ).toThrow()
  })

  it('allows approved Phase 2 routing-policy modes only', () => {
    const db = createPhase2RouterDb()

    for (const mode of ['manual', 'fallback_chain', 'local_first', 'budget_guarded_manual']) {
      db.prepare('INSERT INTO llm_routing_policies (id, name, mode) VALUES (?, ?, ?)').run(
        `policy-${mode}`,
        mode,
        mode
      )
    }

    for (const mode of ['cheapest_compatible', 'quality_first', 'semantic_router']) {
      expect(() =>
        db.prepare('INSERT INTO llm_routing_policies (id, name, mode) VALUES (?, ?, ?)').run(
          `policy-${mode}`,
          mode,
          mode
        )
      ).toThrow()
    }
  })

  it('allows bifrost_local request ledger rows and rejects unapproved backends', () => {
    const db = createPhase2RouterDb()

    insertRequest(db)

    const row = db.prepare('SELECT route_backend, auth_mode FROM llm_requests').get()
    expect(row).toEqual({
      route_backend: 'bifrost_local',
      auth_mode: 'gateway_virtual_key',
    })

    expect(() =>
      insertRequest(db, {
        id: 'request-gomodel',
        routeBackend: 'gomodel_local',
      })
    ).toThrow()
  })
})

describe('BifrostLocalGatewayAdapter', () => {
  it('sends OpenAI-compatible requests and extracts usage and cost metadata', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const fetchFn = async (url: string, init?: RequestInit) => {
      requests.push({ url, init })
      return new Response(
        JSON.stringify({
          id: 'response-1',
          choices: [{ message: { content: 'gateway text' } }],
          usage: {
            prompt_tokens: 11,
            completion_tokens: 22,
            prompt_tokens_details: { cached_tokens: 3 },
            completion_tokens_details: { reasoning_tokens: 4 },
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-bifrost-response-cost': '0.0042',
          },
        }
      )
    }

    const adapter = new BifrostLocalGatewayAdapter(
      {
        provider: 'openai',
        model: 'openai/gpt-4o-mini',
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
        baseURL: 'http://localhost:8080/v1/',
      },
      'redacted-virtual-key',
      fetchFn
    )

    const result = await adapter.complete({
      prompt: 'prompt body',
      options: {
        systemPrompt: 'system body',
        maxTokens: 123,
        temperature: 0.3,
        responseFormat: 'json_object',
      },
    })

    expect(result).toEqual({
      text: 'gateway text',
      usage: {
        inputTokens: 11,
        outputTokens: 22,
        cachedInputTokens: 3,
        reasoningTokens: 4,
      },
      actualCostUsd: 0.0042,
      costSource: 'bifrost',
      metadata: {
        gatewayResponseId: 'response-1',
        gatewayBackend: 'bifrost_local',
      },
    })
    expect(requests[0].url).toBe('http://localhost:8080/v1/chat/completions')
    expect(requests[0].init?.headers).toEqual({
      Authorization: 'Bearer redacted-virtual-key',
      'Content-Type': 'application/json',
    })
    expect(JSON.stringify(result)).not.toContain('redacted-virtual-key')
  })

  it('throws sanitized errors for failed gateway responses', async () => {
    const fetchFn = async () =>
      new Response('upstream unavailable', {
        status: 503,
      })
    const adapter = new BifrostLocalGatewayAdapter(
      {
        provider: 'openai',
        model: 'openai/gpt-4o-mini',
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
      },
      'redacted-virtual-key',
      fetchFn
    )

    await expect(adapter.complete({ prompt: 'prompt body' })).rejects.toThrow(
      'Bifrost gateway request failed: HTTP 503'
    )
  })

  it('rejects remote bifrost_local base URLs', () => {
    expect(
      () =>
        new BifrostLocalGatewayAdapter(
          {
            provider: 'openai',
            model: 'openai/gpt-4o-mini',
            authMode: 'gateway_virtual_key',
            secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
            gatewayBackend: 'bifrost_local',
            baseURL: 'https://gateway.example.com/v1',
          },
          'redacted-virtual-key'
        )
    ).toThrow('bifrost_local baseURL must point to localhost')
  })
})
