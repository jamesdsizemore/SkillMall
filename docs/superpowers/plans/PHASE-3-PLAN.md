# Phase 3 Plan — Advanced Capabilities

**STOP. Read this entire document before touching a single file.**

This document is self-contained. Every implementation decision is made here. Every TypeScript type, SQL schema, API contract, algorithm, and file structure is embedded directly. You do not need to read any other document to execute this plan. If something seems underspecified, re-read this document. If it is genuinely missing, stop and surface the gap — do not invent.

---

## Gate Into Phase 3

**All of the following must be true before any Phase 3 task activates. No exceptions.**

- Phase 2 completion audit (T114) returned `full_outcome_complete: true`
- James confirms Phase 2 is stable in production (no critical bugs open)
- At least 200 skills in the catalog
- At least 500 community members (GitHub-authenticated accounts with at least one install event)
- Ratings system has been operating for at least 3 months with consistent engagement
- Skill Testing Framework (Phase 2 — see below) has test coverage on at least 50 skills

**Do not scope, estimate, or plan detailed Worker task specs until these conditions are verified.** This plan contains the outcome statements, architecture decisions, and rough task breakdown only. Detailed `allowed_files`, `verify`, and `stop_if` blocks for each Worker task are written during the Phase 3 goal-prep session, informed by the actual state of Phase 2 at that time. The architecture and schemas below are decided now and must be used when the time comes.

---

## Goal

Add the four advanced capabilities that require Phase 2 infrastructure: skill chains, RAG-enhanced skills, self-improvement via structured feedback, and the marketplace.

## Outcome

1. **Skill Chain Builder:** users compose multi-skill workflows on a visual canvas; the output is a deployable wrapper skill in `skills/chains/<chain-name>/` that orchestrates the chain
2. **RAG-Enhanced Skills:** users attach document knowledge bases to any skill via CLI; retrieval runs at agent invocation time using local SQLite vector storage (or embedded via the `vss0` extension)
3. **Skill Self-Improvement Loop:** structured user feedback (after 10+ submissions) triggers LLM-generated improvement suggestions; author reviews and approves all suggestions before any change is applied
4. **Skill Marketplace:** three-tier model (free, sponsored, premium); Stripe for payment processing; launch conditions enforced as code gates

## Completion Proof

- Skill Chain Builder: create a chain from at least 2 connected skills via UI canvas; wrapper SKILL.md validates against AgentSkills spec; chain executes correctly in a real agent session
- RAG: `npx skill-mall attach-knowledge business/blue-ocean-strategy ./company-docs/` embeds documents; queries retrieve relevant chunks; SKILL.md frontmatter updated with `rag_enabled: true`
- Self-improvement: 10+ feedback items on a test skill trigger suggestion generation; author approval gate works (no automatic writes ever happen)
- Marketplace: at least 1 premium skill listed and purchasable via Stripe test mode; launch conditions gated in code
- All Phase 3 doc deliverables >= 500 words each

## Likely Misfire

Launching the Marketplace before the launch conditions are met in code. Building RAG before establishing the vector storage approach. Building self-improvement without verifying the Phase 2 feedback storage schema supports it.

## Non-Goals for Phase 3

- Prompt ELO Tester (permanently deferred — requires stable test suite with > 5 test cases per skill for at least 50 skills before ELO rankings can be trusted)
- Any feature not listed in the Phase 3 section of the feature spec

---

## Development Workflow

Same 16-step loop as Phases 1 and 2. Security check is mandatory for every Phase 3 Worker task — Phase 3 introduces Stripe payments, vector storage, and automated code generation paths.

---

## Stack Additions for Phase 3

| Addition | Package | Purpose |
|---|---|---|
| React Flow | `reactflow` | Visual canvas for Skill Chain Builder |
| SQLite VSS | `sqlite-vss` or `@vlcn.io/crsqlite-wasm` | Vector similarity search for RAG (local) |
| Stripe | `stripe` + `@stripe/stripe-js` | Marketplace payments |
| Stripe CLI | local dev tool | Webhook testing in development |

**Vector storage decision:** use SQLite-VSS (`sqlite-vss` extension for `better-sqlite3`) for local-first vector storage. This keeps everything in SQLite — no separate vector database. The VSS extension adds a virtual table for approximate nearest-neighbor search. For production deployments that need scale, the migration path is to Turso (LibSQL-compatible, supports VSS).

**No pgvector.** The Phase 2 decision to use SQLite carries through Phase 3.

---

## SQLite Schema Additions for Phase 3

### Migration: `db/migrations/002_phase3.sql`

```sql
-- Feedback for self-improvement loop
CREATE TABLE IF NOT EXISTS skill_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  reviewer_github_id TEXT NOT NULL,
  satisfaction INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  body TEXT CHECK (length(body) <= 200),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_slug ON skill_feedback(skill_slug);

-- Improvement suggestions (generated when feedback >= 10)
CREATE TABLE IF NOT EXISTS improvement_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  dimension TEXT NOT NULL,         -- 'description' | 'instructions' | 'templates' | 'prompts' | 'metadata'
  suggestion TEXT NOT NULL,
  pattern TEXT NOT NULL,           -- the feedback pattern that triggered this suggestion
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- RAG knowledge bases
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,             -- random UUID
  skill_slug TEXT NOT NULL UNIQUE,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  chunk_size INTEGER NOT NULL DEFAULT 512,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Knowledge chunks (vector storage via VSS extension)
-- Note: VSS virtual table defined separately after extension load
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  source_file TEXT NOT NULL
);

-- Marketplace: purchase records
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,             -- Stripe payment intent ID
  skill_slug TEXT NOT NULL,
  buyer_github_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT NOT NULL,
  purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_github_id);
CREATE INDEX IF NOT EXISTS idx_purchases_slug ON purchases(skill_slug);

-- Marketplace: skill tiers
CREATE TABLE IF NOT EXISTS skill_tiers (
  skill_slug TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'sponsored', 'premium')),
  price_cents INTEGER,             -- null for free/sponsored
  sponsor_name TEXT,               -- for sponsored tier
  creator_github_id TEXT,          -- for premium tier
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### TypeScript Types for Phase 3 (`lib/db/types.ts` additions)

```typescript
export interface SkillFeedback {
  id: number
  skill_slug: string
  reviewer_github_id: string
  satisfaction: number
  body: string | null
  created_at: string
}

