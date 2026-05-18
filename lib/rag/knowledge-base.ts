import fs from 'node:fs'
import path from 'node:path'
import { getDb } from '../db/client'
import type { LLMClient } from '../providers'
import { chunkText, extractText } from './chunker'
import { generateEmbedding } from './embeddings'

const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.ts', '.js', '.py', '.go', '.rb', '.java']

// ---------------------------------------------------------------------------
// Pure-JS cosine similarity — no native extension required.
// At <5K chunks per skill, a linear scan is ~5-15ms — well below the
// embedding API round-trip (~200-400ms) that dominates total latency.
// ---------------------------------------------------------------------------
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `Embedding dimension mismatch: query has ${a.length} dims, stored chunk has ${b.length} dims. ` +
      `Was this knowledge base built with a different embedding provider?`
    )
  }
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Serialize number[] → BLOB (Float32 bytes, 4 bytes per element).
// Intentional precision trade-off: float64 → float32. Negligible impact
// on cosine similarity for text embeddings.
function vectorToBuffer(v: number[]): Buffer {
  return Buffer.from(new Float32Array(v).buffer)
}

// Deserialize BLOB → Float32Array.
// MUST copy bytes into a new ArrayBuffer first: Buffer.buffer is a shared
// pool and buf.byteOffset is not guaranteed to be 4-byte aligned, which
// would throw a RangeError in the Float32Array offset constructor.
function bufferToVector(buf: Buffer): Float32Array {
  const copy = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return new Float32Array(copy)
}

// ---------------------------------------------------------------------------
// Knowledge base management
// ---------------------------------------------------------------------------

export function createKnowledgeBase(
  skillSlug: string,
  sourceDir: string,
  embeddingProvider: string
): number {
  const db = getDb()
  db.prepare(
    `INSERT INTO knowledge_bases (skill_slug, source_dir, embedding_provider, chunk_count)
     VALUES (?, ?, ?, 0)
     ON CONFLICT(skill_slug) DO UPDATE SET
       source_dir = excluded.source_dir,
       embedding_provider = excluded.embedding_provider,
       updated_at = datetime('now')`
  ).run(skillSlug, sourceDir, embeddingProvider)

  const row = db
    .prepare('SELECT id FROM knowledge_bases WHERE skill_slug = ?')
    .get(skillSlug) as { id: number }
  return row.id
}

export async function attachKnowledge(
  kbId: number,
  sourceDir: string,
  client: LLMClient
): Promise<{ chunksAdded: number }> {
  const db = getDb()
  const files = collectFiles(sourceDir, SUPPORTED_EXTENSIONS)
  if (files.length === 0) throw new Error(`No supported files found in ${sourceDir}`)

  // Phase 1: generate ALL embeddings before touching the DB.
  // If the API fails mid-way, the existing knowledge base remains intact.
  const rows: Array<{ chunk: string; relPath: string; embedding: Buffer }> = []

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const chunks = chunkText(extractText(raw))
    const relPath = path.relative(sourceDir, filePath)

    for (const chunk of chunks) {
      const result = await generateEmbedding(chunk, client)
      rows.push({ chunk, relPath, embedding: vectorToBuffer(result.vector) })
    }
  }

  // Phase 2: atomic write in a synchronous transaction
  const insertChunk = db.prepare(
    'INSERT INTO knowledge_chunks (knowledge_base_id, content, source_file, chunk_index, embedding) VALUES (?, ?, ?, ?, ?)'
  )

  db.transaction(() => {
    db.prepare('DELETE FROM knowledge_chunks WHERE knowledge_base_id = ?').run(kbId)
    rows.forEach((row, i) => insertChunk.run(kbId, row.chunk, row.relPath, i, row.embedding))
    db.prepare("UPDATE knowledge_bases SET chunk_count = ?, updated_at = datetime('now') WHERE id = ?")
      .run(rows.length, kbId)
  })()

  return { chunksAdded: rows.length }
}

export interface RetrievedChunk {
  content: string
  sourceFile: string
  score: number
}

export async function retrieveChunks(
  skillSlug: string,
  query: string,
  client: LLMClient,
  topK = 5
): Promise<RetrievedChunk[]> {
  const db = getDb()

  const kb = db
    .prepare('SELECT id FROM knowledge_bases WHERE skill_slug = ?')
    .get(skillSlug) as { id: number } | undefined
  if (!kb) return []

  const queryEmbedding = await generateEmbedding(query, client)
  const queryVec = new Float32Array(queryEmbedding.vector)

  const chunks = db
    .prepare('SELECT content, source_file, embedding FROM knowledge_chunks WHERE knowledge_base_id = ?')
    .all(kb.id) as Array<{ content: string; source_file: string; embedding: Buffer }>

  if (chunks.length === 0) return []

  const scored: RetrievedChunk[] = []
  for (const c of chunks) {
    if (!c.embedding || c.embedding.length === 0) continue
    try {
      scored.push({
        content: c.content,
        sourceFile: c.source_file,
        score: cosineSimilarity(queryVec, bufferToVector(c.embedding)),
      })
    } catch (err) {
      // Log and skip corrupt/mismatched chunks rather than crashing the request
      console.error(`[rag] skipping chunk from ${c.source_file}: ${err instanceof Error ? err.message : err}`)
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, topK)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])

function collectFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue // never follow symlinks
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      results.push(...collectFiles(full, extensions))
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(full)
    }
  }
  return results
}
