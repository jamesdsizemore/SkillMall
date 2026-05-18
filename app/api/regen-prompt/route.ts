import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers'
import { getSession } from '@/lib/auth/github'
import { getSkill } from '@/lib/skills'

const SYSTEM_PROMPT =
  'You are a prompt engineering expert. You rewrite skill prompts using a new reasoning framework while preserving the original tool structure, artifact format, and output requirements. Return only the rewritten prompt body — no frontmatter, no markdown fences, no explanation.'

interface PromptMeta {
  file: string
  name: string
  framework: string
  originalFramework: string
  type: string
  complexity: string
  whenToUse: string
  produces: string[]
}

function parsePromptFile(filePath: string): { meta: PromptMeta; content: string } | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(raw)
    return {
      meta: {
        file: path.basename(filePath),
        name: data.tool ?? path.basename(filePath, '.md'),
        framework: data.framework ?? '',
        originalFramework: data.original_framework ?? data.framework ?? '',
        type: data.type ?? 'tool-specific',
        complexity: data.complexity ?? 'thorough',
        whenToUse: data.when_to_use ?? '',
        produces: Array.isArray(data.produces) ? data.produces : [],
      },
      content,
    }
  } catch {
    return null
  }
}

function getPromptsDir(category: string, slug: string): string {
  return path.join(process.cwd(), 'skills', category, slug, 'resources', 'prompts')
}

// GET /api/regen-prompt?category=&slug= — list prompt files
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const slug = searchParams.get('slug')

  if (!category || !slug) {
    return NextResponse.json({ error: 'category and slug required' }, { status: 400 })
  }

  const promptsDir = getPromptsDir(category, slug)
  if (!fs.existsSync(promptsDir)) {
    return NextResponse.json({ prompts: [] })
  }

  const files = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md'))
  const prompts = files
    .map(f => parsePromptFile(path.join(promptsDir, f)))
    .filter(Boolean) as Array<{ meta: PromptMeta; content: string }>

  return NextResponse.json({ prompts: prompts.map(p => p.meta) })
}

// POST /api/regen-prompt — regenerate prompt with new framework
export async function POST(req: NextRequest) {
  const token = req.cookies.get('sm_session')?.value
  const session = token ? getSession(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { category, slug, promptFile, framework } = body as {
    category?: string
    slug?: string
    promptFile?: string
    framework?: string
  }

  if (!category || !slug || !promptFile || !framework) {
    return NextResponse.json(
      { error: 'category, slug, promptFile, and framework are required' },
      { status: 400 }
    )
  }

  // Only the skill author may regenerate prompts
  const skill = getSkill(category, slug)
  if (!skill) {
    return NextResponse.json({ error: `Skill not found: ${category}/${slug}` }, { status: 404 })
  }
  if (skill.author && skill.author !== session.github_login) {
    return NextResponse.json({ error: 'Only the skill author can regenerate prompts' }, { status: 403 })
  }

  // Security: validate promptFile path stays within skill directory
  const promptsDir = getPromptsDir(category, slug)
  const filePath = path.resolve(promptsDir, path.basename(promptFile))
  if (!filePath.startsWith(promptsDir)) {
    return NextResponse.json({ error: 'Invalid prompt file path' }, { status: 400 })
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `Prompt file not found: ${promptFile}` }, { status: 404 })
  }

  const parsed = parsePromptFile(filePath)
  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse prompt file' }, { status: 500 })
  }

  // Extract tool context from body JSON (embedded during pipeline)
  let toolContext = ''
  try {
    const toolData = JSON.parse(parsed.content.trim())
    const tool = Array.isArray(toolData.tools) ? toolData.tools[0] : null
    if (tool) {
      toolContext = `Tool: ${tool.name}\nArtifact type: ${tool.artifactType}\nArtifact structure:\n${tool.artifactStructure}\nInputs: ${tool.inputs?.join(', ')}\nOutputs: ${tool.outputs?.join(', ')}\nHow used: ${tool.howUsed}`
    }
  } catch {
    // Body is prose, not JSON — use as-is
    toolContext = parsed.content.slice(0, 2000)
  }

  if (!toolContext) {
    return NextResponse.json(
      { error: 'No tool structure found in prompt file — cannot regenerate without tool context' },
      { status: 422 }
    )
  }

  let config
  try {
    config = resolveProviderConfig()
  } catch {
    return NextResponse.json({ error: 'No LLM provider configured on server' }, { status: 503 })
  }

  const client = createLLMClient(config)

  const regenPrompt = `Rewrite this skill prompt using the "${framework}" reasoning framework.

Original framework: ${parsed.meta.originalFramework}
New framework: ${framework}

Tool context:
${toolContext}

Original prompt purpose: ${parsed.meta.whenToUse}

Write the complete rewritten prompt body using ${framework} as the reasoning approach. Preserve the tool structure, artifact format, and output requirements. Focus on how ${framework} would approach this specific tool.`

  let newBody: string
  try {
    newBody = await client.complete(regenPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 2048,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `LLM regeneration failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }

  // Write updated file — update framework field, preserve original_framework
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data: fm } = matter(raw)
  fm.framework = framework
  if (!fm.original_framework) fm.original_framework = parsed.meta.originalFramework

  const updatedFile = matter.stringify(newBody, fm)
  fs.writeFileSync(filePath, updatedFile, 'utf-8')

  return NextResponse.json({
    framework,
    originalFramework: parsed.meta.originalFramework,
    content: newBody,
  })
}
