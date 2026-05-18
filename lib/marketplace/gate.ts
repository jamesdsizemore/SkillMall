import { getDb } from '../db/client'
import { getReviewCount } from '../reviews'
import { getAllSkills } from '../skills'

export interface MarketplaceConditions {
  catalogSize: number
  catalogRequired: number
  communitySize: number
  communityRequired: number
  ratingsMonthsActive: number
  ratingsMonthsRequired: number
  skillsWithTests: number
  skillsWithTestsRequired: number
}

export interface MarketplaceReadiness {
  ready: boolean
  conditions: MarketplaceConditions
}

/**
 * Check whether marketplace launch conditions are met.
 * All four conditions must pass before marketplace UI activates.
 * This function enforces itself at runtime — there is no manual override.
 */
export function checkMarketplaceReady(): MarketplaceReadiness {
  const db = getDb()

  // Condition 1: catalog >= 200 skills
  const skills = getAllSkills()
  const catalogSize = skills.length

  // Condition 2: community >= 500 members (unique reviewers as proxy)
  const communityRow = db
    .prepare("SELECT COUNT(DISTINCT reviewer_github_id) as count FROM reviews")
    .get() as { count: number } | undefined
  const communitySize = communityRow?.count ?? 0

  // Condition 3: ratings >= 3 months active (first review >= 90 days ago)
  const firstReviewRow = db
    .prepare("SELECT MIN(created_at) as first FROM reviews")
    .get() as { first: string | null } | undefined
  const firstReview = firstReviewRow?.first
  const ratingsMonthsActive = firstReview
    ? Math.floor((Date.now() - new Date(firstReview).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0

  // Condition 4: >= 50 skills with test coverage (tests/<slug>/*.json files)
  const fs = require('node:fs')
  const path = require('node:path')
  const testsDir = path.join(process.cwd(), 'tests')
  let skillsWithTests = 0
  if (fs.existsSync(testsDir)) {
    for (const slug of fs.readdirSync(testsDir)) {
      const dir = path.join(testsDir, slug)
      if (
        fs.statSync(dir).isDirectory() &&
        fs.readdirSync(dir).some((f: string) => f.endsWith('.json'))
      ) {
        skillsWithTests++
      }
    }
  }

  const conditions: MarketplaceConditions = {
    catalogSize,
    catalogRequired: 200,
    communitySize,
    communityRequired: 500,
    ratingsMonthsActive,
    ratingsMonthsRequired: 3,
    skillsWithTests,
    skillsWithTestsRequired: 50,
  }

  const ready =
    catalogSize >= 200 &&
    communitySize >= 500 &&
    ratingsMonthsActive >= 3 &&
    skillsWithTests >= 50

  return { ready, conditions }
}
