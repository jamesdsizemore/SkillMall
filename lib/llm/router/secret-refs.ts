import {
  PHASE1_AUTH_MODES,
  PHASE1_GATEWAY_BACKENDS,
  type GatewayBackend,
  type LLMAuthMode,
  type SecretRef,
} from './types'

const authModes = new Set<string>(PHASE1_AUTH_MODES)
const gatewayBackends = new Set<string>(PHASE1_GATEWAY_BACKENDS)

export function assertPhase1AuthMode(value: unknown): LLMAuthMode {
  if (typeof value === 'string' && authModes.has(value)) return value as LLMAuthMode
  throw new Error(`Unsupported Phase 1 auth mode: ${String(value)}`)
}

export function assertPhase1GatewayBackend(value: unknown): GatewayBackend {
  if (value === undefined || value === null || value === '') return 'direct'
  if (typeof value === 'string' && gatewayBackends.has(value)) return value as GatewayBackend
  throw new Error(`Unsupported Phase 1 gateway backend: ${String(value)}`)
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

  if (secretRef && secretRef.type !== 'none') {
    throw new Error(`${authMode} auth must not include a secret ref`)
  }

  return secretRef
}
