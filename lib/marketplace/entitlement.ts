import { getDb } from '../db/client'
import { getSkillTier } from './gate'

export type Entitlement = 'free' | 'purchased' | 'none'

export function getEntitlement(skillSlug: string, githubLogin: string | null): Entitlement {
  const tier = getSkillTier(skillSlug)

  if (tier.tier === 'free') return 'free'
  if (!githubLogin) return 'none'

  const db = getDb()
  const purchase = db
    .prepare('SELECT id FROM purchases WHERE skill_slug = ? AND buyer_github_login = ?')
    .get(skillSlug, githubLogin)

  return purchase ? 'purchased' : 'none'
}

export function hasPurchased(skillSlug: string, githubLogin: string): boolean {
  const db = getDb()
  return !!db
    .prepare('SELECT id FROM purchases WHERE skill_slug = ? AND buyer_github_login = ?')
    .get(skillSlug, githubLogin)
}
