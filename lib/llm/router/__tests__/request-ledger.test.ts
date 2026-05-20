import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getDb } from '../../../db/client'
import {
  finishLLMRequest,
  recordLLMRequestEvent,
  startLLMRequest,
  stringifyLedgerMetadata,
} from '../request-ledger'

const phase1MigrationPath = path.join(process.cwd(), 'db/migrations/006_llm_router_core.sql')
const phase2MigrationPath = path.join(process.cwd(), 'db/migrations/007_llm_router_phase2.sql')
const phase1MigrationSql = fs.readFileSync(phase1MigrationPath, 'utf-8')
const phase2MigrationSql = fs.readFileSync(phase2MigrationPath, 'utf-8')
const tempDbs: Array<{ db: Database.Database; file: string }> = []

function createRouterDb(): Database.Database {
  const file = path.join(os.tmpdir(), `skillmall-router-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  tempDbs.push({ db, file })
  return db
}

function insertValidProviderConfig(db: Database.Database, overrides: Record<string, unknown> = {}) {
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
    id: 'provider-openai',
    providerId: 'openai',
    authMode: 'env_key',
    secretRefType: 'env',
    secretRef: 'OPENAI_API_KEY',
    gatewayBackend: 'direct',
    ...overrides,
  })
}

function insertValidRequest(db: Database.Database, overrides: Record<string, unknown> = {}) {
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
    id: 'request-1',
    operation: 'skill.preview',
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    routeBackend: 'direct',
    authMode: 'env_key',
    status: 'started',
    startedAt: '2026-05-19T12:00:00.000Z',
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

describe('router Phase 2 migration', () => {
  it('applies through getDb and creates all router tables', () => {
    const db = getDb()

    for (const table of [
      'llm_provider_configs',
      'llm_models',
      'llm_pricing_snapshots',
      'llm_routing_policies',
      'llm_requests',
      'llm_request_events',
    ]) {
      const row = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(table)
      expect(row).toBeTruthy()
    }
  })

  it('inserts one request row and one request event row', () => {
    const db = createRouterDb()

    insertValidRequest(db)
    db.prepare(`
      INSERT INTO llm_request_events (
        request_id,
        event_type,
        provider_id,
        model_id,
        message
      ) VALUES (?, ?, ?, ?, ?)
    `).run('request-1', 'request.started', 'openai', 'gpt-4o-mini', 'request started')

    expect(db.prepare('SELECT count(*) AS count FROM llm_requests').get()).toEqual({ count: 1 })
    expect(db.prepare('SELECT count(*) AS count FROM llm_request_events').get()).toEqual({
      count: 1,
    })
  })

  it('rejects raw token and reserved future auth modes in provider configs', () => {
    const db = createRouterDb()

    expect(() => insertValidProviderConfig(db, { id: 'provider-raw', authMode: 'raw_token' })).toThrow()

    for (const authMode of ['api_key', 'keychain_ref', 'codex_session', 'oauth_device_flow']) {
      expect(() => insertValidProviderConfig(db, { id: `provider-${authMode}`, authMode })).toThrow()
    }
  })

  it('rejects unapproved gateway backends in provider configs', () => {
    const db = createRouterDb()

    for (const gatewayBackend of ['gomodel_local', 'litellm_proxy', 'external_openai_compatible']) {
      expect(() =>
        insertValidProviderConfig(db, { id: `provider-${gatewayBackend}`, gatewayBackend })
      ).toThrow()
    }
  })

  it('allows approved Phase 2 routing-policy modes only', () => {
    const db = createRouterDb()

    for (const mode of ['manual', 'local_first', 'fallback_chain', 'budget_guarded_manual']) {
      db.prepare(`
        INSERT INTO llm_routing_policies (id, name, mode)
        VALUES (?, ?, ?)
      `).run(`policy-${mode}`, mode, mode)
    }

    for (const mode of ['cheapest_compatible', 'quality_first']) {
      expect(() => {
        db.prepare(`
          INSERT INTO llm_routing_policies (id, name, mode)
          VALUES (?, ?, ?)
        `).run(`policy-${mode}`, mode, mode)
      }).toThrow()
    }
  })

  it('rejects invalid auth-mode and secret-ref pairings', () => {
    const db = createRouterDb()

    expect(() =>
      insertValidProviderConfig(db, {
        id: 'provider-env-missing-secret',
        secretRefType: null,
        secretRef: null,
      })
    ).toThrow()

    for (const authMode of ['local_cli_session', 'none_local']) {
      expect(() =>
        insertValidProviderConfig(db, {
          id: `provider-${authMode}`,
          authMode,
          secretRefType: 'env',
          secretRef: 'OPENAI_API_KEY',
        })
      ).toThrow()
    }
  })

  it('allows bifrost_local request rows and rejects unsupported request auth modes', () => {
    const db = createRouterDb()

    insertValidRequest(db, {
      id: 'request-bifrost',
      routeBackend: 'bifrost_local',
      authMode: 'gateway_virtual_key',
    })

    expect(() =>
      insertValidRequest(db, { id: 'request-gomodel', routeBackend: 'gomodel_local' })
    ).toThrow()

    for (const authMode of ['raw_token', 'api_key', 'codex_session', 'oauth_device_flow']) {
      expect(() => insertValidRequest(db, { id: `request-${authMode}`, authMode })).toThrow()
    }
  })
})

describe('router Phase 2 request ledger helpers', () => {
  it('starts bifrost_local requests with gateway virtual-key auth', () => {
    const db = createRouterDb()
    const started = startLLMRequest(
      {
        operation: 'skill.preview',
        providerId: 'openai',
        modelId: 'openai/gpt-4o-mini',
        authMode: 'gateway_virtual_key',
        routeBackend: 'bifrost_local',
        routingPolicyId: 'policy-1',
      },
      db
    )

    const row = db
      .prepare('SELECT route_backend, auth_mode, routing_policy_id FROM llm_requests WHERE id = ?')
      .get(started.requestId)
    expect(row).toEqual({
      route_backend: 'bifrost_local',
      auth_mode: 'gateway_virtual_key',
      routing_policy_id: 'policy-1',
    })
  })

  it('records a success lifecycle from started to succeeded', () => {
    const db = createRouterDb()
    const started = startLLMRequest(
      {
        operation: 'skill.preview',
        providerId: 'openai',
        modelId: 'gpt-4o-mini',
        authMode: 'env_key',
        metadata: { workflow: 'create-skill', prompt: 'do not store this' },
      },
      db
    )

    finishLLMRequest(
      {
        requestId: started.requestId,
        status: 'succeeded',
        inputTokens: 10,
        outputTokens: 20,
        estimatedCostUsd: 0.001,
        costSource: 'manual_test',
        metadata: { step: 'preview', response: 'do not store this either' },
      },
      db
    )

    const row = db.prepare('SELECT * FROM llm_requests WHERE id = ?').get(started.requestId) as {
      status: string
      completed_at: string
      latency_ms: number
      input_tokens: number
      output_tokens: number
      estimated_cost_usd: number
      metadata_json: string
    }

    expect(row.status).toBe('succeeded')
    expect(row.completed_at).toBeTruthy()
    expect(row.latency_ms).toBeGreaterThanOrEqual(0)
    expect(row.input_tokens).toBe(10)
    expect(row.output_tokens).toBe(20)
    expect(row.estimated_cost_usd).toBe(0.001)
    expect(row.metadata_json).toContain('preview')
    expect(row.metadata_json).not.toContain('do not store')
  })

  it('records a failure lifecycle with error code and an event', () => {
    const db = createRouterDb()
    const started = startLLMRequest(
      {
        operation: 'skill.generate',
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4',
        authMode: 'env_key',
      },
      db
    )

    recordLLMRequestEvent(
      {
        requestId: started.requestId,
        eventType: 'provider.error',
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4',
        message: 'provider returned an error',
        metadata: { retryable: false },
      },
      db
    )

    finishLLMRequest(
      {
        requestId: started.requestId,
        status: 'failed',
        errorCode: 'provider_error',
      },
      db
    )

    const request = db
      .prepare('SELECT status, error_code FROM llm_requests WHERE id = ?')
      .get(started.requestId)
    const event = db
      .prepare('SELECT event_type, metadata_json FROM llm_request_events WHERE request_id = ?')
      .get(started.requestId)

    expect(request).toEqual({ status: 'failed', error_code: 'provider_error' })
    expect(event).toEqual({ event_type: 'provider.error', metadata_json: '{"retryable":false}' })
  })

  it('stores operation metadata without prompt or response bodies by default', () => {
    const json = stringifyLedgerMetadata({
      operationContext: { step: 'preview', source: 'wizard' },
      prompt: 'secret prompt body',
      response: 'secret response body',
      nested: {
        messages: [{ role: 'user', content: 'secret nested body' }],
        attempt: 1,
      },
    })

    expect(json).toContain('operationContext')
    expect(json).toContain('attempt')
    expect(json).not.toContain('secret prompt body')
    expect(json).not.toContain('secret response body')
    expect(json).not.toContain('secret nested body')
  })

  it('drops secret-like metadata keys before ledger persistence', () => {
    const json = stringifyLedgerMetadata({
      operationContext: { step: 'provider-test' },
      apiKey: 'raw-api-key',
      raw_key: 'raw-key-value',
      token: 'raw-token',
      sessionToken: 'session-token-value',
      credentialPath: '/Users/test/.codex/auth.json',
      nested: {
        authorization: 'Bearer raw-token',
        visible: 'safe metadata',
      },
    })

    expect(json).toContain('operationContext')
    expect(json).toContain('safe metadata')
    expect(json).not.toContain('raw-api-key')
    expect(json).not.toContain('raw-key-value')
    expect(json).not.toContain('raw-token')
    expect(json).not.toContain('session-token-value')
    expect(json).not.toContain('/Users/test/.codex/auth.json')
    expect(json).not.toContain('authorization')
  })

  it('redacts credential-like metadata values under otherwise safe keys', () => {
    const json = stringifyLedgerMetadata({
      operationContext: { step: 'provider-test' },
      details: {
        note: 'safe metadata',
        reference: 'Authorization Bearer raw-token-value',
        path: '/Users/test/.claude/credentials.json',
        cookieHeader: 'session_cookie=raw-session-cookie',
        nested: ['sk-test-secret-value', 'visible value'],
      },
    })

    expect(json).toContain('operationContext')
    expect(json).toContain('safe metadata')
    expect(json).toContain('visible value')
    expect(json).toContain('[redacted]')
    expect(json).not.toContain('raw-token-value')
    expect(json).not.toContain('/Users/test/.claude/credentials.json')
    expect(json).not.toContain('raw-session-cookie')
    expect(json).not.toContain('sk-test-secret-value')
  })
})
