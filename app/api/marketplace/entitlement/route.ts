import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/github'
import { getEntitlement } from '@/lib/marketplace/entitlement'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const skillSlug = searchParams.get('skillSlug')

  if (!skillSlug) {
    return NextResponse.json({ error: 'skillSlug is required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('sm_session')?.value
  const session = token ? getSession(token) : null

  const entitlement = getEntitlement(skillSlug, session?.github_login ?? null)
  return NextResponse.json({ entitlement, skillSlug })
}
