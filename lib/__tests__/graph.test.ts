import { describe, it, expect } from 'vitest'
import { computeGraph } from '../graph'
import type { Skill } from '../skills'

function makeSkill(slug: string, linked: string[] = []): Skill {
  return {
    slug,
    name: slug,
    category: 'development',
    description: `${slug} description`,
    content: '',
    path: `skills/development/${slug}/SKILL.md`,
    linked_skills: linked,
    tags: [],
    version: '1.0.0',
    author: 'test',
    license: '',
    compatibility: '',
    hasReadme: false,
    hasScripts: false,
    hasTemplates: false,
    hasSamples: false,
  }
}

describe('computeGraph', () => {
  it('returns empty nodes and edges for empty input', () => {
    const { nodes, edges } = computeGraph([])
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })

  it('returns nodes array from skill list', () => {
    const skills = [makeSkill('skill-a'), makeSkill('skill-b')]
    const { nodes } = computeGraph(skills)
    expect(nodes).toHaveLength(2)
    expect(nodes.map(n => n.id)).toContain('skill-a')
    expect(nodes.map(n => n.id)).toContain('skill-b')
  })

  it('creates edges for valid linked-skills references', () => {
    const skills = [makeSkill('skill-a', ['skill-b']), makeSkill('skill-b')]
    const { edges } = computeGraph(skills)
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('skill-a')
    expect(edges[0].target).toBe('skill-b')
  })

  it('ignores linked-skills that do not exist in catalog', () => {
    const skills = [makeSkill('skill-a', ['nonexistent-skill'])]
    const { edges } = computeGraph(skills)
    expect(edges).toHaveLength(0)
  })

  it('marks orphan skills with zero connections', () => {
    const skills = [makeSkill('skill-a'), makeSkill('skill-b')]
    const { nodes } = computeGraph(skills)
    for (const node of nodes) {
      expect(node.isOrphan).toBe(true)
      expect(node.connectionCount).toBe(0)
    }
  })

  it('marks hub skills with more than 3 connections', () => {
    const skills = [
      makeSkill('hub', ['a', 'b', 'c', 'd']),
      makeSkill('a', ['hub']),
      makeSkill('b', ['hub']),
      makeSkill('c', ['hub']),
      makeSkill('d', ['hub']),
    ]
    const { nodes } = computeGraph(skills)
    const hub = nodes.find(n => n.id === 'hub')!
    expect(hub.isHub).toBe(true)
    expect(hub.connectionCount).toBeGreaterThan(3)
  })

  it('does not mark skills with 3 or fewer connections as hubs', () => {
    const skills = [
      makeSkill('skill-a', ['skill-b', 'skill-c']),
      makeSkill('skill-b'),
      makeSkill('skill-c'),
    ]
    const { nodes } = computeGraph(skills)
    const nodeA = nodes.find(n => n.id === 'skill-a')!
    expect(nodeA.isHub).toBe(false)
    expect(nodeA.connectionCount).toBe(2)
  })

  it('correctly counts bidirectional connections', () => {
    const skills = [makeSkill('a', ['b']), makeSkill('b', ['a'])]
    const { nodes, edges } = computeGraph(skills)
    // Two edges: a->b and b->a
    expect(edges).toHaveLength(2)
    const nodeA = nodes.find(n => n.id === 'a')!
    const nodeB = nodes.find(n => n.id === 'b')!
    expect(nodeA.connectionCount).toBe(2) // outgoing + incoming
    expect(nodeB.connectionCount).toBe(2)
  })

  it('includes category on nodes', () => {
    const skill = makeSkill('my-skill')
    skill.category = 'ai'
    const { nodes } = computeGraph([skill])
    expect(nodes[0].category).toBe('ai')
  })
})
