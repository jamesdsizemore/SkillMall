import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeProviderConfig } from '@/lib/providers/config-store'
import {
  assertRouterAuthMode,
  assertRouterGatewayBackend,
  sanitizeSecretRef,
  validateSecretRefForAuthMode,
} from '@/lib/llm/router/secret-refs'
import { assertLocalBifrostBaseURL } from '@/lib/llm/router/gateway-adapter'
import {
  assertAuthModeAllowedForProvider,
  getProviderRegistryEntry,
  PROVIDER_REGISTRY,
  providerRegistryIdForExecutableProvider,
} from '@/lib/providers/registry'
import { discoverProviderModels } from '@/lib/providers/model-discovery'
import { defaultAuthModeForProvider } from '@/lib/llm/router/config'
import type { LLMAuthMode, SecretRef } from '@/lib/llm/router/types'
import type { ProviderID, ProviderRegistryID } from '@/lib/providers/types'

const executableProviders = new Set<ProviderID>([
  'openai',
  'anthropic',
  'claude-code',
  'gemini',
  'groq',
  'ollama',
])

const registryIds = PROVIDER_REGISTRY.map((entry) => entry.id) as [ProviderRegistryID, ...ProviderRegistryID[]]

const forbiddenSecretFieldNames = new Set([
  'apiKey',
  'rawKey',
  'key',
  'token',
  'accessToken',
  'sessionToken',
  'browserToken',
  'browser_token',
  'credentialPath',
  'credential_path',
  'credentialsPath',
  'credentials_path',
  'credentialFile',
  'credential_file',
  'credentialFilePath',
  'credential_file_path',
])

const ConfigureBodySchema = z.object({
  providerRegistryId: z.enum(registryIds).optional(),
  provider: z.string().optional(),
  model: z.string().min(1).optional(),
  manualModels: z.array(z.string().min(1)).optional(),
  configMode: z
    .enum(['env_key', 'gateway_virtual_key_ref', 'local_cli_session', 'none_local'])
    .optional(),
  authMode: z.enum(['env_key', 'local_cli_session', 'none_local', 'gateway_virtual_key']).optional(),
  secretRef: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('env'), name: z.string().min(1) }),
      z.object({ type: z.literal('gateway_virtual_key_ref'), name: z.string().min(1) }),
      z.object({ type: z.literal('none') }),
    ])
    .optional(),
  gatewayBackend: z.enum(['direct', 'bifrost_local']).optional(),
  baseURL: z.string().url().optional(),
  routingPolicyId: z.string().min(1).optional(),
}).strict()

export const dynamic = 'force-dynamic'

function rejectedRawSecretFields(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => rejectedRawSecretFields(item, `${prefix}[${index}]`))
  }
  if (!value || typeof value !== 'object') return []

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const nested = rejectedRawSecretFields(nestedValue, path)
    return forbiddenSecretFieldNames.has(key) ? [path, ...nested] : nested
  })
}

function authModeFromInput(configMode: string | undefined, authMode: string | undefined): LLMAuthMode | undefined {
  if (configMode === 'gateway_virtual_key_ref') return 'gateway_virtual_key'
  if (configMode === 'env_key' || configMode === 'local_cli_session' || configMode === 'none_local') {
    return configMode
  }
  return authMode ? assertRouterAuthMode(authMode) : undefined
}

function sanitizeSecretStatus(secretRef: SecretRef | undefined | null) {
  if (!secretRef) return null
  if (secretRef.type === 'none') {
    return {
      type: 'none',
      valuePresent: true,
      source: 'no_secret_required',
    }
  }

  return {
    type: secretRef.type,
    name: secretRef.name,
    valuePresent: Boolean(process.env[secretRef.name]),
    source: 'reference_only',
  }
}

function executableProviderFromInput(value: string | undefined): ProviderID | null {
  return value && executableProviders.has(value as ProviderID) ? (value as ProviderID) : null
}

