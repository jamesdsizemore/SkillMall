import {
  PHASE1_AUTH_MODES,
  PHASE1_GATEWAY_BACKENDS,
  PHASE2_AUTH_MODES,
  PHASE2_GATEWAY_BACKENDS,
  PHASE2_ROUTING_POLICY_MODES,
  type GatewayBackend,
  type LLMAuthMode,
  type RoutingPolicyMode,
  type SecretRef,
} from './types'

const authModes = new Set<string>(PHASE1_AUTH_MODES)
const gatewayBackends = new Set<string>(PHASE1_GATEWAY_BACKENDS)
const routerAuthModes = new Set<string>(PHASE2_AUTH_MODES)
const routerGatewayBackends = new Set<string>(PHASE2_GATEWAY_BACKENDS)
const routerRoutingPolicyModes = new Set<string>(PHASE2_ROUTING_POLICY_MODES)
const secretRefNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/
const storedSecretIdPattern = /^[A-Za-z0-9_.:-]+$/

export function assertPhase1AuthMode(value: unknown): LLMAuthMode {
  if (typeof value === 'string' && authModes.has(value)) return value as LLMAuthMode
  throw new Error(`Unsupported Phase 1 auth mode: ${String(value)}`)
}

export function assertPhase1GatewayBackend(value: unknown): GatewayBackend {
  if (value === undefined || value === null || value === '') return 'direct'
  if (typeof value === 'string' && gatewayBackends.has(value)) return value as GatewayBackend
  throw new Error(`Unsupported Phase 1 gateway backend: ${String(value)}`)
}

export function assertRouterAuthMode(value: unknown): LLMAuthMode {
  if (typeof value === 'string' && routerAuthModes.has(value)) return value as LLMAuthMode
  throw new Error(`Unsupported router auth mode: ${String(value)}`)
}

export function assertRouterGatewayBackend(value: unknown): GatewayBackend {
  if (value === undefined || value === null || value === '') return 'direct'
  if (typeof value === 'string' && routerGatewayBackends.has(value)) return value as GatewayBackend
  throw new Error(`Unsupported router gateway backend: ${String(value)}`)
}

export function assertRouterRoutingPolicyMode(value: unknown): RoutingPolicyMode {
  if (typeof value === 'string' && routerRoutingPolicyModes.has(value)) {
    return value as RoutingPolicyMode
  }
  throw new Error(`Unsupported router routing-policy mode: ${String(value)}`)
}

export function sanitizeSecretRef(ref: unknown): SecretRef {
  if (!ref || typeof ref !== 'object') {
    throw new Error('Secret ref must be an object')
  }

  const candidate = ref as {
    type?: unknown
    name?: unknown
    id?: unknown
    providerRegistryId?: unknown
    secretType?: unknown
  }

  if (candidate.type === 'none') {
    return { type: 'none' }
  }

  if (candidate.type === 'env') {
    return { type: 'env', name: sanitizeSecretRefName(candidate.name, 'Env secret ref') }
  }

  if (candidate.type === 'gateway_virtual_key_ref') {
    return {
      type: 'gateway_virtual_key_ref',
      name: sanitizeSecretRefName(candidate.name, 'Gateway virtual key ref'),
    }
  }

  if (candidate.type === 'stored_provider_secret') {
    return {
      type: 'stored_provider_secret',
      id: sanitizeStoredSecretId(candidate.id),
      providerRegistryId: sanitizeStoredSecretId(candidate.providerRegistryId),
      secretType: sanitizeStoredSecretType(candidate.secretType),
    }
  }

  throw new Error(`Unsupported router secret ref type: ${String(candidate.type)}`)
}

export function sanitizeSecretRefName(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} requires a non-empty reference name`)
  }

  const name = value.trim()
  if (!secretRefNamePattern.test(name)) {
    throw new Error(
      `${label} must be an environment-variable-style reference name, not a raw key, path, or credential file reference`
    )
  }

  return name
}

export function resolveEnvSecret(name: string): string | undefined {
  if (!name.trim()) throw new Error('Env secret name is required')
  return process.env[name]
}

function sanitizeStoredSecretId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Stored provider secret requires a non-empty id')
  }
  const id = value.trim()
  if (!storedSecretIdPattern.test(id)) {
    throw new Error('Stored provider secret id must be an opaque safe identifier')
  }
  return id
}

function sanitizeStoredSecretType(value: unknown): 'api_key' | 'setup_token' {
  if (value === 'api_key' || value === 'setup_token') return value
  throw new Error(`Unsupported stored provider secret type: ${String(value)}`)
}

export function validateSecretRefForAuthMode(
  authMode: LLMAuthMode,
  secretRef: SecretRef | undefined
): SecretRef | undefined {
  if (authMode === 'env_key') {
    if (!secretRef) {
      throw new Error('env_key auth requires an env secret ref or stored API-key secret ref')
    }
    if (secretRef.type === 'env' && secretRef.name.trim().length > 0) {
      return secretRef
    }
    if (secretRef.type === 'stored_provider_secret' && secretRef.secretType === 'api_key') {
      return secretRef
    }
    throw new Error('env_key auth requires an env secret ref or stored API-key secret ref')
  }

  if (authMode === 'gateway_virtual_key') {
    if (
      !secretRef ||
      secretRef.type !== 'gateway_virtual_key_ref' ||
      secretRef.name.trim().length === 0
    ) {
      throw new Error('gateway_virtual_key auth requires a gateway virtual key ref')
    }
    return secretRef
  }

  if (authMode === 'claude_setup_token') {
    if (
      !secretRef ||
      secretRef.type !== 'stored_provider_secret' ||
      secretRef.secretType !== 'setup_token'
    ) {
      throw new Error('claude_setup_token auth requires a stored setup-token secret ref')
    }
    return secretRef
  }

  if (authMode === 'codex_app_server') {
    if (secretRef && secretRef.type !== 'none') {
      throw new Error('codex_app_server auth must not include a SkillMall secret ref')
    }
    return secretRef ?? { type: 'none' }
  }

  if (secretRef && secretRef.type !== 'none') {
    throw new Error(`${authMode} auth must not include a secret ref`)
  }

  return secretRef
}
