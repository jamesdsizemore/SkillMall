import { NextRequest, NextResponse } from 'next/server'
import {
  authenticationRequiredResponse,
  getSessionFromCookies,
  requireSkillAuthor,
} from '@/lib/auth/policy'
import { getSuggestions, analyzeFeedback } from '@/lib/self-improvement/analyzer'
import { getSkill } from '@/lib/skills'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers'

// In this route, [id] is a skill slug (e.g. "my-skill").
// The [id] segment name is shared with the approve/reject sibling routes
// which use a numeric suggestion ID — Next.js requires a single segment name per level.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: skillSlug } = await params
  const suggestions = getSuggestions(skillSlug)
  return NextResponse.json({ suggestions })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: skillSlug } = await params

  const session = await getSessionFromCookies()
  if (!session) {
    return authenticationRequiredResponse()
  }

  const body = await req.json().catch(() => ({})) as { category?: string }
  const { category } = body
  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }
  const skill = getSkill(category, skillSlug)

  if (!skill) {
    return NextResponse.json({ error: `Skill not found: ${category}/${skillSlug}` }, { status: 404 })
  }

  const authorError = requireSkillAuthor(session, skill, 'Only the skill author can trigger analysis')
  if (authorError) return authorError

  let config
  try {
    config = resolveProviderConfig()
  } catch {
    return NextResponse.json({ error: 'No LLM provider configured on server' }, { status: 503 })
  }

  const client = createLLMClient(config)
  const suggestion = await analyzeFeedback(skillSlug, skill.content, client)

  return NextResponse.json({ suggestion }, { status: 201 })
}