function registryExecutionProvider(registryEntry: NonNullable<ReturnType<typeof getProviderRegistryEntry>>): ProviderID | null {
  if (registryEntry.executableProviderId) return registryEntry.executableProviderId
  if (registryEntry.gatewayProfile?.kind === 'openai_compatible') return 'openai'
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const rejectedFields = rejectedRawSecretFields(body)

  if (rejectedFields.length > 0) {
    return NextResponse.json(
      {
        error: 'raw_secret_field_rejected',
        rejectedFields,
        message: 'Configure with secret references only; raw keys, browser/session tokens, and credential file paths are not accepted.',
      },
      { status: 400 }
    )
  }

  const parsed = ConfigureBodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const provider = executableProviderFromInput(parsed.data.provider)
    const providerRegistryId =
      parsed.data.providerRegistryId ?? (provider ? providerRegistryIdForExecutableProvider(provider) : undefined)
    const registryEntry = providerRegistryId ? getProviderRegistryEntry(providerRegistryId) : undefined

    if (!registryEntry) {
      return NextResponse.json(
        { error: 'unknown_provider_registry_id' },
        { status: 400 }
      )
    }

    const authMode = authModeFromInput(parsed.data.configMode, parsed.data.authMode)
    const gatewayBackend = assertRouterGatewayBackend(parsed.data.gatewayBackend)
    if (gatewayBackend === 'bifrost_local') assertLocalBifrostBaseURL(parsed.data.baseURL)
    const secretRef = parsed.data.secretRef ? sanitizeSecretRef(parsed.data.secretRef) : undefined
    if (authMode) {
      assertAuthModeAllowedForProvider(registryEntry, authMode)
      validateSecretRefForAuthMode(authMode, secretRef)
    }

    if (parsed.data.provider && !provider) {
      return NextResponse.json(
        {
          error: 'unsupported_executable_provider',
          message: 'Provider Center registry rows do not widen executable ProviderID support.',
        },
        { status: 400 }
      )
    }

    const openAICompatibleExecutionProvider = registryExecutionProvider(registryEntry)
    const directProviderMatch = Boolean(provider && registryEntry.executableProviderId === provider)
    const canPersistRegistryTarget = Boolean(
      !directProviderMatch &&
      openAICompatibleExecutionProvider &&
      registryEntry.gatewayProfile?.kind === 'openai_compatible' &&
      (authMode ?? 'env_key') === 'env_key'
    )
    const resolvedBaseURL =
      parsed.data.baseURL ??
      (registryEntry.gatewayProfile?.requiresUserEndpoint ? undefined : registryEntry.gatewayProfile?.defaultBaseUrl)

    if (canPersistRegistryTarget && !resolvedBaseURL) {
      return NextResponse.json(
        {
          error: 'invalid_provider_config',
          message: 'OpenAI-compatible registry execution requires a configured baseURL for this provider row.',
        },
        { status: 400 }
      )
    }

    if (canPersistRegistryTarget && !secretRef) {
      return NextResponse.json(
        {
          error: 'invalid_provider_config',
          message: 'OpenAI-compatible registry execution requires an env secret reference for this provider row.',
        },
        { status: 400 }
      )
    }

    if (canPersistRegistryTarget && openAICompatibleExecutionProvider) {
      const resolvedAuthMode = authMode ?? 'env_key'
      assertAuthModeAllowedForProvider(registryEntry, resolvedAuthMode)
      const saved = await writeProviderConfig({
        provider: openAICompatibleExecutionProvider,
        providerRegistryId: registryEntry.id,
        executionKind: registryEntry.id === providerRegistryIdForExecutableProvider(openAICompatibleExecutionProvider)
          ? 'direct'
          : 'openai_compatible',
        model: parsed.data.model,
        authMode: resolvedAuthMode,
        secretRef,
        gatewayBackend,
        baseURL: resolvedBaseURL,
        routingPolicyId: parsed.data.routingPolicyId,
      })

      return NextResponse.json({
        success: true,
        persisted: true,
        providerRegistryId: saved.providerRegistryId,
        provider: saved.provider,
        executionKind: saved.executionKind,
        model: saved.model,
        authMode: saved.authMode,
        gatewayBackend: saved.gatewayBackend,
        secretRef: saved.secretRef ?? null,
        secretStatus: sanitizeSecretStatus(saved.secretRef),
        baseURL: saved.baseURL ?? null,
        routingPolicyId: saved.routingPolicyId ?? null,
      })
    }

    if (provider && registryEntry.executableProviderId === provider) {
      const resolvedAuthMode = authMode ?? defaultAuthModeForProvider(provider)
      assertAuthModeAllowedForProvider(registryEntry, resolvedAuthMode)
      const saved = await writeProviderConfig({
        provider,
        providerRegistryId: registryEntry.id,
        executionKind: gatewayBackend === 'bifrost_local' ? 'bifrost_local' : 'direct',
        model: parsed.data.model,
        authMode,
        secretRef,
        gatewayBackend,
        baseURL: parsed.data.baseURL,
        routingPolicyId: parsed.data.routingPolicyId,
      })

      return NextResponse.json({
        success: true,
        persisted: true,
        providerRegistryId: registryEntry.id,
        provider: saved.provider,
        executionKind: saved.executionKind,
        model: saved.model,
        authMode: saved.authMode,
        gatewayBackend: saved.gatewayBackend,
        secretRef: saved.secretRef ?? null,
        secretStatus: sanitizeSecretStatus(saved.secretRef),
        baseURL: saved.baseURL ?? null,
        routingPolicyId: saved.routingPolicyId ?? null,
      })
    }

    const discovery = await discoverProviderModels(registryEntry, {
      manualModels: parsed.data.manualModels ?? (parsed.data.model ? [parsed.data.model] : undefined),
      baseUrl: parsed.data.baseURL,
    })

    return NextResponse.json({
      success: true,
      persisted: false,
      providerRegistryId: registryEntry.id,
      provider: null,
      status: registryEntry.status === 'planned_source_review' ? 'planned_source_review' : 'metadata_only',
      authMode: authMode ?? null,
      gatewayBackend,
      secretRef: secretRef ?? null,
      secretStatus: sanitizeSecretStatus(secretRef),
      baseURL: parsed.data.baseURL ?? null,
      routingPolicyId: parsed.data.routingPolicyId ?? null,
      modelStatus: {
        strategy: discovery.strategy,
        status: discovery.status,
        source: discovery.source,
        authoritative: discovery.authoritative,
        models: discovery.models,
        networkCalled: discovery.networkCalled,
      },
      message: 'Registry-only configuration metadata accepted; no executable provider config was written.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'invalid_provider_config',
        message: error instanceof Error ? error.message : 'Invalid provider configuration',
      },
      { status: 400 }
    )
  }
}
