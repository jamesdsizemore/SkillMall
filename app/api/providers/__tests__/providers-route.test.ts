import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  writeProviderConfig: vi.fn(),
}))

vi.mock('@/lib/providers/config-store', () => ({
  writeProviderConfig: mocks.writeProviderConfig,
}))

describe('provider API routes', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    mocks.writeProviderConfig.mockReset()
    process.env = { ...originalEnv }
    delete process.env.SKILL_MALL_PROVIDER
    delete process.env.SKILL_MALL_MODEL
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('GET returns sanitized provider auth status without raw secret values', async () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    process.env.SKILL_MALL_MODEL = 'gpt-4o-mini'
    process.env.OPENAI_API_KEY = 'redacted-route-test-token'

    const { GET } = await import('../route')
    const response = await GET()
    const json = await response.json()

    expect(json).toMatchObject({
      configured: true,
      activeProvider: 'openai',
      activeModel: 'gpt-4o-mini',
      authMode: 'env_key',
      gatewayBackend: 'direct',
      accessLabel: 'api_access',
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
    })
    expect(JSON.stringify(json)).not.toContain('redacted-route-test-token')
  })

  it('POST stores non-secret provider config and does not mutate process.env', async () => {
    mocks.writeProviderConfig.mockResolvedValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      authMode: 'env_key',
      gatewayBackend: 'direct',
      baseURL: null,
      routingPolicyId: null,
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
      path: '/Users/test/.skill-mall/config.json',
    })

    const { POST } = await import('../configure/route')
    const response = await POST(
      new Request('http://localhost/api/providers/configure', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'openai',
          model: 'gpt-4o-mini',
          authMode: 'env_key',
          secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
        }),
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      authMode: 'env_key',
      gatewayBackend: 'direct',
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
    })
    expect(mocks.writeProviderConfig).toHaveBeenCalledWith({
      provider: 'openai',
      model: 'gpt-4o-mini',
      authMode: 'env_key',
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
      gatewayBackend: 'direct',
      baseURL: undefined,
      routingPolicyId: undefined,
    })
    expect(process.env.SKILL_MALL_PROVIDER).toBeUndefined()
    expect(process.env.SKILL_MALL_MODEL).toBeUndefined()
    expect(process.env.SKILL_MALL_API_KEY).toBeUndefined()
    expect(JSON.stringify(json)).not.toContain('sk-')
  })

  it('POST rejects invalid auth mode and secret-ref combinations before writing config', async () => {
    const { POST } = await import('../configure/route')
    const response = await POST(
      new Request('http://localhost/api/providers/configure', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'claude-code',
          model: 'claude-sonnet-4-6',
          authMode: 'local_cli_session',
          secretRef: { type: 'env', name: 'ANTHROPIC_API_KEY' },
        }),
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('invalid_provider_config')
    expect(mocks.writeProviderConfig).not.toHaveBeenCalled()
  })

  it('POST rejects raw apiKey request bodies', async () => {
    const { POST } = await import('../configure/route')
    const response = await POST(
      new Request('http://localhost/api/providers/configure', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'raw-route-secret',
        }),
      }) as never
    )

    expect(response.status).toBe(400)
    expect(mocks.writeProviderConfig).not.toHaveBeenCalled()
  })

  it('POST stores bifrost local gateway config with virtual-key refs only', async () => {
    mocks.writeProviderConfig.mockResolvedValue({
      provider: 'openai',
      model: 'openai/gpt-4o-mini',
      authMode: 'gateway_virtual_key',
      gatewayBackend: 'bifrost_local',
      secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
      baseURL: 'http://localhost:8080/v1',
      routingPolicyId: 'policy-1',
      path: '/Users/test/.skill-mall/config.json',
    })

    const { POST } = await import('../configure/route')
    const response = await POST(
      new Request('http://localhost/api/providers/configure', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'openai',
          model: 'openai/gpt-4o-mini',
          authMode: 'gateway_virtual_key',
          secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
          gatewayBackend: 'bifrost_local',
          baseURL: 'http://localhost:8080/v1',
          routingPolicyId: 'policy-1',
        }),
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      provider: 'openai',
      model: 'openai/gpt-4o-mini',
      authMode: 'gateway_virtual_key',
      gatewayBackend: 'bifrost_local',
      secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
      baseURL: 'http://localhost:8080/v1',
      routingPolicyId: 'policy-1',
    })
    expect(JSON.stringify(json)).not.toContain('redacted')
  })

  it('POST rejects remote bifrost local gateway base URLs before writing config', async () => {
    const { POST } = await import('../configure/route')
    const response = await POST(
      new Request('http://localhost/api/providers/configure', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'openai',
          model: 'openai/gpt-4o-mini',
          authMode: 'gateway_virtual_key',
          secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
          gatewayBackend: 'bifrost_local',
          baseURL: 'https://gateway.example.com/v1',
        }),
      }) as never
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('invalid_provider_config')
    expect(json.message).toContain('bifrost_local baseURL must point to localhost')
    expect(mocks.writeProviderConfig).not.toHaveBeenCalled()
  })
})
