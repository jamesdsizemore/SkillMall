import { NextRequest, NextResponse } from 'next/server'
import { authenticationRequiredResponse, getSessionFromCookies } from '@/lib/auth/policy'
import { createFeedback, shouldTriggerAnalysis } from '@/lib/self-improvement/feedback'

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) {
    return authenticationRequiredResponse()
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
