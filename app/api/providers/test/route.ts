import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveRouterProviderConfig } from '@/lib/llm/router/config'
import { getProviderRegistryEntry, PROVIDER_REGISTRY, providerRegistryIdForExecutableProvider } from '@/lib/providers/registry'
import { modelDiscoveryPlanForEntry } from '@/lib/providers/model-discovery'
import { storedSecretValuePresentSync } from '@/lib/providers/secret-store'
import { checkLocalCliAuthStatus } from '@/lib/providers/local-cli-auth'
import type { SecretRef } from '@/lib/llm/router/types'
import type { ProviderRegistryID } from '@/lib/providers/types'

const registryIds = PROVIDER_REGISTRY.map((entry) => entry.id) as [ProviderRegistryID, ...ProviderRegistryID[]]

const TestBodySchema = z.object({
  providerRegistryId: z.enum(registryIds).optional(),
}).strict()

export const dynamic = 'force-dynamic'

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
  'credentialFile',
  'credential_file',
])

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

function sanitizeSecretStatus(secretRef: SecretRef | undefined | null) {
  if (!secretRef) return null
  if (secretRef.type === 'none') {
    return {
      type: 'none',
      valuePresent: true,
      source: 'no_secret_required',
    }
  }

  if (secretRef.type === 'stored_api_key') {
    return {
      type: 'stored_api_key',
      id: secretRef.id,
      valuePresent: storedSecretValuePresentSync(secretRef.id),
      source: 'encrypted_local_store',
    }
  }

  return {
    type: secretRef.type,
    name: secretRef.name,
    valuePresent: Boolean(process.env[secretRef.name]),
    source: 'reference_only',
  }
}

function statusForSecret(secretRef: SecretRef | undefined | null): 'ready' | 'missing_secret' {
  if (!secretRef || secretRef.type === 'none') return 'ready'
  if (secretRef.type === 'stored_api_key') {
    return storedSecretValuePresentSync(secretRef.id) ? 'ready' : 'missing_secret'
  }
  return process.env[secretRef.name] ? 'ready' : 'missing_secret'
}

type ProviderTestStatus =
  | 'ready'
  | 'missing_secret'
  | 'missing_local_cli'
  | 'missing_local_auth'
  | 'planned_source_review'
  | 'not_configured'
  | 'metadata_only'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const rejectedFields = rejectedRawSecretFields(body)

  if (rejectedFields.length > 0) {
    return NextResponse.json(
      {
        error: 'raw_secret_field_rejected',
        rejectedFields,
        message: 'Provider tests accept references only, not raw secrets or credential files.',
      },
      { status: 400 }
    )
  }

  const parsed = TestBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  let activeConfig: ReturnType<typeof resolveRouterProviderConfig> | null = null
  try {
    activeConfig = resolveRouterProviderConfig({ preferStoredConfig: true })
  } catch {
    activeConfig = null
  }

  const providerRegistryId =
    parsed.data.providerRegistryId ??
    (activeConfig ? activeConfig.providerRegistryId ?? providerRegistryIdForExecutableProvider(activeConfig.provider) : undefined)
  const entry = providerRegistryId ? getProviderRegistryEntry(providerRegistryId) : undefined

  if (!entry) {
    return NextResponse.json(
      { error: 'unknown_provider_registry_id' },
      { status: 400 }
    )
  }

  const activeMatches = Boolean(
    activeConfig && (activeConfig.providerRegistryId ?? providerRegistryIdForExecutableProvider(activeConfig.provider)) === entry.id
  )
  const secretRef = activeMatches && activeConfig ? activeConfig.secretRef : undefined
  const discoveryPlan = modelDiscoveryPlanForEntry(entry)
  const localCliAuth =
    entry.accessModes.includes('local_tool_session')
      ? await checkLocalCliAuthStatus(entry.id)
      : null
  const status: ProviderTestStatus =
    entry.status === 'planned_source_review'
      ? 'planned_source_review'
      : localCliAuth && !localCliAuth.available
        ? 'missing_local_cli'
        : localCliAuth && !localCliAuth.authenticated
          ? 'missing_local_auth'
          : localCliAuth && localCliAuth.authenticated
            ? 'ready'
      : activeMatches
        ? statusForSecret(secretRef)
        : entry.executableProviderId
          ? 'not_configured'
          : 'metadata_only'

  return NextResponse.json({
    providerRegistryId: entry.id,
    executableProviderId: entry.executableProviderId ?? null,
    configured: Boolean(activeMatches),
    status,
    checks: [
      {
        name: 'registry_row',
        status: entry.status,
      },
      {
        name: 'secret_reference',
        status: secretRef ? statusForSecret(secretRef) : 'not_applicable',
      },
      ...(localCliAuth
        ? [{
            name: 'local_cli_auth',
            status: localCliAuth.available && localCliAuth.authenticated
              ? 'ready'
              : localCliAuth.available
                ? 'missing_local_auth'
                : 'missing_local_cli',
          }]
        : []),
      {
        name: 'model_discovery',
        status: discoveryPlan.canRefreshNow ? 'supported_when_configured' : discoveryPlan.strategy,
      },
    ],
    authMode: activeMatches && activeConfig ? activeConfig.authMode : null,
    gatewayBackend: activeMatches && activeConfig ? activeConfig.gatewayBackend : null,
    secretStatus: sanitizeSecretStatus(secretRef),
    localCliAuth: localCliAuth
      ? {
          available: localCliAuth.available,
          authenticated: localCliAuth.authenticated,
          authMethod: localCliAuth.authMethod ?? null,
          message: localCliAuth.message,
        }
      : null,
    message: 'Safe configuration/status test only; prompt and response bodies are not accepted, stored, or echoed.',
  })
}
