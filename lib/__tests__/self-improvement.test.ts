import { describe, it, expect, vi } from 'vitest'
import { bumpVersion, applySuggestion } from '../self-improvement/applier'

describe('bumpVersion', () => {
  it("returns '1.2.4' for bumpVersion('1.2.3', 'patch')", () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
  })

  it("returns '1.3.0' for bumpVersion('1.2.3', 'minor')", () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
  })

  it("returns '2.0.0' for bumpVersion('1.2.3', 'major')", () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
  })

  it('defaults to patch bump', () => {
    expect(bumpVersion('2.0.0')).toBe('2.0.1')
  })

  it('returns original on invalid version', () => {
    expect(bumpVersion('not-a-version')).toBe('not-a-version')
  })
})

describe('applySuggestion — author verification', () => {
  it('returns 403-style error when non-author attempts to apply', async () => {
    const result = await applySuggestion({
      suggestionId: 99999,
      skillSlug: 'skill-creator',
      skillCategory: 'ai',
      authorGithubLogin: 'not-the-author',
      client: { complete: vi.fn(), provider: 'openai' as const },
    })
    // Should fail with forbidden error — not-the-author does not match skill.author
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/only .* can apply suggestions|not found|Forbidden/i)
  })
})

describe('applySuggestion — no automatic writes', () => {
  it('returns error without calling LLM when skill not found', async () => {
    const mockClient = { complete: vi.fn(), provider: 'openai' as const, model: 'gpt-4' }

    const result = await applySuggestion({
      suggestionId: 1,
      skillSlug: 'absolutely-nonexistent-skill-xyz',
      skillCategory: 'ai',
      authorGithubLogin: 'anyone',
      client: mockClient,
    })

    // Skill not found — must fail before any LLM call
    expect(result.success).toBe(false)
    expect(mockClient.complete).not.toHaveBeenCalled()
  })

  it('fails immediately when author does not match — no LLM call', async () => {
    const mockClient = { complete: vi.fn(), provider: 'openai' as const, model: 'gpt-4' }

    // skill-creator author is 'jamesdsizemore' — use a different login
    const result = await applySuggestion({
      suggestionId: 1,
      skillSlug: 'skill-creator',
      skillCategory: 'ai',
      authorGithubLogin: 'definitely-not-the-author',
      client: mockClient,
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Forbidden|only .* can apply/i)
    expect(mockClient.complete).not.toHaveBeenCalled()
  })
})
