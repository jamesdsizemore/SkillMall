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

  const candidate = ref as { type?: unknown; name?: unknown }

  if (candidate.type === 'none') {
    return { type: 'none' }
  }

  if (candidate.type === 'env') {
    if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
      throw new Error('Env secret ref requires a non-empty env var name')
    }
    return { type: 'env', name: candidate.name.trim() }
  }

  if (candidate.type === 'gateway_virtual_key_ref') {
    if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
      throw new Error('Gateway virtual key ref requires a non-empty env var name')
    }
    return { type: 'gateway_virtual_key_ref', name: candidate.name.trim() }
  }

  throw new Error(`Unsupported Phase 1 secret ref type: ${String(candidate.type)}`)
}

export function resolveEnvSecret(name: string): string | undefined {
  if (!name.trim()) throw new Error('Env secret name is required')
  return process.env[name]
}

export function validateSecretRefForAuthMode(
  authMode: LLMAuthMode,
  secretRef: SecretRef | undefined
): SecretRef | undefined {
  if (authMode === 'env_key') {
    if (!secretRef || secretRef.type !== 'env' || secretRef.name.trim().length === 0) {
      throw new Error('env_key auth requires an env secret ref')
    }
    return secretRef
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

  if (secretRef && secretRef.type !== 'none') {
    throw new Error(`${authMode} auth must not include a secret ref`)
  }

  return secretRef
}
