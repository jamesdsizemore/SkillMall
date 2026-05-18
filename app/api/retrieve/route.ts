import { NextRequest, NextResponse } from 'next/server'
import { retrieveChunks } from '@/lib/rag/knowledge-base'
import { resolveProviderConfig, createLLMClient } from '@/lib/providers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { skillSlug, query, topK = 5 } = body as {
    skillSlug?: string
    query?: string
    topK?: number
  }

  if (!skillSlug || !query) {
    return NextResponse.json({ error: 'skillSlug and query are required' }, { status: 400 })
  }

  let config
  try {
    config = resolveProviderConfig()
  } catch {
    return NextResponse.json(
      { error: 'No LLM provider configured. Run: npx skill-mall configure' },
      { status: 503 }
    )
  }

  if (config.provider === 'claude-code') {
    return NextResponse.json(
      {
        error:
          "Provider 'claude-code' does not support embeddings. " +
          'Set SKILL_MALL_EMBEDDING_PROVIDER=openai or SKILL_MALL_EMBEDDING_PROVIDER=ollama.',
      },
      { status: 422 }
    )
  }

  const client = createLLMClient(config)

  try {
    const chunks = await retrieveChunks(skillSlug, query, client, Math.min(topK, 20))
    return NextResponse.json({ chunks, skillSlug, query })
  } catch (err) {
    // Log full error server-side; return generic message to client
    // (raw embedding API errors may contain billing/key information)
    console.error('[retrieve] retrieval failed:', err)
    return NextResponse.json({ error: 'Retrieval failed' }, { status: 500 })
  }
}
