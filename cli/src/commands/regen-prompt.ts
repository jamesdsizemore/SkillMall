import path from 'node:path'
import { requireRepoRoot, pc } from '../utils.js'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers/index.js'
import {
  parsePromptFile,
  PromptRegenerationError,
  regeneratePromptFile,
  resolveSkillPromptFilePath,
  resolveSkillPromptTarget,
} from '@/lib/prompt-regenerator.js'

export async function regenPromptCommand(args: string[]): Promise<void> {
  let skillTarget = ''
  let promptFile = ''
  let framework = ''

  let i = 0
  while (i < args.length) {
    if (args[i] === '--framework' && args[i + 1]) {
      framework = args[++i]
      i++
    } else if (!args[i].startsWith('--')) {
      if (!skillTarget) skillTarget = args[i]
      else if (!promptFile) promptFile = args[i]
      i++
    } else {
      i++
    }
  }

  if (!skillTarget || !promptFile || !framework) {
    process.stderr.write(
      pc.red('Usage: skill-mall regen-prompt <category/slug> <prompt-file> --framework "<name>"\n')
    )
    process.exit(1)
  }

  const repoRoot = requireRepoRoot()

  const target = resolveSkillPromptTarget(skillTarget, { repoRoot })
  if (!target) {
    process.stderr.write(pc.red(`Skill not found: ${skillTarget}\n`))
    process.exit(1)
  }

  let promptPath: string
  try {
    promptPath = resolveSkillPromptFilePath(target, promptFile)
  } catch {
    process.stderr.write(pc.red('Prompt file must be within the skill prompt directory.\n'))
    process.exit(1)
  }

  let config
  try {
    config = resolveProviderConfig()
  } catch {
    process.stderr.write(pc.red('No LLM provider configured.\n  Run: npx skill-mall configure\n'))
    process.exit(1)
  }

  const client = createLLMClient(config)

  console.log()
  console.log(pc.bold(`Regenerating: ${path.basename(promptPath)}`))
  const currentPrompt = parsePromptFile(promptPath)
  console.log(pc.dim(`Framework: ${currentPrompt?.meta.framework ?? ''} -> ${framework}`))
  console.log()

  let result
  try {
    result = await regeneratePromptFile({
      promptPath,
      framework,
      client,
    })
  } catch (err) {
    const message = err instanceof PromptRegenerationError
      ? err.message
      : `Regeneration failed: ${err instanceof Error ? err.message : String(err)}`
    process.stderr.write(pc.red(`${message}\n`))
    process.exit(1)
  }

  console.log(pc.green('  Updated: ') + pc.dim(promptPath))
  console.log(pc.dim(`  original_framework preserved: ${result.originalFramework}`))
  console.log()
}
