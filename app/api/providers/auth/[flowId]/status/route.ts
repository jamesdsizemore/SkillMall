import { NextRequest, NextResponse } from 'next/server'
import { getCodexAppServerAuthSession } from '@/lib/providers/codex-app-server-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ flowId: string }> | { flowId: string } }
) {
  const params = await context.params
  const session = getCodexAppServerAuthSession(params.flowId)
  if (!session) return NextResponse.json({ error: 'auth_flow_not_found' }, { status: 404 })
  return NextResponse.json({ session })
}
