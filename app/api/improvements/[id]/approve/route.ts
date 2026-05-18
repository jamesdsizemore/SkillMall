import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/github'
import { applySuggestion } from '@/lib/self-improvement/applier'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers'

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

  let config
  try {
    config = resolveProviderConfig()
  } catch {
    return NextResponse.json({ error: 'No LLM provider configured on server' }, { status: 503 })
  }

  const client = createLLMClient(config)

  const result = await applySuggestion({
    suggestionId,
    skillSlug,
    skillCategory,
    authorGithubLogin: session.github_login,
    client,
  })

  if (!result.success) {
    const status = result.error?.includes('Forbidden') ? 403 : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ success: true, newVersion: result.newVersion })
}
