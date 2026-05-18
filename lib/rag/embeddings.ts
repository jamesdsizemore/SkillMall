import type { LLMClient } from '../providers'

export interface EmbeddingResult {
  vector: number[]
  /** Exact for OpenAI; word-count estimate (~1.35 tokens/word) for Ollama and Gemini. */
  estimatedTokenCount: number
}

const FETCH_TIMEOUT_MS = 30_000

/**
 * Generate an embedding vector using the configured provider.
 * claude-code is explicitly unsupported — it does not expose an embeddings API.
 */
export async function generateEmbedding(
  text: string,
  client: LLMClient
): Promise<EmbeddingResult> {
  if (client.provider === 'claude-code') {
    throw new Error(
      "Provider 'claude-code' does not support embeddings. " +
      "Set SKILL_MALL_EMBEDDING_PROVIDER=openai or SKILL_MALL_EMBEDDING_PROVIDER=ollama."
    )
  }

  if (client.provider === 'openai') return generateOpenAIEmbedding(text)
  if (client.provider === 'ollama') return generateOllamaEmbedding(text)
  if (client.provider === 'gemini') return generateGeminiEmbedding(text)

  throw new Error(`Unsupported embedding provider: ${client.provider}`)
}

async function generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
  // Use OPENAI_API_KEY to prevent a Gemini key being silently sent to OpenAI
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.SKILL_MALL_API_KEY
  if (!apiKey) throw new Error('Set OPENAI_API_KEY in .env.local for OpenAI embeddings')

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!res.ok) {
    // Never forward raw API error body — may contain billing/key info
    throw new Error(`OpenAI embeddings API error: HTTP ${res.status}`)
  }

  const data = await res.json() as {
    data: Array<{ embedding: number[] }>
    usage: { total_tokens: number }
  }
  return { vector: data.data[0].embedding, estimatedTokenCount: data.usage.total_tokens }
}

async function generateOllamaEmbedding(text: string): Promise<EmbeddingResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'

  const res = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!res.ok) {
    throw new Error(`Ollama embeddings error: HTTP ${res.status}. Is Ollama running at ${baseUrl}?`)
  }

  const data = await res.json() as { embedding: number[] }
  return { vector: data.embedding, estimatedTokenCount: Math.ceil(text.split(/\s+/).length * 1.35) }
}

async function generateGeminiEmbedding(text: string): Promise<EmbeddingResult> {
  // Use GEMINI_API_KEY to prevent an OpenAI key being silently sent to Google
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.SKILL_MALL_API_KEY
  if (!apiKey) throw new Error('Set GEMINI_API_KEY in .env.local for Gemini embeddings')

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  )

  if (!res.ok) {
    throw new Error(`Gemini embeddings API error: HTTP ${res.status}`)
  }

  const data = await res.json() as { embedding: { values: number[] } }
  return { vector: data.embedding.values, estimatedTokenCount: Math.ceil(text.split(/\s+/).length * 1.35) }
}
