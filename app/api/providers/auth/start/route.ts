import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { startCodexAppServerAuth } from '@/lib/providers/codex-app-server-auth'

const StartAuthBodySchema = z.object({
  providerRegistryId: z.literal('openai_codex'),
  method: z.enum(['chatgpt', 'chatgpt_device_code']).default('chatgpt_device_code'),
}).strict()

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = StartAuthBodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const session = await startCodexAppServerAuth(parsed.data.method)
    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'codex_auth_start_failed',
        message: error instanceof Error ? error.message : 'Codex authorization failed to start.',
      },
      { status: 500 }
    )
  }
}
