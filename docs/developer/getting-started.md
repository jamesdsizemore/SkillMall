# Developer Getting Started

Everything you need to clone, configure, run, and contribute to SkillMall without asking anyone anything.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone and Install](#clone-and-install)
3. [Configure an LLM Provider](#configure-an-llm-provider)
4. [Database Setup](#database-setup)
5. [Run the Application](#run-the-application)
6. [Run Tests](#run-tests)
7. [Project Structure](#project-structure)
8. [Architecture Overview](#architecture-overview)
9. [Making Your First Change](#making-your-first-change)
10. [Common Developer Tasks](#common-developer-tasks)
11. [Understanding the Test Suite](#understanding-the-test-suite)
12. [Environment Variable Reference](#environment-variable-reference)

---

## Prerequisites

Before cloning, confirm you have the required tooling:

```bash
node --version   # Must be >= 20.0.0
npm --version    # Must be >= 10.0.0
git --version    # Any recent version
```

**Node.js 20+ is required.** SkillMall uses native `fetch`, `AbortSignal.timeout`, and `structuredClone` — APIs that only became stable in Node 18–20. The codebase is tested against Node 22.

If you're on an older Node version, use [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
node --version  # v22.x.x
```

**npm 10+** ships with Node 20+ by default. If you see npm errors about workspace hoisting or `--include=dev`, upgrade:

```bash
npm install -g npm@latest
```

**Git** — any version from the last five years works.

---

## Clone and Install

```bash
git clone https://github.com/jamesdsizemore/SkillMall
cd SkillMall
npm install
cd cli && npm install && cd ..
```

The project has two separate `package.json` files:

- **Root** (`/package.json`): the Next.js web application and all shared `lib/` code
- **CLI** (`/cli/package.json`): the `npx skill-mall` command-line tool, built separately with `tsup`

Both must be installed. The CLI's `tsconfig.json` uses `"@/*": ["../*"]` path aliases to import from the root `lib/` without duplicating code — this is why `cd cli && npm install` is a separate step rather than being handled by npm workspaces.

**Expected output:**

```
added 432 packages in 23s
# (then in cli/)
added 18 packages in 4s
```

If you see peer dependency warnings, they are safe to ignore — they come from `reactflow` and `stripe` having optional peer deps.

---

## Configure an LLM Provider

SkillMall's skill creation pipeline requires an LLM to extract knowledge from URLs and generate skill content. The catalog browsing, deploy, fork, and review features work without an LLM.

Run the interactive configurator:

```bash
npx skill-mall configure
```

This writes your configuration to `~/.skill-mall/config.json` (global) and sets environment variables in `.env.local` for the web app. You can also configure a specific provider directly:

```bash
# Option 1: Claude Code CLI (no API key needed — uses your existing auth)
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6

# Option 2: OpenAI
npx skill-mall configure --provider openai --key sk-... --model gpt-4o

# Option 3: Gemini
npx skill-mall configure --provider gemini --key AIza... --model gemini-2.0-flash-exp

# Option 4: Groq (fast, inexpensive)
npx skill-mall configure --provider groq --key gsk_... --model llama-3.3-70b-versatile

# Option 5: Ollama (local, no API key)
ollama pull llama3.1
npx skill-mall configure --provider ollama --model llama3.1
```

**Provider notes:**

- **Claude Code** is the simplest option for existing Claude Code users — it spawns `claude -p` subprocesses using your already-authenticated session. No API key to manage. Note that it does not support embeddings for RAG features.
- **OpenAI** (gpt-4o or gpt-4o-mini) produces the most reliable JSON extraction for the research pipeline. Most of the codebase was tested against OpenAI.
- **Groq** is 10–20x faster than OpenAI for the same Llama models and substantially cheaper. Best for development.
- **Ollama** requires running `ollama serve` before starting the app. Quality varies by model — `llama3.1` (8B) works but a larger model produces better skill structure.

**For RAG/embeddings**, set a separate embedding provider. The main provider and the embedding provider can differ:

```bash
# In .env.local (not configured via CLI):
SKILL_MALL_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Or for local embeddings:
SKILL_MALL_EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
```

Claude Code does not support embeddings. If `SKILL_MALL_EMBEDDING_PROVIDER=claude-code`, RAG commands will fail with a helpful error.

---

## Database Setup

SkillMall uses SQLite via `better-sqlite3`. The database is created automatically:

```bash
npm run db:migrate
```

**Expected output (first run):**

```
Applied: 001_initial.sql
Applied: 002_phase3.sql
Applied: 003_fork_events.sql
Applied: 004_rag_embedding_column.sql
4 migration(s) applied.
```

**Expected output (subsequent runs):**

```
No new migrations.
```

The database is stored at `data/skillmall.db`. This path is gitignored — your local data never gets committed. The `scripts/migrate.js` runner applies migrations in alphabetical order and tracks applied migrations in a `schema_migrations` table, so re-running is always safe.

**Resetting the database:**

```bash
rm -f data/skillmall.db && npm run db:migrate
```

---

## Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Expected output:**

```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 1.4s
```

**What you'll see:**

The homepage shows the skill catalog. On a fresh install you'll have 26 skills pre-seeded across 8 categories (ai, business, design, development, infrastructure, productivity, research, writing). The header shows the SkillMall logo and navigation. Without a GitHub OAuth configuration, the "Sign In" button will error — this only matters for features that require authentication (reviews, dashboard, feedback, self-improvement suggestions).

**Building for production:**

```bash
npm run build
npm start
```

---

## Run Tests

```bash
npm test
```

**Expected output:**

```
Test Files  28 passed (28)
     Tests  211 passed (211)
  Start at  hh:mm:ss
  Duration  ~1.8s
```

Run a specific test file:

```bash
npm test lib/__tests__/chains.test.ts
npm test lib/__tests__/budget-analyzer.test.ts
```

Run with watch mode for development:

```bash
npm test -- --watch
```

**No test makes real LLM API calls.** All tests that exercise LLM-dependent code use a `MockLLMClient` (defined in `lib/__tests__/mocks/`) that returns deterministic JSON. This means tests run in ~2 seconds with zero API cost and zero network dependency.

---

## Project Structure

```
SkillMall/
├── app/                    # Next.js 15 App Router pages and API routes
│   ├── api/                # 20+ API routes (research pipeline, auth, reviews, etc.)
│   ├── skills/             # Skill browsing and detail pages
│   ├── dashboard/          # Contributor analytics dashboard
│   ├── trending/           # Trending skills by install velocity
│   ├── graph/              # Force-directed skill dependency graph
│   ├── prompt-library/     # Prompt engineering framework browser
│   └── docs/               # (Phase 4) Documentation site
│
├── cli/                    # npx skill-mall CLI (separate package)
│   ├── src/commands/       # One file per CLI command (~20 commands)
│   ├── src/index.ts        # Command router and help text
│   └── package.json        # Separate deps and build config (tsup)
│
├── components/             # React components (client and server)
│   └── skill-mall/         # All app-specific components
│       ├── homepage/       # Catalog grid, search, hero
│       ├── skill-detail/   # SkillTabs, PromptCard, BudgetPanel
│       ├── improvements/   # Self-improvement loop UI
│       ├── marketplace/    # TierBadge, PremiumTeaser
│       └── chains/         # ReactFlow chain builder canvas
│
├── lib/                    # Shared business logic (used by app/ and cli/)
│   ├── providers/          # LLM provider abstraction (openai, claude-code, etc.)
│   ├── rag/                # RAG: chunker, embeddings, knowledge-base (pure JS)
│   ├── self-improvement/   # Feedback collection and suggestion generation
│   ├── marketplace/        # Gate conditions, entitlement, Stripe payments
│   ├── db/                 # SQLite client and type definitions
│   └── __tests__/          # Test files (28 files, 211 tests)
│
├── skills/                 # The skill catalog — one directory per skill
│   ├── _template/          # Scaffold template for new skills
│   ├── _starters/          # 20 domain starter templates
│   ├── ai/                 # Skills in the AI category
│   ├── business/           # Skills in the business category
│   └── ...                 # (development, design, writing, etc.)
│
├── db/migrations/          # SQL migrations applied in order by migrate.js
├── tests/                  # Skill test suites (JSON test cases per skill)
├── docs/                   # Documentation (this directory)
│   ├── developer/          # Technical reference for contributors
│   ├── guide/              # End-user tutorials and guides
│   ├── marketing/          # Landing page, press kit, use cases
│   └── superpowers/        # Internal plans and specs (not published)
│
├── scripts/                # Utility scripts
│   ├── new-skill.sh        # Scaffold a new skill from _template
│   ├── sync-agents.sh      # Regenerate AGENTS.md (runs on commit)
│   ├── validate-skill.sh   # Validate SKILL.md frontmatter
│   └── migrate.js          # Apply pending SQL migrations
│
├── .github/                # CI/CD
│   ├── workflows/          # GitHub Actions (validate-skills.yml)
│   └── actions/            # Reusable action: skill-mall-validate
│
├── data/                   # SQLite database (gitignored)
├── skill-builder-output/   # CLI pipeline output (gitignored)
└── AGENTS.md               # Auto-generated skill catalog (git-tracked)
```

**Why this structure?**

The central design decision is that `lib/` is shared between the Next.js web app (`app/`) and the CLI (`cli/`). Both the browser wizard and the CLI command `npx skill-mall create` invoke the same `runPipeline()` function in `lib/pipeline.ts`. The CLI's `tsconfig.json` uses `"paths": {"@/*": ["../*"]}` to enable this sharing without a monorepo setup. This keeps the codebase small: there's no duplicated research engine, no duplicated LLM client, no duplicated skill parser.

`skills/` is a flat file database. Every skill is a directory with a `SKILL.md` (frontmatter + content), `README.md`, and optional `resources/` subdirectory. The web catalog reads these files at build time via `lib/skills.ts`. No database table stores skill content — skills are files, committed to git, reviewed via PR.

The `_starters/` directory contains 20 pre-built domain starter templates (code-review, okr-framework, blue-ocean-strategy, etc.) that users can instantiate with `npx skill-mall new --from-template <slug> <name>`.

---

## Architecture Overview

SkillMall has two user interfaces (the web wizard and the CLI) that share a common pipeline and library layer.

```
Browser (wizard)    CLI (npx skill-mall)
        │                    │
        ▼                    ▼
  app/api/ routes    cli/src/commands/
        │                    │
        └────────┬───────────┘
                 ▼
           lib/ (shared)
           ├── pipeline.ts       ← 5-stage research + build
           ├── providers/        ← LLM abstraction
           ├── skill-builder.ts  ← file generation
           ├── prompt-engine.ts  ← framework selection
           ├── research-engine.ts← URL fetch + extraction
           ├── quality-score.ts  ← 5-dimension scoring
           └── db/client.ts      ← SQLite via better-sqlite3
                 │
                 ▼
           data/skillmall.db (SQLite)
           skills/ (filesystem)
```

**The 5-stage pipeline** (triggered by `POST /api/create-skill` or `npx skill-mall create`):

1. **Research** — fetches provided URLs via Cheerio, extracts text, calls the LLM to identify named tools/frameworks/methodologies, returns a validated `ResearchResult` (Zod schema).
2. **Tool selection** — selects which tools to build skills for based on quality and relevance.
3. **Prompt engineering** — selects a reasoning framework for each tool's prompts from 40+ PE frameworks, generates framework-specific prompts.
4. **Skill building** — generates `SKILL.md`, `README.md`, `resources/templates/`, `resources/samples/`, `resources/scripts/`, `resources/prompts/` for each tool.
5. **Atomic write** — writes all files as a single operation. Either everything succeeds or nothing is written.

**Why SQLite, not Supabase?**

SkillMall is designed to self-host on a single server or Raspberry Pi. Supabase adds a network dependency, a subscription cost, and credentials management. SQLite with WAL mode handles hundreds of concurrent readers, which covers the realistic load for a team-scale deployment. For production at scale, the migration path is to Turso (libSQL over HTTP with SQLite compatibility).

**Why multi-provider, not just one LLM?**

Different users have different constraints: API budget, offline requirements, data privacy (Ollama), existing credits, model preference. The provider abstraction (`lib/providers/index.ts` → `LLMClient` interface) means every feature works identically regardless of which provider is configured. Adding a new provider is a ~50-line addition of one file in `lib/providers/`.

**Why the Nothing design system?**

SkillMall uses a custom "Nothing" design vocabulary: bracket-notation labels (`[ SKILLS ]`), monospace tracking, minimal color (one accent, the rest grayscale), Doto font for numeric displays. The rationale: a skill catalog tool will be used by technical people who trust systems that look precise and intentional, not colorful and marketing-y. Every design token is a CSS custom property in `app/globals.css`, named `--sm-*` to avoid collisions.

**RAG (Retrieval-Augmented Generation):**

RAG uses **pure JavaScript cosine similarity** — no native extension required. This was an explicit architectural decision: sqlite-vss (the original plan) is abandoned and broken on Node 22; sqlite-vec (its successor) still requires platform-specific native binaries with Vercel deployment issues. For skill catalog corpus sizes (<5,000 chunks per skill), a pure-JS linear scan takes 5–15ms — below the embedding API round-trip (~200–400ms). Embeddings are stored as `Float32Array` bytes (BLOB) in `knowledge_chunks.embedding`. See `lib/rag/knowledge-base.ts` for the implementation.

---

## Making Your First Change

The best first change is adding a skill manually to the catalog. This proves your dev environment works end-to-end.

**Step 1: Copy the template**

```bash
cp -r skills/_template skills/development/my-first-skill
```

**Step 2: Edit the SKILL.md**

Open `skills/development/my-first-skill/SKILL.md` and fill in the frontmatter:

```yaml
---
name: my-first-skill
description: "A test skill to verify the dev environment works."
license: MIT
metadata:
  version: "1.0.0"
  author: your-github-username
  category: development
  tags: "testing, development"
---

# My First Skill

Write your skill instructions here.
```

**Step 3: Validate**

```bash
bash scripts/validate-skill.sh skills/development/my-first-skill
```

Expected output: `OK    skills/development/my-first-skill/SKILL.md`

**Step 4: See it in the catalog**

The catalog reads skills at build time via `lib/skills.ts`. In dev mode (`npm run dev`), changes to files in `skills/` are picked up on the next page load — no restart needed.

Open [http://localhost:3000/?cat=development](http://localhost:3000/?cat=development) and find your skill.

**Step 5: Clean up**

```bash
rm -rf skills/development/my-first-skill
```

That's it. You've verified that the skill file system, the parser, and the catalog rendering all work on your machine.

---

## Common Developer Tasks

| Task | Command | Expected output |
|---|---|---|
| Add new API route | Create `app/api/<name>/route.ts` | Route available at `http://localhost:3000/api/<name>` |
| Add new CLI command | Create `cli/src/commands/<name>.ts`, import + register in `cli/src/index.ts` | `node cli/dist/index.js <name> --help` prints usage |
| Rebuild CLI after changes | `cd cli && npm run build` | `cli/dist/index.js` updated |
| Reset database | `rm -f data/skillmall.db && npm run db:migrate` | "N migration(s) applied" |
| Run specific test file | `npm test lib/__tests__/<file>.test.ts` | Output for that file only |
| Check TypeScript only | `npx tsc --noEmit` | Exits 0 if clean |
| Validate a skill | `bash scripts/validate-skill.sh skills/<cat>/<slug>` | 0 errors |
| Create a skill via CLI | `npx skill-mall create "topic" --urls <url>` | Writes research-result.json |
| Confirm research (finish pipeline) | `npx skill-mall confirm-research <slug>` | Skill written to `skills/` |
| Regenerate AGENTS.md | `bash scripts/sync-agents.sh` | AGENTS.md updated |
| Check lint | `npm run lint` | 0 errors (warnings OK) |
| Build for production | `npm run build && npm start` | App running on port 3000 |
| Apply new migration | `npm run db:migrate` | "N migration(s) applied" |
| Run full test suite | `npm test` | 28 files, 211 tests pass |

---

## Understanding the Test Suite

The test suite lives in `lib/__tests__/` (28 files, 211 tests as of Phase 3). Tests use [Vitest](https://vitest.dev/) — a Jest-compatible test runner that uses native ES modules.

**Key architectural decisions:**

**No real LLM API calls.** Every test that exercises LLM-dependent code uses a `MockLLMClient`:

```typescript
// lib/__tests__/mocks/llm-client.ts
export const mockClient = {
  complete: vi.fn().mockResolvedValue('{"tools": [...]}'),
  provider: 'openai' as const,
}
```

This means tests run in ~2 seconds, require no API keys, produce deterministic results, and can be run in CI without secrets.

**Real SQLite for database tests.** Tests that exercise database code (feedback, reviews, analytics, chains) use a real SQLite database. The database is the same one from `npm run db:migrate` — `data/skillmall.db`. Tests clean up after themselves by deleting their test data in `beforeEach` and `afterEach` hooks.

**Test file naming convention:** `lib/__tests__/<module-name>.test.ts`. One test file per lib module. Tests import from the module under test directly — no barrel files.

**Adding a new test:**

1. Create `lib/__tests__/<your-module>.test.ts`
2. Import the functions you want to test
3. Use `describe`/`it`/`expect` (Vitest API, compatible with Jest)
4. If your code calls an LLM: import `mockClient` from `mocks/` and call `vi.fn().mockResolvedValue(...)` with the JSON your code expects
5. Run `npm test lib/__tests__/<your-module>.test.ts` to verify

**Test coverage by module:**

| Test file | What it covers |
|---|---|
| `pipeline.test.ts` | Full research-to-file pipeline (mocked LLM) |
| `prompt-engine.test.ts` | Framework selection and prompt generation |
| `quality-score.test.ts` | All 5 scoring dimensions |
| `budget-analyzer.test.ts` | Description budget simulation |
| `chains.test.ts` | Chain building and validation |
| `rag.test.ts` | Chunking, embedding generation, cosine similarity |
| `feedback.test.ts` | Feedback collection, satisfaction validation |
| `self-improvement.test.ts` | bumpVersion(), author identity guard |
| `marketplace.test.ts` | checkMarketplaceReady() gate logic |
| `i18n.test.ts` | Locale detection, translation validation |
| `graph.test.ts` | computeGraph() hub/orphan detection |
| `forking.test.ts` | Fork chain, forked_from metadata |
| `analytics.test.ts` | getEffectivenessTrend() 30-day window |
| `agent-detection.test.ts` | Installed agent detection |
| `db.test.ts` | SQLite client initialization |
| `auth.test.ts` | Session management |

---

## Environment Variable Reference

Create `.env.local` in the project root (it's gitignored). Copy from `.env.local` after running `npm run dev` once — a template is generated automatically.

| Variable | Required | Source | Breaks if missing |
|---|---|---|---|
| `SKILL_MALL_PROVIDER` | Yes (for skill creation) | `npx skill-mall configure` | Skill creation pipeline fails: "No LLM provider configured" |
| `SKILL_MALL_API_KEY` | Depends on provider | Your LLM provider's dashboard | Auth fails for OpenAI, Gemini, Groq |
| `SKILL_MALL_MODEL` | No | Auto-set during configure | Uses provider default model |
| `SKILL_MALL_EMBEDDING_PROVIDER` | No (for RAG only) | Same as SKILL_MALL_PROVIDER but separate | RAG attach-knowledge fails |
| `OPENAI_API_KEY` | For OpenAI embeddings | platform.openai.com | OpenAI embedding calls fail |
| `GEMINI_API_KEY` | For Gemini embeddings | aistudio.google.com | Gemini embedding calls fail |
| `OLLAMA_BASE_URL` | No | Default: http://localhost:11434 | Ollama commands use wrong URL |
| `GITHUB_CLIENT_ID` | Yes (for auth features) | github.com/settings/developers | Sign In button fails |
| `GITHUB_CLIENT_SECRET` | Yes (for auth features) | github.com/settings/developers | OAuth callback fails with 500 |
| `NEXTAUTH_SECRET` | Yes (for auth features) | Any 32-char random string | Session cookie fails to sign |
| `NEXT_PUBLIC_APP_URL` | Yes (for auth features) | Your app's base URL | OAuth redirect URI mismatch |
| `STRIPE_SECRET_KEY` | Phase 3 only | dashboard.stripe.com/test/apikeys | Marketplace checkout fails |
| `STRIPE_PUBLISHABLE_KEY` | Phase 3 only | dashboard.stripe.com/test/apikeys | Checkout UI fails |
| `STRIPE_WEBHOOK_SECRET` | Phase 3 only | `stripe listen --forward-to ...` | Webhook signature verification fails |

**Quick setup for local development (auth not needed):**

```bash
# .env.local — minimum for skill creation without auth
SKILL_MALL_PROVIDER=openai
SKILL_MALL_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Quick setup with GitHub auth:**

```bash
# 1. Go to github.com/settings/developers → New OAuth App
# 2. Homepage URL: http://localhost:3000
# 3. Authorization callback URL: http://localhost:3000/api/auth/callback/github
# 4. Copy the Client ID and generate a secret

SKILL_MALL_PROVIDER=openai
SKILL_MALL_API_KEY=sk-...
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Next Steps

- **[Architecture Deep Dive](./architecture.md)** — internal system design, provider abstraction, database schema
- **[API Reference](./api-reference.md)** — all 20+ API routes with request/response schemas
- **[CLI Reference](./cli-reference.md)** — all CLI commands with flags and expected outputs
- **[Contributing Guide](./contributing.md)** — skill contribution workflow, code standards, PR process
- **[Extending SkillMall](./extending.md)** — adding providers, CLI commands, API routes, quality dimensions
- **[Deployment](./deployment.md)** — Vercel, Railway, VPS, environment variables, SQLite in production
