import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeProviderConfig } from '@/lib/providers/config-store'
import { deleteProviderSecret, storedProviderSecretId, writeProviderSecret } from '@/lib/providers/secret-store'

export const dynamic = 'force-dynamic'

const SetupTokenSchema = z.object({
  providerRegistryId: z.literal('claude_code'),
  token: z.string().min(1),
  model: z.string().min(1).optional(),
}).strict()

function setupTokenRef() {
  return {
    type: 'stored_provider_secret' as const,
    id: storedProviderSecretId('claude_code', 'setup_token'),
    providerRegistryId: 'claude_code',
    secretType: 'setup_token' as const,
  }
}

function sanitizeToken(value: string): string {
  const token = value.trim()
  if (!token.startsWith('sk-ant-oat01-')) {
    throw new Error('Claude setup-token must start with sk-ant-oat01-.')
  }
  if (token.length < 24) {
    throw new Error('Claude setup-token looks too short.')
  }
  return token
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = SetupTokenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.issues }, { status: 400 })
  }

  try {
    const token = sanitizeToken(parsed.data.token)
    const secret = writeProviderSecret({
      providerRegistryId: 'claude_code',
      secretType: 'setup_token',
      value: token,
    })
    const secretRef = setupTokenRef()
    let saved: Awaited<ReturnType<typeof writeProviderConfig>>
    try {
      saved = await writeProviderConfig({
        provider: 'claude-code',
        providerRegistryId: 'claude_code',
        executionKind: 'direct',
        authMode: 'claude_setup_token',
        secretRef,
        model: parsed.data.model,
        gatewayBackend: 'direct',
      })
    } catch (error) {
      deleteProviderSecret(secret.id)
      throw new Error(error instanceof Error ? error.message : 'Claude setup-token could not be saved to provider config.')
    }

    return NextResponse.json({
      success: true,
      providerRegistryId: 'claude_code',
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
        error: 'invalid_setup_token',
        message: error instanceof Error ? error.message : 'Invalid Claude setup-token.',
      },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  const id = storedProviderSecretId('claude_code', 'setup_token')
  await writeProviderConfig({
    provider: 'claude-code',
    providerRegistryId: 'claude_code',
    executionKind: 'direct',
    authMode: 'local_cli_session',
    secretRef: { type: 'none' },
    gatewayBackend: 'direct',
  })
  const deleted = deleteProviderSecret(id)
  return NextResponse.json({
    success: true,
    providerRegistryId: 'claude_code',
    authMode: 'local_cli_session',
    deleted,
    secretStatus: {
      type: 'stored_provider_secret',
      id,
      valuePresent: false,
      source: 'app_managed_encrypted_store',
    },
  })
}