export interface ImprovementSuggestion {
  id: number
  skill_slug: string
  dimension: 'description' | 'instructions' | 'templates' | 'prompts' | 'metadata'
  suggestion: string
  pattern: string
  status: 'pending' | 'approved' | 'rejected'
  generated_at: string
  resolved_at: string | null
}

export interface KnowledgeBase {
  id: string
  skill_slug: string
  embedding_model: string
  chunk_size: number
  chunk_count: number
  created_at: string
}

export interface KnowledgeChunk {
  id: number
  knowledge_base_id: string
  chunk_text: string
  chunk_index: number
  source_file: string
}

export interface Purchase {
  id: string
  skill_slug: string
  buyer_github_id: string
  amount_cents: number
  currency: string
  stripe_session_id: string
  purchased_at: string
}

export interface SkillTier {
  skill_slug: string
  tier: 'free' | 'sponsored' | 'premium'
  price_cents: number | null
  sponsor_name: string | null
  creator_github_id: string | null
  updated_at: string
}
```

---

## Skill Chain Builder

### What it produces

A wrapper skill at `skills/chains/<chain-name>/`:

```
skills/chains/blue-ocean-to-okr/
├── SKILL.md           # Chain skill with chain metadata in frontmatter
├── README.md          # Documents the chain: steps, handoffs, expected output
└── chain.json         # Machine-readable chain definition
```

### chain.json format

```typescript
interface Chain {
  name: string
  slug: string
  steps: ChainStep[]
}

interface ChainStep {
  order: number
  skillSlug: string               // 'category/skill-name'
  usesOutput?: string             // output file from previous step to pass forward
  passesAs: 'context_append' | 'context_replace' | 'named_variable'
  namedVariable?: string          // if passesAs === 'named_variable'
  instructions?: string           // additional instructions for this step
}
```

### SKILL.md frontmatter additions for chain skills

```yaml
---
name: blue-ocean-to-okr-chain
description: "Run a complete Blue Ocean Strategy analysis and convert insights to OKRs."
metadata:
  chain: true
  chain_steps:
    - skill: business/blue-ocean-strategy
      uses_output: strategy-canvas-proposed.md
      passes_as: context_append
    - skill: productivity/phased-implementation-plan
      receives: strategy-canvas-proposed.md
      instructions: "Use the proposed Strategy Canvas as strategic context for OKR setting"
---
```

### Visual Canvas

Use React Flow for the drag-and-drop canvas. Each node represents a skill. Directed edges represent data flow between skills. Clicking an edge opens a configuration panel for the handoff type.

**Canvas interactions:**
- Drag skills from a sidebar panel onto the canvas
- Draw connections between skill nodes by dragging from one node's output handle to the next node's input handle
- Click a connection to configure: `passesAs`, `namedVariable`, `instructions`
- Click a node to see the skill's description, available outputs, and expected inputs

**Page:** `/skills/chains/new` — the chain builder canvas

### File: `lib/chains.ts`

```typescript
import fs from 'fs'
import path from 'path'
import type { InMemoryFile, SkillMetadata } from './skill-builder'

interface ChainStep {
  order: number
  skillSlug: string
  usesOutput?: string
  passesAs: 'context_append' | 'context_replace' | 'named_variable'
  namedVariable?: string
  instructions?: string
}

interface Chain {
  name: string
  slug: string
  steps: ChainStep[]
}

/** Generate a chain skill directory from a chain definition. Does not write to disk. */
export function buildChainDirectory(chain: Chain, meta: SkillMetadata): InMemoryFile[] {
  const stepDescriptions = chain.steps
    .sort((a, b) => a.order - b.order)
    .map((s, i) => `${i + 1}. ${s.skillSlug}${s.usesOutput ? ` (uses: ${s.usesOutput})` : ''}`)
    .join('\n')

  const frontmatter = `---
name: ${chain.slug}
description: "Run a coordinated ${chain.name} analysis using ${chain.steps.length} skills in sequence."
license: MIT
metadata:
  version: "1.0.0"
  chain: true
  chain_steps:
${chain.steps.sort((a, b) => a.order - b.order).map(s => `    - skill: ${s.skillSlug}
      passes_as: ${s.passesAs}
${s.usesOutput ? `      uses_output: ${s.usesOutput}\n` : ''}${s.instructions ? `      instructions: "${s.instructions}"\n` : ''}`).join('')}
---`

  const skillMd = `${frontmatter}

# ${chain.name}

A skill chain that orchestrates ${chain.steps.length} skills in sequence.

## Steps

${stepDescriptions}

## Usage

Invoke this chain to run the full sequence. Each step's output is passed to the next step as context.
`

  const chainJson = JSON.stringify(chain, null, 2)

  const readme = `# ${chain.name} Chain

## Steps

${stepDescriptions}

## How to use

Deploy this chain skill, then invoke it: the agent runs each skill in sequence,
passing outputs forward as specified in chain.json.
`

  return [
    { path: 'SKILL.md', content: skillMd },
    { path: 'chain.json', content: chainJson },
    { path: 'README.md', content: readme },
  ]
}
```

### API Route: `POST /api/create-chain`

```typescript
// Body: { chain: Chain; metadata: SkillMetadata }
// Auth: not required
// Returns: { slug: string; path: string; fileCount: number }
// Validates chain SKILL.md against AgentSkills spec before writing
// Uses atomicWrite from lib/pipeline.ts
```

---

## RAG-Enhanced Skills

### How it works

1. User runs `npx skill-mall attach-knowledge <slug> ./docs/`
2. CLI reads all supported files (Markdown, txt, PDF text via simple extraction)
3. Chunks each file into 512-token segments
4. Generates embeddings using the configured LLM provider's embedding endpoint
5. Stores embeddings in SQLite via the VSS extension
6. Updates SKILL.md frontmatter with `rag_enabled: true` and `knowledge_base_id`

At agent invocation time, the agent (or user) calls `POST /api/retrieve` with the current query, which returns the top-5 most relevant chunks. These are prepended to the skill context.

### Embedding Strategy

**Provider-specific embedding:**

| Provider | Embedding call | Dimensions |
|---|---|---|
| openai | `openai.embeddings.create({ model: 'text-embedding-3-small', input })` | 1536 |
| claude-code | Not supported natively — fallback to OpenAI or Ollama for embeddings | — |
| ollama | `POST http://localhost:11434/api/embeddings { model: 'nomic-embed-text', prompt }` | 768 |
| gemini | `genAI.getGenerativeModel({ model: 'text-embedding-004' }).embedContent(text)` | 768 |
| groq | Not supported — use OpenAI-compatible endpoint or fallback | — |

