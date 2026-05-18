import fs from 'node:fs'
import path from 'node:path'
import * as p from '@clack/prompts'
import { requireRepoRoot, pc } from '../utils.js'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers/index.js'

// Dynamic import to prevent better-sqlite3 (CJS) from loading at CLI startup,
// which crashes all commands regardless of which one is being run.
async function getRagModules() {
  const { createKnowledgeBase, attachKnowledge } = await import('@/lib/rag/knowledge-base.js')
  return { createKnowledgeBase, attachKnowledge }
}

export async function attachKnowledgeCommand(args: string[]): Promise<void> {
  const [skillArg, sourceDir] = args.filter(a => !a.startsWith('--'))

  if (!skillArg || !sourceDir) {
    process.stderr.write(
      pc.red('Usage: skill-mall attach-knowledge <category/slug> <source-dir>\n') +
      pc.dim('  Example: skill-mall attach-knowledge ai/skill-creator ./docs/\n')
    )
    process.exit(1)
  }

  const resolvedDir = path.resolve(sourceDir)
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    process.stderr.write(pc.red(`Source directory not found: ${sourceDir}\n`))
    process.exit(1)
  }

  // Validate category/slug format
  const parts = skillArg.split('/')
  if (parts.length > 2) {
    process.stderr.write(pc.red(`Invalid skill path: "${skillArg}". Expected <category>/<slug> or <slug>.\n`))
    process.exit(1)
  }
  const slug = parts.length === 2 ? parts[1] : parts[0]

  let config
  try {
    config = resolveProviderConfig()
  } catch {
    process.stderr.write(
      pc.red('No LLM provider configured.\n') +
      pc.dim('  Run: npx skill-mall configure\n')
    )
    process.exit(1)
  }

  if (config.provider === 'claude-code') {
    process.stderr.write(
      pc.red("Provider 'claude-code' does not support embeddings.\n") +
      pc.dim('  Set SKILL_MALL_EMBEDDING_PROVIDER=openai or SKILL_MALL_EMBEDDING_PROVIDER=ollama\n')
    )
    process.exit(1)
  }

  const client = createLLMClient(config)

  console.log()
  p.intro(pc.bold('  skill-mall attach-knowledge'))
  console.log(`  ${pc.dim('Skill:')} ${slug}`)
  console.log(`  ${pc.dim('Source:')} ${resolvedDir}`)
  console.log(`  ${pc.dim('Provider:')} ${config.provider} / ${config.model}`)
  console.log()

  const spinner = p.spinner()
  spinner.start('Chunking files and generating embeddings...')

  try {
    const { createKnowledgeBase, attachKnowledge } = await getRagModules()
    const kbId = createKnowledgeBase(slug, resolvedDir, config.provider)
    const { chunksAdded } = await attachKnowledge(kbId, resolvedDir, client)
    spinner.stop(`Done — ${chunksAdded} chunk${chunksAdded !== 1 ? 's' : ''} embedded`)
    console.log()
    console.log(pc.green('  Knowledge base attached.'))
    console.log(pc.dim('  Retrieve chunks via POST /api/retrieve'))
    console.log()
  } catch (err) {
    spinner.stop('Failed')
    process.stderr.write(pc.red(`Error: ${err instanceof Error ? err.message : String(err)}\n`))
    process.exit(1)
  }
}
