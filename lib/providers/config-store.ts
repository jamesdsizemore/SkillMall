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
import type { GatewayBackend, LLMAuthMode, RouterExecutionKind, SecretRef } from '../llm/router/types'
import { DEFAULT_MODELS } from './defaults'
import type { ProviderID, ProviderRegistryID } from './types'

export const USER_CONFIG_PATH = path.join(os.homedir(), '.skill-mall', 'config.json')

type RawProviderConfig = {
  provider?: ProviderID
  activeProviderRegistryId?: ProviderRegistryID
  model?: string
  providers?: Record<string, StoredRouterProviderConfig>
  providerTargets?: Record<string, StoredRouterProviderConfig>
}

async function readRawConfig(): Promise<RawProviderConfig> {
  try {
    return JSON.parse(await fs.readFile(userConfigPath(), 'utf-8')) as RawProviderConfig
  } catch {
    return {}
  }
}

function userConfigPath(): string {
  return process.env.SKILL_MALL_CONFIG_PATH ?? USER_CONFIG_PATH
}

export async function writeProviderConfig(input: {
  provider: ProviderID
  providerRegistryId?: ProviderRegistryID
  executionKind?: RouterExecutionKind
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
  providerRegistryId: ProviderRegistryID
  executionKind: RouterExecutionKind
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
  const providerTargets = existing.providerTargets ?? {}
  const previousProviderConfig = providers[input.provider] ?? {}
  const providerRegistryId = input.providerRegistryId ?? providerRegistryIdForExecutableProvider(input.provider)
  const previousTargetConfig = providerTargets[providerRegistryId] ?? {}
  const previousConfig = { ...previousProviderConfig, ...previousTargetConfig }
  const model = input.model ?? previousConfig.model ?? DEFAULT_MODELS[input.provider]
  const authMode = assertRouterAuthMode(input.authMode ?? defaultAuthModeForProvider(input.provider))
  const registryEntry = getProviderRegistryEntry(providerRegistryId)
  if (registryEntry) assertAuthModeAllowedForProvider(registryEntry, authMode)
  const gatewayBackend = assertRouterGatewayBackend(input.gatewayBackend ?? previousConfig.gatewayBackend)
  const executionKind = input.executionKind ?? (gatewayBackend === 'bifrost_local' ? 'bifrost_local' : 'direct')
  const baseURL =
    input.baseURL ??
    (gatewayBackend === 'bifrost_local' || executionKind === 'openai_compatible' ? previousConfig.baseURL : undefined)
  if (gatewayBackend === 'bifrost_local') assertLocalBifrostBaseURL(baseURL)
  const rawSecretRef =
    input.secretRef ??
    (input.keyEnv ? { type: 'env', name: input.keyEnv } : previousConfig.secretRef) ??
    (authMode === 'env_key'
      ? defaultSecretRefForProvider(input.provider)
      : authMode === 'gateway_virtual_key'
        ? undefined
        : { type: 'none' })
  const secretRef = validateSecretRefForAuthMode(authMode, sanitizeSecretRef(rawSecretRef))

  const safePreviousProviderConfig = { ...previousProviderConfig }
  delete safePreviousProviderConfig.apiKey
  const safePreviousTargetConfig = { ...previousTargetConfig }
  delete safePreviousTargetConfig.apiKey

  providers[input.provider] = {
    ...safePreviousProviderConfig,
    model,
    authMode,
    secretRef,
    gatewayBackend,
    ...(baseURL ? { baseURL } : { baseURL: undefined }),
    ...(input.routingPolicyId ? { routingPolicyId: input.routingPolicyId } : {}),
  }

  providerTargets[providerRegistryId] = {
    ...safePreviousTargetConfig,
    provider: input.provider,
    providerRegistryId,
    executionKind,
    model,
    authMode,
    secretRef,
    gatewayBackend,
    ...(baseURL ? { baseURL } : { baseURL: undefined }),
    ...(input.routingPolicyId ? { routingPolicyId: input.routingPolicyId } : {}),
  }

  const configPath = userConfigPath()
  await fs.mkdir(path.dirname(configPath), { recursive: true })
  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        ...existing,
        provider: input.provider,
        activeProviderRegistryId: providerRegistryId,
        model,
        providers,
        providerTargets,
      },
      null,
      2
    ) + '\n',
    'utf-8'
  )

  return {
    provider: input.provider,
    providerRegistryId,
    executionKind,
    authMode,
    secretRef,
    apiKey: undefined,
    model,
    gatewayBackend,
    baseURL,
    routingPolicyId: input.routingPolicyId,
    path: configPath,
  }
}