**For providers that don't support embeddings:** the CLI prints an error and instructs the user to configure a separate embedding provider. A `SKILL_MALL_EMBEDDING_PROVIDER` env var can specify a different provider for embeddings (defaults to the main provider).

### File: `lib/rag/embeddings.ts`

```typescript
import type { LLMClient, ProviderID } from '../providers'

export interface EmbeddingResult {
  vector: number[]
  tokenCount: number
}

/** Generate an embedding vector for the given text. Not all providers support this. */
export async function generateEmbedding(
  text: string,
  provider: ProviderID,
  apiKey?: string
): Promise<EmbeddingResult> {
  if (provider === 'openai' || provider === 'groq') {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({
      apiKey,
      baseURL: provider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined,
    })
    const result = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return {
      vector: result.data[0].embedding,
      tokenCount: result.usage.prompt_tokens,
    }
  }

  if (provider === 'ollama') {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    })
    const data = await res.json() as { embedding: number[] }
    return { vector: data.embedding, tokenCount: Math.ceil(text.split(/\s+/).length * 1.35) }
  }

  if (provider === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey!)
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(text)
    return { vector: result.embedding.values, tokenCount: Math.ceil(text.split(/\s+/).length * 1.35) }
  }

  throw new Error(`Provider "${provider}" does not support embeddings. Set SKILL_MALL_EMBEDDING_PROVIDER to openai or ollama.`)
}
```

### File: `lib/rag/chunker.ts`

```typescript
/** Split text into chunks of approximately targetTokens tokens. */
export function chunkText(text: string, targetTokens = 512): string[] {
  const words = text.split(/\s+/)
  const wordsPerChunk = Math.floor(targetTokens / 1.35)  // rough token-to-word ratio
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '))
  }

  return chunks.filter(c => c.trim().length > 20)  // skip near-empty chunks
}

/** Read and extract text from supported file types. */
export function extractText(filePath: string): string {
  const fs = require('fs')
  const content = fs.readFileSync(filePath, 'utf-8')
  // For now: read as plain text. PDF support can be added later.
  return content
}
```

### CLI: `npx skill-mall attach-knowledge <slug> <dir>`

```typescript
// 1. Find skill in catalog
// 2. Create knowledge base entry in SQLite
// 3. Walk <dir> recursively for .md, .txt files
// 4. Chunk each file
// 5. Generate embedding for each chunk (via generateEmbedding)
// 6. Store in knowledge_chunks table
// 7. Store embedding vector in VSS virtual table
// 8. Update SKILL.md frontmatter with rag_enabled: true, knowledge_base_id: <id>
// 9. Print: "Embedded X chunks from Y files"
```

### API Route: `POST /api/retrieve`

```typescript
// Body: { skillSlug: string; query: string; topK?: number }
// Generates embedding for query
// Runs VSS nearest-neighbor search against knowledge_chunks for this skill
// Returns: { chunks: Array<{ text: string; source: string; similarity: number }> }
// Default topK: 5
```

---

## Skill Self-Improvement Loop

### Feedback Collection

After deploying a skill, users may submit structured feedback via the catalog UI:

- **Satisfaction:** 1–5 stars
- **Body:** free text, max 200 chars, optional field. Prompt: "What worked and what did not?"
- **Opt-in only.** Never prompted automatically.

**Trigger:** when a skill accumulates >= 10 feedback instances, the system runs the analysis.

### Feedback Analysis (LLM)

```typescript
// lib/self-improvement/analyzer.ts

interface FeedbackPattern {
  dimension: 'description' | 'instructions' | 'templates' | 'prompts' | 'metadata'
  pattern: string       // the observed pattern across feedback items
  suggestion: string    // specific change recommendation
}

async function analyzeFeedback(
  skill: Skill,
  feedback: SkillFeedback[],
  client: LLMClient
): Promise<FeedbackPattern[]>
```

**Analysis prompt:**

```
You are analyzing user feedback for an AI agent skill to generate improvement suggestions.

Skill: ${skill.name}
Description: "${skill.description}"
Category: ${skill.category}

User feedback (${feedback.length} items):
${feedback.map(f => `- Rating: ${f.satisfaction}/5. ${f.body ?? '(no text)'}`).join('\n')}

Identify patterns in the feedback and generate specific improvement suggestions.
For each suggestion, name the skill dimension it applies to and the specific change.

Return JSON:
{
  "patterns": [
    {
      "dimension": "description|instructions|templates|prompts|metadata",
      "pattern": "<the feedback pattern you observed>",
      "suggestion": "<specific actionable change to make>"
    }
  ]
}

Rules:
- Only generate suggestions when the feedback pattern is clear (appears in >= 30% of responses)
- Be specific: not "improve the instructions" but "add a validation step after step 3 that checks..."
- Do not suggest changes to things that feedback doesn't mention
```

### Approval Gate

All suggestions are stored in `improvement_suggestions` with `status: 'pending'`. The skill author sees them at `/skills/<category>/<slug>/improvements`. Each suggestion can be approved or rejected. Only approved suggestions are applied.

**No automatic writes ever happen.** The system never edits a SKILL.md, template, or prompt file without author approval.

### API Routes

**GET /api/improvements/[skillSlug]** — list pending suggestions (auth required, must be skill author)
**POST /api/improvements/[id]/approve** — approve and apply a suggestion (auth required, must be skill author)
**POST /api/improvements/[id]/reject** — reject a suggestion (auth required, must be skill author)

### Applying Approved Suggestions

When a suggestion is approved:
1. Load current file content
2. Apply the suggestion via LLM call ("Given this current content and this suggestion, generate the updated content")
3. Write to disk
4. Bump `metadata.version` in SKILL.md (patch if description/clarity change, minor if new instructions added)
5. Record `resolved_at` timestamp on the suggestion

---

## Skill Marketplace

### Three-Tier Model

| Tier | Description | Revenue |
|---|---|---|
| `free` | All current public skills. Permanent. Never paywalled. | None |
| `sponsored` | Company funds maintenance. Skill remains free to use. | Attribution badge only |
| `premium` | Creator charges for specialized skills. | 70% creator / 20% ops / 10% community fund |

### Launch Conditions (code-enforced gate)

