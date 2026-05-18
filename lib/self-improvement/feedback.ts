import { getDb } from '../db/client'
import type { SkillFeedback } from '../db/types'

const MAX_BODY_LENGTH = 200
const ANALYSIS_TRIGGER_COUNT = 10

export function createFeedback(params: {
  skillSlug: string
  authorGithubLogin: string
  satisfaction: number
  body?: string
}): SkillFeedback {
  if (params.satisfaction < 1 || params.satisfaction > 5) {
    throw new Error('satisfaction must be between 1 and 5')
  }
  if (params.body && params.body.length > MAX_BODY_LENGTH) {
    throw new Error(`body must be ${MAX_BODY_LENGTH} characters or fewer`)
  }

  const db = getDb()
  db.prepare(
    'INSERT INTO skill_feedback (skill_slug, author_github_login, satisfaction, body) VALUES (?, ?, ?, ?)'
  ).run(params.skillSlug, params.authorGithubLogin, params.satisfaction, params.body ?? null)

  return db
    .prepare(
      'SELECT * FROM skill_feedback WHERE skill_slug = ? AND author_github_login = ? ORDER BY created_at DESC LIMIT 1'
    )
    .get(params.skillSlug, params.authorGithubLogin) as SkillFeedback
}

export function getFeedbackCount(skillSlug: string): number {
  const db = getDb()
  const row = db
    .prepare('SELECT COUNT(*) as count FROM skill_feedback WHERE skill_slug = ?')
    .get(skillSlug) as { count: number } | undefined
  return row?.count ?? 0
}

export function getRecentFeedback(skillSlug: string, limit = 50): SkillFeedback[] {
  const db = getDb()
  return db
    .prepare(
      'SELECT * FROM skill_feedback WHERE skill_slug = ? ORDER BY id DESC LIMIT ?'
    )
    .all(skillSlug, limit) as SkillFeedback[]
}

export function shouldTriggerAnalysis(skillSlug: string): boolean {
  return getFeedbackCount(skillSlug) >= ANALYSIS_TRIGGER_COUNT
}
