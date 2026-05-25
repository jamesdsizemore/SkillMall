import { afterEach, describe, expect, it } from 'vitest'
import {
  assertPhase1AuthMode,
  assertPhase1GatewayBackend,
  assertRouterAuthMode,
  assertRouterGatewayBackend,
  assertRouterRoutingPolicyMode,
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

  it('rejects path-like secret reference names', () => {
    expect(() =>
      sanitizeSecretRef({ type: 'env', name: '/Users/test/.codex/auth.json' })
    ).toThrow('reference name')
    expect(() =>
      sanitizeSecretRef({ type: 'gateway_virtual_key_ref', name: '../claude/credentials.json' })
    ).toThrow('reference name')
  })

  it('sanitizes gateway virtual key refs without returning key values', () => {
    const ref = sanitizeSecretRef({
      type: 'gateway_virtual_key_ref',
      name: 'BIFROST_VIRTUAL_KEY',
      value: 'redacted-virtual-key',
    })

    expect(ref).toEqual({ type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' })
    expect(JSON.stringify(ref)).not.toContain('redacted-virtual-key')
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

  it('accepts approved Phase 2 router auth modes and rejects reserved modes', () => {
    expect(assertRouterAuthMode('env_key')).toBe('env_key')
    expect(assertRouterAuthMode('local_cli_session')).toBe('local_cli_session')
    expect(assertRouterAuthMode('none_local')).toBe('none_local')
    expect(assertRouterAuthMode('gateway_virtual_key')).toBe('gateway_virtual_key')

    for (const mode of ['api_key', 'keychain_ref', 'codex_session', 'oauth_device_flow', 'file_ref']) {
      expect(() => assertRouterAuthMode(mode)).toThrow('Unsupported router auth mode')
    }
  })

  it('accepts approved Phase 2 router gateway backends only', () => {
    expect(assertRouterGatewayBackend(undefined)).toBe('direct')
    expect(assertRouterGatewayBackend('direct')).toBe('direct')
    expect(assertRouterGatewayBackend('bifrost_local')).toBe('bifrost_local')

    for (const backend of ['gomodel_local', 'litellm_proxy', 'external_openai_compatible']) {
      expect(() => assertRouterGatewayBackend(backend)).toThrow(
        'Unsupported router gateway backend'
      )
    }
  })

  it('accepts approved Phase 2 routing-policy modes only', () => {
    expect(assertRouterRoutingPolicyMode('manual')).toBe('manual')
    expect(assertRouterRoutingPolicyMode('fallback_chain')).toBe('fallback_chain')
    expect(assertRouterRoutingPolicyMode('local_first')).toBe('local_first')
    expect(assertRouterRoutingPolicyMode('budget_guarded_manual')).toBe('budget_guarded_manual')

    for (const mode of ['cheapest_compatible', 'quality_first', 'semantic_router']) {
      expect(() => assertRouterRoutingPolicyMode(mode)).toThrow(
        'Unsupported router routing-policy mode'
      )
    }
  })

  it('requires env_key to use an API credential ref', () => {
    const ref = sanitizeSecretRef({ type: 'env', name: 'OPENAI_API_KEY' })
    const storedRef = sanitizeSecretRef({ type: 'stored_api_key', id: 'provider:openai:api_key' })

    expect(validateSecretRefForAuthMode('env_key', ref)).toEqual(ref)
    expect(validateSecretRefForAuthMode('env_key', storedRef)).toEqual(storedRef)
    expect(() => validateSecretRefForAuthMode('env_key', undefined)).toThrow(
      'env_key auth requires an API key secret ref'
    )
    expect(() => validateSecretRefForAuthMode('env_key', { type: 'none' })).toThrow(
      'env_key auth requires an env secret ref or stored API-key ref'
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

  it('requires gateway_virtual_key to use a gateway virtual key ref', () => {
    const ref = sanitizeSecretRef({
      type: 'gateway_virtual_key_ref',
      name: 'BIFROST_VIRTUAL_KEY',
    })

    expect(validateSecretRefForAuthMode('gateway_virtual_key', ref)).toEqual(ref)
    expect(() => validateSecretRefForAuthMode('gateway_virtual_key', undefined)).toThrow(
      'gateway_virtual_key auth requires a gateway virtual key ref'
    )
    expect(() =>
      validateSecretRefForAuthMode('gateway_virtual_key', { type: 'env', name: 'OPENAI_API_KEY' })
    ).toThrow('gateway_virtual_key auth requires a gateway virtual key ref')
  })
})
