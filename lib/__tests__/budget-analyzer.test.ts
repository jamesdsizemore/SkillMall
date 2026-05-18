import { describe, it, expect } from 'vitest'
import { analyzeDescription, analyzeSkill } from '../budget-analyzer'

describe('analyzeDescription', () => {
  it('returns visible: true when description fits within charsAvailable', () => {
    const result = analyzeDescription('Short description', 200)
    expect(result.visible).toBe(true)
    expect(result.truncatedText).toBe('')
    expect(result.rewriteSuggestions).toHaveLength(0)
  })

  it('returns visible: false when description exceeds charsAvailable', () => {
    const longDesc = 'Apply Blue Ocean Strategy to identify uncontested market space and make competition irrelevant through the Four Actions Framework'
    const result = analyzeDescription(longDesc, 50)
    expect(result.visible).toBe(false)
    expect(result.visibleText).toBe(longDesc.slice(0, 50))
    expect(result.truncatedText).toBe(longDesc.slice(50))
  })

  it('suggests shortening when description is too long', () => {
    const longDesc = 'Apply Blue Ocean Strategy to identify uncontested market space and make competition irrelevant through the Four Actions Framework'
    const result = analyzeDescription(longDesc, 50)
    expect(result.rewriteSuggestions.some(s => s.startsWith('Shorten by'))).toBe(true)
    expect(result.rewriteSuggestions[0]).toContain(`${longDesc.length - 50} characters`)
  })

  it('extracts trigger phrase from description start', () => {
    const desc = 'Apply Blue Ocean Strategy to identify market opportunities'
    const result = analyzeDescription(desc, 200)
    expect(result.triggerPhrase).toBeTruthy()
    expect(result.triggerPhrase).toContain('Apply Blue Ocean')
  })

  it('marks trigger preserved when trigger fits within visible text', () => {
    const desc = 'Apply Blue Ocean Strategy to identify uncontested market space'
    const result = analyzeDescription(desc, 200)
    expect(result.triggerPreserved).toBe(true)
  })

  it('marks trigger NOT preserved when description is truncated before trigger', () => {
    const desc = 'Apply Blue Ocean Strategy to identify uncontested market space and create new demand'
    // Truncate to just 5 chars — trigger is not in first 5 chars
    const result = analyzeDescription(desc, 5)
    expect(result.visible).toBe(false)
    expect(result.triggerPreserved).toBe(false)
    expect(result.rewriteSuggestions.some(s => s.includes('Move'))).toBe(true)
  })

  it('uses provided triggerPhrase override when supplied', () => {
    const desc = 'this description starts lowercase'
    const result = analyzeDescription(desc, 200, 'My custom trigger')
    expect(result.triggerPhrase).toBe('My custom trigger')
  })

  it('returns triggerPreserved: true when description has no extractable trigger', () => {
    const desc = 'a'
    const result = analyzeDescription(desc, 200)
    expect(result.triggerPhrase).toBeNull()
    expect(result.triggerPreserved).toBe(true)
  })

  it('returns correct descriptionLength', () => {
    const desc = 'Hello world'
    const result = analyzeDescription(desc, 200)
    expect(result.descriptionLength).toBe(desc.length)
  })

  it('returns correct charsAvailable', () => {
    const result = analyzeDescription('test', 150)
    expect(result.charsAvailable).toBe(150)
  })
})

describe('analyzeSkill', () => {
  it('sets slug on the result', () => {
    const result = analyzeSkill('ai/skill-creator', 'Create new AI agent skills', 200)
    expect(result.slug).toBe('ai/skill-creator')
  })

  it('budget analysis at 50 installed skills truncates long descriptions', () => {
    // Simulate a 50-installed-skills scenario with 200 char budget
    // This description is intentionally > 200 chars
    const longDesc =
      'Apply the Blue Ocean Strategy framework to identify uncontested market space and render competition irrelevant. ' +
      'Uses the Four Actions Framework (ERRC grid) and Strategy Canvas to create lasting differentiation beyond rivalry.'
    expect(longDesc.length).toBeGreaterThan(200)
    const result = analyzeSkill('business/blue-ocean', longDesc, 200)
    expect(result.visible).toBe(false)
    expect(result.descriptionLength).toBeGreaterThan(200)
  })

  it('trigger phrase "Apply Blue Ocean" preserved when description fits', () => {
    const desc = 'Apply Blue Ocean Strategy to find uncontested markets'
    const result = analyzeSkill('business/blue-ocean', desc, 200)
    expect(result.triggerPreserved).toBe(true)
  })

  it('trigger phrase not preserved when truncated before it appears', () => {
    const desc = 'Apply Blue Ocean Strategy to find uncontested markets with Four Actions Framework'
    const result = analyzeSkill('business/blue-ocean', desc, 10)
    expect(result.triggerPreserved).toBe(false)
  })
})
