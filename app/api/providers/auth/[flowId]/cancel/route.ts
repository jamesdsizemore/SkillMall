import { NextRequest, NextResponse } from 'next/server'
import { cancelCodexAppServerAuth } from '@/lib/providers/codex-app-server-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params
  const session = await cancelCodexAppServerAuth(flowId)
  if (!session) {
    return NextResponse.json(
      {
        error: 'auth_session_not_found',
        message: 'Codex authorization session was not found.',
      },
      { status: 404 }
    )
  }

  return NextResponse.json({ session })
}
