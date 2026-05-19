import { NextRequest, NextResponse } from 'next/server'
import {
  authenticationRequiredResponse,
  getSessionFromCookies,
  requireSkillAuthor,
} from '@/lib/auth/policy'
import { rejectSuggestion } from '@/lib/self-improvement/analyzer'
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

  const session = await getSessionFromCookies()
  if (!session) {
    return authenticationRequiredResponse()
  }

  const body = await req.json().catch(() => ({})) as { skillSlug?: string; skillCategory?: string }
  const { skillSlug, skillCategory } = body

  if (!skillSlug || !skillCategory) {
    return NextResponse.json({ error: 'skillSlug and skillCategory are required' }, { status: 400 })
  }

  const skill = getSkill(skillCategory, skillSlug)
  if (skill) {
    const authorError = requireSkillAuthor(session, skill, 'Only the skill author can reject suggestions')
    if (authorError) return authorError
  }

  rejectSuggestion(suggestionId)
  return NextResponse.json({ success: true })
}
