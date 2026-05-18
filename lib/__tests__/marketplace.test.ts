import { describe, it, expect } from 'vitest'
import { checkMarketplaceReady } from '../marketplace/gate'

describe('checkMarketplaceReady', () => {
  it('returns ready: false with current counts when conditions are not met', () => {
    const result = checkMarketplaceReady()
    // In a test environment, all conditions will be false
    // (catalog < 200, community < 500, ratings < 3 months, skills with tests < 50)
    expect(result.ready).toBe(false)
    expect(result.conditions).toMatchObject({
      catalogRequired: 200,
      communityRequired: 500,
      ratingsMonthsRequired: 3,
      skillsWithTestsRequired: 50,
    })
  })

  it('returns condition counts as numbers', () => {
    const result = checkMarketplaceReady()
    expect(typeof result.conditions.catalogSize).toBe('number')
    expect(typeof result.conditions.communitySize).toBe('number')
    expect(typeof result.conditions.ratingsMonthsActive).toBe('number')
    expect(typeof result.conditions.skillsWithTests).toBe('number')
  })

  it('returns ready: true only when ALL 4 conditions pass (gate logic)', () => {
    const result = checkMarketplaceReady()
    const { conditions } = result

    // Verify the AND logic: ready must match all 4 conditions
    const expectedReady =
      conditions.catalogSize >= 200 &&
      conditions.communitySize >= 500 &&
      conditions.ratingsMonthsActive >= 3 &&
      conditions.skillsWithTests >= 50

    expect(result.ready).toBe(expectedReady)
  })

  it('skillsWithTests count matches actual tests/ directory', () => {
    const result = checkMarketplaceReady()
    // We have 24 skills with test suites from T257
    expect(result.conditions.skillsWithTests).toBeGreaterThanOrEqual(24)
  })
})
