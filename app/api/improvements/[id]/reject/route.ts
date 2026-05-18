import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/github'
import { rejectSuggestion, getSuggestions } from '@/lib/self-improvement/analyzer'
import { getSkill } from '@/lib/skills'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const suggestionId = parseInt(id, 10)
  if (isNaN(suggestionId)) {
    return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('sm_session')?.value
  const session = token ? getSession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { skillSlug?: string; skillCategory?: string }
  const { skillSlug, skillCategory } = body

  if (!skillSlug || !skillCategory) {
    return NextResponse.json({ error: 'skillSlug and skillCategory are required' }, { status: 400 })
  }

  const skill = getSkill(skillCategory, skillSlug)
  if (skill && skill.author !== session.github_login) {
    return NextResponse.json({ error: 'Only the skill author can reject suggestions' }, { status: 403 })
  }

  rejectSuggestion(suggestionId)
  return NextResponse.json({ success: true })
}
