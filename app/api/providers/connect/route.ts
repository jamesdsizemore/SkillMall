import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkLocalCliAuthStatus, startLocalCliAuthFlow } from '@/lib/providers/local-cli-auth'
import { getProviderRegistryEntry, PROVIDER_REGISTRY } from '@/lib/providers/registry'
import type { ProviderRegistryID } from '@/lib/providers/types'

const registryIds = PROVIDER_REGISTRY.map((entry) => entry.id) as [ProviderRegistryID, ...ProviderRegistryID[]]

const ConnectBodySchema = z.object({
  providerRegistryId: z.enum(registryIds),
}).strict()

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

function safeLocalCliAuthPayload(status: Awaited<ReturnType<typeof checkLocalCliAuthStatus>>) {
  return {
    available: status.available,
    authenticated: status.authenticated,
    authMethod: status.authMethod ?? null,
    message: status.message,
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const rejectedFields = rejectedRawSecretFields(body)
  if (rejectedFields.length > 0) {
    return NextResponse.json(
      {
        error: 'raw_secret_field_rejected',
        rejectedFields,
        message: 'Provider local auth connection accepts provider selection only, not raw secrets or credential files.',
      },
      { status: 400 }
    )
  }

  const parsed = ConnectBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const entry = getProviderRegistryEntry(parsed.data.providerRegistryId)
  if (!entry) {
    return NextResponse.json(
      { error: 'unknown_provider_registry_id' },
      { status: 400 }
    )
  }

  if (!entry.accessModes.includes('local_tool_session')) {
    return NextResponse.json(
      {
        error: 'unsupported_connect_provider',
        message: 'Connect is only available for local CLI/session auth providers.',
      },
      { status: 400 }
    )
  }

  const before = await checkLocalCliAuthStatus(entry.id)
  if (before.available && before.authenticated) {
    return NextResponse.json({
      providerRegistryId: entry.id,
      status: 'ready',
      alreadyAuthenticated: true,
      localCliAuth: safeLocalCliAuthPayload(before),
      message: 'Local CLI auth is already active.',
    })
  }

  const flow = await startLocalCliAuthFlow(entry.id)
  if (!flow.started) {
    return NextResponse.json(
      {
        providerRegistryId: entry.id,
        status: before.available ? 'missing_local_auth' : 'missing_local_cli',
        localCliAuth: safeLocalCliAuthPayload(before),
        authFlow: {
          started: false,
          command: flow.command,
          launchedInTerminal: false,
        },
        message: flow.message,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    providerRegistryId: entry.id,
    status: 'auth_flow_started',
    localCliAuth: safeLocalCliAuthPayload(before),
    authFlow: {
      started: true,
      command: flow.command,
      launchedInTerminal: flow.launchedInTerminal,
    },
    message: flow.message,
  })
}
