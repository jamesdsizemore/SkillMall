import type { Skill } from './skills'

export interface GraphNode {
  id: string
  label: string
  category: string
  description: string
  connectionCount: number
  isHub: boolean
  isOrphan: boolean
  clusterId: number | null   // null = no cluster
}

export interface GraphEdge {
  id: string
  source: string
  target: string
}

export interface SkillGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  clusterCount: number
}

const HUB_THRESHOLD = 4
const CLUSTER_MIN_SIZE = 5

export function computeGraph(skills: Skill[]): SkillGraph {
  const slugSet = new Set(skills.map(s => s.slug))
  const connectionCounts = new Map<string, number>()
  const adjacency = new Map<string, Set<string>>()

  const edges: GraphEdge[] = []
  for (const skill of skills) {
    for (const linked of skill.linked_skills) {
      if (slugSet.has(linked)) {
        edges.push({ id: `${skill.slug}-${linked}`, source: skill.slug, target: linked })
        connectionCounts.set(skill.slug, (connectionCounts.get(skill.slug) ?? 0) + 1)
        connectionCounts.set(linked, (connectionCounts.get(linked) ?? 0) + 1)
        if (!adjacency.has(skill.slug)) adjacency.set(skill.slug, new Set())
        if (!adjacency.has(linked)) adjacency.set(linked, new Set())
        adjacency.get(skill.slug)!.add(linked)
        adjacency.get(linked)!.add(skill.slug)
      }
    }
  }

  // Cluster detection: connected components of 5+ nodes with high internal connectivity.
  // A cluster is a connected component where internal edges > external edges for the group.
  const clusterMap = new Map<string, number>()
  let clusterCount = 0
  const visited = new Set<string>()

  for (const skill of skills) {
    if (visited.has(skill.slug)) continue
    const neighbors = adjacency.get(skill.slug)
    if (!neighbors || neighbors.size === 0) { visited.add(skill.slug); continue }

    // BFS to find connected component
    const component: string[] = []
    const queue = [skill.slug]
    while (queue.length > 0) {
      const curr = queue.shift()!
      if (visited.has(curr)) continue
      visited.add(curr)
      component.push(curr)
      for (const nb of adjacency.get(curr) ?? []) {
        if (!visited.has(nb)) queue.push(nb)
      }
    }

    if (component.length >= CLUSTER_MIN_SIZE) {
      const componentSet = new Set(component)
      let internalEdges = 0
      let externalEdges = 0
      for (const node of component) {
        for (const nb of adjacency.get(node) ?? []) {
          if (componentSet.has(nb)) internalEdges++
          else externalEdges++
        }
      }
      // internalEdges counted twice (undirected)
      internalEdges = Math.floor(internalEdges / 2)
      if (internalEdges > externalEdges) {
        clusterCount++
        for (const node of component) clusterMap.set(node, clusterCount)
      }
    }
  }

  const nodes: GraphNode[] = skills.map(s => {
    const count = connectionCounts.get(s.slug) ?? 0
    return {
      id: s.slug,
      label: s.name,
      category: s.category,
      description: s.description,
      connectionCount: count,
      isHub: count >= HUB_THRESHOLD,
      isOrphan: count === 0,
      clusterId: clusterMap.get(s.slug) ?? null,
    }
  })

  return { nodes, edges, clusterCount }
}
