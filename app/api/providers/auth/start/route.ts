import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { startCodexAppServerAuthSession } from '@/lib/providers/codex-app-server-auth'

export const dynamic = 'force-dynamic'

const forbiddenFieldNames = new Set([
  'apiKey',
  'rawKey',
  'key',
  'token',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'browserToken',
  'browser_token',
  'credentialPath',
  'credential_path',
  'credentialFile',
  'credential_file',
])

const StartAuthSchema = z.object({
  providerRegistryId: z.literal('openai_codex'),
  method: z.enum(['chatgpt', 'chatgpt_device_code']).default('chatgpt'),
}).strict()

function rejectedFields(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => rejectedFields(item, `${prefix}[${index}]`))
  }
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const nestedPaths = rejectedFields(nested, path)
    return forbiddenFieldNames.has(key) ? [path, ...nestedPaths] : nestedPaths
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const rejected = rejectedFields(body)
  if (rejected.length > 0) {
    return NextResponse.json(
      {
        error: 'raw_secret_field_rejected',
        rejectedFields: rejected,
        message: 'Codex auth start accepts provider/method only, not raw tokens or credential files.',
      },
      { status: 400 }
    )
  }

  const parsed = StartAuthSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.issues }, { status: 400 })
  }

  try {
    const session = await startCodexAppServerAuthSession({ method: parsed.data.method })
    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'codex_auth_start_failed',
        message: error instanceof Error ? error.message : 'Codex auth start failed',
      },
      { status: 502 }
    )
  }
}
