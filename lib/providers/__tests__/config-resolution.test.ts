import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveRouterProviderConfig } from '../../llm/router/config'
import { writeProviderConfig } from '../config-store'
import { ConfigError } from '../types'
import { DEFAULT_MODELS } from '../defaults'
import fs from 'fs'
import fsPromises from 'fs/promises'

describe('router provider config resolution', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    for (const key of [
      'SKILL_MALL_PROVIDER',
      'SKILL_MALL_API_KEY',
      'SKILL_MALL_MODEL',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GEMINI_API_KEY',
      'GROQ_API_KEY',
    ]) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('reads provider/model precedence from env vars and returns env secret refs only', () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'redacted-openai-token'
    process.env.SKILL_MALL_MODEL = 'gpt-4o-mini'

    const config = resolveRouterProviderConfig()
    expect(config.provider).toBe('openai')
    expect(config.model).toBe('gpt-4o-mini')
    expect(config.authMode).toBe('env_key')
    expect(config.secretRef).toEqual({ type: 'env', name: 'OPENAI_API_KEY' })
    expect(JSON.stringify(config)).not.toContain('redacted-openai-token')
  })

  it('uses default model when SKILL_MALL_MODEL is not set', () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'

    const config = resolveRouterProviderConfig()
    expect(config.model).toBe(DEFAULT_MODELS.openai)
    expect(config.secretRef).toEqual({ type: 'env', name: 'OPENAI_API_KEY' })
  })

  it('maps claude-code config to local_cli_session without secret refs', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        provider: 'claude-code',
        providers: {
          'claude-code': { model: 'claude-sonnet-4-6' },
        },
      })
    )

    const config = resolveRouterProviderConfig()
    expect(config.provider).toBe('claude-code')
    expect(config.model).toBe('claude-sonnet-4-6')
    expect(config.authMode).toBe('local_cli_session')
    expect(config.secretRef).toEqual({ type: 'none' })
  })

  it('ignores legacy raw apiKey config and returns a redacted warning shape', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        provider: 'openai',
        providers: {
          openai: { apiKey: 'legacy-openai-token', model: 'gpt-4o' },
        },
      })
    )

    const config = resolveRouterProviderConfig()
    expect(config.provider).toBe('openai')
    expect(config.model).toBe('gpt-4o')
    expect(config.authMode).toBe('env_key')
    expect(config.secretRef).toEqual({ type: 'env', name: 'OPENAI_API_KEY' })
    expect(config.warnings).toContain(
      'Legacy raw apiKey was ignored; configure an env secret reference instead.'
    )
    expect(JSON.stringify(config)).not.toContain('legacy-openai-token')
  })

  it('rejects reserved future auth modes in config files', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        provider: 'anthropic',
        providers: {
          anthropic: {
            authMode: 'codex_session',
            model: 'claude-sonnet-4-20250514',
          },
        },
      })
    )

    expect(() => resolveRouterProviderConfig()).toThrow('Unsupported router auth mode')
  })

  it('rejects unapproved gateway backends in config files', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        provider: 'openai',
        providers: {
          openai: {
            model: 'gpt-4o',
            gatewayBackend: 'gomodel_local',
          },
        },
      })
    )

    expect(() => resolveRouterProviderConfig()).toThrow('Unsupported router gateway backend')
  })

  it('resolves bifrost local gateway config with gateway virtual key refs', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        provider: 'openai',
        providers: {
          openai: {
            model: 'openai/gpt-4o-mini',
            authMode: 'gateway_virtual_key',
            secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
            gatewayBackend: 'bifrost_local',
            baseURL: 'http://localhost:8080/v1',
            routingPolicyId: 'policy-1',
          },
        },
      })
    )

    const config = resolveRouterProviderConfig()
    expect(config).toMatchObject({
      provider: 'openai',
      model: 'openai/gpt-4o-mini',
      authMode: 'gateway_virtual_key',
      secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
      gatewayBackend: 'bifrost_local',
      baseURL: 'http://localhost:8080/v1',
      routingPolicyId: 'policy-1',
    })
  })

  it('rejects remote bifrost local gateway base URLs in config files', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        provider: 'openai',
        providers: {
          openai: {
            model: 'openai/gpt-4o-mini',
            authMode: 'gateway_virtual_key',
            secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
            gatewayBackend: 'bifrost_local',
            baseURL: 'https://gateway.example.com/v1',
          },
        },
      })
    )

    expect(() => resolveRouterProviderConfig()).toThrow(
      'bifrost_local baseURL must point to localhost'
    )
  })

  it('throws ConfigError when no provider is configured', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    expect(() => resolveRouterProviderConfig()).toThrow(ConfigError)
    expect(() => resolveRouterProviderConfig()).toThrow('No LLM provider configured')
  })

  it('SKILL_MALL_PROVIDER and SKILL_MALL_MODEL take precedence over config file values', () => {
    process.env.SKILL_MALL_PROVIDER = 'groq'
    process.env.SKILL_MALL_MODEL = 'llama-3.3-70b-versatile'
    process.env.GROQ_API_KEY = 'groq-env-token'

    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({ provider: 'openai', apiKey: 'legacy-root-token', model: 'gpt-4o' })
    )

    const config = resolveRouterProviderConfig()
    expect(config.provider).toBe('groq')
    expect(config.model).toBe('llama-3.3-70b-versatile')
    expect(config.secretRef).toEqual({ type: 'env', name: 'GROQ_API_KEY' })
    expect(JSON.stringify(config)).not.toContain('groq-env-token')
  })

  it('writes env secret references without raw API keys', async () => {
    vi.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('missing'))
    vi.spyOn(fsPromises, 'mkdir').mockResolvedValue(undefined)
    const writeFile = vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined)

    const result = await writeProviderConfig({
      provider: 'openai',
      model: 'gpt-4o-mini',
      keyEnv: 'OPENAI_API_KEY',
    })

    expect(result).toMatchObject({
      provider: 'openai',
      model: 'gpt-4o-mini',
      authMode: 'env_key',
      secretRef: { type: 'env', name: 'OPENAI_API_KEY' },
    })
    const written = String(writeFile.mock.calls[0]?.[1])
    expect(written).toContain('"authMode": "env_key"')
    expect(written).toContain('"name": "OPENAI_API_KEY"')
    expect(written).not.toContain('apiKey')
    expect(written).not.toContain('sk-')
  })

  it('writes bifrost local gateway refs without raw virtual keys', async () => {
    vi.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('missing'))
    vi.spyOn(fsPromises, 'mkdir').mockResolvedValue(undefined)
    const writeFile = vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined)

    const result = await writeProviderConfig({
      provider: 'openai',
      model: 'openai/gpt-4o-mini',
      authMode: 'gateway_virtual_key',
      secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
      gatewayBackend: 'bifrost_local',
      baseURL: 'http://localhost:8080/v1',
      routingPolicyId: 'policy-1',
    })

    expect(result).toMatchObject({
      provider: 'openai',
      model: 'openai/gpt-4o-mini',
      authMode: 'gateway_virtual_key',
      secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
      gatewayBackend: 'bifrost_local',
      baseURL: 'http://localhost:8080/v1',
      routingPolicyId: 'policy-1',
    })
    const written = String(writeFile.mock.calls[0]?.[1])
    expect(written).toContain('"gatewayBackend": "bifrost_local"')
    expect(written).toContain('"type": "gateway_virtual_key_ref"')
    expect(written).toContain('"name": "BIFROST_VIRTUAL_KEY"')
    expect(written).not.toContain('redacted-virtual-key')
  })

  it('refuses to write remote bifrost local gateway base URLs', async () => {
    vi.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('missing'))

    await expect(
      writeProviderConfig({
        provider: 'openai',
        model: 'openai/gpt-4o-mini',
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        gatewayBackend: 'bifrost_local',
        baseURL: 'https://gateway.example.com/v1',
      })
    ).rejects.toThrow('bifrost_local baseURL must point to localhost')
  })

  it('refuses to write raw API keys to config JSON', async () => {
    await expect(
      writeProviderConfig({
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'raw-openai-secret',
      })
    ).rejects.toThrow('Raw API keys must not be written')
  })
})
