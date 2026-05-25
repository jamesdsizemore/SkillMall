import { NextRequest, NextResponse } from 'next/server'
import { cancelCodexAppServerAuthSession } from '@/lib/providers/codex-app-server-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ flowId: string }> | { flowId: string } }
) {
  const params = await context.params
  const session = await cancelCodexAppServerAuthSession(params.flowId)
  if (!session) return NextResponse.json({ error: 'auth_flow_not_found' }, { status: 404 })
  return NextResponse.json({ session })
}
