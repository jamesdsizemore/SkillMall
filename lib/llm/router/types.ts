export const PHASE1_AUTH_MODES = ['env_key', 'local_cli_session', 'none_local'] as const

export type LLMAuthMode = (typeof PHASE1_AUTH_MODES)[number]

export const PHASE1_GATEWAY_BACKENDS = ['direct'] as const

export type GatewayBackend = (typeof PHASE1_GATEWAY_BACKENDS)[number]

export type SecretRefType = 'env' | 'none'

export type SecretRef =
  | { type: 'env'; name: string }
  | { type: 'none' }

export interface RouterProviderConfig {
  provider: string
  model: string
  authMode: LLMAuthMode
  secretRef?: SecretRef
  baseURL?: string
  gatewayBackend?: GatewayBackend
  routingPolicyId?: string
}

export interface LLMRequestStartInput {
  operation: string
  providerId: string
  modelId?: string
  authMode: LLMAuthMode
  routeBackend?: GatewayBackend
  routingPolicyId?: string
  metadata?: Record<string, unknown>
}

export interface LLMRequestFinishInput {
  requestId: string
  status: 'succeeded' | 'failed'
  inputTokens?: number
  outputTokens?: number
  cachedInputTokens?: number
  reasoningTokens?: number
  estimatedCostUsd?: number
  actualCostUsd?: number
  costSource?: string
  errorCode?: string
  metadata?: Record<string, unknown>
}

export interface LLMRequestEventInput {
  requestId: string
  eventType: string
  providerId?: string
  modelId?: string
  message?: string
  metadata?: Record<string, unknown>
}
