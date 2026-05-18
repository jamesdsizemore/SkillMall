import fs from 'node:fs'
import path from 'node:path'
import * as p from '@clack/prompts'
import { requireRepoRoot, isValidSkillName, pc } from '../utils.js'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers/index.js'
import { extractFromCodebase } from '@/lib/codebase-extractor.js'

interface ExtractArgs {
  targetDir: string
  output: string
  category: string
  focus: string[]
}

function parseArgs(rawArgs: string[]): ExtractArgs {
  let targetDir = ''
  let output = ''
  let category = 'development'
  let focus: string[] = []

  let i = 0
  while (i < rawArgs.length) {
    if (rawArgs[i] === '--output' && rawArgs[i + 1]) {
      output = rawArgs[++i]
      i++
    } else if (rawArgs[i] === '--category' && rawArgs[i + 1]) {
      category = rawArgs[++i]
      i++
    } else if (rawArgs[i] === '--focus' && rawArgs[i + 1]) {
      focus = rawArgs[++i].split(',').map(s => s.trim()).filter(Boolean)
      i++
    } else if (!rawArgs[i].startsWith('--')) {
      if (!targetDir) targetDir = rawArgs[i]
      i++
    } else {
      i++
    }
  }

  return { targetDir, output, category, focus }
}

export async function extractCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args)

  if (!parsed.targetDir) {
    process.stderr.write(pc.red('Usage: skill-mall extract <dir> --output <slug> [--category <cat>] [--focus "pattern1,pattern2"]\n'))
    process.exit(1)
  }

  if (!parsed.output) {
    process.stderr.write(pc.red('--output <slug> is required\n'))
    process.exit(1)
  }

  if (!isValidSkillName(parsed.output)) {
    process.stderr.write(pc.red(`Invalid output slug: "${parsed.output}"\n  Must be lowercase letters, numbers, and hyphens only.\n`))
    process.exit(1)
  }

  const resolvedDir = path.resolve(parsed.targetDir)
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    process.stderr.write(pc.red(`Directory not found: ${parsed.targetDir}\n`))
    process.exit(1)
  }

  console.log()
  p.intro(pc.bold('  skill-mall extract'))

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

  const client = createLLMClient(config)

  console.log(`  ${pc.dim('Directory:')} ${resolvedDir}`)
  console.log(`  ${pc.dim('Output slug:')} ${parsed.output}`)
  console.log(`  ${pc.dim('Provider:')} ${config.provider} / ${config.model}`)
  if (parsed.focus.length > 0) {
    console.log(`  ${pc.dim('Focus:')} ${parsed.focus.join(', ')}`)
  }
  console.log()

  const spinner = p.spinner()
  spinner.start('Collecting files and extracting patterns...')

  let result
  try {
    result = await extractFromCodebase(resolvedDir, parsed.output, parsed.focus, client)
  } catch (err) {
    spinner.stop('Extraction failed')
    process.stderr.write(pc.red(`Error: ${err instanceof Error ? err.message : String(err)}\n`))
    process.exit(1)
  }

  spinner.stop('Extraction complete')

  // Write research-result.json (same format as create command)
  const repoRoot = requireRepoRoot()
  const outputDir = path.join(repoRoot, 'skill-builder-output', parsed.output)
  fs.mkdirSync(outputDir, { recursive: true })

  const researchPath = path.join(outputDir, 'research-result.json')
  fs.writeFileSync(researchPath, JSON.stringify(result, null, 2) + '\n', 'utf-8')

  console.log()
  console.log(pc.green('  Written: ') + pc.dim(researchPath))
  console.log()
  console.log(pc.bold('  Note: research-unverified (no authoritative URLs provided)'))
  console.log(pc.dim('  Review the extracted patterns, then run:'))
  console.log(`    ${pc.cyan(`npx skill-mall confirm-research ${parsed.output}`)}`)
  console.log()
}
