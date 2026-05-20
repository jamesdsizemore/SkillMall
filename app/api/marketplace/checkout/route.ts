import { NextRequest, NextResponse } from 'next/server'
import { authenticationRequiredResponse, getSessionFromCookies } from '@/lib/auth/policy'
import { createCheckoutSession } from '@/lib/marketplace/payments'
import { getSkill } from '@/lib/skills'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) {
    return authenticationRequiredResponse()
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { skillSlug, skillCategory } = body as { skillSlug?: string; skillCategory?: string }

  if (!skillSlug || !skillCategory) {
    return NextResponse.json({ error: 'skillSlug and skillCategory are required' }, { status: 400 })
  }

  const skill = getSkill(skillCategory, skillSlug)
  if (!skill) {
    return NextResponse.json({ error: `Skill not found: ${skillCategory}/${skillSlug}` }, { status: 404 })
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  try {
    const result = await createCheckoutSession(
      skillSlug,
      skill.name,
      session.github_login,
      `${origin}/skills/${skillCategory}/${skillSlug}?purchased=true`,
      `${origin}/skills/${skillCategory}/${skillSlug}`
    )
    return NextResponse.json({ checkoutUrl: result.checkoutUrl })
  } catch (err) {
    console.error('[checkout] createCheckoutSession failed:', err)
    return NextResponse.json({ error: 'Checkout unavailable' }, { status: 503 })
  }
}
