import { describe, it, expect, beforeEach } from 'vitest'
import { createFeedback, getFeedbackCount, getRecentFeedback, shouldTriggerAnalysis } from '../self-improvement/feedback'
import { getDb } from '../db/client'

function cleanFeedback(slug: string) {
  const db = getDb()
  db.prepare('DELETE FROM skill_feedback WHERE skill_slug = ?').run(slug)
}

const TEST_SLUG = 'test-feedback-skill'
const TEST_USER = 'test-user-feedback'

describe('createFeedback', () => {
  beforeEach(() => cleanFeedback(TEST_SLUG))

  it('creates feedback with valid inputs', () => {
    const fb = createFeedback({
      skillSlug: TEST_SLUG,
      authorGithubLogin: TEST_USER,
      satisfaction: 4,
      body: 'Great skill!',
    })
    expect(fb.skill_slug).toBe(TEST_SLUG)
    expect(fb.satisfaction).toBe(4)
    expect(fb.body).toBe('Great skill!')
  })

  it('creates feedback without body', () => {
    const fb = createFeedback({
      skillSlug: TEST_SLUG,
      authorGithubLogin: TEST_USER,
      satisfaction: 5,
    })
    expect(fb.body).toBeNull()
  })

  it('throws when satisfaction is out of range', () => {
    expect(() =>
      createFeedback({ skillSlug: TEST_SLUG, authorGithubLogin: TEST_USER, satisfaction: 0 })
    ).toThrow('satisfaction must be between 1 and 5')

    expect(() =>
      createFeedback({ skillSlug: TEST_SLUG, authorGithubLogin: TEST_USER, satisfaction: 6 })
    ).toThrow('satisfaction must be between 1 and 5')
  })

  it('throws when body exceeds 200 chars', () => {
    expect(() =>
      createFeedback({
        skillSlug: TEST_SLUG,
        authorGithubLogin: TEST_USER,
        satisfaction: 3,
        body: 'x'.repeat(201),
      })
    ).toThrow('200 characters or fewer')
  })
})

describe('getFeedbackCount', () => {
  beforeEach(() => cleanFeedback(TEST_SLUG))

  it('returns 0 when no feedback exists', () => {
    expect(getFeedbackCount(TEST_SLUG)).toBe(0)
  })

  it('returns correct count after insertions', () => {
    createFeedback({ skillSlug: TEST_SLUG, authorGithubLogin: 'user1', satisfaction: 4 })
    createFeedback({ skillSlug: TEST_SLUG, authorGithubLogin: 'user2', satisfaction: 5 })
    expect(getFeedbackCount(TEST_SLUG)).toBe(2)
  })
})

describe('getRecentFeedback', () => {
  beforeEach(() => cleanFeedback(TEST_SLUG))

  it('returns empty array when no feedback', () => {
    expect(getRecentFeedback(TEST_SLUG)).toEqual([])
  })

  it('returns feedback in descending created_at order', () => {
    createFeedback({ skillSlug: TEST_SLUG, authorGithubLogin: 'user1', satisfaction: 3 })
    createFeedback({ skillSlug: TEST_SLUG, authorGithubLogin: 'user2', satisfaction: 5 })
    const results = getRecentFeedback(TEST_SLUG)
    expect(results.length).toBe(2)
    // Most recent first
    expect(results[0].author_github_login).toBe('user2')
  })
})

describe('shouldTriggerAnalysis', () => {
  beforeEach(() => cleanFeedback(TEST_SLUG))

  it('returns false when fewer than 10 submissions', () => {
    for (let i = 0; i < 9; i++) {
      createFeedback({ skillSlug: TEST_SLUG, authorGithubLogin: `user${i}`, satisfaction: 4 })
    }
    expect(shouldTriggerAnalysis(TEST_SLUG)).toBe(false)
  })

  it('returns true when 10 or more submissions', () => {
    for (let i = 0; i < 10; i++) {
      createFeedback({ skillSlug: TEST_SLUG, authorGithubLogin: `user${i}`, satisfaction: 4 })
    }
    expect(shouldTriggerAnalysis(TEST_SLUG)).toBe(true)
  })
})
