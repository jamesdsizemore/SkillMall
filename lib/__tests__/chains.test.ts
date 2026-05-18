import { describe, it, expect } from 'vitest'
import { buildChainDirectory, buildChainSkillDirectory, validateChain, type Chain } from '../chains'
import type { SkillMetadata } from '../skill-builder'

const CHAIN_2_STEPS: Chain = {
  name: 'Test Analysis',
  slug: 'test-analysis',
  steps: [
    { order: 1, skillSlug: 'ai/skill-creator', passesAs: 'context_append' },
    { order: 2, skillSlug: 'business/wrong-slug', passesAs: 'context_append', usesOutput: 'ai/skill-creator' },
  ],
}

const META: SkillMetadata = {
  slug: 'test-analysis',
  title: 'Test Analysis',
  author: 'test-user',
  category: 'chains',
  tags: ['test', 'chain'],
  targetAgents: ['claude-code'],
}

describe('buildChainDirectory', () => {
  it('produces SKILL.md, chain.json, and README.md', () => {
    const files = buildChainDirectory(CHAIN_2_STEPS, META)
    const paths = files.map(f => f.path)
    expect(paths).toContain('SKILL.md')
    expect(paths).toContain('chain.json')
    expect(paths).toContain('README.md')
  })

  it('SKILL.md frontmatter contains chain: true', () => {
    const files = buildChainDirectory(CHAIN_2_STEPS, META)
    const skillMd = files.find(f => f.path === 'SKILL.md')!
    expect(skillMd.content).toContain('chain: true')
  })

  it('SKILL.md contains the correct number of steps', () => {
    const files = buildChainDirectory(CHAIN_2_STEPS, META)
    const skillMd = files.find(f => f.path === 'SKILL.md')!
    expect(skillMd.content).toContain('1. ai/skill-creator')
    expect(skillMd.content).toContain('2. business/wrong-slug')
  })

  it('SKILL.md name field matches chain slug', () => {
    const files = buildChainDirectory(CHAIN_2_STEPS, META)
    const skillMd = files.find(f => f.path === 'SKILL.md')!
    expect(skillMd.content).toContain('name: test-analysis')
  })

  it('chain.json is valid JSON containing chain data', () => {
    const files = buildChainDirectory(CHAIN_2_STEPS, META)
    const chainJson = files.find(f => f.path === 'chain.json')!
    const parsed = JSON.parse(chainJson.content)
    expect(parsed.slug).toBe('test-analysis')
    expect(parsed.steps).toHaveLength(2)
  })

  it('steps are sorted by order in output', () => {
    const reversed: Chain = {
      name: 'Reversed',
      slug: 'reversed',
      steps: [
        { order: 2, skillSlug: 'skill-b', passesAs: 'context_append' },
        { order: 1, skillSlug: 'skill-a', passesAs: 'context_append' },
      ],
    }
    const files = buildChainDirectory(reversed, META)
    const skillMd = files.find(f => f.path === 'SKILL.md')!
    const aIdx = skillMd.content.indexOf('skill-a')
    const bIdx = skillMd.content.indexOf('skill-b')
    expect(aIdx).toBeLessThan(bIdx)
  })
})

describe('buildChainSkillDirectory', () => {
  it('returns directory with category chains and correct slug', () => {
    const dir = buildChainSkillDirectory(CHAIN_2_STEPS, META)
    expect(dir.category).toBe('chains')
    expect(dir.slug).toBe('test-analysis')
    expect(dir.files.length).toBeGreaterThanOrEqual(3)
  })
})

describe('validateChain', () => {
  it('returns valid: true for a well-formed chain SKILL.md', () => {
    const dir = buildChainSkillDirectory(CHAIN_2_STEPS, META)
    const result = validateChain(dir)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
