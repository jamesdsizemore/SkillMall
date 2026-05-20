export const PHASE1_AUTH_MODES = ['env_key', 'local_cli_session', 'none_local'] as const

export const PHASE2_AUTH_MODES = [...PHASE1_AUTH_MODES, 'gateway_virtual_key'] as const

export type LLMAuthMode = (typeof PHASE2_AUTH_MODES)[number]

export const PHASE1_GATEWAY_BACKENDS = ['direct'] as const

export const PHASE2_GATEWAY_BACKENDS = [...PHASE1_GATEWAY_BACKENDS, 'bifrost_local'] as const

export type GatewayBackend = (typeof PHASE2_GATEWAY_BACKENDS)[number]

export const PHASE2_ROUTING_POLICY_MODES = [
  'manual',
  'fallback_chain',
  'local_first',
  'budget_guarded_manual',
] as const

export type RoutingPolicyMode = (typeof PHASE2_ROUTING_POLICY_MODES)[number]

export type SecretRefType = 'env' | 'none' | 'gateway_virtual_key_ref'

export type SecretRef =
  | { type: 'env'; name: string }
  | { type: 'gateway_virtual_key_ref'; name: string }
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
