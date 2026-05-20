# Architecture

The definitive internal reference for SkillMall. This document describes how the system works, why key decisions were made, and how the pieces connect. Read this before making significant changes to the codebase.

## Table of Contents

1. [System Overview](#system-overview)
2. [The Provider Abstraction](#the-provider-abstraction)
3. [The 5-Stage Pipeline](#the-5-stage-pipeline)
4. [State Management](#state-management)
5. [Database Design](#database-design)
6. [Authentication](#authentication)
7. [RAG — Retrieval-Augmented Generation](#rag--retrieval-augmented-generation)
8. [The Nothing Design System](#the-nothing-design-system)
9. [Performance Characteristics](#performance-characteristics)
10. [Security Model](#security-model)

---

## System Overview

```
┌─────────────────────────┐    ┌─────────────────────────┐
│   Browser (Web Wizard)  │    │   CLI (npx skill-mall)  │
│   Next.js App Router    │    │   TypeScript + tsup     │
└───────────┬─────────────┘    └───────────┬─────────────┘
            │ HTTP POST                     │ direct call
            ▼                               ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│   app/api/ routes       │    │  cli/src/commands/      │
│   (Next.js handlers)    │    │  (command functions)    │
└───────────┬─────────────┘    └───────────┬─────────────┘
            │                               │
            └───────────────┬───────────────┘
                            │ shared imports via @/lib/
                            ▼
            ┌───────────────────────────────┐
            │         lib/ (shared)         │
            │  pipeline.ts                  │
            │  research-engine.ts           │
            │  skill-builder.ts             │
            │  prompt-engine.ts             │
            │  providers/ (LLM abstraction) │
            │  quality-score.ts             │
            │  analytics.ts, forking.ts     │
            │  rag/ (pure-JS vector search) │
            │  marketplace/gate.ts          │
            └───────────┬───────────────────┘
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
    ┌─────────────────┐  ┌──────────────────────┐
    │  data/          │  │  skills/             │
    │  skillmall.db   │  │  (filesystem catalog)│
    │  (SQLite WAL)   │  │  one dir per skill   │
    └─────────────────┘  └──────────────────────┘
```

**Why this architecture?**

The central insight is that the web wizard and the CLI are two UIs for the same operations. A developer using `npx skill-mall create` and a product manager using the browser wizard both run the same `runPipeline()` function in `lib/pipeline.ts`. Having one implementation means one place to fix bugs, one place to add providers, one set of types. The CLI's `tsconfig.json` uses path aliases (`"@/*": ["../*"]`) to import from the root `lib/` without duplicating code or using a monorepo.

`skills/` is the "database" for skill content. Every skill is a directory with committed files, not a database row. This enables: git blame for skill history, PR-based contribution review, local editing with any text editor, and static generation of the catalog at build time. SQL stores only derived data (install counts, reviews, sessions) — things that change without a git commit.

---

## The Provider Abstraction

SkillMall supports five LLM providers through a single interface. Every feature that calls an LLM goes through this abstraction — there is no provider-specific code outside `lib/providers/`.

### The LLMClient Interface

```typescript
// lib/providers/types.ts

export type ProviderID = 'openai' | 'claude-code' | 'gemini' | 'groq' | 'ollama'

export interface ProviderConfig {
  provider: ProviderID
  apiKey?: string
  model: string
  baseURL?: string
}

export interface CompletionOptions {
  maxTokens?: number
  temperature?: number
  responseFormat?: 'text' | 'json_object'
  systemPrompt?: string
  timeoutMs?: number
}

export interface LLMClient {
  complete(prompt: string, options?: CompletionOptions): Promise<string>
  readonly provider: ProviderID
}
```

Every provider implements `LLMClient`. The `provider` field is used in places that need provider-specific behavior (e.g., claude-code cannot do embeddings).

### Resolution Order

`resolveProviderConfig()` in `lib/providers/index.ts` resolves configuration in this order:

1. Environment variables (`SKILL_MALL_PROVIDER`, `SKILL_MALL_MODEL`, plus provider-specific API keys such as `OPENAI_API_KEY`)
2. `~/.skill-mall/config.json` (written by `npx skill-mall configure`)

If neither source has a provider, it throws `ConfigError: "No LLM provider configured. Run: npx skill-mall configure"`.

### Factory Function

```typescript
export function createLLMClient(config: ProviderConfig): LLMClient {
  switch (config.provider) {
    case 'openai':    return new OpenAIClient(config)
    case 'claude-code': return new ClaudeCodeClient(config)
    case 'gemini':    return new GeminiClient(config)
    case 'groq':      return new GroqClient(config)
    case 'ollama':    return new OllamaClient(config)
    default: {
      const _exhaustive: never = config.provider
      throw new Error(`Unknown provider: ${_exhaustive}`)
    }
  }
}
```

The `_exhaustive: never` pattern ensures TypeScript will produce a compile error if a new `ProviderID` is added without a corresponding `case` in the factory.

### Claude Code: Subprocess, Not SDK

`ClaudeCodeClient` does not use the Anthropic SDK (`@anthropic-ai/sdk`). It spawns `claude -p "<prompt>"` as a child process and reads stdout. This is because:

- Claude Code CLI users are already authenticated — no API key to manage
- The Anthropic SDK requires an API key that Claude Code users may not have
- The CLI uses the same model versioning as the user's installed Claude Code

This means `claude` must be in `$PATH` for the claude-code provider to work.

### Adding a New Provider

1. Create `lib/providers/<name>.ts` implementing `LLMClient`
2. Add the provider ID to `ProviderID` in `types.ts`
3. Add a `case` in `createLLMClient()` in `index.ts`
4. Add default model to `DEFAULT_MODELS` in `defaults.ts`
5. Add setup instructions to `PROVIDER_CATALOG` in `defaults.ts`

The entire addition is ~50 lines and one new file.

---

## The 5-Stage Pipeline

The skill creation pipeline runs when a user calls `POST /api/create-skill` (web wizard) or `npx skill-mall confirm-research` (CLI). It produces a complete skill directory from a topic and optional source URLs.

### Stage 1 — Input Validation

The pipeline accepts:

```typescript
interface PipelineInput {
  topic: string           // e.g., "Blue Ocean Strategy"
  sourceUrls: string[]    // 0-10 authoritative URLs
  category: string        // e.g., "business"
  author?: string         // GitHub login
  targetAgents: string[]  // which agents to target
}
```

Validation via Zod. If `sourceUrls` is empty, the Research Engine uses LLM training knowledge and sets `researchUnverified: true` on the result.

### Stage 2 — Research Engine (`lib/research-engine.ts`)

The Research Engine fetches and extracts knowledge:

1. **URL fetch** — uses `cheerio` to parse HTML. Strips `<script>`, `<style>`, nav, footer, ads. Extracts main content text from `<main>`, `<article>`, `.content`, or `<body>` as fallback.
2. **Character cap** — 8,000 chars per URL, 20,000 chars combined. This keeps the extraction prompt within model context limits.
3. **LLM extraction** — sends a structured prompt asking for named tools, frameworks, matrices, canvases, and methodologies. The prompt specifies exact JSON schema output.
4. **Zod validation** — parses LLM output against `ResearchResultSchema`. If validation fails, the prompt is retried once with the error message appended.
5. **researchUnverified flag** — set to `true` when no source URLs were provided (knowledge from training data only).

The extraction prompt enforces key constraints:
- "Only extract tools explicitly named in the content. Do not infer or invent."
- `summary` first sentence must start with an imperative verb
- `artifactType` must be one of: `matrix | canvas | grid | list | flowchart | analysis`

### Stage 3 — Skill Builder (`lib/skill-builder.ts`)

The Skill Builder generates the file tree for each extracted tool. It operates in-memory, producing an `InMemorySkillDirectory`:

```typescript
export interface InMemoryFile {
  path: string
  content: string
}

export interface InMemorySkillDirectory {
  slug: string
  category: string
  files: InMemoryFile[]
}
```

**What's template-generated (deterministic):**
- `SKILL.md` frontmatter structure
- `resources/templates/*.md` — blank artifact templates from `artifactStructure`
- `resources/scripts/*.sh` — shell scripts based on tool type

**What's LLM-powered:**
- `resources/samples/*.md` — completed example artifacts showing realistic output
- `README.md` body text (introduction, use case sections)

The distinction matters for testing: template-generated files can be tested without an LLM mock; LLM-powered files require `MockLLMClient`.

### Stage 4 — Prompt Engine (`lib/prompt-engine.ts`)

The Prompt Engine generates framework-specific prompts for each tool. This is the most LLM-intensive stage — a 20-tool domain generates 60+ LLM calls.

**Framework pre-filter algorithm:**

The full prompt engineering framework catalog has 40+ entries. For each tool, the engine:

1. Looks up `FRAMEWORK_CANDIDATES` — a table mapping artifact types to compatible frameworks:
   ```
   canvas → [Blue Ocean ERRC, SWOT, Boston Matrix, Six Thinking Hats...]
   matrix → [BCG Matrix, Ansoff Matrix, Priority Matrix...]
   analysis → [PEST, Porter's Five Forces, Root Cause Analysis...]
   ```
2. Filters to the 8-12 candidates most appropriate for this artifact type
3. Sends one LLM call asking it to select the best framework from the candidates (not the full 40+ list — this reduces hallucination)
4. Generates the full prompt body using the selected framework

The two-call structure (select framework → generate prompt) produces more coherent prompts than asking the LLM to do both in one call.

**Optimizer integration:**

After generating each prompt, `optimizePrompt()` audits it across 4 dimensions (token efficiency, intent completeness, output clarity, trigger sharpness) and applies improvements. This adds one more LLM call per prompt but significantly improves prompt quality.

### Stage 5 — Validation and Atomic Write (`lib/pipeline.ts`)

**Validation** (`validateSkillDirectory()`):
- `name`: kebab-case, ≤ 64 chars
- `description`: required, ≤ 1024 chars (warns above 150)
- `when_to_use` (if present): ≤ 150 chars
- `README.md`: must be present

**Atomic write** (`atomicWrite()`):
1. Write all files to a temp directory (`<output>.__tmp__`)
2. Rename temp directory to final path (OS-level atomic operation on most filesystems)
3. If any step fails, the temp directory is cleaned up — the original directory is never partially overwritten

This prevents the catalog from containing half-written skills if a write fails mid-operation.

---

## State Management

### Web Wizard State

The multi-step wizard uses `useReducer` + React Context (`WizardContext`) with `sessionStorage` persistence.

**Why not Zustand?** Zustand is a library dependency for state that could be handled with React primitives. The wizard state is simple: a few fields advancing through 4 steps. `useReducer` is sufficient and requires zero additional packages.

**Why not URL state?** The research result contains thousands of characters of JSON (tools, prompts, samples). Encoding this in a URL would produce a URL too long for browsers and would expose sensitive pipeline output in browser history and server logs.

**Why sessionStorage, not localStorage?** Wizard state should not persist across browser sessions. If a user closes the tab mid-wizard, they should start fresh rather than resuming with potentially stale research from yesterday.

**State shape:**
```typescript
type WizardState = {
  step: 'topic' | 'research' | 'review' | 'building' | 'done'
  topic: string
  sourceUrls: string[]
  category: string
  researchResult: ResearchResult | null
  selectedTools: string[]
  buildResult: BuildResult | null
}
```

---

## Database Design

SkillMall uses SQLite via `better-sqlite3` with WAL (Write-Ahead Logging) mode enabled.

### Tables

**`sessions`** — GitHub OAuth sessions
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  github_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT 'read:user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
```
Session IDs are random 32-byte hex strings. Sessions expire after 7 days and are cleaned up lazily.

**`install_events`** — aggregate install analytics, zero PII
```sql
CREATE TABLE IF NOT EXISTS install_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
`agent_type` is the agent ID string (e.g., `claude-code`, `cursor`) or a special value like `search-click:<query>` for search analytics.

**`reviews`** — community skill reviews
```sql
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  reviewer_github_id TEXT NOT NULL,
  reviewer_login TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 150),
  is_generic INTEGER NOT NULL DEFAULT 0,
  has_install_signal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_slug, reviewer_github_id)
);
```
The `UNIQUE` constraint prevents duplicate reviews. `is_generic` flags reviews detected as template-like (low quality signal). `has_install_signal` flags reviews from users who have actually deployed the skill.

**Phase 3 tables** (from `002_phase3.sql`): `skill_feedback`, `improvement_suggestions`, `knowledge_bases`, `knowledge_chunks`, `purchases`, `skill_tiers`.

**Phase 3+ tables** (from later migrations): `fork_events` (from `003_fork_events.sql`), `knowledge_chunks` column retype (from `004_rag_embedding_column.sql`).

### Why SQLite, Not Supabase

SkillMall is designed for self-hosting on a single machine. SQLite with WAL mode:

- **Requires zero infrastructure** — no database server to run, no network to configure
- **Handles realistic load** — WAL mode allows concurrent readers; write throughput matches a team-scale deployment
- **Works offline** — no network dependency during development
- **Is trivially backupable** — `cp data/skillmall.db data/backup.db`

The migration path to Turso (hosted SQLite over libSQL) is straightforward if a deployment outgrows a single machine.

### Migration Runner

`scripts/migrate.js` applies SQL migrations in alphabetical filename order:

1. Creates `schema_migrations` table if absent
2. Reads all `.sql` files from `db/migrations/`
3. Skips files already recorded in `schema_migrations`
4. Applies each pending migration and records it

**Adding a new migration:**

Create `db/migrations/005_<description>.sql` (next number in sequence). Run `npm run db:migrate`. The runner handles the rest. Never edit existing migrations — they are immutable once applied.

### WAL Mode

`better-sqlite3` enables WAL mode immediately after opening the database:

```typescript
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
```

WAL mode allows concurrent readers (the web app serving catalog pages) while a writer (pipeline writing install events) is active. Without WAL, SQLite uses exclusive locking and catalog pages would stall during writes.

---

## Authentication

SkillMall uses GitHub OAuth for authentication. Anonymous users can browse and deploy skills. Authentication unlocks: leaving reviews, viewing the contributor dashboard, triggering self-improvement analysis, and approving improvement suggestions.

### OAuth Flow

```
1. User clicks "Sign In"
         │
         ▼
2. GET /api/auth/login
   - Generates CSRF state token (random 16-byte hex)
   - Stores state token in httpOnly cookie `sm_oauth_state`
   - Redirects to: https://github.com/login/oauth/authorize
       ?client_id=<GITHUB_CLIENT_ID>
       &redirect_uri=<APP_URL>/api/auth/callback/github
       &state=<state_token>
       &scope=read:user
         │
         │ User authorizes on GitHub
         ▼
3. GET /api/auth/callback/github?code=<code>&state=<state>
   - Validates state against `sm_oauth_state` cookie (CSRF prevention)
   - Exchanges code for access token via POST to GitHub
   - Fetches user profile (login, id) via GitHub API
   - Creates session row in SQLite (7-day TTL)
   - Sets `sm_session` httpOnly cookie with session ID
   - Redirects to homepage
```

### Session Cookie Spec

```
Name:     sm_session
Value:    <random 32-byte hex>
HttpOnly: true
SameSite: Strict
Secure:   true (in production; false in dev)
MaxAge:   604800 (7 days)
Path:     /
```

`SameSite=Strict` prevents cross-site request forgery for state-changing requests. `HttpOnly` prevents JavaScript from reading the session token. Sessions are revoked by deleting the row from the `sessions` table.

### Session Resolution

Any route that needs the authenticated user calls:

```typescript
const cookieStore = await cookies()
const token = cookieStore.get('sm_session')?.value
const session = token ? getSession(token) : null
if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
```

`getSession()` queries SQLite and checks `expires_at`. Expired sessions return `null`.

---

## RAG — Retrieval-Augmented Generation

RAG allows attaching document knowledge bases to skills. When a skill is invoked with attached knowledge, relevant document chunks are retrieved and included in context.

### Architecture Decision: Pure JavaScript Cosine Similarity

SkillMall uses **pure JavaScript cosine similarity** for vector search — no native extension. This was an explicit architectural decision after evaluating alternatives:

| Option | Verdict |
|---|---|
| **sqlite-vss** | Abandoned. Broken on Node 22. No musl/Alpine support. |
| **sqlite-vec** | Legitimate successor, but still a native extension with Vercel deployment issues. |
| **LanceDB** | Production-grade, but overkill for <5K chunks per skill. Adds parallel storage system. |
| **Pure JS** | Correct choice for this corpus size. |

**Why pure JS is correct here:** At <5,000 chunks per skill, a linear cosine scan takes 5–15ms. The embedding API round-trip (OpenAI: ~200–400ms) dominates latency. ANN indexes (what sqlite-vss/sqlite-vec provide) only pay off at ~20K+ vectors per corpus — which would require ~7.5M words of attached documentation per skill. This is not a realistic scenario for a skill catalog.

### Implementation

```
Embed phase (CLI):
  source directory
      │
      ▼
  collectFiles() → chunk each file → generateEmbedding() per chunk
  (buffers all embeddings before any DB writes — atomic transaction)
      │
      ▼
  knowledge_bases table (1 row per skill)
  knowledge_chunks table (1 row per chunk, embedding as BLOB)

Retrieve phase (API):
  query string
      │
      ▼
  generateEmbedding(query)
      │
      ▼
  SELECT all chunks for this skill
      │
      ▼
  cosineSimilarity(queryVec, chunkVec) for each chunk
      │
      ▼
  top-K results sorted by score
```

**Buffer alignment note:** When reading embeddings from SQLite, `Buffer.buffer` is a shared pool with non-guaranteed 4-byte alignment. `Float32Array` requires 4-byte alignment. The implementation copies bytes before constructing the Float32Array:

```typescript
function bufferToVector(buf: Buffer): Float32Array {
  // Must copy — buf.byteOffset may not be 4-byte aligned
  const copy = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return new Float32Array(copy)
}
```

### Embedding Providers

| Provider | Model | Key env var |
|---|---|---|
| `openai` | `text-embedding-3-small` (1536 dims) | `OPENAI_API_KEY` |
| `ollama` | `nomic-embed-text` (768 dims) | None (local) |
| `gemini` | `text-embedding-004` | `GEMINI_API_KEY` |
| `claude-code` | Not supported | — |

Provider-specific keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`) are used rather than the shared `SKILL_MALL_API_KEY` to prevent cross-provider authentication failures.

---

## The Nothing Design System

SkillMall uses a custom design vocabulary called "Nothing" — developed to signal precision and technical depth rather than color and marketing energy.

### Core Rules

- **Bracket notation for labels:** `[ SKILLS ]` not "Skills", `[ OK ]` not a checkmark
- **Monospace for UI text:** all labels, tags, and metadata use Space Mono at tracked spacing
- **One accent color:** `--sm-display` (the brightest color in the system). Everything else is grayscale.
- **Doto font for numbers:** install counts, quality scores, timestamps use the Doto variable font
- **No shadows, no gradients:** borders only

### Token System

All design values are CSS custom properties on `:root`:

```css
--sm-bg: #0a0a0a           /* page background */
--sm-surface: #111         /* card backgrounds */
--sm-border: #1f2937       /* all borders */
--sm-primary: #e5e7eb      /* primary text */
--sm-secondary: #9ca3af    /* secondary text */
--sm-disabled: #4b5563     /* placeholder/disabled */
--sm-display: #f9fafb      /* accent: skill names, CTAs */
--sm-accent: #ef4444       /* errors and warnings */
```

### Tailwind v4 Integration

Tailwind v4 uses `@theme` in CSS to define the design system:

```css
@import "tailwindcss";

@theme {
  --color-sm-bg: #0a0a0a;
  --color-sm-surface: #111;
  /* ... */
}
```

This makes tokens available as Tailwind utilities (`bg-sm-bg`, `text-sm-primary`, `border-sm-border`). The `@theme` block also defines `--font-space-mono` and `--font-doto` as custom font references.

### Animation Keyframes

Four keyframes are defined in `globals.css`:

- `reveal` — character-by-character text reveal (skill name on detail page)
- `fade-in` — opacity 0 → 1 for cards
- `slide-up` — transform translateY + fade for panels
- `pulse-border` — border opacity pulse for loading states

---

## Performance Characteristics

### What Is Slow

**LLM calls** dominate all performance budgets:

- Research extraction: 1–2 calls per domain
- Tool selection: 1 call
- Framework selection: 1 call per tool
- Prompt generation: 1 call per tool
- Sample generation: 1 call per tool
- Prompt optimization: 1 call per prompt (3–10 per tool)

For a 20-tool domain: **60–100 LLM calls total**, taking 2–5 minutes end-to-end. This is a known and accepted characteristic. The pipeline is not interactive — it runs in the background and the user reviews the result.

**Embedding generation:** 200–400ms per chunk via OpenAI API. A 100-chunk knowledge base takes 20–40 seconds to embed.

### What Is Fast

**Catalog browsing** is static-generated at build time via Next.js. `getAllSkills()` runs once during `npm run build` — the resulting pages are served from edge cache with no filesystem reads at request time.

**SQLite reads** are synchronous and sub-millisecond for indexed queries. Install count lookups, review fetches, and session validation all complete in <1ms.

**Pure-JS cosine similarity:** 5–15ms for 2,000 vectors. See [RAG section](#rag--retrieval-augmented-generation) for the rationale.

### Static Generation Strategy

The catalog uses `generateStaticParams()` to pre-render all skill detail pages at build time:

```typescript
export async function generateStaticParams() {
  const skills = getAllSkills()
  return skills.map(s => ({ category: s.category, slug: s.slug }))
}
```

This produces one static HTML file per skill. Browsing is instant. Dynamic data (install counts, reviews, quality scores) is fetched client-side with `useEffect` — the page shell renders immediately, data loads in ~50ms.

---

## Security Model

### Input Validation

Every API route that accepts user input uses Zod for validation before processing:

```typescript
// Example from POST /api/feedback
const schema = z.object({
  skillSlug: z.string().min(1),
  satisfaction: z.number().int().min(1).max(5),
  body: z.string().max(200).optional(),
})
const result = schema.safeParse(await req.json())
if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
```

No API route processes unvalidated user input.

### SQL Injection Prevention

**All database queries use parameterized statements.** There are no string-interpolated SQL queries in the codebase.

```typescript
// CORRECT — parameterized
db.prepare('SELECT * FROM reviews WHERE skill_slug = ?').all(slug)

// WRONG — never do this
db.exec(`SELECT * FROM reviews WHERE skill_slug = '${slug}'`)
```

`better-sqlite3`'s prepared statement API makes parameterization the natural path — you cannot pass user input directly to `.exec()` without explicitly building a string.

### Path Traversal Prevention

The codebase extractor (`lib/codebase-extractor.ts`) and the RAG knowledge base collector (`lib/rag/knowledge-base.ts`) both validate that the target directory is within `process.cwd()`:

```typescript
const resolved = path.resolve(targetDir)
if (!resolved.startsWith(process.cwd())) {
  throw new Error('Target directory must be within the project directory')
}
```

Symlinks are skipped entirely (`if (entry.isSymbolicLink()) continue`).

### Author Identity Verification

The self-improvement loop (`lib/self-improvement/applier.ts`) verifies author identity before applying any LLM-generated suggestion:

```typescript
if (skill.author !== authorGithubLogin) {
  return {
    success: false,
    error: `Forbidden: only ${skill.author} can apply suggestions to this skill`,
  }
}
```

This check happens before any LLM call or disk write. A non-author receiving the API response will never trigger an LLM call or file modification.

### Stripe Webhook Security

The Stripe webhook route reads the raw request body via `req.arrayBuffer()` (not `req.json()`, which would parse and re-serialize, breaking signature verification):

```typescript
const rawBody = Buffer.from(await req.arrayBuffer())
const event = stripe.webhooks.constructEvent(rawBody, signature, secret)
```

If `constructEvent` throws (invalid signature, missing secret, tampered body), the request returns 400 without processing the payload. Purchase events are only recorded after successful signature verification.

### Error Logging Policy

Internal error details (API error bodies from LLM providers, database error messages) are logged server-side via `console.error` and never returned to clients. Clients receive generic messages:

```typescript
} catch (err) {
  console.error('[retrieve] retrieval failed:', err)  // full error in server logs
  return NextResponse.json({ error: 'Retrieval failed' }, { status: 500 })  // generic to client
}
```

This prevents leaking API keys, billing information, or database schema details through error responses.

---

## Quality Score System

SkillMall computes a 0–100 quality score for every skill, displayed prominently on skill detail pages and used for catalog ranking. The score is computed by `computeQualityScore()` in `lib/quality-score.ts` across five dimensions:

### Dimension 1 — Description Quality (30 points)

The description is the single most important field in a skill. It determines when agents invoke the skill and what users see in search results.

- **Trigger phrase** (10 pts): Does the description start with an action verb and a recognizable trigger phrase? "Apply Blue Ocean Strategy to..." scores higher than "A skill that helps with..."
- **Length** (10 pts): Is the description between 50 and 150 characters? Too short loses context. Over 150 gets silently truncated by agent listing budgets.
- **Specificity** (10 pts): Does the description name specific deliverables or methodologies? "Apply the ERRC grid and Strategy Canvas" is specific. "Helps with strategy" is not.

### Dimension 2 — Content Completeness (25 points)

Does the skill's content section actually explain how to use it?

- **Length** (10 pts): Is the SKILL.md body at least 200 words?
- **Structure** (10 pts): Does it have headings that organize the content?
- **Examples** (5 pts): Does it include examples or templates?

### Dimension 3 — Linked Skills (15 points)

Does the skill reference related skills via `linked-skills` in frontmatter?

- Having at least one linked skill: 10 pts
- Having three or more: 15 pts
- Skills in isolation are harder to discover and use in context

### Dimension 4 — Resources (20 points)

Does the skill include supporting materials?

- `resources/templates/`: 8 pts — blank artifact templates users can fill in
- `resources/samples/`: 7 pts — completed example outputs
- `resources/prompts/`: 5 pts — framework-specific prompts for different use cases

### Dimension 5 — Metadata Completeness (10 points)

Are all optional metadata fields filled in?

- `version`: 2 pts
- `author`: 3 pts
- `tags` (at least 3): 5 pts

The score is cached and recomputed on each page render — it's not stored in the database. This keeps it always in sync with the actual skill files without requiring a migration.

---

## Skill Catalog Design

### File System as Database

The `skills/` directory is the source of truth for skill content. `lib/skills.ts` parses it at build time (for static generation) and at request time (for API routes that need skill data).

```typescript
// lib/skills.ts (simplified)
export function getAllSkills(): Skill[] {
  const skillsDir = path.join(process.cwd(), 'skills')
  // Read each category directory, each skill directory, parse SKILL.md
  // Returns array of Skill objects with all frontmatter fields parsed
}
```

**Why parse at build time?** The catalog is read-heavy and write-light. A new skill is added via a git commit and PR. The Next.js build runs after merge, pre-rendering all skill detail pages. Subsequent reads are served from edge cache — zero filesystem I/O per request.

**Why not a database for skill content?** Skills need to be contributed via git PR so they can be code-reviewed, history-tracked, and easily forked. A database row is opaque — a markdown file with frontmatter is transparent and diff-able. The filesystem is the right database for content that changes via commit.

### AGENTS.md Auto-Generation

`AGENTS.md` is a catalog index auto-generated by `scripts/sync-agents.sh` on every commit that touches `skills/`. It provides a flat list of all skills for agent systems that can ingest a single document. The pre-commit hook runs this automatically — developers never edit `AGENTS.md` manually.

### Skill Validation

`bash scripts/validate-skill.sh <path>` validates a skill's SKILL.md against the AgentSkills spec:

- `name`: required, kebab-case, ≤ 64 chars
- `description`: required, warns above 150 chars
- `when_to_use` (if present): ≤ 150 chars
- `metadata.version`: warns if missing
- `metadata.category`: warns if missing
- `metadata.author`: warns if missing
- `README.md`: must be present in the same directory

The `--strict` flag treats warnings as errors, used in CI to enforce quality on PRs.

---

## Dependency Architecture

### Why better-sqlite3, Not node-sqlite3

`better-sqlite3` uses a synchronous API by design. SQLite is a single-process database — async wrappers add complexity without benefit. Synchronous queries are simpler to reason about, easier to test, and avoid the need for connection pool management.

`node-sqlite3` (the alternative) uses callbacks and a thread pool, which introduces subtle ordering bugs when multiple queries run concurrently in the same Node.js process.

### Why next-mdx-remote for Documentation

The `/docs` section (Phase 4 infrastructure) uses `next-mdx-remote` to render markdown files as Next.js pages. This provides:

- **Static generation**: docs pages are pre-rendered at build time from `.md` files
- **MDX support**: React components can be embedded in documentation
- **Syntax highlighting**: via Shiki (configured in the MDX provider)
- **No build-time coupling**: docs files can be added without touching Next.js page files

### CLI Package Structure

The CLI is a separate npm package (`cli/package.json`) that imports from the root `lib/` via path aliases. This avoids monorepo complexity (no npm workspaces, no Turborepo) while keeping the CLI and web app in a single repository.

```json
// cli/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["../*"]
    }
  },
  "include": ["src/**/*", "../lib/**/*"]
}
```

`tsup` bundles the CLI into `cli/dist/index.js`. One critical constraint: modules that use `better-sqlite3` (a CJS native extension) must be **dynamically imported** inside command functions — not at the top level of the file. Static imports pull `better-sqlite3` into the ESM bundle at startup, crashing all CLI commands even if the invoked command doesn't use the database.

```typescript
// CORRECT — lazy load DB-dependent modules
export async function attachKnowledgeCommand(args: string[]) {
  const { createKnowledgeBase } = await import('@/lib/rag/knowledge-base.js')
  // ...
}

// WRONG — static import crashes all CLI commands at startup
import { createKnowledgeBase } from '@/lib/rag/knowledge-base.js'
```

---

## Next Steps

- **[API Reference](./api-reference.md)** — all routes with schemas and curl examples
- **[CLI Reference](./cli-reference.md)** — all commands with expected outputs
- **[Contributing Guide](./contributing.md)** — how to contribute skills and code
- **[Extending SkillMall](./extending.md)** — adding providers, commands, quality dimensions
