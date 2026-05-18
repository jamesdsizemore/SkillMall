import fs from 'node:fs'
import path from 'node:path'
import { requireRepoRoot, pc } from '../utils.js'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers/index.js'

const SYSTEM_PROMPT =
  'You are a prompt engineering expert. You rewrite skill prompts using a new reasoning framework while preserving the original tool structure and output requirements. Return only the rewritten prompt body — no frontmatter, no markdown fences, no explanation.'

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!fmMatch) return { data: {}, body: content }

  const data: Record<string, unknown> = {}
  for (const line of fmMatch[1].split('\n')) {
    const m = line.match(/^(\w[\w_-]*):\s*(.+)$/)
    if (m) {
      let val: unknown = m[2].trim()
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1)
      }
      data[m[1]] = val
    }
  }
  return { data, body: fmMatch[2].trim() }
}

function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  const fm = Object.entries(data)
    .map(([k, v]) => {
      if (typeof v === 'string' && v.includes(',')) return `${k}: "${v}"`
      return `${k}: ${v}`
    })
    .join('\n')
  return `---\n${fm}\n---\n\n${body}\n`
}

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

  // Resolve skill directory
  const [cat, slug] = skillTarget.includes('/')
    ? skillTarget.split('/')
    : ['', skillTarget]

  let skillDir: string | null = null
  if (cat) {
    const candidate = path.join(repoRoot, 'skills', cat, slug)
    if (fs.existsSync(candidate)) skillDir = candidate
  } else {
    for (const c of fs.readdirSync(path.join(repoRoot, 'skills'))) {
      const candidate = path.join(repoRoot, 'skills', c, skillTarget)
      if (fs.existsSync(candidate)) { skillDir = candidate; break }
    }
  }

  if (!skillDir) {
    process.stderr.write(pc.red(`Skill not found: ${skillTarget}\n`))
    process.exit(1)
  }

  // Resolve prompt file — relative to skill dir or absolute path within skill dir
  const promptPath = path.isAbsolute(promptFile)
    ? promptFile
    : path.join(skillDir, promptFile)

  if (!fs.existsSync(promptPath)) {
    process.stderr.write(pc.red(`Prompt file not found: ${promptPath}\n`))
    process.exit(1)
  }

  // Security: ensure prompt file is within skill directory
  if (!path.resolve(promptPath).startsWith(path.resolve(skillDir))) {
    process.stderr.write(pc.red('Prompt file must be within the skill directory.\n'))
    process.exit(1)
  }

  const raw = fs.readFileSync(promptPath, 'utf-8')
  const { data: fm, body } = parseFrontmatter(raw)

  const currentFramework = (fm.framework as string) ?? ''
  const originalFramework = (fm.original_framework as string) ?? currentFramework

  // Extract tool context from body JSON
  let toolContext = ''
  try {
    const toolData = JSON.parse(body) as { tools?: Array<{ name: string; artifactType: string; artifactStructure: string; inputs: string[]; outputs: string[]; howUsed: string }> }
    const tool = Array.isArray(toolData.tools) ? toolData.tools[0] : null
    if (tool) {
      toolContext = `Tool: ${tool.name}\nArtifact type: ${tool.artifactType}\nArtifact structure:\n${tool.artifactStructure}\nInputs: ${tool.inputs?.join(', ')}\nOutputs: ${tool.outputs?.join(', ')}\nHow used: ${tool.howUsed}`
    }
  } catch {
    toolContext = body.slice(0, 2000)
  }

  if (!toolContext) {
    process.stderr.write(pc.red('No tool structure found in prompt file — cannot regenerate.\n'))
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
  console.log(pc.dim(`Framework: ${currentFramework} → ${framework}`))
  console.log()

  const regenPrompt = `Rewrite this skill prompt using the "${framework}" reasoning framework.

Original framework: ${originalFramework}
New framework: ${framework}

Tool context:
${toolContext}

How used: ${fm.when_to_use ?? ''}

Write the complete rewritten prompt body using ${framework}. Preserve tool structure, artifact format, and output requirements.`

  let newBody: string
  try {
    newBody = await client.complete(regenPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 2048,
    })
  } catch (err) {
    process.stderr.write(pc.red(`Regeneration failed: ${err instanceof Error ? err.message : String(err)}\n`))
    process.exit(1)
  }

  // Update frontmatter
  fm.framework = framework
  if (!fm.original_framework) fm.original_framework = originalFramework

  const updated = stringifyFrontmatter(fm, newBody)
  fs.writeFileSync(promptPath, updated, 'utf-8')

  console.log(pc.green('  Updated: ') + pc.dim(promptPath))
  console.log(pc.dim(`  original_framework preserved: ${originalFramework}`))
  console.log()
}
