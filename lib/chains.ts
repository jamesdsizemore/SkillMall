import fs from 'node:fs'
import path from 'node:path'
import type { InMemoryFile, InMemorySkillDirectory, SkillMetadata } from './skill-builder'
import { validateSkillDirectory } from './pipeline'

export interface ChainStep {
  order: number
  skillSlug: string           // category/slug format
  usesOutput?: string         // slug of prior step whose output to use
  passesAs: 'context_append' | 'context_replace' | 'named_variable'
  namedVariable?: string
  instructions?: string
}

export interface Chain {
  name: string
  slug: string
  steps: ChainStep[]
}

export function buildChainDirectory(
  chain: Chain,
  meta: SkillMetadata
): InMemoryFile[] {
  const sortedSteps = [...chain.steps].sort((a, b) => a.order - b.order)

  const stepDescriptions = sortedSteps
    .map((s, i) => `${i + 1}. ${s.skillSlug}${s.usesOutput ? ` (uses: ${s.usesOutput})` : ''}`)
    .join('\n')

  const chainStepsYaml = sortedSteps
    .map(s => {
      let entry = `    - skill: ${s.skillSlug}\n      passes_as: ${s.passesAs}\n`
      if (s.usesOutput) entry += `      uses_output: ${s.usesOutput}\n`
      if (s.instructions) entry += `      instructions: "${s.instructions}"\n`
      if (s.namedVariable) entry += `      named_variable: ${s.namedVariable}\n`
      return entry
    })
    .join('')

  const frontmatter = `---
name: ${chain.slug}
description: "Run a coordinated ${chain.name} analysis using ${chain.steps.length} skills in sequence."
license: MIT
metadata:
  version: "1.0.0"
  author: "${meta.author ?? ''}"
  category: ${meta.category}
  tags: "${meta.tags.join(', ')}"
  chain: true
  chain_steps:
${chainStepsYaml}---`

  return [
    {
      path: 'SKILL.md',
      content: `${frontmatter}\n\n# ${chain.name}\n\n${stepDescriptions}`,
    },
    {
      path: 'chain.json',
      content: JSON.stringify(chain, null, 2),
    },
    {
      path: 'README.md',
      content: `# ${chain.name} Chain\n\nA coordinated workflow using ${chain.steps.length} skills.\n\n## Steps\n\n${stepDescriptions}`,
    },
  ]
}

export function buildChainSkillDirectory(
  chain: Chain,
  meta: SkillMetadata
): InMemorySkillDirectory {
  return {
    slug: chain.slug,
    category: 'chains',
    files: buildChainDirectory(chain, meta),
  }
}

export function validateChain(dir: InMemorySkillDirectory) {
  return validateSkillDirectory(dir)
}

export function listChains(): Array<{ slug: string; name: string; steps: number }> {
  const chainsDir = path.join(process.cwd(), 'skills', 'chains')
  if (!fs.existsSync(chainsDir)) return []

  const chains: Array<{ slug: string; name: string; steps: number }> = []
  for (const slug of fs.readdirSync(chainsDir)) {
    const chainJson = path.join(chainsDir, slug, 'chain.json')
    if (!fs.existsSync(chainJson)) continue
    try {
      const chain = JSON.parse(fs.readFileSync(chainJson, 'utf-8')) as Chain
      chains.push({ slug, name: chain.name, steps: chain.steps.length })
    } catch {
      // Skip malformed chain.json
    }
  }
  return chains
}

export function getChain(slug: string): Chain | null {
  const chainJson = path.join(process.cwd(), 'skills', 'chains', slug, 'chain.json')
  if (!fs.existsSync(chainJson)) return null
  try {
    return JSON.parse(fs.readFileSync(chainJson, 'utf-8')) as Chain
  } catch {
    return null
  }
}
