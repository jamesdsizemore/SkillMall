import { NextRequest, NextResponse } from 'next/server'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers'
import {
  authenticationRequiredResponse,
  getSessionFromRequest,
  requireSkillAuthorWhenPresent,
} from '@/lib/auth/policy'
import { getSkill } from '@/lib/skills'
import {
  getPromptsDir,
  listPromptFiles,
  PromptRegenerationError,
  regeneratePromptFile,
  resolvePromptFilePath,
} from '@/lib/prompt-regenerator'

// GET /api/regen-prompt?category=&slug= — list prompt files
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const slug = searchParams.get('slug')

  if (!category || !slug) {
    return NextResponse.json({ error: 'category and slug required' }, { status: 400 })
  }

  return NextResponse.json({ prompts: listPromptFiles(category, slug) })
}

// POST /api/regen-prompt — regenerate prompt with new framework
export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return authenticationRequiredResponse()
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
  const authorError = requireSkillAuthorWhenPresent(
    session,
    skill,
    'Only the skill author can regenerate prompts'
  )
  if (authorError) return authorError

  const promptsDir = getPromptsDir(category, slug)
  let filePath: string
  try {
    filePath = resolvePromptFilePath(promptsDir, promptFile)
  } catch {
    return NextResponse.json({ error: 'Invalid prompt file path' }, { status: 400 })
  }

  let config
  try {
    config = resolveProviderConfig()
  } catch {
    return NextResponse.json({ error: 'No LLM provider configured on server' }, { status: 503 })
  }

  const client = createLLMClient(config)

  try {
    return NextResponse.json(await regeneratePromptFile({
      promptPath: filePath,
      framework,
      client,
    }))
  } catch (err) {
    if (err instanceof PromptRegenerationError) {
      const status = err.code === 'PROMPT_NOT_FOUND'
        ? 404
        : err.code === 'NO_TOOL_CONTEXT'
          ? 422
          : err.code === 'INVALID_PROMPT_PATH'
            ? 400
            : 500
      return NextResponse.json({ error: err.message }, { status })
    }

    return NextResponse.json(
      { error: `LLM regeneration failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }
}
