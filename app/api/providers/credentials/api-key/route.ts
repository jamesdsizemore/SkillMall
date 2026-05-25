import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeProviderConfig } from '@/lib/providers/config-store'
import { deleteProviderSecret, storedProviderSecretId, writeProviderSecret } from '@/lib/providers/secret-store'
import { getProviderRegistryEntry, PROVIDER_REGISTRY, providerRegistryIdForExecutableProvider } from '@/lib/providers/registry'
import type { ProviderID, ProviderRegistryID } from '@/lib/providers/types'

export const dynamic = 'force-dynamic'

const registryIds = PROVIDER_REGISTRY.map((entry) => entry.id) as [ProviderRegistryID, ...ProviderRegistryID[]]
const directApiProviderIds = ['openai', 'anthropic', 'gemini', 'groq'] as const

const ApiKeySchema = z.object({
  providerRegistryId: z.enum(registryIds),
  apiKey: z.string().min(1),
  model: z.string().min(1).optional(),
  baseURL: z.string().url().optional(),
}).strict()

type DirectApiProviderRegistryId = (typeof directApiProviderIds)[number]

const executableProviderByRegistryId: Record<DirectApiProviderRegistryId, ProviderID> = {
  openai: 'openai',
  anthropic: 'anthropic',
  gemini: 'gemini',
  groq: 'groq',
}

function apiKeyRef(providerRegistryId: ProviderRegistryID) {
  return {
    type: 'stored_provider_secret' as const,
    id: storedProviderSecretId(providerRegistryId, 'api_key'),
    providerRegistryId,
    secretType: 'api_key' as const,
  }
}

function sanitizeApiKey(value: string): string {
  const key = value.trim()
  if (key.length < 8) {
    throw new Error('API key looks too short.')
  }
  return key
}

function isDirectApiProviderId(value: ProviderRegistryID): value is DirectApiProviderRegistryId {
  return (directApiProviderIds as readonly string[]).includes(value)
}

function resolveApiKeyTarget(providerRegistryId: ProviderRegistryID, baseURL: string | undefined) {
  const registryEntry = getProviderRegistryEntry(providerRegistryId)
  if (!registryEntry) {
    throw new Error('Unknown provider registry id.')
  }

  if (isDirectApiProviderId(providerRegistryId)) {
    return {
      provider: executableProviderByRegistryId[providerRegistryId],
      executionKind: 'direct' as const,
      baseURL: undefined,
    }
  }

  if (registryEntry.gatewayProfile?.kind === 'openai_compatible') {
    const resolvedBaseURL =
      baseURL ??
      (registryEntry.gatewayProfile.requiresUserEndpoint ? undefined : registryEntry.gatewayProfile.defaultBaseUrl)
    if (!resolvedBaseURL) {
      throw new Error('This provider requires a base URL before an API key can be saved.')
    }

    return {
      provider: 'openai' as const,
      executionKind: registryEntry.id === providerRegistryIdForExecutableProvider('openai') ? 'direct' as const : 'openai_compatible' as const,
      baseURL: resolvedBaseURL,
    }
  }

  throw new Error('This provider is visible in the registry but is not configurable by API key in this UI yet.')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = ApiKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.issues }, { status: 400 })
  }

  try {
    const apiKey = sanitizeApiKey(parsed.data.apiKey)
    const target = resolveApiKeyTarget(parsed.data.providerRegistryId, parsed.data.baseURL)
    const secret = writeProviderSecret({
      providerRegistryId: parsed.data.providerRegistryId,
      secretType: 'api_key',
      value: apiKey,
    })
    const secretRef = apiKeyRef(parsed.data.providerRegistryId)
    let saved: Awaited<ReturnType<typeof writeProviderConfig>>
    try {
      saved = await writeProviderConfig({
        provider: target.provider,
        providerRegistryId: parsed.data.providerRegistryId,
        executionKind: target.executionKind,
        authMode: 'env_key',
        secretRef,
        model: parsed.data.model,
        gatewayBackend: 'direct',
        baseURL: target.baseURL,
      })
    } catch (error) {
      deleteProviderSecret(secret.id)
      throw new Error(error instanceof Error ? error.message : 'API key could not be saved to provider config.')
    }

    return NextResponse.json({
      success: true,
      providerRegistryId: saved.providerRegistryId,
      provider: saved.provider,
      model: saved.model,
      authMode: saved.authMode,
      secretRef,
      secretStatus: {
        type: 'stored_provider_secret',
        id: secret.id,
        secretType: secret.secretType,
        valuePresent: true,
        source: 'app_managed_encrypted_store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'invalid_api_key',
        message: error instanceof Error ? error.message : 'Invalid API key.',
      },
      { status: 400 }
    )
  }
}
