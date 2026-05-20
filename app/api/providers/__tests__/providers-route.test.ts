import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'

const mocks = vi.hoisted(() => ({
  writeProviderConfig: vi.fn(),
  getDb: vi.fn(),
}))

vi.mock('@/lib/providers/config-store', () => ({
  writeProviderConfig: mocks.writeProviderConfig,
}))

vi.mock('@/lib/db/client', () => ({
  getDb: mocks.getDb,
}))

function postRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

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

function createProviderDb(): Database.Database {
  const file = path.join(os.tmpdir(), `skillmall-provider-route-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  db.exec(phase4MigrationSql)
  tempDbs.push({ db, file })
  return db
}

describe('provider API routes', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    mocks.writeProviderConfig.mockReset()
    mocks.getDb.mockReset()
    process.env = { ...originalEnv }
    delete process.env.SKILL_MALL_PROVIDER
    delete process.env.SKILL_MALL_MODEL
    delete process.env.OPENAI_API_KEY
    delete process.env.BIFROST_VIRTUAL_KEY
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.doUnmock('@/lib/llm/router/config')
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
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

  it('GET returns broad sanitized catalog/status output without raw secret values', async () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    process.env.SKILL_MALL_MODEL = 'gpt-5-mini'
    process.env.OPENAI_API_KEY = 'redacted-route-test-token'

    const { GET } = await import('../route')
    const response = await GET()
    const json = await response.json()

    expect(json).toMatchObject({
      configured: true,
      activeProvider: 'openai',
      activeProviderRegistryId: 'openai',
      activeModel: 'gpt-5-mini',
      authMode: 'env_key',
      gatewayBackend: 'direct',
      accessLabel: 'api_access',
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
      secretStatus: {
        type: 'env',
        name: 'OPENAI_API_KEY',
        valuePresent: true,
      },
    })
    expect(json.providers.map((provider: { id: string }) => provider.id)).toEqual(
      expect.arrayContaining([
        'openai',
        'openrouter',
        'alibaba_dashscope_qwen',
        'huggingface',
        'deepseek',
        'custom_openai_compatible',
      ])
    )
    expect(json.providers.find((provider: { id: string }) => provider.id === 'openai')).toMatchObject({
      id: 'openai',
      executableProviderId: 'openai',
      discoveryStrategy: 'openai_compatible_models',
      modelStatus: {
        source: 'fallback',
        authoritative: false,
      },
      configStatus: {
        configured: true,
        activeModel: 'gpt-5-mini',
        secretStatus: {
          valuePresent: true,
        },
      },
    })
    expect(JSON.stringify(json)).not.toContain('redacted-route-test-token')
    expect(JSON.stringify(json)).not.toContain('/Users/test/.config')
  })

  it('GET returns cached model source/count/timestamp status from llm_models', async () => {
    const db = createProviderDb()
    mocks.getDb.mockReturnValue(db)
    db.prepare(`
      INSERT INTO llm_models (
        id,
        provider_id,
        provider_registry_id,
        execution_kind,
        model_id,
        display_name,
        source,
        last_checked_at,
        raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'zai:glm-5.1:test',
      'zai',
      'zai',
      'source_backed_static',
      'glm-5.1',
      'GLM 5.1',
      'source_backed_static',
      new Date().toISOString(),
      '{}'
    )

    const { GET } = await import('../route')
    const response = await GET()
    const json = await response.json()
    const zai = json.providers.find((provider: { id: string }) => provider.id === 'zai')

    expect(response.status).toBe(200)
    expect(zai).toMatchObject({
      modelStatus: {
        source: 'source_backed_static',
        authoritative: true,
        stale: false,
        modelCount: 1,
        models: ['glm-5.1'],
      },
    })
    expect(zai.modelStatus.lastCheckedAt).toBeTruthy()
  })

  it.each([
    ['apiKey', 'raw-route-secret'],
    ['rawKey', 'raw-route-secret'],
    ['token', 'browser-token-secret'],
    ['sessionToken', 'session-token-secret'],
    ['browserToken', 'browser-token-secret'],
    ['credentialPath', '/Users/test/.config/claude/credentials.json'],
    ['credentialFile', '/Users/test/.codex/auth.json'],
  ])('configure rejects raw secret field %s before writing config', async (field, value) => {
    const { POST } = await import('../configure/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/configure', {
        provider: 'openai',
        model: 'gpt-5-mini',
        [field]: value,
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('raw_secret_field_rejected')
    expect(json.rejectedFields).toContain(field)
    expect(JSON.stringify(json)).not.toContain(String(value))
    expect(mocks.writeProviderConfig).not.toHaveBeenCalled()
  })

  it.each([
    { type: 'env', name: '/Users/test/.config/claude/credentials.json' },
    { type: 'env', name: '~/.codex/auth.json' },
    { type: 'gateway_virtual_key_ref', name: '../claude-code/credentials.json' },
    { type: 'gateway_virtual_key_ref', name: 'BIFROST/VIRTUAL/KEY' },
  ])('configure rejects path-like secret reference name %# before writing config', async (secretRef) => {
    const { POST } = await import('../configure/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/configure', {
        providerRegistryId: 'openai',
        provider: 'openai',
        model: 'gpt-5-mini',
        configMode: secretRef.type === 'env' ? 'env_key' : 'gateway_virtual_key_ref',
        secretRef,
        ...(secretRef.type === 'gateway_virtual_key_ref'
          ? { gatewayBackend: 'bifrost_local', baseURL: 'http://localhost:8080/v1' }
          : {}),
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('invalid_provider_config')
    expect(json.message).toContain('reference name')
    expect(JSON.stringify(json)).not.toContain(secretRef.name)
    expect(mocks.writeProviderConfig).not.toHaveBeenCalled()
  })

  it.each([
    {
      providerRegistryId: 'openai',
      provider: 'openai',
      configMode: 'local_cli_session',
      secretRef: { type: 'none' },
    },
    {
      providerRegistryId: 'anthropic',
      provider: 'anthropic',
      configMode: 'gateway_virtual_key_ref',
      secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
      gatewayBackend: 'bifrost_local',
      baseURL: 'http://localhost:8080/v1',
    },
  ])('configure rejects auth/access-mode mismatch before writing config %#', async (payload) => {
    const { POST } = await import('../configure/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/configure', {
        model: 'model-a',
        ...payload,
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('invalid_provider_config')
    expect(json.message).toMatch(/not allowed/)
    expect(mocks.writeProviderConfig).not.toHaveBeenCalled()
  })

  it('configure stores env_key executable provider config without mutating process.env', async () => {
    mocks.writeProviderConfig.mockResolvedValue({
      provider: 'openai',
      providerRegistryId: 'openai',
      executionKind: 'direct',
      model: 'gpt-5-mini',
      authMode: 'env_key',
      gatewayBackend: 'direct',
      baseURL: null,
      routingPolicyId: null,
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
      path: '/Users/test/.skill-mall/config.json',
    })

    const { POST } = await import('../configure/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/configure', {
        providerRegistryId: 'openai',
        provider: 'openai',
        model: 'gpt-5-mini',
        configMode: 'env_key',
        secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      persisted: true,
      providerRegistryId: 'openai',
      provider: 'openai',
      model: 'gpt-5-mini',
      authMode: 'env_key',
      gatewayBackend: 'direct',
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
    })
    expect(mocks.writeProviderConfig).toHaveBeenCalledWith({
      provider: 'openai',
      providerRegistryId: 'openai',
      executionKind: 'direct',
      model: 'gpt-5-mini',
      authMode: 'env_key',
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
      gatewayBackend: 'direct',
      baseURL: undefined,
      routingPolicyId: undefined,
    })
    expect(process.env.SKILL_MALL_PROVIDER).toBeUndefined()
    expect(process.env.SKILL_MALL_MODEL).toBeUndefined()
    expect(process.env.SKILL_MALL_API_KEY).toBeUndefined()
    expect(JSON.stringify(json)).not.toContain('/Users/test/.skill-mall/config.json')
  })

  it('configure stores gateway_virtual_key_ref executable provider config', async () => {
    mocks.writeProviderConfig.mockResolvedValue({
      provider: 'openai',
      providerRegistryId: 'openai',
      executionKind: 'bifrost_local',
      model: 'openai/gpt-5-mini',
      authMode: 'gateway_virtual_key',
      gatewayBackend: 'bifrost_local',
      secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
      baseURL: 'http://localhost:8080/v1',
      routingPolicyId: 'policy-1',
      path: '/Users/test/.skill-mall/config.json',
    })

    const { POST } = await import('../configure/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/configure', {
        providerRegistryId: 'openai',
        provider: 'openai',
        model: 'openai/gpt-5-mini',
        configMode: 'gateway_virtual_key_ref',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
        baseURL: 'http://localhost:8080/v1',
        routingPolicyId: 'policy-1',
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      persisted: true,
      executionKind: 'bifrost_local',
      authMode: 'gateway_virtual_key',
      gatewayBackend: 'bifrost_local',
      secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
      secretStatus: {
        type: 'gateway_virtual_key_ref',
        name: 'BIFROST_VIRTUAL_KEY',
        valuePresent: false,
      },
    })
  })

  it('configure stores local_cli_session and none_local executable provider config safely', async () => {
    mocks.writeProviderConfig
      .mockResolvedValueOnce({
        provider: 'claude-code',
        providerRegistryId: 'claude_code',
        executionKind: 'direct',
        model: 'claude-sonnet-4-6',
        authMode: 'local_cli_session',
        gatewayBackend: 'direct',
        secretRef: { type: 'none' },
      })
      .mockResolvedValueOnce({
        provider: 'ollama',
        providerRegistryId: 'ollama',
        executionKind: 'direct',
        model: 'llama3.1',
        authMode: 'none_local',
        gatewayBackend: 'direct',
        secretRef: { type: 'none' },
      })

    const { POST } = await import('../configure/route')
    const claudeResponse = await POST(
      postRequest('http://localhost/api/providers/configure', {
        providerRegistryId: 'claude_code',
        provider: 'claude-code',
        model: 'claude-sonnet-4-6',
        configMode: 'local_cli_session',
        secretRef: { type: 'none' },
      }) as never
    )
    const ollamaResponse = await POST(
      postRequest('http://localhost/api/providers/configure', {
        providerRegistryId: 'ollama',
        provider: 'ollama',
        model: 'llama3.1',
        configMode: 'none_local',
        secretRef: { type: 'none' },
      }) as never
    )

    expect(claudeResponse.status).toBe(200)
    expect(await claudeResponse.json()).toMatchObject({
      persisted: true,
      authMode: 'local_cli_session',
      secretRef: { type: 'none' },
      secretStatus: { type: 'none', valuePresent: true },
    })
    expect(ollamaResponse.status).toBe(200)
    expect(await ollamaResponse.json()).toMatchObject({
      persisted: true,
      authMode: 'none_local',
      secretRef: { type: 'none' },
      secretStatus: { type: 'none', valuePresent: true },
    })
  })

  it('configure accepts custom OpenAI-compatible metadata without widening executable providers', async () => {
    mocks.writeProviderConfig.mockResolvedValue({
      provider: 'openai',
      providerRegistryId: 'custom_openai_compatible',
      executionKind: 'openai_compatible',
      model: 'custom-chat-model',
      authMode: 'env_key',
      gatewayBackend: 'direct',
      secretRef: { type: 'env', name: 'CUSTOM_LLM_API_KEY' },
      baseURL: 'https://llm.example.com/v1',
    })

    const { POST } = await import('../configure/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/configure', {
        providerRegistryId: 'custom_openai_compatible',
        configMode: 'env_key',
        baseURL: 'https://llm.example.com/v1',
        secretRef: { type: 'env', name: 'CUSTOM_LLM_API_KEY' },
        model: 'custom-chat-model',
        manualModels: ['custom-chat-model'],
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      persisted: true,
      providerRegistryId: 'custom_openai_compatible',
      provider: 'openai',
      executionKind: 'openai_compatible',
      authMode: 'env_key',
      baseURL: 'https://llm.example.com/v1',
      secretRef: { type: 'env', name: 'CUSTOM_LLM_API_KEY' },
    })
    expect(mocks.writeProviderConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        providerRegistryId: 'custom_openai_compatible',
        executionKind: 'openai_compatible',
        baseURL: 'https://llm.example.com/v1',
      })
    )
  })

  it('configure persists OpenAI-compatible registry rows as target-aware configs', async () => {
    mocks.writeProviderConfig.mockResolvedValue({
      provider: 'openai',
      providerRegistryId: 'openrouter',
      executionKind: 'openai_compatible',
      model: 'openai/gpt-5-mini',
      authMode: 'env_key',
      gatewayBackend: 'direct',
      secretRef: { type: 'env', name: 'OPENROUTER_API_KEY' },
      baseURL: 'https://openrouter.ai/api/v1',
    })

    const { POST } = await import('../configure/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/configure', {
        providerRegistryId: 'openrouter',
        configMode: 'env_key',
        secretRef: { type: 'env', name: 'OPENROUTER_API_KEY' },
        model: 'openai/gpt-5-mini',
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      persisted: true,
      providerRegistryId: 'openrouter',
      provider: 'openai',
      executionKind: 'openai_compatible',
      authMode: 'env_key',
      secretRef: { type: 'env', name: 'OPENROUTER_API_KEY' },
      baseURL: 'https://openrouter.ai/api/v1',
    })
    expect(mocks.writeProviderConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        baseURL: 'https://openrouter.ai/api/v1',
      })
    )
    expect(json.provider).not.toBe('openrouter')
  })

  it('model refresh returns live executable discovery for supported OpenAI-compatible providers', async () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'refresh-secret'
    const db = createProviderDb()
    mocks.getDb.mockReturnValue(db)
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'gpt-live-a' }, { id: 'gpt-live-b' }] }))
    )

    const { POST } = await import('../models/refresh/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/models/refresh', {
        providerRegistryId: 'openai',
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      providerRegistryId: 'openai',
      executableProviderId: 'openai',
      discovery: {
        status: 'live',
        source: 'live',
        authoritative: true,
        models: ['gpt-live-a', 'gpt-live-b'],
        networkCalled: true,
      },
    })
    expect(json).toMatchObject({
      persisted: true,
      modelStatus: {
        modelCount: 2,
        source: 'live:openai_compatible',
        executionKind: 'openai_compatible',
      },
    })
    expect(
      db.prepare('SELECT provider_registry_id, execution_kind, COUNT(*) as count FROM llm_models GROUP BY provider_registry_id, execution_kind').get()
    ).toMatchObject({
      provider_registry_id: 'openai',
      execution_kind: 'openai_compatible',
      count: 2,
    })
    expect(JSON.stringify(json)).not.toContain('refresh-secret')
  })

  it('model refresh uses active gateway virtual-key refs for local gateway discovery', async () => {
    process.env.BIFROST_VIRTUAL_KEY = 'gateway-refresh-secret'
    mocks.getDb.mockReturnValue(createProviderDb())
    vi.doMock('@/lib/llm/router/config', () => ({
      resolveRouterProviderConfig: () => ({
        provider: 'openai',
        model: 'openai/gpt-5-mini',
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
        baseURL: 'http://localhost:8080/v1',
        warnings: [],
      }),
    }))
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'gateway-live-model' }] }))
    )

    const { POST } = await import('../models/refresh/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/models/refresh', {
        providerRegistryId: 'openai',
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      configured: true,
      discovery: {
        status: 'live',
        networkCalled: true,
        models: ['gateway-live-model'],
      },
      secretStatus: {
        type: 'gateway_virtual_key_ref',
        name: 'BIFROST_VIRTUAL_KEY',
        valuePresent: true,
      },
    })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer gateway-refresh-secret' }),
      })
    )
    expect(JSON.stringify(json)).not.toContain('gateway-refresh-secret')
  })

  it('model refresh reports planned-source-review, manual, and status-only rows without generic probing', async () => {
    const db = createProviderDb()
    mocks.getDb.mockReturnValue(db)
    const { POST } = await import('../models/refresh/route')
    const sourceBacked = await POST(
      postRequest('http://localhost/api/providers/models/refresh', {
        providerRegistryId: 'alibaba_dashscope_qwen',
      }) as never
    )
    const manual = await POST(
      postRequest('http://localhost/api/providers/models/refresh', {
        providerRegistryId: 'custom_openai_compatible',
        manualModels: ['custom-a', 'custom-b'],
      }) as never
    )
    const statusOnly = await POST(
      postRequest('http://localhost/api/providers/models/refresh', {
        providerRegistryId: 'claude_code',
      }) as never
    )

    expect(await sourceBacked.json()).toMatchObject({
      persisted: true,
      discovery: {
        status: 'source_backed_static',
        source: 'source_backed_static',
        networkCalled: false,
      },
    })
    expect(await manual.json()).toMatchObject({
      discovery: {
        status: 'manual_models',
        source: 'manual',
        models: ['custom-a', 'custom-b'],
        networkCalled: false,
      },
    })
    expect(await statusOnly.json()).toMatchObject({
      persisted: true,
      discovery: {
        status: 'static_fallback',
        source: 'fallback',
        authoritative: false,
        networkCalled: false,
      },
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('model refresh does not probe default endpoints for unconfigured OpenAI-compatible rows', async () => {
    mocks.getDb.mockReturnValue(createProviderDb())
    const { POST } = await import('../models/refresh/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/models/refresh', {
        providerRegistryId: 'openrouter',
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      providerRegistryId: 'openrouter',
      configured: false,
      discovery: {
        status: 'endpoint_required',
        networkCalled: false,
      },
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('provider test route redacts secrets and returns safe statuses', async () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'test-route-secret'

    const { POST } = await import('../test/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/test', {
        providerRegistryId: 'openai',
        prompt: 'do not persist me',
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      providerRegistryId: 'openai',
      status: 'ready',
      configured: true,
      secretStatus: {
        type: 'env',
        name: 'OPENAI_API_KEY',
        valuePresent: true,
      },
    })
    expect(JSON.stringify(json)).not.toContain('test-route-secret')
    expect(JSON.stringify(json)).not.toContain('do not persist me')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('policy route upserts, lists, disables, and rejects prompt or raw secret fields', async () => {
    const db = createProviderDb()
    mocks.getDb.mockReturnValue(db)

    const { GET, POST } = await import('../policies/route')
    const createResponse = await POST(
      postRequest('http://localhost/api/providers/policies', {
        id: 'budget-openai',
        name: 'Budget OpenAI',
        mode: 'budget_guarded_manual',
        rules: {
          candidates: [
            {
              id: 'api',
              estimatedCostUsd: 0.02,
              config: {
                provider: 'openai',
                providerRegistryId: 'openai',
                model: 'gpt-4o-mini',
                authMode: 'env_key',
                secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
                gatewayBackend: 'direct',
              },
            },
          ],
        },
        budget: { remainingUsd: 0.01, monthlyBudgetUsd: 20 },
      }) as never
    )
    const created = await createResponse.json()

    expect(createResponse.status).toBe(200)
    expect(created).toMatchObject({
      success: true,
      policy: {
        id: 'budget-openai',
        mode: 'budget_guarded_manual',
        budget: {
          remainingUsd: 0.01,
          limitUsd: 20,
        },
      },
    })

    const listResponse = await GET()
    expect(await listResponse.json()).toMatchObject({
      supportedModes: ['manual', 'fallback_chain', 'local_first', 'budget_guarded_manual'],
      policies: [
        expect.objectContaining({
          id: 'budget-openai',
          enabled: true,
        }),
      ],
    })

    const disableResponse = await POST(
      postRequest('http://localhost/api/providers/policies', {
        action: 'disable',
        id: 'budget-openai',
      }) as never
    )
    expect(await disableResponse.json()).toMatchObject({
      success: true,
      policy: {
        id: 'budget-openai',
        enabled: false,
      },
    })

    const rejected = await POST(
      postRequest('http://localhost/api/providers/policies', {
        id: 'bad-policy',
        name: 'Bad policy',
        mode: 'manual',
        rules: {
          prompt: 'do not store this',
          candidates: [
            {
              config: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                api_key: 'raw-secret',
              },
            },
          ],
        },
      }) as never
    )
    const rejectedJson = await rejected.json()

    expect(rejected.status).toBe(400)
    expect(rejectedJson.error).toBe('policy_field_rejected')
    expect(JSON.stringify(rejectedJson)).not.toContain('do not store this')
    expect(JSON.stringify(rejectedJson)).not.toContain('raw-secret')
  })

  it('policy route activates an existing policy through the current provider config', async () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    const db = createProviderDb()
    mocks.getDb.mockReturnValue(db)
    mocks.writeProviderConfig.mockResolvedValue({
      provider: 'openai',
      providerRegistryId: 'openai',
      executionKind: 'direct',
      model: 'gpt-4o-mini',
      authMode: 'env_key',
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
      gatewayBackend: 'direct',
      routingPolicyId: 'manual-openai',
      path: '/Users/test/.skill-mall/config.json',
    })

    const { POST } = await import('../policies/route')
    await POST(
      postRequest('http://localhost/api/providers/policies', {
        id: 'manual-openai',
        name: 'Manual OpenAI',
        mode: 'manual',
      }) as never
    )
    const activateResponse = await POST(
      postRequest('http://localhost/api/providers/policies', {
        action: 'activate',
        id: 'manual-openai',
      }) as never
    )
    const json = await activateResponse.json()

    expect(activateResponse.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      activated: true,
      routingPolicyId: 'manual-openai',
      activeProviderRegistryId: 'openai',
    })
    expect(mocks.writeProviderConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        providerRegistryId: 'openai',
        routingPolicyId: 'manual-openai',
      })
    )
    expect(JSON.stringify(json)).not.toContain('/Users/test/.skill-mall/config.json')
  })

  it('policy simulation route evaluates locally without provider requests or prompt storage', async () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    const db = createProviderDb()
    mocks.getDb.mockReturnValue(db)

    const { POST: savePolicy } = await import('../policies/route')
    await savePolicy(
      postRequest('http://localhost/api/providers/policies', {
        id: 'budget-openai',
        name: 'Budget OpenAI',
        mode: 'budget_guarded_manual',
        rules: {
          candidates: [
            {
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
          ],
        },
        budget: { remainingUsd: 0.01 },
      }) as never
    )

    const { POST } = await import('../policies/simulate/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/policies/simulate', {
        id: 'budget-openai',
        estimatedCostUsd: 0.02,
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      simulation: true,
      providerRequestSent: false,
      promptStored: false,
      responseStored: false,
      blocked: true,
      selected: null,
      policyId: 'budget-openai',
    })
    expect(fetch).not.toHaveBeenCalled()

    const rejected = await POST(
      postRequest('http://localhost/api/providers/policies/simulate', {
        id: 'budget-openai',
        session_token: 'do not store this',
      }) as never
    )
    const rejectedJson = await rejected.json()
    expect(rejected.status).toBe(400)
    expect(rejectedJson.error).toBe('policy_field_rejected')
    expect(JSON.stringify(rejectedJson)).not.toContain('do not store this')
  })

  it('usage route labels actual and estimated cost distinctly', async () => {
    const prepare = vi.fn((sql: string) => {
      if (sql.includes('GROUP BY provider_id')) {
        return {
          all: () => [
            {
              provider_id: 'openai',
              request_count: 2,
              succeeded_count: 1,
              failed_count: 1,
              input_tokens: 10,
              output_tokens: 20,
              actual_cost_usd: 0.5,
              estimated_cost_usd: 0.25,
            },
          ],
        }
      }

      return {
        get: () => ({
          request_count: 2,
          succeeded_count: 1,
          failed_count: 1,
          input_tokens: 10,
          output_tokens: 20,
          actual_cost_usd: 0.5,
          estimated_cost_usd: 0.25,
        }),
      }
    })
    mocks.getDb.mockReturnValue({ prepare })

    const { GET } = await import('../usage/route')
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      available: true,
      summary: {
        request_count: 2,
        actual_cost_usd: 0.5,
        estimated_cost_usd: 0.25,
      },
      byProvider: [
        {
          provider_id: 'openai',
          actual_cost_usd: 0.5,
          estimated_cost_usd: 0.25,
        },
      ],
      costLabels: {
        actual_cost_usd: 'provider_or_gateway_reported_actual_cost',
        estimated_cost_usd: 'locally_estimated_cost',
      },
    })
  })

  it('pricing refresh stores source-backed Portkey snapshots without hosted credentials', async () => {
    const db = createProviderDb()
    mocks.getDb.mockReturnValue(db)
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          'gpt-4o-mini': {
            pricing_config: {
              pay_as_you_go: {
                request_token: { price: 0.000015 },
                response_token: { price: 0.00006 },
              },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const { POST } = await import('../pricing/refresh/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/pricing/refresh', {
        providerRegistryId: 'openai',
        modelIds: ['gpt-4o-mini'],
      }) as never
    )
    const json = await response.json()
    const row = db.prepare(`
      SELECT provider_id, provider_registry_id, execution_kind, model_id, source, source_url, pricing_json
      FROM llm_pricing_snapshots
    `).get() as {
      provider_id: string
      provider_registry_id: string
      execution_kind: string
      model_id: string
      source: string
      source_url: string
      pricing_json: string
    }

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      refreshed: true,
      source: 'portkey_models',
      sourceLicense: 'MIT',
      providerRegistryId: 'openai',
      snapshotCount: 1,
      models: [
        {
          providerRegistryId: 'openai',
          modelId: 'gpt-4o-mini',
          pricing: {
            inputPerMillion: 0.15,
            outputPerMillion: 0.6,
          },
        },
      ],
    })
    expect(row).toMatchObject({
      provider_id: 'openai',
      provider_registry_id: 'openai',
      execution_kind: 'pricing_snapshot',
      model_id: 'gpt-4o-mini',
      source: 'Portkey Models',
    })
    expect(row.source_url).toContain('githubusercontent.com/Portkey-AI/models')
    expect(row.pricing_json).toContain('sourceLicense')
    expect(JSON.stringify(json)).not.toContain('apiKey')
  })

  it('pricing refresh returns a failure-tolerant response when the source is unavailable', async () => {
    mocks.getDb.mockReturnValue(createProviderDb())
    vi.mocked(fetch).mockResolvedValue(new Response('unavailable', { status: 503 }))

    const { POST } = await import('../pricing/refresh/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/pricing/refresh', {
        providerRegistryId: 'openai',
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      refreshed: false,
      error: 'pricing_source_failed',
      snapshotCount: 0,
      models: [],
    })
  })

  it('pricing refresh rejects arbitrary source URL overrides', async () => {
    mocks.getDb.mockReturnValue(createProviderDb())

    const { POST } = await import('../pricing/refresh/route')
    const response = await POST(
      postRequest('http://localhost/api/providers/pricing/refresh', {
        providerRegistryId: 'openai',
        sourceUrl: 'http://localhost:3000/internal.json',
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('invalid_input')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('usage route handles unavailable ledger tables gracefully', async () => {
    mocks.getDb.mockImplementation(() => {
      throw new Error('no such table: llm_requests')
    })

    const { GET } = await import('../usage/route')
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      available: false,
      summary: {
        request_count: 0,
        actual_cost_usd: 0,
        estimated_cost_usd: 0,
      },
    })
  })
})
