import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/github'
import { createCheckoutSession } from '@/lib/marketplace/payments'
import { getSkill } from '@/lib/skills'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sm_session')?.value
  const session = token ? getSession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 503 }
    )
  }
}
