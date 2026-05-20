import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import {
  assertRouterAuthMode,
  assertRouterGatewayBackend,
  sanitizeSecretRef,
  validateSecretRefForAuthMode,
} from '../llm/router/secret-refs'
import { assertLocalBifrostBaseURL } from '../llm/router/gateway-adapter'
import {
  defaultAuthModeForProvider,
  defaultSecretRefForProvider,
  type StoredRouterProviderConfig,
} from '../llm/router/config'
import {
  assertAuthModeAllowedForProvider,
  getProviderRegistryEntry,
  providerRegistryIdForExecutableProvider,
} from './registry'
import type { GatewayBackend, LLMAuthMode, SecretRef } from '../llm/router/types'
import { DEFAULT_MODELS } from './defaults'
import type { ProviderID } from './types'

export const USER_CONFIG_PATH = path.join(os.homedir(), '.skill-mall', 'config.json')

type RawProviderConfig = {
  provider?: ProviderID
  model?: string
  providers?: Record<string, StoredRouterProviderConfig>
}

async function readRawConfig(): Promise<RawProviderConfig> {
  try {
    return JSON.parse(await fs.readFile(USER_CONFIG_PATH, 'utf-8')) as RawProviderConfig
  } catch {
    return {}
  }
}

export async function writeProviderConfig(input: {
  provider: ProviderID
  authMode?: LLMAuthMode
  secretRef?: SecretRef
  keyEnv?: string
  apiKey?: string
  model?: string
  baseURL?: string
  gatewayBackend?: GatewayBackend
  routingPolicyId?: string
}): Promise<{
  provider: ProviderID
  authMode: LLMAuthMode
  secretRef?: SecretRef
  apiKey?: undefined
  model: string
  gatewayBackend: GatewayBackend
  path: string
  baseURL?: string
  routingPolicyId?: string
}> {
  if (input.apiKey) {
    throw new Error('Raw API keys must not be written to ~/.skill-mall/config.json; use keyEnv instead.')
  }

  const existing = await readRawConfig()
  const providers = existing.providers ?? {}
  const previousProviderConfig = providers[input.provider] ?? {}
  const model = input.model ?? previousProviderConfig.model ?? DEFAULT_MODELS[input.provider]
  const authMode = assertRouterAuthMode(input.authMode ?? defaultAuthModeForProvider(input.provider))
  const registryEntry = getProviderRegistryEntry(providerRegistryIdForExecutableProvider(input.provider))
  if (registryEntry) assertAuthModeAllowedForProvider(registryEntry, authMode)
  const gatewayBackend = assertRouterGatewayBackend(input.gatewayBackend ?? previousProviderConfig.gatewayBackend)
  const baseURL =
    input.baseURL ??
    (gatewayBackend === 'bifrost_local' ? previousProviderConfig.baseURL : undefined)
  if (gatewayBackend === 'bifrost_local') assertLocalBifrostBaseURL(baseURL)
  const rawSecretRef =
    input.secretRef ??
    (input.keyEnv ? { type: 'env', name: input.keyEnv } : previousProviderConfig.secretRef) ??
    (authMode === 'env_key'
      ? defaultSecretRefForProvider(input.provider)
      : authMode === 'gateway_virtual_key'
        ? undefined
        : { type: 'none' })
  const secretRef = validateSecretRefForAuthMode(authMode, sanitizeSecretRef(rawSecretRef))

  const safePreviousProviderConfig = { ...previousProviderConfig }
  delete safePreviousProviderConfig.apiKey

  providers[input.provider] = {
    ...safePreviousProviderConfig,
    model,
    authMode,
    secretRef,
    gatewayBackend,
    ...(baseURL ? { baseURL } : { baseURL: undefined }),
    ...(input.routingPolicyId ? { routingPolicyId: input.routingPolicyId } : {}),
  }

  await fs.mkdir(path.dirname(USER_CONFIG_PATH), { recursive: true })
  await fs.writeFile(
    USER_CONFIG_PATH,
    JSON.stringify({ ...existing, provider: input.provider, model, providers }, null, 2) + '\n',
    'utf-8'
  )

  return {
    provider: input.provider,
    authMode,
    secretRef,
    apiKey: undefined,
    model,
    gatewayBackend,
    baseURL,
    routingPolicyId: input.routingPolicyId,
    path: USER_CONFIG_PATH,
  }
}
