import fs from 'node:fs'
import path from 'node:path'
import { requireRepoRoot, pc } from '../utils.js'
import { analyzeSkill, type BudgetCheckResult } from '@/lib/budget-analyzer.js'

export function budgetCheckCommand(args: string[]): void {
  // Parse slug: expect <category/slug> or <category> <slug>
  const flagIdx = args.findIndex(a => a.startsWith('-'))
  const positional = flagIdx === -1 ? args : args.slice(0, flagIdx)

  let categorySlug = positional[0] ?? ''

  // Support both "ai/skill-creator" and "ai skill-creator"
  if (!categorySlug.includes('/') && positional[1]) {
    categorySlug = `${positional[0]}/${positional[1]}`
  }

  if (!categorySlug || !categorySlug.includes('/')) {
    process.stderr.write(pc.red('Usage: skill-mall budget-check <category/slug> [--chars-available <n>] [--agent <agent>]\n'))
    process.exit(1)
  }

  // Parse flags
  const charsIdx = args.indexOf('--chars-available')
  const charsAvailable = charsIdx !== -1 ? parseInt(args[charsIdx + 1] ?? '200', 10) : 200

  const agentIdx = args.indexOf('--agent')
  const agent = agentIdx !== -1 ? args[agentIdx + 1] : null

  if (isNaN(charsAvailable) || charsAvailable < 10) {
    process.stderr.write(pc.red('--chars-available must be a number >= 10\n'))
    process.exit(1)
  }

  // Find SKILL.md and extract description
  const repoRoot = requireRepoRoot()
  const skillDir = path.join(repoRoot, 'skills', ...categorySlug.split('/'))
  const skillMdPath = path.join(skillDir, 'SKILL.md')

  if (!fs.existsSync(skillMdPath)) {
    process.stderr.write(pc.red(`Skill not found: skills/${categorySlug}/SKILL.md\n`))
    process.exit(1)
  }

  const content = fs.readFileSync(skillMdPath, 'utf-8')
  const description = extractDescription(content)

  if (!description) {
    process.stderr.write(pc.red(`No description field found in ${skillMdPath}\n`))
    process.exit(1)
  }

  const result = analyzeSkill(categorySlug, description, charsAvailable)
  printResult(result, agent)
}

function extractDescription(skillMd: string): string | null {
  const match = skillMd.match(/^description:\s*"?(.+?)"?\s*$/m)
  return match ? match[1].trim() : null
}

function printResult(result: BudgetCheckResult, agent: string | null): void {
  console.log()
  console.log(
    pc.bold(`Budget analysis: ${result.slug} / ${result.charsAvailable} chars available`)
  )
  console.log()

  if (agent) {
    console.log(
      pc.dim(`Note: budget is simulated at --chars-available. Set this to match your agent's actual budget.`)
    )
    console.log()
  }

  const status = result.visible
    ? pc.green('FULLY VISIBLE')
    : pc.yellow(`TRUNCATED (${result.descriptionLength - result.charsAvailable} chars cut)`)

  console.log(`Description (${result.descriptionLength} chars): ${status}`)

  if (result.triggerPhrase) {
    console.log(`Trigger phrase: ${pc.cyan(`"${result.triggerPhrase}"`)}`)
    const preserved = result.triggerPreserved ? pc.green('YES') : pc.red('NO')
    console.log(`Trigger preserved: ${preserved}`)
  } else {
    console.log(`Trigger phrase: ${pc.dim('(none detected)')}`)
  }

  if (!result.visible && result.truncatedText) {
    console.log()
    console.log(pc.dim('Truncated text: ') + pc.yellow(`"${result.truncatedText.slice(0, 60)}${result.truncatedText.length > 60 ? '...' : ''}""`))
  }

  if (result.rewriteSuggestions.length > 0) {
    console.log()
    console.log(pc.bold('Suggestions:'))
    for (const s of result.rewriteSuggestions) {
      console.log(`  - ${s}`)
    }
  } else {
    console.log()
    console.log(pc.green('No rewrite needed.'))
  }
  console.log()
}
