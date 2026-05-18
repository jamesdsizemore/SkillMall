import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { getDb } from '../db/client'
import type { LLMClient } from '../providers'
import { getSkill } from '../skills'

const SYSTEM_PROMPT =
  'You are an expert at improving AI agent skills. Apply the suggested improvement to the skill content. Return the complete updated skill content including frontmatter. Preserve all existing fields. Change only what the suggestion specifies.'

export function bumpVersion(version: string, bump: 'patch' | 'minor' | 'major' = 'patch'): string {
  const parts = version.split('.').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return version

  const [major, minor, patch] = parts
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major + 1}.0.0`
}

interface ApplyOptions {
  suggestionId: number
  skillSlug: string
  skillCategory: string
  authorGithubLogin: string     // the person approving
  client: LLMClient
}

interface ApplyResult {
  success: boolean
  newVersion: string
  error?: string
}

export async function applySuggestion(options: ApplyOptions): Promise<ApplyResult> {
  const { suggestionId, skillSlug, skillCategory, authorGithubLogin, client } = options

  // CRITICAL: verify author identity before applying any changes
  const skill = getSkill(skillCategory, skillSlug)
  if (!skill) {
    return { success: false, newVersion: '', error: `Skill not found: ${skillCategory}/${skillSlug}` }
  }

  if (skill.author !== authorGithubLogin) {
    return {
      success: false,
      newVersion: '',
      error: `Forbidden: only ${skill.author} can apply suggestions to this skill`,
    }
  }

  // Load suggestion
  const db = getDb()
  const suggestion = db
    .prepare('SELECT * FROM improvement_suggestions WHERE id = ?')
    .get(suggestionId) as { id: number; suggestion_body: string; status: string } | undefined

  if (!suggestion) {
    return { success: false, newVersion: '', error: 'Suggestion not found' }
  }

  if (suggestion.status !== 'pending') {
    return { success: false, newVersion: '', error: 'Suggestion is not pending' }
  }

  // Read current SKILL.md
  const skillMdPath = path.join(process.cwd(), 'skills', skillCategory, skillSlug, 'SKILL.md')
  const currentContent = fs.readFileSync(skillMdPath, 'utf-8')
  const { data: fm } = matter(currentContent)

  // Bump version
  const currentVersion = String(fm.metadata?.version ?? fm.version ?? '1.0.0')
  const newVersion = bumpVersion(currentVersion)

  // Generate improved content via LLM
  const prompt = `Apply this improvement to the skill:

Improvement suggestion:
${suggestion.suggestion_body}

Current skill content:
<skill>
${currentContent.slice(0, 4000)}
</skill>

Return the complete improved skill content with updated frontmatter. Set version to "${newVersion}" in the metadata block.`

  const improvedContent = await client.complete(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 3000,
  })

  // Write to disk
  fs.writeFileSync(skillMdPath, improvedContent, 'utf-8')

  // Mark suggestion as approved and applied
  db.prepare(
    `UPDATE improvement_suggestions
     SET status = 'approved', reviewed_at = datetime('now'), applied_at = datetime('now')
     WHERE id = ?`
  ).run(suggestionId)

  return { success: true, newVersion }
}
