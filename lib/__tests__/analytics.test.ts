import { describe, it, expect } from 'vitest'
import { getEffectivenessTrend } from '../analytics'

describe('getEffectivenessTrend', () => {
  it('returns exactly 30 data points', () => {
    const trend = getEffectivenessTrend('test-skill')
    expect(trend).toHaveLength(30)
  })

  it('each point has a date string and averageScore', () => {
    const trend = getEffectivenessTrend('test-skill')
    for (const point of trend) {
      expect(typeof point.date).toBe('string')
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(point.averageScore === null || typeof point.averageScore === 'number').toBe(true)
    }
  })

  it('dates are in chronological order (oldest first)', () => {
    const trend = getEffectivenessTrend('test-skill')
    for (let i = 1; i < trend.length; i++) {
      expect(trend[i].date >= trend[i - 1].date).toBe(true)
    }
  })

  it('last point is today', () => {
    const trend = getEffectivenessTrend('test-skill')
    const today = new Date().toISOString().slice(0, 10)
    expect(trend[trend.length - 1].date).toBe(today)
  })

  it('first point is 29 days ago', () => {
    const trend = getEffectivenessTrend('test-skill')
    const expected = new Date()
    expected.setDate(expected.getDate() - 29)
    const expectedStr = expected.toISOString().slice(0, 10)
    expect(trend[0].date).toBe(expectedStr)
  })

  it('returns null averageScore for days with no reviews (real empty DB)', () => {
    const trend = getEffectivenessTrend('nonexistent-skill-slug-xyz')
    // All points should be null since this slug has no reviews
    for (const point of trend) {
      expect(point.averageScore).toBeNull()
    }
  })
})
