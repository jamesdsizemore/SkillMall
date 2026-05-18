import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/github'
import { getSuggestions, analyzeFeedback } from '@/lib/self-improvement/analyzer'
import { getSkill } from '@/lib/skills'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ skillSlug: string }> }
) {
  const { skillSlug } = await params
  const suggestions = getSuggestions(skillSlug)
  return NextResponse.json({ suggestions })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ skillSlug: string }> }
) {
  const { skillSlug } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('sm_session')?.value
  const session = token ? getSession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { category?: string }
  const category = body.category ?? 'ai'
  const skill = getSkill(category, skillSlug)

  if (!skill) {
    return NextResponse.json({ error: `Skill not found: ${category}/${skillSlug}` }, { status: 404 })
  }

  if (skill.author !== session.github_login) {
    return NextResponse.json({ error: 'Only the skill author can trigger analysis' }, { status: 403 })
  }

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
