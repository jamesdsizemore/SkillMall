import { getDb } from '../db/client'
import type { ImprovementSuggestion } from '../db/types'
import type { LLMClient } from '../providers'
import { getRecentFeedback, getFeedbackCount } from './feedback'

const SYSTEM_PROMPT =
  'You are a skill quality analyst. Based on user feedback, you generate a specific, actionable improvement suggestion for an AI agent skill. You focus on making the skill more useful, precise, and trigger-accurate. Return only the suggestion text — no preamble, no meta-commentary.'

export async function analyzeFeedback(
  skillSlug: string,
  skillContent: string,
  client: LLMClient
): Promise<ImprovementSuggestion> {
  const feedback = getRecentFeedback(skillSlug, 50)
  const count = getFeedbackCount(skillSlug)

  const avgSatisfaction =
    feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + f.satisfaction, 0) / feedback.length).toFixed(1)
      : 'N/A'

  const feedbackSummary = feedback
    .filter(f => f.body)
    .slice(0, 10)
    .map((f, i) => `${i + 1}. [${f.satisfaction}/5] "${f.body}"`)
    .join('\n')

  const prompt = `Analyze this skill and the user feedback to suggest one specific improvement.

Skill content:
<skill>
${skillContent.slice(0, 3000)}
</skill>

User feedback (${count} total submissions, average ${avgSatisfaction}/5):
${feedbackSummary || '(no written feedback — satisfaction scores only)'}

Suggest ONE specific, actionable improvement to this skill. Be concrete: what exact text should change and why. Maximum 500 characters.`

  const suggestionBody = await client.complete(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.4,
    maxTokens: 300,
  })

  const db = getDb()
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO improvement_suggestions (skill_slug, suggestion_body, generated_from_feedback_count)
     VALUES (?, ?, ?)`
  ).run(skillSlug, suggestionBody.trim(), count)

  return db
    .prepare('SELECT * FROM improvement_suggestions WHERE id = ?')
    .get(lastInsertRowid) as ImprovementSuggestion
}

export function getPendingSuggestions(skillSlug: string): ImprovementSuggestion[] {
  const db = getDb()
  return db
    .prepare(
      "SELECT * FROM improvement_suggestions WHERE skill_slug = ? AND status = 'pending' ORDER BY id DESC"
    )
    .all(skillSlug) as ImprovementSuggestion[]
}

export function getSuggestions(skillSlug: string): ImprovementSuggestion[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM improvement_suggestions WHERE skill_slug = ? ORDER BY id DESC')
    .all(skillSlug) as ImprovementSuggestion[]
}

export function rejectSuggestion(id: number): void {
  const db = getDb()
  db.prepare(
    "UPDATE improvement_suggestions SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?"
  ).run(id)
}
