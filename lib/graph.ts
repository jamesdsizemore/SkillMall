import type { Skill } from './skills'

export interface GraphNode {
  id: string
  label: string
  category: string
  connectionCount: number
  isHub: boolean
  isOrphan: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
}

export interface SkillGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function computeGraph(skills: Skill[]): SkillGraph {
  const slugSet = new Set(skills.map(s => s.slug))
  const connectionCounts = new Map<string, number>()

  const edges: GraphEdge[] = []
  for (const skill of skills) {
    for (const linked of skill.linked_skills) {
      if (slugSet.has(linked)) {
        edges.push({
          id: `${skill.slug}-${linked}`,
          source: skill.slug,
          target: linked,
        })
        connectionCounts.set(skill.slug, (connectionCounts.get(skill.slug) ?? 0) + 1)
        connectionCounts.set(linked, (connectionCounts.get(linked) ?? 0) + 1)
      }
    }
  }

  const nodes: GraphNode[] = skills.map(s => {
    const count = connectionCounts.get(s.slug) ?? 0
    return {
      id: s.slug,
      label: s.name,
      category: s.category,
      connectionCount: count,
      isHub: count > 3,
      isOrphan: count === 0,
    }
  })

  return { nodes, edges }
}
