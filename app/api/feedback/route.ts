import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/github'
import { createFeedback, getFeedbackCount, shouldTriggerAnalysis } from '@/lib/self-improvement/feedback'

export async function POST(req: NextRequest) {
  // Auth required
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

  const { skillSlug, satisfaction, body: feedbackBody } = body as {
    skillSlug?: string
    satisfaction?: number
    body?: string
  }

  if (!skillSlug || typeof skillSlug !== 'string') {
    return NextResponse.json({ error: 'skillSlug is required' }, { status: 400 })
  }

  if (!satisfaction || satisfaction < 1 || satisfaction > 5) {
    return NextResponse.json({ error: 'satisfaction must be 1-5' }, { status: 400 })
  }

  if (feedbackBody && feedbackBody.length > 200) {
    return NextResponse.json({ error: 'body must be 200 characters or fewer' }, { status: 400 })
  }

  try {
    const feedback = createFeedback({
      skillSlug,
      authorGithubLogin: session.github_login,
      satisfaction,
      body: feedbackBody,
    })

    const analysisTriggered = shouldTriggerAnalysis(skillSlug)

    return NextResponse.json({ feedback, analysisTriggered }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create feedback' },
      { status: 500 }
    )
  }
}