```typescript
// lib/marketplace/gate.ts

interface LaunchConditions {
  minSkillCount: number         // 200
  minCommunityMembers: number   // 500
  minRatingsMonths: number      // 3
  minSkillsWithTests: number    // 50
}

const CONDITIONS: LaunchConditions = {
  minSkillCount: 200,
  minCommunityMembers: 500,
  minRatingsMonths: 3,
  minSkillsWithTests: 50,
}

export async function checkMarketplaceReady(db: Database): Promise<{
  ready: boolean
  conditions: Record<keyof LaunchConditions, { required: number; current: number; met: boolean }>
}>
```

**The Marketplace UI tabs, Stripe checkout, and premium skill listings are hidden behind this gate.** If `checkMarketplaceReady()` returns `ready: false`, the marketplace section does not render — not a disabled state, not a "coming soon" — it simply does not exist in the UI.

### Stripe Integration

**Environment variables:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Payment flow:**
1. User clicks "Purchase" on a premium skill
2. API creates Stripe Checkout Session
3. User completes payment on Stripe-hosted page
4. Stripe webhook fires `checkout.session.completed`
5. Webhook handler records purchase in SQLite `purchases` table
6. User is granted access

**Webhook validation:** always verify the Stripe webhook signature using `stripe.webhooks.constructEvent()`. Reject any webhook that doesn't verify.

### Revenue Split Implementation

The 70/20/10 split is tracked in the `purchases` table. Actual disbursement to creators is a manual process (Stripe Connect or direct bank transfer) — Phase 3 only tracks the purchases, not the automated payouts.

### File: `lib/marketplace/payments.ts`

```typescript
import Stripe from 'stripe'
import { getDb } from '../db/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
})

export async function createCheckoutSession(
  skillSlug: string,
  priceCents: number,
  buyerGithubLogin: string
): Promise<string> {  // returns checkout URL
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `SkillMall: ${skillSlug}` },
        unit_amount: priceCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${skillSlug}?purchased=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${skillSlug}`,
    metadata: { skillSlug, buyerGithubLogin },
  })
  return session.url!
}

