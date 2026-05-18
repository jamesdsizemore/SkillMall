import fs from 'node:fs'
import path from 'node:path'
import { requireRepoRoot, pc } from '../utils.js'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers/index.js'
import { loadTestCases, runTestSuite, type TestSuiteResult } from '@/lib/skill-tester.js'

export async function testSkillCommand(args: string[]): Promise<void> {
  const slug = args[0]
  if (!slug) {
    process.stderr.write(pc.red('Usage: skill-mall test <category/slug>\n'))
    process.exit(1)
  }

  const repoRoot = requireRepoRoot()

  // Resolve skill SKILL.md — slug may be "ai/skill-creator" or just "skill-creator"
  let skillMdPath: string | null = null
  if (slug.includes('/')) {
    const candidate = path.join(repoRoot, 'skills', ...slug.split('/'), 'SKILL.md')
    if (fs.existsSync(candidate)) skillMdPath = candidate
  } else {
    // Search all categories for this slug
    const skillsDir = path.join(repoRoot, 'skills')
    for (const cat of fs.readdirSync(skillsDir)) {
      const candidate = path.join(skillsDir, cat, slug, 'SKILL.md')
      if (fs.existsSync(candidate)) {
        skillMdPath = candidate
        break
      }
    }
  }

  if (!skillMdPath) {
    process.stderr.write(pc.red(`Skill not found: ${slug}\n`))
    process.exit(1)
  }

  const skillContent = fs.readFileSync(skillMdPath, 'utf-8')
  const testsDir = path.join(repoRoot, 'tests')
  const testCases = loadTestCases(testsDir, slug)

  if (testCases.length === 0) {
    const name = slug.includes('/') ? slug.split('/').pop()! : slug
    console.log()
    console.log(pc.yellow(`No test cases found for: ${slug}`))
    console.log(pc.dim(`  Expected: tests/${name}/*.json`))
    console.log()
    process.exit(0)
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
  console.log(pc.bold(`Testing: ${slug}`))
  console.log(pc.dim(`Provider: ${config.provider} / ${config.model}`))
  console.log(pc.dim(`Test cases: ${testCases.length}`))
  console.log()

  const result = await runTestSuite(slug, skillContent, testCases, client)
  printResult(result)

  process.exit(result.failCount > 0 ? 1 : 0)
}

function printResult(result: TestSuiteResult): void {
  for (const r of result.results) {
    const icon = r.passed ? pc.green('PASS') : pc.red('FAIL')
    console.log(`  [${icon}] ${r.description}`)

    if (!r.passed) {
      for (const req of r.requiredResults) {
        if (!req.passed) {
          console.log(`       ${pc.red('REQUIRED:')} ${req.assertion}`)
        }
      }
      for (const forb of r.forbiddenResults) {
        if (forb.triggered) {
          console.log(`       ${pc.red('FORBIDDEN triggered:')} ${forb.assertion}`)
        }
      }
    }
  }

  console.log()
  const passRate = result.passRate
  const rateColor = passRate === 100 ? pc.green : passRate >= 70 ? pc.yellow : pc.red
  console.log(
    pc.bold(`Results: ${result.passCount}/${result.testCount} passed`) +
      ` (${rateColor(passRate + '%')})`
  )
  console.log()
}
