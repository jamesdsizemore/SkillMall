import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveProviderConfig, ConfigError } from '../index'
import { DEFAULT_MODELS } from '../defaults'
import fs from 'fs'

describe('resolveProviderConfig', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear provider env vars before each test
    delete process.env.SKILL_MALL_PROVIDER
    delete process.env.SKILL_MALL_API_KEY
    delete process.env.SKILL_MALL_MODEL
  })

  afterEach(() => {
    // Restore original env
    Object.assign(process.env, originalEnv)
    vi.restoreAllMocks()
  })

  it('reads provider from env vars', () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    process.env.SKILL_MALL_API_KEY = 'sk-test'
    process.env.SKILL_MALL_MODEL = 'gpt-4o-mini'

    const config = resolveProviderConfig()
    expect(config.provider).toBe('openai')
    expect(config.apiKey).toBe('sk-test')
    expect(config.model).toBe('gpt-4o-mini')
  })

  it('uses default model when SKILL_MALL_MODEL is not set', () => {
    process.env.SKILL_MALL_PROVIDER = 'openai'
    process.env.SKILL_MALL_API_KEY = 'sk-test'

    const config = resolveProviderConfig()
    expect(config.model).toBe(DEFAULT_MODELS.openai)
  })

  it('reads from config file when env vars are not set', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        provider: 'claude-code',
        model: 'claude-sonnet-4-6',
      })
    )

    const config = resolveProviderConfig()
    expect(config.provider).toBe('claude-code')
    expect(config.model).toBe('claude-sonnet-4-6')
    expect(config.apiKey).toBeUndefined()
  })

  it('reads nested provider config from config file', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        provider: 'openai',
        providers: {
          openai: { apiKey: 'sk-from-file', model: 'gpt-4o' },
        },
      })
    )

    const config = resolveProviderConfig()
    expect(config.provider).toBe('openai')
    expect(config.apiKey).toBe('sk-from-file')
    expect(config.model).toBe('gpt-4o')
  })

  it('throws ConfigError when no provider is configured', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    expect(() => resolveProviderConfig()).toThrow(ConfigError)
    expect(() => resolveProviderConfig()).toThrow('No LLM provider configured')
  })

  it('env vars take precedence over config file', () => {
    process.env.SKILL_MALL_PROVIDER = 'groq'
    process.env.SKILL_MALL_API_KEY = 'gsk-env'

    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({ provider: 'openai', apiKey: 'sk-file' })
    )

    const config = resolveProviderConfig()
    expect(config.provider).toBe('groq')
    expect(config.apiKey).toBe('gsk-env')
  })
})