export function handleWebhook(payload: Buffer, signature: string): void {
  const event = stripe.webhooks.constructEvent(
    payload, signature, process.env.STRIPE_WEBHOOK_SECRET!
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { skillSlug, buyerGithubLogin } = session.metadata!

    const db = getDb()
    db.prepare(`
      INSERT OR IGNORE INTO purchases (id, skill_slug, buyer_github_id, amount_cents, stripe_session_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(session.id, skillSlug, buyerGithubLogin, session.amount_total, session.id)
  }
}
```

---

## Rough Task Breakdown (Detail Written During Goal-Prep)

The following task IDs are reserved for Phase 3. Detailed `allowed_files`, `verify`, and `stop_if` blocks are written during the Phase 3 goal-prep session.

### T201 — SQLite Phase 3 Migration

**Objective:** Apply `db/migrations/002_phase3.sql`. Install SQLite-VSS extension. Verify all new tables created and VSS available.

**Key decision:** install `sqlite-vss` via npm. Load the extension in `lib/db/client.ts` using `db.loadExtension()`. If `loadExtension` is not available (Electron sandbox), document the workaround.

---

### T202 — Skill Chain Builder (Canvas + API)

**Objective:** Visual canvas at `/skills/chains/new` using React Flow. `POST /api/create-chain` route that validates and writes the chain skill directory. Chain SKILL.md validates against AgentSkills spec.

**Implementation:** Follow the "Skill Chain Builder" section — Chain TypeScript interfaces, `lib/chains.ts`, `buildChainDirectory`, SKILL.md frontmatter format, chain.json format, React Flow canvas interactions.

---

### T203 — RAG Knowledge Attachment (CLI)

**Objective:** `npx skill-mall attach-knowledge <slug> <dir>` command. Chunk files, generate embeddings, store in SQLite+VSS, update SKILL.md frontmatter.

**Implementation:** Follow the "RAG-Enhanced Skills" section — `lib/rag/embeddings.ts`, `lib/rag/chunker.ts`, CLI command, `POST /api/retrieve` route, SQLite VSS query.

**Provider caveat:** Claude Code CLI does not support embeddings. Users with claude-code as their provider must set `SKILL_MALL_EMBEDDING_PROVIDER=ollama` (or openai) for RAG to work. Surface this clearly in CLI output.

---

### T204 — Self-Improvement Feedback Collection

**Objective:** Feedback form on skill detail page (opt-in, 1-5 satisfaction + 200-char text). `POST /api/feedback` API route. Trigger analysis when count reaches 10.

**Implementation:** Follow the "Skill Self-Improvement Loop" section — `skill_feedback` table (from migration T201), feedback collection UI, analysis trigger, `lib/self-improvement/analyzer.ts`, suggestion storage in `improvement_suggestions` table, suggestion review UI at `/skills/<category>/<slug>/improvements`.

---

### T205 — Self-Improvement Approval and Application

**Objective:** Author reviews pending suggestions, approves or rejects each. Approved suggestions applied via LLM-generated edit with version bump.

**Strict constraint:** no automatic writes. Ever. The approval route must verify the authenticated user is the skill author before applying any change. Use `skill.author` from SKILL.md frontmatter matched against `session.github_login`.

---

### T206 — Marketplace Launch Gate and Tier System

**Objective:** Implement `checkMarketplaceReady()` gate. `skill_tiers` table (from migration T201). Admin route to set skill tier. UI renders marketplace UI only when gate passes.

---

### T207 — Stripe Payment Integration

**Objective:** `createCheckoutSession`, Stripe webhook handler, purchase record in SQLite, entitlement check on premium skill access.

**Stripe CLI for local webhook testing:** add `stripe listen --forward-to localhost:3000/api/webhooks/stripe` to dev setup docs. Never test webhooks by directly calling the webhook endpoint — always use the Stripe CLI to simulate events.

---

### T208 — Phase 3 Documentation

**Objective:** Write all Phase 3 doc deliverables >= 500 words each.

- `docs/user/skill-chains.md` — chain builder walkthrough, canvas interactions, chain SKILL.md format
- `docs/user/rag-enhanced-skills.md` — knowledge attachment guide, provider embedding support matrix, retrieval API usage
- `docs/user/self-improvement-loop.md` — feedback submission, how suggestions are generated, approval workflow
- `docs/user/marketplace.md` — three tiers, pricing model, revenue split, launch conditions
- `docs/reference/chain-format.md` — chain SKILL.md frontmatter spec, chain.json format spec

---

### T209 — Phase 3 Completion Audit (Judge)

**Objective:** Audit whether Phase 3 is complete. All T201–T208 done, all tests passing, build clean, launch conditions verified if marketplace active.

---

## Complete API Surface for Phase 3

Every API route Phase 3 adds. Each route inherits the Phase 1/2 error response conventions (400 invalid_input, 401 unauthorized, 403 forbidden, 422 pipeline_failed, 503 provider_not_configured).

### Chain Routes

**POST /api/create-chain**
```typescript
// Body: {
//   chain: Chain                  // name, slug, steps[]
//   metadata: SkillMetadata       // slug, category, tags, targetAgents
// }
// Returns: { slug: string; path: string; fileCount: number }
// Validates chain SKILL.md with validateSkillDirectory before writing
// Writes atomically via atomicWrite to skills/chains/<slug>/
// Error 422 if validation fails (returns errors array)
```

**GET /api/chains**
```typescript
// Returns: Array<{ slug: string; name: string; steps: number; skills: string[] }>
// Lists all skills in skills/chains/ with their step count and skill slugs
```

**GET /api/chains/[slug]**
```typescript
// Returns: { skill: Skill; chain: Chain } — the skill metadata + parsed chain.json
// 404 if chain not found
```

### RAG Routes

**POST /api/retrieve**
```typescript
// Body: { skillSlug: string; query: string; topK?: number }
// Auth: not required — retrieval is read-only
// Generates query embedding using configured embedding provider
// Runs VSS nearest-neighbor search
// Returns: {
//   chunks: Array<{
//     text: string
//     source: string           // source filename
//     chunkIndex: number
//     similarity: number       // cosine similarity 0.0-1.0
//   }>
// }
// Default topK: 5, max: 20
// 503 if no embedding provider configured
// 404 if skill has no knowledge base
```

**DELETE /api/knowledge-bases/[skillSlug]**
```typescript
// Auth: required (must be skill author)
// Deletes all chunks and the knowledge base entry
// Removes rag_enabled and knowledge_base_id from SKILL.md frontmatter
// Returns: { success: true; chunksDeleted: number }
```

### Feedback Routes

**POST /api/feedback**
```typescript
// Body: { skillSlug: string; satisfaction: number (1-5); body?: string (max 200 chars) }
// Auth: required (GitHub session)
// Returns: { feedback: SkillFeedback; analysisTriggered: boolean }
// analysisTriggered: true when submission count just hit 10 (triggers background analysis)
// Idempotent: same user can submit feedback multiple times (creates new rows, not upsert)
```

**GET /api/improvements/[skillSlug]**
```typescript
// Auth: required (must be skill author — session.github_login === skill.author)
// Returns: {
//   suggestions: ImprovementSuggestion[]
//   feedbackCount: number
//   analysisReady: boolean     // true when feedbackCount >= 10
// }
```

**POST /api/improvements/[id]/approve**
```typescript
// Auth: required (must be skill author)
// Applies the suggestion to the relevant skill file via LLM-generated edit
// Bumps version in SKILL.md (patch for clarity, minor for instructions/content)
// Sets suggestion status to 'approved', resolved_at to now()
// Returns: { success: boolean; newVersion: string; changedFile: string }
```

**POST /api/improvements/[id]/reject**
```typescript
// Auth: required (must be skill author)
// Sets status to 'rejected', resolved_at to now()
// Returns: { success: true }
```

### Marketplace Routes

**GET /api/marketplace/status**
```typescript
// No auth required
// Returns: {
//   ready: boolean
//   conditions: {
//     skillCount: { required: 200; current: number; met: boolean }
//     communityMembers: { required: 500; current: number; met: boolean }
//     ratingsMonths: { required: 3; current: number; met: boolean }
//     skillsWithTests: { required: 50; current: number; met: boolean }
//   }
// }
```

**POST /api/marketplace/checkout**
```typescript
// Body: { skillSlug: string }
// Auth: required
// Returns: { checkoutUrl: string }
// 403 if skill is not premium
// 402 if marketplace not ready (launch conditions not met)
// Creates Stripe Checkout Session, returns redirect URL
```

**POST /api/webhooks/stripe**
```typescript
// Raw body required (do not parse as JSON — Stripe needs raw bytes for signature verification)
// Validates Stripe-Signature header using stripe.webhooks.constructEvent()
// 400 if signature invalid
// Handles: checkout.session.completed → records purchase in SQLite
// Returns 200 immediately; processing is synchronous
// CRITICAL: add export const config = { api: { bodyParser: false } } to this route
```

**GET /api/marketplace/entitlement**
```typescript
// Body: { skillSlug: string }  (query param)
// Auth: required
// Returns: { hasAccess: boolean; tier: 'free' | 'sponsored' | 'premium' | null }
// hasAccess is always true for free/sponsored skills
// For premium: true if purchase record exists for this buyer + skill
```

---

## Complete File Tree for Phase 3 (new files only)

```
app/
  skills/
    chains/
      new/
        page.tsx                  # React Flow canvas
  api/
    chains/
      route.ts                    # GET all chains
      [slug]/
        route.ts                  # GET single chain
    create-chain/
      route.ts                    # POST create chain
    retrieve/
      route.ts                    # POST RAG retrieval
    knowledge-bases/
      [skillSlug]/
        route.ts                  # DELETE knowledge base
    feedback/
      route.ts                    # POST submit feedback
    improvements/
      [skillSlug]/
        route.ts                  # GET suggestions for skill
      [id]/
        approve/
          route.ts                # POST approve suggestion
        reject/
          route.ts                # POST reject suggestion
    marketplace/
      status/
        route.ts                  # GET launch conditions
      checkout/
        route.ts                  # POST create Stripe session
      entitlement/
        route.ts                  # GET access check
    webhooks/
      stripe/
        route.ts                  # POST Stripe webhook

lib/
  chains.ts                       # buildChainDirectory
  rag/
    embeddings.ts                 # generateEmbedding
    chunker.ts                    # chunkText, extractText
    knowledge-base.ts             # createKnowledgeBase, attachKnowledge, retrieveChunks
  self-improvement/
    analyzer.ts                   # analyzeFeedback
    applier.ts                    # applySuggestion (LLM-based edit + version bump)
    feedback.ts                   # createFeedback, getFeedbackCount, getRecentFeedback
  marketplace/
    gate.ts                       # checkMarketplaceReady
    payments.ts                   # createCheckoutSession, handleWebhook
    entitlement.ts                # hasAccess, getTier

components/
  skill-mall/
    chains/
      ChainCanvas.tsx             # React Flow canvas
      ChainNodePanel.tsx          # Sidebar with skill search
      ChainEdgeConfig.tsx         # Connection configuration panel
    improvements/
      SuggestionCard.tsx
      SuggestionList.tsx

cli/
  src/
    commands/
      attach-knowledge.ts
      chain.ts                    # npx skill-mall chain create <name>

db/
  migrations/
    002_phase3.sql                # All Phase 3 tables

docs/
  user/
    skill-chains.md
    rag-enhanced-skills.md
    self-improvement-loop.md
    marketplace.md
  reference/
    chain-format.md
```

---

## Security Requirements for Phase 3

Every Phase 3 route that touches sensitive operations has stricter security requirements than Phase 1/2.

### Author verification pattern

Before applying any improvement suggestion or modifying a skill, always verify:

```typescript
async function verifySkillAuthor(skillSlug: string, session: Session): Promise<void> {
  const skill = getAllSkills().find(s => s.slug === skillSlug)
  if (!skill) throw new Error('Skill not found')
  if (skill.author !== session.github_login) {
    throw new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }
}
```

### Stripe webhook security

```typescript
// In app/api/webhooks/stripe/route.ts:
export const config = { api: { bodyParser: false } }  // MUST be present

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer()
  const payload = Buffer.from(body)
  const signature = req.headers.get('Stripe-Signature')!

  try {
    // This throws if signature is invalid — never skip this check
    stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }
  // ... handle event
}
```

### RAG content validation

When attaching knowledge, validate that:
1. The target directory is within the current working directory (no path traversal)
2. Files are within size limits (max 5MB per file, max 50MB total per knowledge base)
3. File extensions are from the allowed set (.md, .txt — no executables)

```typescript
function validateKnowledgePath(targetDir: string): void {
  const resolved = path.resolve(targetDir)
  const cwd = process.cwd()
  if (!resolved.startsWith(cwd)) {
    throw new Error('Knowledge directory must be within the project directory')
  }
}
```

### Marketplace entitlement

Premium skill content must not be served to users without a verified purchase record. The skill detail page must check entitlement before rendering the full SKILL.md content for premium skills.

```typescript
// In app/skills/[category]/[slug]/page.tsx — after Phase 3:
const tier = getSkillTier(skill.slug)  // from skill_tiers table
if (tier === 'premium') {
  const session = await getCurrentSession()
  if (!session || !hasPurchase(skill.slug, session.github_id)) {
    // Render teaser view: name, description, quality score, purchase button
    // Do NOT render SKILL.md content
    return <PremiumTeaser skill={skill} price={tier.price_cents} />
  }
}
```

---

## React Flow Canvas Implementation

### Component Structure

```typescript
// components/skill-mall/chains/ChainCanvas.tsx
'use client'

import ReactFlow, {
  Node, Edge, Connection, addEdge,
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useState, useCallback } from 'react'
import type { Skill } from '@/lib/skills'

interface SkillNodeData {
  skill: Skill
  outputs: string[]   // derived from skill.hasSamples ? skill resources
}

function SkillNode({ data }: { data: SkillNodeData }) {
  return (
    <div className="border border-sm-border bg-sm-surface px-4 py-3 min-w-[200px]">
      <Handle type="target" position={Position.Left} className="!bg-sm-blue !border-sm-border" />

      <p
        className="text-[9px] tracking-widest text-sm-secondary mb-1"
        style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
      >
        [ {data.skill.category.toUpperCase()} ]
      </p>
      <p className="text-sm font-semibold text-sm-display">{data.skill.name}</p>
      <p className="text-xs text-sm-secondary mt-1 line-clamp-2">{data.skill.description}</p>

      <Handle type="source" position={Position.Right} className="!bg-sm-blue !border-sm-border" />
    </div>
  )
}

const nodeTypes = { skillNode: SkillNode }

interface ChainCanvasProps {
  availableSkills: Skill[]
  onChainReady: (chain: ChainDefinition) => void
}

interface ChainDefinition {
  nodes: Node<SkillNodeData>[]
  edges: Edge[]
}

export function ChainCanvas({ availableSkills, onChainReady }: ChainCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<SkillNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [chainName, setChainName] = useState('')

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      data: { passesAs: 'context_append', namedVariable: null, instructions: null },
    }, eds))
  }, [setEdges])

  const addSkill = (skill: Skill) => {
    const id = `skill-${skill.slug}-${Date.now()}`
    setNodes(nds => [...nds, {
      id,
      type: 'skillNode',
      position: { x: nds.length * 280, y: 100 },
      data: { skill, outputs: [] },
    }])
  }

  const buildChain = () => {
    if (!chainName.trim() || nodes.length < 2) return

    const slug = chainName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x)

    const steps = sortedNodes.map((node, i) => ({
      order: i + 1,
      skillSlug: `${node.data.skill.category}/${node.data.skill.slug}`,
      passesAs: 'context_append' as const,
    }))

    onChainReady({ nodes, edges })
  }

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Skill sidebar */}
      <div className="w-64 border-r border-sm-border bg-sm-surface overflow-y-auto p-3">
        <p
          className="text-[9px] tracking-widest text-sm-secondary mb-3"
          style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
        >
          [ DRAG SKILLS ONTO CANVAS ]
        </p>
        {availableSkills.map(skill => (
          <button
            key={skill.slug}
            onClick={() => addSkill(skill)}
            className="w-full text-left border border-sm-border p-2 mb-1 hover:border-sm-display transition-colors"
          >
            <p className="text-xs font-semibold text-sm-display">{skill.name}</p>
            <p
              className="text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
            >
              {skill.category.toUpperCase()}
            </p>
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_, edge) => setSelectedEdge(edge)}
          fitView
          className="bg-sm-bg"
        >
          <Background color="var(--border-visible)" gap={16} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* Build controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-sm-surface border border-sm-border p-3">
          <div className="border-b border-sm-border">
            <input
              value={chainName}
              onChange={e => setChainName(e.target.value)}
              placeholder="chain name"
              className="bg-transparent text-sm text-sm-primary outline-none placeholder:text-sm-disabled py-1"
            />
          </div>
          <button
            onClick={buildChain}
            disabled={!chainName.trim() || nodes.length < 2}
            className="bg-sm-display px-4 py-2 text-[10px] tracking-widest text-sm-bg disabled:opacity-30 hover:opacity-80"
            style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
          >
            [ BUILD CHAIN ]
          </button>
        </div>
      </div>

      {/* Edge configuration panel */}
      {selectedEdge && (
        <ChainEdgeConfig
          edge={selectedEdge}
          onUpdate={(config) => {
            setEdges(eds => eds.map(e => e.id === selectedEdge.id ? { ...e, data: config } : e))
            setSelectedEdge(null)
          }}
          onClose={() => setSelectedEdge(null)}
        />
      )}
    </div>
  )
}
```

### Edge Configuration Panel

```typescript
// components/skill-mall/chains/ChainEdgeConfig.tsx
'use client'

import type { Edge } from 'reactflow'
import { useState } from 'react'

interface EdgeConfig {
  passesAs: 'context_append' | 'context_replace' | 'named_variable'
  namedVariable: string | null
  instructions: string | null
}

interface Props {
  edge: Edge
  onUpdate: (config: EdgeConfig) => void
  onClose: () => void
}

export function ChainEdgeConfig({ edge, onUpdate, onClose }: Props) {
  const [config, setConfig] = useState<EdgeConfig>({
    passesAs: edge.data?.passesAs ?? 'context_append',
    namedVariable: edge.data?.namedVariable ?? null,
    instructions: edge.data?.instructions ?? null,
  })

  return (
    <div className="w-64 border-l border-sm-border bg-sm-surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p
          className="text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
        >
          [ CONFIGURE HANDOFF ]
        </p>
        <button
          onClick={onClose}
          className="text-[9px] tracking-widest text-sm-disabled hover:text-sm-primary"
          style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
        >
          [ X ]
        </button>
      </div>

      <div className="space-y-2">
        {(['context_append', 'context_replace', 'named_variable'] as const).map(opt => (
          <button
            key={opt}
            onClick={() => setConfig(c => ({ ...c, passesAs: opt }))}
            className={`w-full text-left border px-3 py-2 text-[10px] tracking-widest transition-colors ${
              config.passesAs === opt ? 'border-sm-display text-sm-display' : 'border-sm-border text-sm-secondary'
            }`}
            style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
          >
            [ {opt.toUpperCase().replace(/_/g, ' ')} ]
          </button>
        ))}
      </div>

      {config.passesAs === 'named_variable' && (
        <div className="border-b border-sm-border focus-within:border-sm-display transition-colors">
          <input
            value={config.namedVariable ?? ''}
            onChange={e => setConfig(c => ({ ...c, namedVariable: e.target.value }))}
            placeholder="variable name"
            className="w-full bg-transparent py-1 text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
          />
        </div>
      )}

      <div className="border-b border-sm-border focus-within:border-sm-display transition-colors">
        <textarea
          value={config.instructions ?? ''}
          onChange={e => setConfig(c => ({ ...c, instructions: e.target.value || null }))}
          placeholder="additional instructions for next step (optional)"
          rows={3}
          className="w-full bg-transparent py-1 text-sm text-sm-primary outline-none placeholder:text-sm-disabled resize-none"
        />
      </div>

      <button
        onClick={() => onUpdate(config)}
        className="w-full bg-sm-display py-2 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity"
        style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
      >
        [ SAVE HANDOFF ]
      </button>
    </div>
  )
}
```

---

## Self-Improvement Applier Implementation

### File: `lib/self-improvement/applier.ts`

```typescript
import fs from 'fs'
import path from 'path'
import { getDb } from '../db/client'
import { getAllSkills } from '../skills'
import type { LLMClient } from '../providers'
import type { ImprovementSuggestion } from '../db/types'

/**
 * Apply an approved improvement suggestion to the relevant skill file.
 * Uses LLM to generate the edit. Bumps version in SKILL.md.
 * Never writes without explicit approval — this function is only called
 * after the author has approved the suggestion.
 */
export async function applySuggestion(
  suggestion: ImprovementSuggestion,
  client: LLMClient
): Promise<{ changedFile: string; newVersion: string }> {
  const skills = getAllSkills()
  const skill = skills.find(s => s.slug === suggestion.skill_slug)
  if (!skill) throw new Error(`Skill not found: ${suggestion.skill_slug}`)

  const skillDir = path.dirname(skill.path)

  // Determine which file to edit based on dimension
  const fileToEdit = getFileForDimension(suggestion.dimension, skillDir, skill.path)
  const currentContent = fs.readFileSync(fileToEdit, 'utf-8')

  // LLM generates the edited content
  const editPrompt = `You are editing an AI agent skill file to apply an improvement suggestion.

Current file content:
<current>
${currentContent}
</current>

Improvement suggestion:
Dimension: ${suggestion.dimension}
Pattern observed: ${suggestion.pattern}
Suggested change: ${suggestion.suggestion}

Apply the suggestion to the file content. Return ONLY the complete updated file content.
Do not add any explanation, preamble, or markdown fences. Return the raw file content.`

  const updatedContent = await client.complete(editPrompt, {
    temperature: 0.2,
    maxTokens: 4000,
    systemPrompt: 'You apply specific, targeted improvements to skill files. Return only the raw updated file content.',
  })

  // Determine version bump type
  const bumpType = suggestion.dimension === 'instructions' ? 'minor' : 'patch'
  const newVersion = bumpVersion(skill.version, bumpType)

  // Update version in SKILL.md if we're editing a different file
  let skillMdContent = fs.readFileSync(skill.path, 'utf-8')
  skillMdContent = skillMdContent.replace(
    /^  version: ".*"$/m,
    `  version: "${newVersion}"`
  )

  // Write atomically: write to temp first, then rename
  const tempPath = `${fileToEdit}.tmp-${Date.now()}`
  fs.writeFileSync(tempPath, updatedContent, 'utf-8')
  fs.renameSync(tempPath, fileToEdit)

  if (fileToEdit !== skill.path) {
    const tempSkillMd = `${skill.path}.tmp-${Date.now()}`
    fs.writeFileSync(tempSkillMd, skillMdContent, 'utf-8')
    fs.renameSync(tempSkillMd, skill.path)
  }

  // Mark suggestion as resolved
  const db = getDb()
  db.prepare(`
    UPDATE improvement_suggestions
    SET status = 'approved', resolved_at = datetime('now')
    WHERE id = ?
  `).run(suggestion.id)

  return { changedFile: path.relative(process.cwd(), fileToEdit), newVersion }
}

function getFileForDimension(
  dimension: ImprovementSuggestion['dimension'],
  skillDir: string,
  skillMdPath: string
): string {
  switch (dimension) {
    case 'description':
    case 'instructions':
    case 'metadata':
      return skillMdPath
    case 'templates': {
      const templatesDir = path.join(skillDir, 'resources', 'templates')
      const files = fs.existsSync(templatesDir) ? fs.readdirSync(templatesDir) : []
      // Edit the first template file — Worker should refine which file if needed
      return files.length > 0 ? path.join(templatesDir, files[0]) : skillMdPath
    }
    case 'prompts': {
      const promptsDir = path.join(skillDir, 'resources', 'prompts')
      const files = fs.existsSync(promptsDir) ? fs.readdirSync(promptsDir) : []
      return files.length > 0 ? path.join(promptsDir, files[0]) : skillMdPath
    }
  }
}

function bumpVersion(current: string, type: 'patch' | 'minor' | 'major'): string {
  const parts = current.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!parts) return current

  const [, major, minor, patch] = parts.map(Number)
  switch (type) {
    case 'major': return `${major + 1}.0.0`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'patch': return `${major}.${minor}.${patch + 1}`
  }
}
```

---

## Marketplace Frontend Components

### Skill Tier Badge (`components/skill-mall/marketplace/TierBadge.tsx`)

```typescript
'use client'

type Tier = 'free' | 'sponsored' | 'premium' | null

export function TierBadge({ tier }: { tier: Tier }) {
  if (!tier || tier === 'free') return null

  return (
    <span
      className={`text-[9px] tracking-widest px-2 py-0.5 border ${
        tier === 'premium'
          ? 'border-sm-accent text-sm-accent'
          : 'border-sm-blue text-sm-blue'
      }`}
      style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
    >
      [ {tier.toUpperCase()} ]
    </span>
  )
}
```

### Premium Teaser (`components/skill-mall/marketplace/PremiumTeaser.tsx`)

```typescript
'use client'

import { useState } from 'react'
import type { Skill } from '@/lib/skills'

interface Props {
  skill: Skill
  priceCents: number
}

export function PremiumTeaser({ skill, priceCents }: Props) {
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    setLoading(true)
    const res = await fetch('/api/marketplace/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillSlug: skill.slug }),
    })
    const { checkoutUrl } = await res.json()
    window.location.href = checkoutUrl
  }

  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p
          className="mb-2 text-[9px] tracking-widest text-sm-accent"
          style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
        >
          [ PREMIUM SKILL ]
        </p>
        <h1 className="mb-3 text-3xl font-bold text-sm-display">{skill.name}</h1>
        <p className="mb-8 text-sm text-sm-secondary">{skill.description}</p>

        <div className="border border-sm-border bg-sm-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-sm-primary">Full skill access</span>
            <span
              className="text-2xl font-black text-sm-display"
              style={{ fontFamily: '"Doto", monospace' }}
            >
              ${(priceCents / 100).toFixed(2)}
            </span>
          </div>
          <ul className="space-y-2 text-xs text-sm-secondary">
            <li>— SKILL.md with complete instructions</li>
            <li>— All artifact templates</li>
            <li>— Completed sample outputs</li>
            <li>— All framework-selected prompts</li>
          </ul>
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full bg-sm-display py-3 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity disabled:opacity-30"
            style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
          >
            {loading ? '[ REDIRECTING TO CHECKOUT... ]' : `[ PURCHASE — $${(priceCents / 100).toFixed(2)} ]`}
          </button>
        </div>

        <p className="mt-4 text-[10px] text-sm-disabled text-center" style={{ fontFamily: 'var(--font-space-mono, monospace)' }}>
          Powered by Stripe. Revenue split: 70% creator / 20% ops / 10% community fund.
        </p>
      </div>
    </div>
  )
}
```

---

## Test Cases for Phase 3

### Chain Builder Tests

- `buildChainDirectory` with 2 steps produces SKILL.md with `chain: true` frontmatter
- `buildChainDirectory` with 3 steps produces 3 entries in `chain_steps` frontmatter
- `validateSkillDirectory` on chain SKILL.md returns valid: true
- chain.json round-trips correctly (parse → stringify → parse produces identical object)

### RAG Tests

- `chunkText` with 1000-word text produces chunks of approximately 380 words each
- `chunkText` filters out near-empty chunks (< 20 chars)
- `generateEmbedding` with openai provider calls `openai.embeddings.create` (mocked)
- `generateEmbedding` with claude-code provider throws with helpful error message
- Retrieval returns top-K chunks sorted by similarity descending

### Self-Improvement Tests

- `analyzeFeedback` with 10 mixed feedback items returns at least 1 pattern
- `applySuggestion` with mocked LLM updates file content and bumps version
- `bumpVersion('1.2.3', 'patch')` returns `'1.2.4'`
- `bumpVersion('1.2.3', 'minor')` returns `'1.3.0'`
- Author verification: approving suggestion as non-author returns 403

### Marketplace Tests

- `checkMarketplaceReady` returns `ready: false` when conditions not met
- `checkMarketplaceReady` returns `ready: true` only when ALL conditions are met
- Stripe webhook with invalid signature → 400 (never processes payload)
- `hasAccess` returns true for free skills without purchase record
- `hasAccess` returns false for premium skills without purchase record

---

## Dependency Graph for Phase 3 Tasks

```
T201 (DB Migration)
  ├─→ T202 (Chain Builder)
  ├─→ T203 (RAG)
  ├─→ T204 (Feedback Collection)
  │     └─→ T205 (Approval + Application)
  └─→ T206 (Marketplace Gate + Tiers)
        └─→ T207 (Stripe Payments)

T208 (Documentation) — parallel with T202-T207
T209 (Completion Audit) — after all T201-T208
```

T202 and T203 can run in parallel after T201.
T204 must complete before T205.
T206 must complete before T207.
T208 runs in parallel with T202-T207 as features stabilize.

---

## GoalBuddy Setup

Phase 3 goal-prep runs AFTER Phase 2 completion audit passes and all launch conditions are verified.

```bash
# /goal-prep
# Slug: skillmall-phase3
# Input shape: existing_plan
# This file: docs/superpowers/plans/PHASE-3-PLAN.md
# Gate: verify ALL launch conditions before creating board
#   - catalog >= 200 skills
#   - community >= 500 authenticated members
#   - ratings system >= 3 months active
#   - >= 50 skills with test coverage
```

During goal-prep, verify each launch condition against actual data before creating the board. If any condition is not met, do not create the board — record which conditions are missing and set a follow-up date.

Task types:
- T201–T207: Worker tasks (detailed specs written at goal-prep time)
- T208: Worker (documentation)
- T209: Judge (completion audit)
