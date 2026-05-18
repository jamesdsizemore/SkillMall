# RAG-Enhanced Skills

**RAG** (Retrieval-Augmented Generation) lets you attach a knowledge base to any skill so that when the skill is invoked, relevant document chunks are retrieved and included in context automatically.

## How it works

1. Run `npx skill-mall attach-knowledge` pointing at a directory of documents
2. The CLI chunks each file (~512 tokens per chunk), generates embeddings via your configured provider, and stores them in SQLite
3. When `/api/retrieve` is called, a pure-JavaScript cosine similarity scan finds the top-K most relevant chunks
4. Those chunks are returned for inclusion in the skill's context

## Vector search approach

RAG uses **pure JavaScript cosine similarity** — no native extension required. At corpus sizes realistic for a skill knowledge base (<5,000 chunks per skill), a linear scan takes 5-15ms. This is well below the embedding API round-trip (~200-400ms) that dominates total latency anyway. Native extensions like sqlite-vss and sqlite-vec were evaluated and rejected: sqlite-vss is abandoned and broken on Node 22; sqlite-vec still requires platform-specific binaries that create deployment complexity with no benefit at this corpus scale.

## Embedding provider support

Set `SKILL_MALL_EMBEDDING_PROVIDER` in `.env.local`. Use provider-specific API keys:

| Provider | Model | API key env var | Notes |
|----------|-------|-----------------|-------|
| `openai` | `text-embedding-3-small` | `OPENAI_API_KEY` | Recommended. 1536 dims. |
| `ollama` | `nomic-embed-text` | — | Free, local. Requires Ollama at `http://localhost:11434`. |
| `gemini` | `text-embedding-004` | `GEMINI_API_KEY` | Google Cloud credentials. |
| `claude-code` | — | — | **Not supported.** No embeddings API. |

Use `OPENAI_API_KEY` for OpenAI and `GEMINI_API_KEY` for Gemini. Do not share `SKILL_MALL_API_KEY` across providers — a key for one provider sent to another will fail with an unhelpful error.

## Attaching a knowledge base

```bash
npx skill-mall attach-knowledge ai/skill-creator ./docs/
```

This command:
1. Collects all `.md`, `.txt`, `.ts`, `.js`, `.py`, `.go`, `.rb`, `.java` files
2. Chunks each file (~380 words per chunk)
3. Generates embeddings (all embeddings are buffered in memory before any DB writes)
4. Writes everything atomically — if the embedding API fails mid-run, the existing knowledge base is unchanged
5. Associates the knowledge base with the `skill-creator` skill

## Retrieving relevant chunks

```
POST /api/retrieve
{
  "skillSlug": "skill-creator",
  "query": "how to write a good trigger phrase",
  "topK": 5
}
```

Response:
```json
{
  "chunks": [
    { "content": "...", "sourceFile": "docs/trigger-phrases.md", "score": 0.93 },
    { "content": "...", "sourceFile": "docs/best-practices.md", "score": 0.87 }
  ]
}
```

Maximum 20 chunks. Chunks with mismatched or corrupt embeddings are skipped with a server-side log entry rather than crashing the request. Error details are logged server-side only — the API returns a generic error to callers to prevent API key or billing information from leaking in error responses.

## Embedding dimension consistency

All chunks in a knowledge base must be embedded with the same provider. If you switch providers, re-run `attach-knowledge` to regenerate embeddings. Querying with a different provider than was used for attachment will be detected and logged per-chunk rather than silently returning wrong results.

## Database storage

Two tables from `002_phase3.sql`, updated by `004_rag_embedding_column.sql`:

- `knowledge_bases`: one row per skill (source dir, chunk count, embedding provider)
- `knowledge_chunks`: content, source file, chunk index, `embedding BLOB` (Float32Array bytes)

## Next steps to scale

If a future skill knowledge base exceeds ~20,000 chunks and the cosine scan becomes a measurable bottleneck (monitor query latency), replace the linear scan with sqlite-vec. At that point the corpus size will justify the native extension deployment overhead.
