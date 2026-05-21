import fs from 'node:fs'
import path from 'node:path'
import { pc } from '../utils.js'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers/index.js'
import { optimizePrompt } from '@/lib/prompt-optimizer.js'

export async function optimizePromptCommand(args: string[]): Promise<void> {
  let filePath: string | null = null
  let useStdin = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--stdin') {
      useStdin = true
    } else if (args[i] === '--help' || args[i] === '-h') {
      printUsage()
      process.exit(0)
    } else if (!args[i].startsWith('--')) {
      filePath = args[i]
    }
  }

  if (!useStdin && !filePath) {
    printUsage()
    process.exit(1)
  }

  // Read input
  let promptText: string
  if (useStdin) {
    promptText = fs.readFileSync(0, 'utf-8').trim()
  } else {
    const resolved = path.resolve(filePath!)
    if (!fs.existsSync(resolved)) {
      process.stderr.write(pc.red(`File not found: ${filePath}\n`))
      process.exit(1)
    }
    promptText = fs.readFileSync(resolved, 'utf-8')
  }

  if (!promptText) {
    process.stderr.write(pc.red('Empty prompt — nothing to optimize.\n'))
    process.exit(1)
  }

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

  console.log()
  console.log(pc.bold('Analyzing prompt quality...'))
  console.log()

  let audit
  try {
    audit = await optimizePrompt(promptText, client)
  } catch (err) {
    process.stderr.write(pc.red(`Analysis failed: ${err instanceof Error ? err.message : String(err)}\n`))
    process.exit(1)
  }

  // Print 4-dimension audit
  console.log(pc.bold('── Token Efficiency ────────────────────────────────'))
  console.log(`  Score: ${scoreColor(audit.tokenEfficiencyScore)} / 100`)
  console.log(`  Before: ${audit.tokenCountBefore} tokens  →  After: ${audit.tokenCountAfter} tokens  (${audit.tokenReductionPercent}% reduction)`)
  console.log()

  console.log(pc.bold('── Intent Completeness ─────────────────────────────'))
  console.log(`  Score: ${scoreColor(audit.intentCompletenessScore)} / 100`)
  if (audit.intentDimensionsPresent.length > 0) {
    console.log(`  ${pc.green('Present:')} ${audit.intentDimensionsPresent.join(', ')}`)
  }
  if (audit.intentDimensionsMissing.length > 0) {
    console.log(`  ${pc.yellow('Missing:')} ${audit.intentDimensionsMissing.join(', ')}`)
    for (const [dim, suggestion] of Object.entries(audit.intentSuggestions)) {
      console.log(`    ${pc.dim(dim + ':')} ${suggestion}`)
    }
  }
  console.log()

  console.log(pc.bold('── Output Clarity ──────────────────────────────────'))
  console.log(`  Score: ${scoreColor(audit.outputClarityScore)} / 100  ${audit.outputClarityPasses ? pc.green('[PASS]') : pc.yellow('[FAIL]')}`)
  if (audit.outputClarityIssues.length > 0) {
    for (const issue of audit.outputClarityIssues) {
      console.log(`  ${pc.yellow('•')} ${issue}`)
    }
  }
  console.log()

  console.log(pc.bold('── Trigger Sharpness ───────────────────────────────'))
  console.log(`  Score: ${scoreColor(audit.triggerSharpnessScore)} / 100  ${audit.triggerSharpnessPasses ? pc.green('[PASS]') : pc.yellow('[FAIL]')}`)
  if (audit.triggerSuggestion) {
    console.log(`  Suggestion: ${pc.dim(audit.triggerSuggestion)}`)
  }
  console.log()

  if (audit.optimizationFailed) {
    console.log(pc.yellow('  Note: optimization pass failed — raw audit only.'))
    return
  }

  // Write output files (only when input is a file, not stdin)
  if (filePath && !useStdin) {
    const resolved = path.resolve(filePath)
    const ext = path.extname(resolved)
    const base = resolved.slice(0, -ext.length)

    const optimizedPath = base + '-optimized' + ext
    const diffPath = base + '.diff'

    fs.writeFileSync(optimizedPath, audit.optimizedPrompt, 'utf-8')

    // Simple unified-style diff
    const originalLines = promptText.split('\n')
    const optimizedLines = audit.optimizedPrompt.split('\n')
    const diff = [
      `--- ${path.basename(resolved)}`,
      `+++ ${path.basename(optimizedPath)}`,
      ...originalLines.map(l => `- ${l}`),
      ...optimizedLines.map(l => `+ ${l}`),
    ].join('\n')
    fs.writeFileSync(diffPath, diff, 'utf-8')

    console.log(pc.green('  Optimized: ') + pc.dim(optimizedPath))
    console.log(pc.green('  Diff:      ') + pc.dim(diffPath))
  } else {
    // stdin mode: print optimized prompt to stdout
    console.log(pc.bold('── Optimized Prompt ────────────────────────────────'))
    console.log(audit.optimizedPrompt)
  }
  console.log()
}

function printUsage(): void {
  console.log()
  console.log(pc.bold('Usage:'))
  console.log('  skill-mall optimize-prompt <file.md>   Optimize a prompt file')
  console.log('  skill-mall optimize-prompt --stdin     Read prompt from stdin')
  console.log()
  console.log(pc.bold('Output (file mode):'))
  console.log('  <filename>-optimized.md    Optimized prompt')
  console.log('  <filename>.diff            Unified diff of changes')
  console.log()
  console.log(pc.bold('Example:'))
  console.log("  echo 'This prompt helps you...' | skill-mall optimize-prompt --stdin")
  console.log()
}

function scoreColor(score: number): string {
  if (score >= 80) return pc.green(String(score))
  if (score >= 60) return pc.yellow(String(score))
  return pc.red(String(score))
}
