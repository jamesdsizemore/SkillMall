import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'
import { buildChainSkillDirectory, validateChain, type Chain } from '@/lib/chains'
import { atomicWrite } from '@/lib/pipeline'
import type { SkillMetadata } from '@/lib/skill-builder'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { chain, metadata } = body as { chain: Chain; metadata: SkillMetadata }

  if (!chain?.name || !chain?.slug || !Array.isArray(chain?.steps)) {
    return NextResponse.json({ error: 'chain.name, chain.slug, and chain.steps are required' }, { status: 400 })
  }

  if (chain.steps.length < 2) {
    return NextResponse.json({ error: 'A chain requires at least 2 steps' }, { status: 422 })
  }

  const dir = buildChainSkillDirectory(chain, metadata ?? { slug: chain.slug, category: 'chains', tags: [], targetAgents: [] })
  const validation = validateChain(dir)

  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Chain SKILL.md failed validation', errors: validation.errors },
      { status: 422 }
    )
  }

  const outputPath = path.join(process.cwd(), 'skills', 'chains', chain.slug)

  if (fs.existsSync(outputPath)) {
    return NextResponse.json({ error: `Chain already exists: chains/${chain.slug}` }, { status: 409 })
  }

  const writeResult = await atomicWrite(dir, outputPath)
  if (!writeResult.success) {
    return NextResponse.json({ error: 'Write failed' }, { status: 500 })
  }

  return NextResponse.json({ slug: chain.slug, path: outputPath, steps: chain.steps.length }, { status: 201 })
}
