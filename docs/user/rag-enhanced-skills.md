# RAG-Enhanced Skills

**RAG** (Retrieval-Augmented Generation) lets you attach a knowledge base to any skill so that when the skill is invoked, relevant chunks from your documents are retrieved and included in the skill's context automatically.

This makes skills context-aware without requiring you to include the entire document in the skill prompt.

## Current status

RAG support requires `sqlite-vss` for vector similarity search. The `sqlite-vss` native extension is not yet available for Node.js 22. As a result, the attach-knowledge CLI command and `/api/retrieve` endpoint are built but will throw a clear error when invoked until `sqlite-vss` is available.

**RAG is blocked** until the runtime environment includes a compatible `sqlite-vss` binary. The code is complete and ready — only the runtime dependency is missing.

## Embedding provider support

RAG requires an embedding provider separate from your main LLM provider. Set `SKILL_MALL_EMBEDDING_PROVIDER` in `.env.local`:

| Provider | Model | Notes |
|----------|-------|-------|
| `openai` | `text-embedding-3-small` | Recommended. Requires `SKILL_MALL_API_KEY` with OpenAI key. |
| `ollama` | `nomic-embed-text` | Free, local. Requires Ollama running at `http://localhost:11434`. |
| `gemini` | `text-embedding-004` | Requires Google API key. |
| `claude-code` | — | **Not supported.** Claude Code CLI does not expose an embeddings API. |

```bash
# .env.local
SKILL_MALL_EMBEDDING_PROVIDER=openai
SKILL_MALL_API_KEY=sk-...
```

## Attaching a knowledge base

When `sqlite-vss` is available, attach a knowledge base with:

```bash
npx skill-mall attach-knowledge ai/skill-creator ./docs/
```

This command:
1. Reads all `.md`, `.txt`, `.ts`, `.js`, `.py` files in `./docs/`
2. Splits them into ~512-token chunks
3. Generates embeddings for each chunk using `SKILL_MALL_EMBEDDING_PROVIDER`
4. Stores chunks and embeddings in the SQLite database
5. Associates the knowledge base with the `ai/skill-creator` skill

## Retrieving relevant chunks

Once attached, retrieve relevant chunks via:

```
POST /api/retrieve
{
  "skillSlug": "skill-creator",
  "query": "how to write a good trigger phrase"
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

The retrieve endpoint uses VSS nearest-neighbor search to return the top-5 most relevant chunks by cosine similarity.

## How chunking works

Text is split into chunks of approximately 512 tokens (based on word count estimation at 1.35 words per token). Chunks shorter than 20 characters are discarded. The chunker reads `.md`, `.txt`, `.ts`, `.js`, `.py`, `.go`, `.rb`, and `.java` files.

## Database storage

Knowledge base data is stored in two tables created by `002_phase3.sql`:

- `knowledge_bases`: one row per skill, tracking source directory, chunk count, embedding provider, and update timestamp
- `knowledge_chunks`: one row per chunk, storing text, source file, chunk index, and the embedding as a JSON float array

When `sqlite-vss` is available, a virtual table `vss_knowledge` enables fast nearest-neighbor search across stored embeddings.

## Limitations

- Claude Code provider does not support embeddings — use `openai` or `ollama`
- RAG requires `sqlite-vss` native extension — not yet available on Node.js 22
- The retrieve endpoint returns top-5 chunks by default
- Embeddings are provider-specific — switching providers requires re-embedding all chunks

## Next steps

Once `sqlite-vss` becomes available for your Node.js version, RAG can be enabled without any code changes. The tables, CLI command, and API route are all in place. Run `npm run db:migrate` (already applied) and set `SKILL_MALL_EMBEDDING_PROVIDER` to get started.
