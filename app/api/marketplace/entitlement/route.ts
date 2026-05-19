import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/policy'
import { getEntitlement } from '@/lib/marketplace/entitlement'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const skillSlug = searchParams.get('skillSlug')

  if (!skillSlug) {
    return NextResponse.json({ error: 'skillSlug is required' }, { status: 400 })
  }

  const session = await getSessionFromCookies()

  const entitlement = getEntitlement(skillSlug, session?.github_login ?? null)
  return NextResponse.json({ entitlement, skillSlug })
}
