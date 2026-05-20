import { afterEach, describe, expect, it } from 'vitest'
import {
  assertPhase1AuthMode,
  assertPhase1GatewayBackend,
  resolveEnvSecret,
  sanitizeSecretRef,
  validateSecretRefForAuthMode,
} from '../secret-refs'

describe('router Phase 1 config helpers', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('sanitizes env secret refs without returning secret values', () => {
    process.env.OPENAI_API_KEY = 'redacted-test-secret'

    const ref = sanitizeSecretRef({ type: 'env', name: 'OPENAI_API_KEY', value: 'redacted-test-secret' })

    expect(ref).toEqual({ type: 'env', name: 'OPENAI_API_KEY' })
    expect(JSON.stringify(ref)).not.toContain('redacted-test-secret')
  })

  it('resolves env secrets only through explicit runtime lookup', () => {
    process.env.OPENAI_API_KEY = 'redacted-test-secret'

    expect(resolveEnvSecret('OPENAI_API_KEY')).toBe('redacted-test-secret')
    expect(sanitizeSecretRef({ type: 'env', name: 'OPENAI_API_KEY' })).toEqual({
      type: 'env',
      name: 'OPENAI_API_KEY',
    })
  })

  it('throws for invalid secret refs', () => {
    expect(() => sanitizeSecretRef({ type: 'env' })).toThrow('Env secret ref requires')
    expect(() => sanitizeSecretRef({ type: 'file_ref', path: '~/.secret' })).toThrow(
      'Unsupported Phase 1 secret ref type'
    )
    expect(() => sanitizeSecretRef(null)).toThrow('Secret ref must be an object')
  })

  it('accepts only Phase 1 auth modes', () => {
    expect(assertPhase1AuthMode('env_key')).toBe('env_key')
    expect(assertPhase1AuthMode('local_cli_session')).toBe('local_cli_session')
    expect(assertPhase1AuthMode('none_local')).toBe('none_local')

    for (const mode of ['api_key', 'keychain_ref', 'codex_session', 'oauth_device_flow', 'gateway_virtual_key']) {
      expect(() => assertPhase1AuthMode(mode)).toThrow('Unsupported Phase 1 auth mode')
    }
  })

  it('accepts only direct gateway backend in Phase 1', () => {
    expect(assertPhase1GatewayBackend(undefined)).toBe('direct')
    expect(assertPhase1GatewayBackend('direct')).toBe('direct')

    for (const backend of ['gomodel', 'bifrost', 'external_openai_compatible']) {
      expect(() => assertPhase1GatewayBackend(backend)).toThrow(
        'Unsupported Phase 1 gateway backend'
      )
    }
  })

  it('requires env_key to use an env secret ref', () => {
    const ref = sanitizeSecretRef({ type: 'env', name: 'OPENAI_API_KEY' })

    expect(validateSecretRefForAuthMode('env_key', ref)).toEqual(ref)
    expect(() => validateSecretRefForAuthMode('env_key', undefined)).toThrow(
      'env_key auth requires an env secret ref'
    )
    expect(() => validateSecretRefForAuthMode('env_key', { type: 'none' })).toThrow(
      'env_key auth requires an env secret ref'
    )
  })

  it('rejects secret refs for local_cli_session and none_local', () => {
    const ref = sanitizeSecretRef({ type: 'env', name: 'OPENAI_API_KEY' })

    expect(validateSecretRefForAuthMode('local_cli_session', { type: 'none' })).toEqual({
      type: 'none',
    })
    expect(validateSecretRefForAuthMode('none_local', undefined)).toBeUndefined()
    expect(() => validateSecretRefForAuthMode('local_cli_session', ref)).toThrow(
      'local_cli_session auth must not include a secret ref'
    )
    expect(() => validateSecretRefForAuthMode('none_local', ref)).toThrow(
      'none_local auth must not include a secret ref'
    )
  })
})
