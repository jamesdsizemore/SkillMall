import fs from 'fs'
import os from 'os'
import path from 'path'
import { DEFAULT_MODELS } from '../../providers/defaults'
import { ConfigError, type ProviderID } from '../../providers/types'
import {
  assertAuthModeAllowedForProvider,
  getProviderRegistryEntry,
  providerRegistryIdForExecutableProvider,
} from '../../providers/registry'
import {
  assertRouterAuthMode,
  assertRouterGatewayBackend,
  sanitizeSecretRef,
  validateSecretRefForAuthMode,
} from './secret-refs'
import { assertLocalBifrostBaseURL } from './gateway-adapter'
import type { GatewayBackend, LLMAuthMode, RouterProviderConfig, SecretRef } from './types'
import type { ProviderRegistryID } from '../../providers/types'

export const ROUTER_USER_CONFIG_PATH = path.join(os.homedir(), '.skill-mall', 'config.json')

const PROVIDER_IDS: ProviderID[] = ['openai', 'codex', 'anthropic', 'claude-code', 'gemini', 'groq', 'ollama']

const API_ENV_BY_PROVIDER: Partial<Record<ProviderID, string>> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
}

export interface StoredRouterProviderConfig {
  provider?: string
  providerRegistryId?: string
  executionKind?: string
  model?: string
  authMode?: string
  secretRef?: unknown
  baseURL?: string
  gatewayBackend?: string
  routingPolicyId?: string
  apiKey?: string
}

export interface RouterConfigFile {
  provider?: string
  activeProviderRegistryId?: string
  model?: string
  providers?: Record<string, StoredRouterProviderConfig>
  providerTargets?: Record<string, StoredRouterProviderConfig>
}

export interface ResolvedRouterProviderConfig extends RouterProviderConfig {
  provider: ProviderID
  providerRegistryId: ProviderRegistryID
  gatewayBackend: GatewayBackend
  warnings: string[]
}

function isProviderID(value: string | undefined): value is ProviderID {
  return Boolean(value && (PROVIDER_IDS as string[]).includes(value))
}

export function defaultAuthModeForProvider(provider: ProviderID): LLMAuthMode {
  if (provider === 'codex') return 'codex_app_server'
  if (provider === 'claude-code') return 'local_cli_session'
  if (provider === 'ollama') return 'none_local'
  return 'env_key'
}

export function defaultSecretRefForProvider(provider: ProviderID): SecretRef | undefined {
  const envName = API_ENV_BY_PROVIDER[provider]
  return envName ? { type: 'env', name: envName } : undefined
}

function readConfigFile(): RouterConfigFile | undefined {
  if (!fs.existsSync(ROUTER_USER_CONFIG_PATH)) return undefined
  try {
    return JSON.parse(fs.readFileSync(ROUTER_USER_CONFIG_PATH, 'utf-8')) as RouterConfigFile
  } catch {
    throw new ConfigError(
      `~/.skill-mall/config.json is malformed JSON. Run: npx skill-mall configure`
    )
  }
}

function resolveAuthAndSecret(
  provider: ProviderID,
  providerRegistryId: ProviderRegistryID,
  stored: StoredRouterProviderConfig | undefined,
  warnings: string[]
): { authMode: LLMAuthMode; secretRef?: SecretRef } {
  if (stored?.apiKey) {
    warnings.push('Legacy raw apiKey was ignored; configure an env secret reference instead.')
  }

  const authMode = assertRouterAuthMode(stored?.authMode ?? defaultAuthModeForProvider(provider))
  const registryEntry = getProviderRegistryEntry(providerRegistryId)
  if (registryEntry) assertAuthModeAllowedForProvider(registryEntry, authMode)
  const rawSecretRef =
    stored?.secretRef ??
    (authMode === 'env_key'
      ? defaultSecretRefForProvider(provider)
      : authMode === 'gateway_virtual_key'
        ? undefined
        : authMode === 'codex_app_server'
          ? { type: 'none' }
        : { type: 'none' })
  const secretRef = rawSecretRef ? sanitizeSecretRef(rawSecretRef) : undefined

  return {
    authMode,
    secretRef: validateSecretRefForAuthMode(authMode, secretRef),
  }
}

export function resolveRouterProviderConfig(): ResolvedRouterProviderConfig {
  const envProvider = process.env.SKILL_MALL_PROVIDER
  const envModel = process.env.SKILL_MALL_MODEL

  if (envProvider) {
    if (!isProviderID(envProvider)) {
      throw new ConfigError(`Unknown LLM provider "${envProvider}". Run: npx skill-mall configure`)
    }

    const authMode = defaultAuthModeForProvider(envProvider)
    const registryEntry = getProviderRegistryEntry(providerRegistryIdForExecutableProvider(envProvider))
    if (registryEntry) assertAuthModeAllowedForProvider(registryEntry, authMode)
    const secretRef = validateSecretRefForAuthMode(
      authMode,
      authMode === 'env_key' ? defaultSecretRefForProvider(envProvider) : { type: 'none' }
    )

    return {
      provider: envProvider,
      providerRegistryId: providerRegistryIdForExecutableProvider(envProvider),
      executionKind: 'direct',
      model: envModel ?? DEFAULT_MODELS[envProvider],
      authMode,
      secretRef,
      gatewayBackend: 'direct',
      warnings: [],
    }
  }

  const raw = readConfigFile()
  if (!raw) {
    throw new ConfigError('No LLM provider configured. Run: npx skill-mall configure')
  }

  if (!isProviderID(raw.provider)) {
    throw new ConfigError(
      `~/.skill-mall/config.json has an unknown provider. Run: npx skill-mall configure`
    )
  }

  const fallbackRegistryId = providerRegistryIdForExecutableProvider(raw.provider)
  const activeProviderRegistryId = (raw.activeProviderRegistryId ?? fallbackRegistryId) as ProviderRegistryID
  const target = raw.providerTargets?.[activeProviderRegistryId]
  const storedProvider = target?.provider && isProviderID(target.provider) ? target.provider : raw.provider
  const stored = target ?? raw.providers?.[storedProvider] ?? {}
  const warnings: string[] = []
  if ((raw as { apiKey?: unknown }).apiKey) {
    warnings.push('Legacy root apiKey was ignored; configure an env secret reference instead.')
  }

  const { authMode, secretRef } = resolveAuthAndSecret(storedProvider, activeProviderRegistryId, stored, warnings)
  const gatewayBackend = assertRouterGatewayBackend(stored.gatewayBackend)
  if (gatewayBackend === 'bifrost_local') assertLocalBifrostBaseURL(stored.baseURL)

  return {
    provider: storedProvider,
    providerRegistryId: activeProviderRegistryId,
    executionKind: stored.executionKind === 'openai_compatible'
      ? 'openai_compatible'
      : gatewayBackend === 'bifrost_local'
        ? 'bifrost_local'
        : 'direct',
    model: envModel ?? stored.model ?? raw.model ?? DEFAULT_MODELS[storedProvider],
    authMode,
    secretRef,
    baseURL: stored.baseURL,
    gatewayBackend,
    routingPolicyId: stored.routingPolicyId,
    warnings,
  }
}
