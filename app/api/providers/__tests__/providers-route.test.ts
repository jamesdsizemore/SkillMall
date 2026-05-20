import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
        model: 'claude-sonnet-4-6',
        authMode: 'local_cli_session',
        gatewayBackend: 'direct',
        secretRef: { type: 'none' },
      })
      .mockResolvedValueOnce({
        provider: 'ollama',
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
      persisted: false,
      providerRegistryId: 'custom_openai_compatible',
      status: 'metadata_only',
      authMode: 'env_key',
      baseURL: 'https://llm.example.com/v1',
      secretRef: { type: 'env', name: 'CUSTOM_LLM_API_KEY' },
      modelStatus: {
        strategy: 'manual_custom_models',
        models: ['custom-chat-model'],
        authoritative: true,
      },
    })
    expect(json.provider).toBeNull()
    expect(mocks.writeProviderConfig).not.toHaveBeenCalled()
  })

  it('model refresh returns live executable discovery for supported OpenAI-compatible providers', async () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'refresh-secret'
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
    expect(JSON.stringify(json)).not.toContain('refresh-secret')
  })

  it('model refresh uses active gateway virtual-key refs for local gateway discovery', async () => {
    process.env.BIFROST_VIRTUAL_KEY = 'gateway-refresh-secret'
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
    const { POST } = await import('../models/refresh/route')
    const planned = await POST(
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

    expect(await planned.json()).toMatchObject({
      discovery: {
        status: 'planned_source_review',
        networkCalled: false,
        liveCallable: false,
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
