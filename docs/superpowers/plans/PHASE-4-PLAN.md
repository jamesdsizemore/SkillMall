# Phase 4 Plan — Comprehensive Documentation

**STOP. Read this entire document before touching a single file.**

This document is self-contained. Every implementation decision is made here. Every document's required structure, word count, content sections, code example requirements, and tone specifications are embedded directly. Writers do not make structural decisions — they follow this document.

Phase 4 is documentation-only. No new features. No code changes. Every file produced is a Markdown document. Every document is production-quality: complete, accurate, tested against the actual codebase, and written for a specific reader.

---

## What Phase 4 Produces

Three documentation suites, each targeting a distinct reader:

**Suite 1 — Developer Documentation** (`docs/developer/`): For engineers building on, contributing to, or extending SkillMall. Assumes TypeScript literacy. No hand-holding on basic concepts. Dense, precise, code-heavy.

**Suite 2 — End-User Documentation** (`docs/guide/`): For people who want to use SkillMall to create and deploy skills. Tutorial-based. Step-by-step. Assumes nothing. Reads like a friendly teacher, not a reference manual. Every tutorial has a clear goal, real commands, expected outputs, and troubleshooting.

**Suite 3 — Marketing Documentation** (`docs/marketing/`): For communicating SkillMall's value. Landing page copy, case studies, comparison guides, press kit. Persuasive but accurate. Never overpromises.

---

## Gate Into Phase 4

**Phase 4 activates when:**
- Phase 3 T280 (missed features audit) has passed
- The codebase the docs describe actually works — writers must verify every command and code example against the running application before publishing

**Phase 4 does NOT require Phase 3 to be complete.** The developer docs and marketing docs can start as soon as Phase 3 T280 passes. End-user docs covering Phase 3 features (chains, RAG, etc.) wait until those features are built.

---

## The Documentation Standard

Every document in Phase 4 meets these requirements. No exceptions.

**Minimum word counts** are floors, not targets. If the topic requires more, write more.

**Code examples must be real.** Every command shown must work against the actual codebase. Every TypeScript snippet must compile. Every API response must match the actual response. Writers run every example before shipping.

**Screenshots described as prose.** Since this is Markdown, describe what the user would see: "The wizard shows a dark panel on the left with the Doto number `03` in large dot-matrix font, and a list of 3 extracted tool cards on the right."

**Tone by suite:**
- Developer: direct, precise, assumes competence, skips pleasantries
- End-user: warm, encouraging, assumes nothing, celebrates progress
- Marketing: confident, benefit-first, specific not vague, honest about limitations

**Every document has:**
- A one-sentence summary at the top (what this doc covers and who it's for)
- A table of contents for docs over 1000 words
- At least one "What you'll learn" or "What you'll build" statement at the top
- Cross-links to related docs where relevant
- A "Next steps" or "Related" section at the bottom

---

## Development Workflow

Every Writer task follows this loop:

1. Read the task's Content Specification in this document completely
2. Verify every command, URL, and code example against the running application
3. Write the document to the specified minimum word count with all required sections
4. Read it aloud (or read it as if you are the target reader) — fix anything that sounds wrong
5. Check cross-links exist and point to real files
6. Final word count check — below minimum means incomplete
7. `git commit && git push`

**Writers do not invent.** If a feature they're documenting doesn't work as described, they stop and file a bug rather than document behavior that doesn't exist.

---

## File Conflict Ordering

These files are modified by multiple tasks. Sequential only:

| File | Tasks in order |
|---|---|
| `docs/developer/README.md` (new) | T401 only |
| `docs/guide/index.md` | T411 then T412 |
| `README.md` (repo root) | T401 updates it, then T421 adds marketing copy |

---

## Suite 1: Developer Documentation

Target reader: TypeScript developer who wants to contribute to SkillMall, integrate with its APIs, extend the platform, or understand its architecture. Has never seen this codebase before.

---

### T401 — Developer Getting Started + Architecture Overview

**Type:** Worker | **Minimum:** 3,000 words

**Objective:** Write `docs/developer/getting-started.md` and update the root `README.md` developer section. A developer reading getting-started.md should be able to clone, configure, run, and make their first contribution without asking anyone anything.

**`docs/developer/getting-started.md` required sections:**

**Prerequisites** — exact versions required: Node.js 20+, npm 10+, Git. How to check: `node --version`. What to install if missing.

**Clone and install:**
```bash
git clone https://github.com/jamesdsizemore/SkillMall
cd SkillMall
npm install
cd cli && npm install && cd ..
```

**Configure LLM provider** — explain that skills generation requires an LLM. Show all 5 options with exact commands:
```bash
# Option 1: Claude Code CLI (no API key needed if already authenticated)
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6

# Option 2: OpenAI
npx skill-mall configure --provider openai --key sk-... --model gpt-4o

# Option 3: Gemini
npx skill-mall configure --provider gemini --key AIza... --model gemini-2.0-flash-exp

# Option 4: Groq (fast, cheap)
npx skill-mall configure --provider groq --key gsk_... --model llama-3.3-70b-versatile

# Option 5: Ollama (local, no API key)
ollama pull llama3.1
npx skill-mall configure --provider ollama --model llama3.1
```

**Database setup:**
```bash
npm run db:migrate
# Output: Applied: 001_initial.sql
#         1 migration(s) applied.
```

**Run the app:**
```bash
npm run dev
# Open http://localhost:3000
```

**Run tests:**
```bash
npm test
# Expected: X test files, Y tests passing
```

**Project structure explanation** — annotated directory tree explaining what each major directory does. Not just a listing — explain WHY each directory exists and what decisions led to its structure.

**Making your first change** — walk through adding a new skill to the catalog manually (copy from `_template`, fill in fields, validate, view in catalog). This proves the dev environment works.

**Architecture overview** (500 words minimum in this section): The two interfaces (web wizard, CLI) share `lib/`. The 5-stage pipeline. Why SQLite. Why not Supabase. Why multi-provider. The Nothing design system decision.

**Common developer tasks** — quick reference with exact commands and expected outputs:

| Task | Command | Expected output |
|---|---|---|
| Add new API route | Create `app/api/<name>/route.ts` | Route available at `http://localhost:3000/api/<name>` |
| Add new CLI command | Create `cli/src/commands/<name>.ts`, register in `cli/src/index.ts` | `npx skill-mall <name> --help` prints usage |
| Reset database | `rm -f data/skillmall.db && npm run db:migrate` | "1 migration(s) applied" |
| Run specific test | `npm test lib/__tests__/<file>.test.ts` | Test output for that file only |
| Check types only | `npx tsc --noEmit` | Exits 0 if clean |
| Build CLI | `cd cli && npm run build` | `cli/dist/index.js` updated |
| Validate a skill | `bash scripts/validate-skill.sh skills/<cat>/<slug>` | 0 errors |
| Generate a skill via CLI | `npx skill-mall create "topic" --urls <url>` then `npx skill-mall confirm-research <slug>` | Skill written to `skills/` |

**Understanding the test suite** — explain the test file structure, the MockLLMClient pattern, why tests never make real LLM calls, how to add a new test, what each test file covers.

**Environment variable reference table** — every env var, whether it's required or optional, where to get the value, what breaks if missing:

| Variable | Required | Source | Breaks if missing |
|---|---|---|---|
| SKILL_MALL_PROVIDER | Yes (for pipeline) | `npx skill-mall configure` | Skill creation fails with "No LLM provider configured" |
| SKILL_MALL_API_KEY | Depends on provider | Your provider's dashboard | Auth fails for API-based providers |
| SKILL_MALL_MODEL | No | Auto-set from provider defaults | Uses provider default model |
| GITHUB_CLIENT_ID | Yes (for auth features) | github.com/settings/developers | Sign In button fails |
| GITHUB_CLIENT_SECRET | Yes (for auth features) | github.com/settings/developers | OAuth callback fails |
| NEXTAUTH_SECRET | Yes (for auth features) | Any 32-char random string | Session creation fails |
| NEXT_PUBLIC_APP_URL | Yes (for auth features) | Your deployment URL | OAuth redirect URI mismatch |
| STRIPE_SECRET_KEY | Phase 3 only | stripe.com dashboard | Marketplace checkout fails |
| STRIPE_PUBLISHABLE_KEY | Phase 3 only | stripe.com dashboard | Checkout UI fails |
| STRIPE_WEBHOOK_SECRET | Phase 3 only | `stripe listen` | Webhook verification fails |

**Allowed files:**
```
docs/developer/getting-started.md
README.md
```

**Verify:**
- Every command in the doc runs without error on a fresh clone
- The project structure explanation matches the actual directory layout
- Word count >= 3,000

**Stop if:**
- Any command produces an error — fix the code or document the workaround, never document a broken command

---

### T402 — Architecture Deep Dive

**Type:** Worker | **Minimum:** 4,000 words

**Objective:** Write `docs/developer/architecture.md` — the definitive technical reference for anyone who needs to understand how SkillMall works internally.

**Required sections:**

**System overview** — ASCII architecture diagram showing: browser/CLI → API routes/CLI commands → lib/ pipeline → SQLite → filesystem (skills/). Explain why each layer exists.

**The provider abstraction** — why multi-provider, how `lib/providers/index.ts` works, how `resolveProviderConfig()` resolution order works, how to add a new provider (interface, factory, defaults, catalog entry). Show the full TypeScript interface.

**The 5-stage pipeline** in detail:
- Stage 1 (Input): what data flows in, how validation works
- Stage 2 (Research Engine): URL fetching with cheerio, LLM extraction, Zod validation, retry logic, the exact extraction prompt structure
- Stage 3 (Skill Builder): what's deterministic vs LLM-powered (samples are LLM, everything else is template), `InMemorySkillDirectory`
- Stage 4 (Prompt Engine): framework pre-filter algorithm (FRAMEWORK_CANDIDATES table), LLM selection from candidates, prompt body generation, optimizer integration
- Stage 5 (Validation + Write): `validateSkillDirectory` checks, atomic write via temp+rename

**State management** — wizard state (WizardContext + useReducer + sessionStorage), why no Zustand, why not URL state

**Database design** — every table (sessions, install_events, reviews, fork_events, search_clicks), why SQLite not Supabase, WAL mode, the migration runner, adding new migrations

**Authentication** — GitHub OAuth flow step-by-step, CSRF state cookie, session token in SQLite, the `sm_session` cookie spec (httpOnly, SameSite=Strict, 7-day TTL)

**Nothing Design System** — why chosen, the CSS custom property token system, how `@theme` extension works in Tailwind v4, the 4 animation keyframes and when to use them, the design rules enforced

**Performance characteristics** — what's slow (LLM calls: 60+ for a 20-tool domain), what's fast (static pages build at compile time), the static generation strategy for the skill catalog

**Security model** — where inputs are validated (Zod on all API inputs), parameterized SQL queries, path traversal prevention in codebase extractor, author identity verification in self-improvement loop, Stripe webhook signature verification

**Allowed files:**
```
docs/developer/architecture.md
```

**Verify:** Every TypeScript type shown matches the actual types in the codebase. Every SQL query shown matches the actual schema.

**Stop if:**
- Any TypeScript type shown doesn't match the actual type in the codebase — run grep to verify before writing
- Any SQL schema shown doesn't match `db/migrations/001_initial.sql` — check the actual file
- Need files outside allowed_files

---

### T403 — Complete API Reference

**Type:** Worker | **Minimum:** 5,000 words

**Objective:** Write `docs/developer/api-reference.md` — every API route documented with method, path, authentication requirements, request schema, response schema, error codes, and curl examples.

**Format for each route:**
```
## POST /api/research

**Authentication:** None required
**Rate limit:** None (local development)

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| topic | string | Yes | Domain or methodology to research |
| sourceUrls | string[] | No | Up to 10 authoritative URLs |

### Response

```json
{
  "topic": "Blue Ocean Strategy",
  "sources": ["https://blueoceanstrategy.com/tools/"],
  "summary": "Apply Blue Ocean Strategy to...",
  "tools": [...],
  "principles": [...],
  "suggestedCategory": "business",
  "suggestedTags": ["strategy", "blue-ocean"]
}
```

### Error responses

| Status | error | Meaning |
|---|---|---|
| 400 | invalid_input | Request body failed validation |
| 503 | provider_not_configured | No LLM provider set up |
| 422 | pipeline_failed | LLM extraction failed after retry |

### curl example

```bash
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "Blue Ocean Strategy", "sourceUrls": ["https://blueoceanstrategy.com/tools/"]}'
```
```

**All routes to document** — in this order, one full section each:

**Authentication routes:**
- GET /api/auth/login — initiates GitHub OAuth, redirect behavior, state cookie
- GET /api/auth/callback/github — code exchange, session creation, redirect
- POST /api/auth/logout — session deletion, cookie clearing

**Provider routes:**
- GET /api/providers — full catalog of supported providers with setup instructions
- POST /api/providers/configure — dev-only, writes .env.local

**Pipeline routes:**
- POST /api/research — Research Engine, URL fetching, extraction, Zod validation
- POST /api/confirm-research — Skill Builder + Prompt Engine without disk write
- POST /api/create-skill — full pipeline with atomic write

**Tool routes:**
- POST /api/optimize-prompt — 4-dimension audit
- POST /api/regen-prompt — framework override regeneration (requires build-metadata.json)
- POST /api/eval-triggers — description trigger evaluator
- POST /api/budget-check — budget simulation
- POST /api/fork-skill — creates independent fork
- GET /api/version-history — git changelog for a skill

**Community routes:**
- POST /api/reviews — submit review (auth required)
- GET /api/reviews/[skillSlug] — reviews + effectiveness score + install count
- POST /api/feedback — submit self-improvement feedback (auth required)
- GET /api/improvements/[skillSlug] — pending suggestions (auth + author required)
- POST /api/improvements/[id]/approve — apply suggestion (auth + author required)
- POST /api/improvements/[id]/reject — reject suggestion (auth + author required)

**MCP route:**
- GET /api/mcp — tool list
- POST /api/mcp — JSON-RPC 2.0 tool execution (search_skills, get_skill, get_prompts, list_categories, deploy_skill)

**Analytics routes:**
- POST /api/analytics/search-click — fire-and-forget click tracking

**Marketplace routes (Phase 3):**
- GET /api/marketplace/status — launch conditions check
- POST /api/marketplace/checkout — creates Stripe session
- GET /api/marketplace/entitlement — access check
- POST /api/webhooks/stripe — webhook (MUST document raw body requirement)

For EACH route, show: method, path, auth requirement, complete request body schema table, complete response schema, ALL error codes with exact error string values, and a working curl example that returns documented response.

**Allowed files:**
```
docs/developer/api-reference.md
```

**Verify:** Every curl example runs against `localhost:3000` and returns the documented response shape.

**Stop if:**
- Any curl example returns a different status code or response shape than documented — run it first
- Any route documented doesn't exist in `app/api/` — check before writing
- Need files outside allowed_files

---

### T404 — CLI Complete Reference

**Type:** Worker | **Minimum:** 3,000 words

**Objective:** Write `docs/developer/cli-reference.md` — every CLI command with full flag documentation, examples, and expected output.

**Format for each command:**
```
## npx skill-mall create

Create a skill using the research-first pipeline.

### Synopsis

npx skill-mall create "<topic>" [--urls <url>...] [--category <cat>] [--author <name>]

### Options

| Flag | Default | Description |
|---|---|---|
| --urls | (none) | One or more authoritative source URLs |
| --category | business | Skill catalog category |
| --author | (from config) | GitHub username for metadata.author |

### Behavior

1. Runs the Research Engine against the topic and URLs
2. Writes `skill-builder-output/<slug>/research-result.json`
3. Prints: `npx skill-mall confirm-research <slug>`

### Examples

```bash
# Research-first with source URLs (recommended)
npx skill-mall create "blue ocean strategy" \
  --urls https://blueoceanstrategy.com/tools/ \
  --category business

# Training knowledge only (marked as unverified)
npx skill-mall create "okr framework" --category productivity
```

### Exit codes

| Code | Meaning |
|---|---|
| 0 | Success — research-result.json written |
| 1 | No provider configured |
| 2 | All URLs failed to fetch |
| 3 | LLM extraction failed after retry |
```

**All commands to document:** configure, create, confirm-research, deploy (including --all-agents, --agents, --scope), deploy-pack, fork, revert, publish (--registry npm and --registry skills.sh), validate, new (template-based), new (--from-template), extract, test, budget-check, optimize-prompt, regen-prompt, eval-triggers, mcp-server, attach-knowledge (Phase 3), list, find.

**Allowed files:**
```
docs/developer/cli-reference.md
```

**Verify:** Every command shown produces the documented output on the actual CLI.

**Stop if:**
- Any CLI command shown exits with an error — verify against the actual built CLI before documenting
- Need files outside allowed_files

---

### T405 — Contributing Guide

**Type:** Worker | **Minimum:** 2,500 words

**Objective:** Write `docs/developer/contributing.md` — everything a contributor needs to submit a quality PR, whether they're adding a skill, fixing a bug, or building a feature.

**Required sections:**

**Types of contributions** — skills (easiest), bug fixes, documentation, new features. Different paths for each.

**Contributing a skill** — the complete workflow:
1. Run feature-inventory-check against the spec
2. Use `npx skill-mall create` or write manually
3. Validate with `bash scripts/validate-skill.sh --strict skills/<category>/<slug>`
4. Test the skill in a real Claude Code session
5. Open a PR — CI runs automatically

**Quality bar for skills** — the exact quality score rubric (25+25+20+20+10), what score is required for merge (70+), what the CI checks, how to read the validation report on the PR

**Contributing code** — the 16-step development workflow, commit message convention (feat/fix/refactor/test/docs/chore), PR template, code review process

**Code standards** — TypeScript strict mode, Zod validation on all external inputs, parameterized SQL, atomic file writes, no magic strings in UI (bracket notation, Space Mono), Nothing design rules

**Writing tests** — where test files go (`lib/__tests__/`), the MockLLMClient pattern, how to avoid real LLM calls in tests, test file naming convention, minimum coverage expectations

**Documentation contributions** — using the `plan-review` skill before submitting docs PRs, word count minimums, accuracy requirements

**Allowed files:**
```
docs/developer/contributing.md
```
**Verify:**
- `wc -w docs/developer/contributing.md` shows >= 2500
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T406 — Extending SkillMall

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/developer/extending.md` — how to extend SkillMall without forking: adding providers, adding CLI commands, adding API routes, adding skill analyzers.

**Required sections:**

**Adding a new LLM provider** — exact implementation with code:
1. Create `lib/providers/<name>.ts` implementing `LLMClient` interface
2. Add to `ProviderID` union in `lib/providers/types.ts`
3. Add to `DEFAULT_MODELS` in `lib/providers/defaults.ts`
4. Add case to `createLLMClient` in `lib/providers/index.ts`
5. Add to `PROVIDER_CATALOG` in `app/api/providers/route.ts`

**Adding a new CLI command** — the pattern (commander.js-style, exports a function, registered in `cli/src/index.ts`), the file template, how to handle `@/lib/` imports in the CLI context

**Adding a new API route** — the Next.js App Router pattern, Zod validation, error response format, adding to `docs/developer/api-reference.md`

**Adding a new skill quality dimension** — modifying `lib/quality-score.ts`, the `DimensionScore` type, how feedback messages work

**Adding a new PE framework** — the `FRAMEWORK_DESCRIPTIONS` and `FRAMEWORK_CANDIDATES` structure in `lib/pe-frameworks.ts`

**Allowed files:**
```
docs/developer/extending.md
```
**Verify:**
- `wc -w docs/developer/extending.md` shows >= 2000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T407 — Deployment Guide

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/developer/deployment.md` — how to deploy SkillMall beyond `npm run dev`.

**Required sections:**

**Vercel deployment** — step-by-step:
1. Fork the repo
2. Connect to Vercel
3. Set environment variables: `SKILL_MALL_PROVIDER`, `SKILL_MALL_API_KEY`, `SKILL_MALL_MODEL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
4. Important limitation: Vercel filesystem is read-only. What this means: skill creation (POST /api/create-skill) writes to the filesystem — this does NOT work on Vercel. The catalog (browse/search/deploy) works. The pipeline does not.
5. For a fully functional deployment, use a VPS or Railway

**Railway/VPS deployment** — what's different: writable filesystem, SQLite database persists, all features work

**Environment variables reference** — every env var, required vs optional, where to get the value, what breaks if missing

**SQLite in production** — the WAL mode advantage, backup strategy (`cp data/skillmall.db data/skillmall.backup.db`), the read-only Vercel limitation explained clearly, migration path to Turso for scale

**GitHub OAuth in production** — updating callback URL, Secure cookie flag, `NEXT_PUBLIC_APP_URL` must match actual domain

**CLI in production environments** — `npm install -g skill-mall` when published, or `npx skill-mall` for one-off use

**Allowed files:**
```
docs/developer/deployment.md
```

**Verify:**
- `wc -w docs/developer/deployment.md` shows >= 2000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files

---

## Suite 2: End-User Documentation

Target reader: Someone who knows what Claude Code (or another AI coding agent) is and wants to make it more powerful with skills. May have never written a line of code. Explain everything. Celebrate every milestone. Never assume.

---

### T411 — Introduction to SkillMall

**Type:** Worker | **Minimum:** 2,500 words

**Objective:** Write `docs/guide/introduction.md` — the first thing a new user reads. By the end, they understand what SkillMall is, why they need it, and are ready to install their first skill.

**Required sections:**

**What is SkillMall?** — 3 paragraphs. Plain language. No jargon. The simplest possible explanation: "Claude Code (and other AI coding agents) are incredibly capable, but they work best when they know exactly how you want them to work. A skill is a set of instructions that tells the agent: this is how to do THIS specific thing, step by step, with the right artifacts, templates, and checks."

**What is a skill, really?** — concrete example. Describe what happens when you invoke `/blue-ocean-strategy` in Claude Code. The agent reads the skill file. It knows the 21 tools. It knows the templates. It generates a complete strategy canvas without you having to explain what one is.

**Who uses SkillMall?** — 3 personas with specific scenarios:
- The solo developer who creates a `code-review` skill so Claude always reviews PRs in their team's style
- The strategy consultant who creates a `blue-ocean-strategy` skill so any analysis they run is consistent and complete
- The engineering team who creates a `debugging-session` skill so every engineer on the team follows the same systematic debugging process

**What can you do with SkillMall?** — the 4 main actions:
1. Browse and deploy skills from the catalog (5-minute value)
2. Create skills from authoritative sources (use the wizard or CLI)
3. Customize and fork existing skills for your context
4. Share skills with your team via collections

**How skills work across agents** — SkillMall skills work with Claude Code, Cursor, Codex, Gemini CLI, and any other AgentSkills-compatible agent. Explain what "AgentSkills-compatible" means without making it technical.

**Your first 10 minutes with SkillMall** — not a tutorial (that's T412), but a preview of what's possible:
- Minute 1: browse the catalog
- Minute 3: deploy a skill to Claude Code
- Minute 5: invoke the skill and see it work
- Minute 10: fork the skill and customize it

**Is SkillMall right for you?** — honest. SkillMall is best when you: have repeatable workflows you want to systematize, work with a domain that has established methodologies, want consistency across your team. It's not magic — skills are as good as the knowledge that goes into them.

**Allowed files:**
```
docs/guide/introduction.md
```
**Verify:**
- `wc -w docs/guide/introduction.md` shows >= 2500
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T412 — Quick Start: Your First Skill in 10 Minutes

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/guide/quick-start.md` — a complete tutorial that gets a brand new user from zero to a deployed skill in 10 minutes. Every step shown. Every expected output shown. Every potential error addressed.

**Format:** Tutorial. Present tense. Second person ("you"). Step by step. Expected outputs in code blocks. Screenshots described as prose. Every stumbling block addressed with "If you see X, do Y."

**Structure:**

**What you'll build** — "By the end of this tutorial, you'll have the SkillMall app running locally and a skill deployed to Claude Code that you can invoke right now."

**What you need** — Node.js 20+, Git, Claude Code installed (or another compatible agent). Link to install guides.

**Step 1: Clone and run** (2 minutes)
```bash
git clone https://github.com/jamesdsizemore/SkillMall
cd SkillMall
npm install
npm run dev
```
"Open http://localhost:3000. You should see the SkillMall homepage with a counter showing the number of skills in the catalog."

**Step 2: Browse the catalog** (1 minute) — describe what the homepage looks like, how to search, how to click into a skill detail page.

**Step 3: Deploy a skill** (2 minutes) — screenshot described: "On the skill detail page, find the DEPLOY section in the right sidebar. Click the dropdown to select your agent (Claude Code is the default). Click COPY to copy the deploy command."
```bash
cp -r skills/productivity/development-workflow ~/.claude/skills/
```
"Or use the CLI: `npx skill-mall deploy productivity/development-workflow`"

**Step 4: Use the skill** (3 minutes) — open Claude Code, type `/development-workflow`, describe what happens. "Claude Code now has access to the 16-step development workflow. When you invoke it, Claude will follow the complete process: TypeScript check, lint, build, two code reviews, smoke test, and git commit."

**Step 5: Explore** (2 minutes) — how to find more skills, how the search works, how quality scores help you decide which skill to use.

**What's next** — links to: Creating your first skill (T413), Understanding quality scores, Deploying to multiple agents at once.

**Allowed files:**
```
docs/guide/quick-start.md
```
**Verify:**
- `wc -w docs/guide/quick-start.md` shows >= 2000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T413 — Tutorial: Creating Your First Skill with the Wizard

**Type:** Worker | **Minimum:** 3,000 words

**Objective:** Write `docs/guide/tutorials/wizard-tutorial.md` — a complete, step-by-step tutorial walking a user through the full 6-step wizard to create a real skill.

**The tutorial creates:** a skill for the "Jobs-to-Be-Done" customer interview framework.

**Before you start** — prerequisites: SkillMall running (`npm run dev`), LLM provider configured. If not configured, show: "Click Settings in the header, then Providers. Select your provider and enter your API key."

**Step 1: Open the wizard** — "Click 'Create a Skill' in the navigation. You'll see the wizard's first step."

**Describe the Step 1 screen** — the large topic input field, the "ADD SOURCE URL" button, what each field means and why it matters.

**Enter the topic and URL:**
```
Topic: Jobs-to-Be-Done Customer Interviews
Source URL: https://jobs-to-be-done.com/what-is-jobs-to-be-done-theory-e5dc9f87e37c
```
"Adding a source URL is optional but strongly recommended. Without it, the Research Engine uses its training knowledge, which may not be as accurate or current."

**Step 2: Review the research** — describe the screen layout (dark counter panel on left, tool cards on right). "The Research Engine has extracted the key tools from the Jobs-to-Be-Done methodology. You should see 5-8 tool cards including 'Interview Script', 'Job Statement', and 'Outcome Statement'."

"Expand at least one tool by clicking [DETAILS]. Read the extracted inputs, outputs, and procedure. This is your chance to verify the extraction is accurate before any files are written."

"If a tool looks wrong, don't worry — you can still proceed. The pipeline is a starting point, not the final word. You can edit the generated files after creation."

"Click [CONFIRM RESEARCH →]"

**Steps 3-6** — walk through each screen with the same level of detail. What each field means. What good values look like. What the estimated prompt count means. What the file tree preview shows.

**After creation** — "You'll be redirected to your new skill's detail page. The quality score shows 87/100 — excellent for a first generation."

**Using the skill** — deploy it, invoke it in Claude Code, show what happens.

**Troubleshooting** — common issues and fixes.

**Allowed files:**
```
docs/guide/tutorials/wizard-tutorial.md
```
**Verify:**
- `wc -w docs/guide/tutorials/wizard-tutorial.md` shows >= 3000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T414 — Tutorial: Creating Skills with the CLI

**Type:** Worker | **Minimum:** 2,500 words

**Objective:** Write `docs/guide/tutorials/cli-tutorial.md` — a complete tutorial for creating, reviewing, and deploying a skill using only the command line.

**The tutorial creates:** a skill for the "OKR Framework".

**Why use the CLI instead of the wizard?** — faster for power users, scriptable, works in CI/CD, lets you review the research result as a JSON file before proceeding.

**Step 1: Configure (if not done)**
```bash
npx skill-mall configure
# Interactive: select provider, enter API key, select model
```
Or non-interactive:
```bash
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6
```
"You should see: Configured: claude-code / claude-sonnet-4-6"

**Step 2: Create the skill**
```bash
npx skill-mall create "okr framework" \
  --urls https://www.whatmatters.com/faqs/okr-meaning-definition-example \
  --category productivity
```
"The Research Engine fetches the URL, extracts the OKR methodology tools, and writes the result to `skill-builder-output/okr-framework/research-result.json`."

**Step 3: Review the research result**
```bash
cat skill-builder-output/okr-framework/research-result.json | python3 -m json.tool
```
"Open the file and review the extracted tools. You should see: OKR Template, Key Result Criteria, Confidence Rating, OKR Review Template. If anything looks wrong, you can edit the JSON directly before confirming."

Walk through what each field in the ResearchResult means. What `researchUnverified: false` means (the URL was fetched). What `suggestedCategory` is used for.

**Step 4: Confirm and build**
```bash
npx skill-mall confirm-research okr-framework
```
"Expected output:
```
Building skill directory...
Skill directory built.
Writing to skills/productivity/okr-framework/
Written to skills/productivity/okr-framework/
  Files written: 23
  Prompts: 8
  Quality score: 82/100
```"

**Step 5: Validate**
```bash
bash scripts/validate-skill.sh skills/productivity/okr-framework
```
"Expected: `0 errors, X warnings`"

**Step 6: Deploy**
```bash
npx skill-mall deploy productivity/okr-framework
# Or to all detected agents:
npx skill-mall deploy productivity/okr-framework --all-agents
```

**The full workflow as one command sequence** — show it all together so users can copy-paste.

**Allowed files:**
```
docs/guide/tutorials/cli-tutorial.md
```
**Verify:**
- `wc -w docs/guide/tutorials/cli-tutorial.md` shows >= 2500
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T415 — Tutorial: Customizing and Forking Skills

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/guide/tutorials/customizing-skills.md` — how to take an existing skill and make it your own.

**Why fork instead of edit?** — forking creates an independent copy. The original skill can update; your fork stays as you made it. Your changes don't affect the community version.

**Tutorial:** Fork the `development-workflow` skill and add team-specific steps.

**Step 1: Fork via CLI**
```bash
npx skill-mall fork productivity/development-workflow my-team-workflow
```

**Step 2: Understand what was created** — explain the `forked_from` frontmatter field. Show what the fork directory looks like. Explain what's independent (everything) and what's not (changes to original don't propagate).

**Step 3: Edit the SKILL.md** — open `skills/productivity/my-team-workflow/SKILL.md`. Walk through each section. Add a new rule: "Before Step 16 (git commit), always run `./scripts/check-team-standards.sh`."

**Step 4: Edit a template** — open one of the template files. Add a team-specific field.

**Step 5: Update the description** — "The description in SKILL.md is what Claude reads to understand when to use the skill. Make it specific to your team's workflow."

**Step 6: Validate and deploy**
```bash
bash scripts/validate-skill.sh skills/productivity/my-team-workflow
npx skill-mall deploy productivity/my-team-workflow
```

**Using the Fork UI button** — describe the Fork button on the skill detail page. Same outcome, different path.

**Keeping your fork in sync** — explaining that forks are intentionally independent, and how to manually pull in improvements from the original.

**Allowed files:**
```
docs/guide/tutorials/customizing-skills.md
```
**Verify:**
- `wc -w docs/guide/tutorials/customizing-skills.md` shows >= 2000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T416 — Guide: Understanding Skill Quality

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/guide/understanding-quality.md` — a complete guide to the quality score system, how it's computed, and how to improve it.

**Required sections:**

**What the quality score means** — 0 to 100. What the ranges mean in practice (below 40: template/placeholder, 40-70: usable but incomplete, 70-89: good, 90+: excellent).

**The five dimensions** — explain each one in plain English with examples of what earns full points and what loses points:

1. **Description quality (25 pts):** "The description is the first thing an agent reads to decide whether to use your skill. It needs to start with an action verb ('Apply', 'Run', 'Analyze'), stay under 150 characters, and put the most important keyword in the first 80 characters." Show good example vs bad example.

2. **Completeness (25 pts):** "Does your skill have the resources needed to actually be useful? A SKILL.md without a README is like a recipe without instructions. Templates without samples leave users guessing what 'done' looks like."

3. **Frontmatter health (20 pts):** "The metadata fields tell the catalog how to categorize and display your skill. Missing `author` means nobody knows who to contact. Wrong `category` means users searching the right section won't find you."

4. **Resource richness (20 pts):** "The more complete your skill's resources are, the more useful it is. A skill with 15+ files (templates, samples, prompts, scripts) covers more ground than one with 3."

5. **Link health (10 pts):** "If your skill references another skill that doesn't exist, the link is broken. Clean up before publishing."

**How to improve your score** — for each dimension, a 3-step improvement plan. Show the before/after feedback messages.

**The Budget Analyzer** — introduce the Budget Analysis tab. Explain that even a perfect description gets truncated when 50 skills are installed. Show how to use `--chars-available` to simulate different load levels.

**Allowed files:**
```
docs/guide/understanding-quality.md
```
**Verify:**
- `wc -w docs/guide/understanding-quality.md` shows >= 2000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T417 — Guide: Using Collections and Packs

**Type:** Worker | **Minimum:** 1,500 words

**Objective:** Write `docs/guide/using-collections.md` — how to deploy skill packs and create your own.

**Required sections:**

**What's a collection?** — a curated bundle of related skills with a recommended deployment order. Like an app bundle for your agent.

**Deploying the starter packs:**
```bash
# Full-Stack Developer Kit
npx skill-mall deploy-pack full-stack-developer-kit --agent claude-code

# Strategic Business Pack
npx skill-mall deploy-pack strategic-business-pack --agent cursor

# Documentation Suite
npx skill-mall deploy-pack documentation-suite
```

**Creating your own collection** — walk through creating a `my-team-pack/collection.json`. Explain the format (name, slug, skills array with order and notes).

**Submitting a community pack** — how to open a PR, what the CI checks, quality requirements.

**Allowed files:**
```
docs/guide/using-collections.md
```
**Verify:**
- `wc -w docs/guide/using-collections.md` shows >= 1500
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T418 — Guide: Prompt Optimization

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/guide/prompt-optimization.md` — how to use the prompt library and optimizer to write better prompts.

**Required sections:**

**The Prompt Library** — what's in it, how to browse it, how to filter by category, the one-click copy button. "When you're writing a skill prompt by hand, the prompt library is your toolkit."

**Understanding the 40+ frameworks** — don't list all 40. Pick 8-10 of the most useful ones and explain each with a real-world example. "Chain of Thought: use this when your skill needs to show its reasoning steps, not just the answer. ERRC Grid analysis benefits from CoT because the agent needs to reason about each quadrant before filling it in."

**The Prompt Optimizer** — walk through a real optimization session. Start with a bad prompt. Show the 4-dimension audit output. Show the improved version. Show the token reduction.

**Framework Override** — when and why to override the algorithm's choice. "The algorithm chose Structured Output for your matrix prompt. But you know your team prefers seeing the reasoning trace. Override to Chain of Thought + Structured Output."

**Writing effective skill descriptions** — the trigger phrase concept, the 150-character limit, the first-80-characters rule, why imperative verbs matter.

**Allowed files:**
```
docs/guide/prompt-optimization.md
```

**Verify:**
- `wc -w docs/guide/prompt-optimization.md` shows >= 2000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files

---

## Suite 3: Marketing Documentation

Target reader: Decision-maker, potential user, journalist, investor. May not know what Claude Code is. Needs to understand SkillMall's value quickly. Every word earns its place.

---

### T421 — Landing Page Copy

**Type:** Worker | **Minimum:** 2,500 words of copy

**Objective:** Write `docs/marketing/landing-page-copy.md` — complete copy for the SkillMall marketing homepage, ready to implement.

**Document format:** Each section labeled clearly with section name, word count target, and the actual copy.

**Required sections:**

**Hero section** (50 words):
- Headline (10 words max): "The Open-Source Skill Catalog for AI Coding Agents"
- Subheadline (20 words): "Create, deploy, and share structured skills that make Claude Code, Cursor, and any AI agent significantly more capable — instantly."
- Primary CTA: "Browse Skills" → links to catalog
- Secondary CTA: "Create Your First Skill" → links to wizard

**Problem statement** (100 words): The paragraph that makes someone nod and say "yes, that's exactly my problem." Focus on: agents are powerful but generic; every developer keeps re-explaining the same context; there's no standard way to share these reusable workflows.

**Product overview** (150 words): What SkillMall is, how it works, what you get. Not features — benefits. "Your agent learns your code review process once and applies it perfectly every time."

**Three core features** (50 words each):
1. Research-first skill creation: "Point SkillMall at any methodology, framework, or workflow. It extracts the tools, generates templates, and creates prompts — in minutes."
2. One-click deployment: "Skills deploy to Claude Code, Cursor, Codex, Gemini CLI, and more with a single command."
3. Community catalog: "Browse, fork, and build on hundreds of skills created by the community."

**Social proof section** — three quote-format testimonials (write as placeholders with [REAL QUOTE FROM USER X] format, showing the structure and topic focus expected)

**How it works** — 4 steps with specific descriptions:
1. Browse the catalog and deploy in 60 seconds
2. Create a skill from any URL in minutes
3. Review and confirm the extracted knowledge
4. Deploy to all your agents at once

**FAQ** — 6 questions with direct, honest answers:
- "Is SkillMall free?" "Yes, completely open-source under MIT license."
- "Does it work with my agent?" "If it supports AgentSkills format, yes. That includes Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, and more."
- "What LLM does it use?" "Yours. SkillMall uses your own API key. No shared backend, no subscription."
- "How accurate are the generated skills?" "More accurate when you provide source URLs. Without URLs, it uses training knowledge and marks results as unverified so you know."
- "Can I keep skills private?" "Yes. Skills live in your local filesystem. You decide what to publish."
- "What's a skill, exactly?" "A SKILL.md file with structured instructions, templates for every artifact, sample outputs, and framework-selected prompts. Your agent reads it to know exactly how to complete a specific type of work."

**Final CTA section** (75 words): "SkillMall is open-source and free forever. Start in 60 seconds — no account required."

**Allowed files:**
```
docs/marketing/landing-page-copy.md
```
**Verify:**
- `wc -w docs/marketing/landing-page-copy.md` shows >= 2500
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T422 — Value Proposition Document

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/marketing/value-proposition.md` — a detailed articulation of SkillMall's value for different audiences. Used internally for messaging consistency, externally as a product brief.

**Required sections:**

**The one-sentence pitch for each audience:**
- Developers: "SkillMall lets you systematize any coding workflow into a reusable skill that any AI coding agent follows perfectly, every time."
- Team leads: "SkillMall turns your team's best practices into skills that every engineer can invoke — making consistency the default, not the exception."
- Consultants: "SkillMall converts any methodology into a structured skill that guides AI agents through the complete process — with the right artifacts, templates, and validation checks."
- Open-source maintainers: "SkillMall creates community-driven skill catalogs that make AI agents domain-aware without requiring every user to re-explain the same knowledge."

**The core value proposition** — "SkillMall solves the knowledge gap between what AI agents can do and what you need them to know." 3 paragraphs expanding on this.

**Value by use case** — for each of 5 specific use cases, the specific value delivered:
1. Code review standardization: time saved per PR, consistency improvement
2. Business strategy analysis: completeness of analysis, time to deliverable
3. Documentation generation: coverage, consistency, no blank-page problem
4. Debugging systematization: systematic approach, reduced context switching
5. API documentation: completeness, format consistency

**Competitive differentiation** — what SkillMall has that alternatives don't: research-first generation from authoritative sources, 40+ prompt engineering framework library, multi-agent deployment, open-source and local-first, community catalog

**What SkillMall is NOT** — honest limitations: not a replacement for human expertise, not magic (skills are as good as the knowledge that goes into them), not a SaaS subscription

**Allowed files:**
```
docs/marketing/value-proposition.md
```
**Verify:**
- `wc -w docs/marketing/value-proposition.md` shows >= 2000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T423 — Use Cases and Case Studies

**Type:** Worker | **Minimum:** 3,500 words

**Objective:** Write `docs/marketing/use-cases.md` — 6 detailed use cases showing exactly how SkillMall works in real-world scenarios. Each use case tells a complete story.

**Format for each use case:**
- **The situation**: Who, what they do, what problem they have
- **The skill they created**: Exactly how (wizard or CLI, what source URL, how long it took)
- **What the skill produces**: Specific artifacts, specific time savings
- **The result**: Concrete outcome with specifics

**6 use cases to write:**

1. **Code Review for a SaaS Team** — a 6-person engineering team, inconsistent PR reviews, the code-review starter template, every PR now gets checked for the same 15 criteria, senior dev saves 30 min/day on review feedback

2. **Blue Ocean Strategy Analysis** — a solo strategy consultant, client asks for a complete Blue Ocean analysis, the wizard + blueoceanstrategy.com URL, 21 tools extracted in 4 minutes, full analysis in 2 hours vs 2 days

3. **Incident Postmortem at a Startup** — on-call engineer, 2am incident, the incident-postmortem skill guides through the complete process, structured blame-free postmortem document generated in 20 minutes

4. **API Documentation for an Open-Source Project** — maintainer dreads writing docs, api-documentation skill generates complete docs from code, PR descriptions automatically formatted, contributors adopt faster

5. **OKR Planning for a Remote Team** — team lead, quarterly planning, OKR skill guides Claude through the complete OKR framework, team alignment meeting goes from 3 hours to 45 minutes

6. **Debugging Systematically** — developer chasing a race condition, debugging-session skill forces systematic approach (reproduce, isolate, identify, fix, verify), bug found in 45 minutes vs 4-hour rabbit hole

**Allowed files:**
```
docs/marketing/use-cases.md
```
**Verify:**
- `wc -w docs/marketing/use-cases.md` shows >= 3500
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T424 — Comparison Guide

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/marketing/comparison.md` — honest, accurate comparison of SkillMall vs alternatives.

**Format:** Fair and factual. Acknowledge where alternatives are better. Be specific, not vague.

**Alternatives to compare:**

1. **Custom system prompts** — what they are, where they fall short (not structured, not shared, not versioned, no templates), where SkillMall wins (structured format, community, templates, multi-agent), where system prompts win (simpler for one-off tasks)

2. **skills.sh registry** — sister platform, how they relate (SkillMall can publish TO skills.sh), where they complement each other

3. **Claude's Projects feature** — built into Claude.ai, no setup, where it falls short (web-only, no CLI, no structured artifacts, no multi-agent), where SkillMall wins

4. **Custom instructions / memory** — agent-specific memory features, why they're different from skills (persistent context vs structured task instruction), when to use each

5. **Documentation + prompting from scratch** — what most people do today, the cost (re-explaining context constantly, inconsistency, no sharing), why structured skills are better

**The honest answer to "which should I use?"** — a decision framework. Small teams doing simple tasks: system prompts may be enough. Teams with repeatable complex workflows: SkillMall. Need community-sourced skills: SkillMall. Primarily using Claude.ai web: consider Projects. Need multi-agent: SkillMall.

**Allowed files:**
```
docs/marketing/comparison.md
```
**Verify:**
- `wc -w docs/marketing/comparison.md` shows >= 2000
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T425 — Press Kit

**Type:** Worker | **Minimum:** 1,500 words

**Objective:** Write `docs/marketing/press-kit.md` — everything a journalist, podcast host, or conference organizer needs to write about or feature SkillMall.

**Required sections:**

**About SkillMall** — 3 versions:
- 50 words: the elevator pitch
- 100 words: the press blurb
- 300 words: the full background

**Key facts** — bullet list of the most quotable facts:
- Open-source (MIT license)
- Works with X agents (list them)
- 40+ prompt engineering frameworks built in
- Research-first generation from any URL
- Skills deploy globally in one command

**Founding context** — what problem led to SkillMall being built, when, by whom

**Technical differentiators** — the 3 things that are unique about SkillMall technically (for technical publications)

**Media-ready descriptions** — 5 different one-liners for different contexts:
- For a developer podcast: "The npm of AI agent skills"
- For a business publication: "Making AI coding agents domain-aware"
- For a tech blog: "Open-source skill catalog with research-first generation"
- For a product newsletter: "Turn any methodology into a deployable AI agent skill in minutes"
- For a general audience: "A library of instructions that make AI tools dramatically more useful"

**Frequently asked questions** — 5 questions a journalist would ask, with direct answers

**Contact** — how to reach the maintainer for questions, corrections, or interviews

**Allowed files:**
```
docs/marketing/press-kit.md
```
**Verify:**
- `wc -w docs/marketing/press-kit.md` shows >= 1500
- Every CLI command shown runs without error on the actual codebase (`npm run dev` running)
- Every code block compiles or executes correctly when copied as-is
- Read the document as the target reader — nothing assumes unstated knowledge, nothing is confusing
- All cross-links point to files that exist

**Stop if:**
- A feature documented doesn't exist or doesn't work as described — document reality, add "Coming in Phase 3/4" where needed
- Any CLI command shown produces an error — fix the command or note the prerequisite before documenting it
- Word count is below minimum — add more content, never padding
- Need files outside allowed_files


---

### T426 — Documentation Infrastructure

**Type:** Worker | **Minimum:** Technical implementation

**Objective:** Set up the documentation site infrastructure. Add a `/docs` section to the Next.js app that renders the Markdown documentation files with navigation, search, and proper formatting.

**Implementation:** Use `next-mdx-remote` or `contentlayer` to render Markdown files from `docs/` as pages at `/docs/*`. Add a documentation layout with:
- Left sidebar navigation (organized by suite: Developer / Guide / Marketing)
- Right sidebar table of contents (from headings)
- Syntax highlighting for code blocks (using `shiki`)
- Search (simple: browser-side search through loaded content)
- Nothing design tokens applied to docs pages

**Navigation structure:**
```
/docs
  /docs/developer
    /docs/developer/getting-started
    /docs/developer/architecture
    /docs/developer/api-reference
    /docs/developer/cli-reference
    /docs/developer/contributing
    /docs/developer/extending
    /docs/developer/deployment
  /docs/guide
    /docs/guide/introduction
    /docs/guide/quick-start
    /docs/guide/tutorials/wizard
    /docs/guide/tutorials/cli
    /docs/guide/tutorials/customizing
    /docs/guide/understanding-quality
    /docs/guide/using-collections
    /docs/guide/prompt-optimization
  /docs/marketing
    (linked from landing page, not in main nav)
```

**Allowed files:**
```
app/docs/
components/docs/
lib/docs.ts
package.json
```

**Verify:**
- `npm run build` succeeds with docs pages included
- `/docs` renders the documentation index
- Code blocks have syntax highlighting
- Navigation works on all pages
- Search finds content across all docs

**Stop if:**
- The docs site causes `npm run build` to fail — fix before continuing
- `next-mdx-remote` or chosen library has version conflicts with existing dependencies — resolve before proceeding
- Need files outside allowed_files

---

### T427 — Documentation Audit (Judge)

**Type:** Judge | **Depends on:** T401–T426

**Objective:** Audit all Phase 4 documentation for completeness, accuracy, and quality. Every document must meet its word count minimum, every command must work, every code example must compile.

**Checklist:**
- [ ] All 15 content documents exist and meet word count minimums
- [ ] Every CLI command shown has been verified to run
- [ ] Every API curl example returns the documented response shape
- [ ] Every TypeScript snippet compiles without errors
- [ ] Cross-links between documents resolve to existing files
- [ ] No document references features that haven't been built yet (flag for Phase 3 completion first)
- [ ] Documentation site `/docs` renders correctly
- [ ] The "getting started" tutorial produces a working result when followed from scratch on a fresh clone

**Do not approve if:**
- Any document is below its minimum word count
- Any command shown produces an error
- Any API response doesn't match what the route actually returns
- The docs site fails to build

---


---

### T419 — Troubleshooting Guide (End-User)

**Type:** Worker | **Minimum:** 3,000 words

**Objective:** Write `docs/guide/troubleshooting.md` — a comprehensive guide for every error and problem a user can encounter. Organized by symptom, not by component. Written so a non-technical user can self-diagnose.

**Required structure:** Every entry follows this format:
```
### I see: "[exact error message or symptom]"

**What this means:** [plain English explanation]

**Fix it:**
1. [First thing to try]
2. [If that doesn't work]
3. [Last resort]

**If none of these work:** [where to get help]
```

**Required entries — minimum 25 specific problems:**

**Provider and LLM problems:**
- "No LLM provider configured" — how to run configure, all 5 providers
- "Missing credentials" — which env var to set, for each provider
- Research Engine returns "Extraction failed after 2 attempts" — what causes it, how to try different URLs, what to do when training knowledge is better
- "Claude Code CLI times out" — check `claude --version`, check `claude auth`, check PATH
- Ollama not responding — `ollama serve` check, model not pulled, port conflict
- Research results are wrong/generic — source URL too general, try more specific URL, Wikipedia isn't authoritative for most methodologies

**Wizard problems:**
- Research step shows 0 tools — URL blocked by robots.txt, URL requires JavaScript rendering, how to use --urls flag directly
- "Continue" button stays disabled — reminder about DETAILS expansion requirement
- Step 2 "confirm" never finishes — LLM is slow on this domain, expected timing, patience
- Wizard loses progress on refresh — sessionStorage explanation, how to recover
- Created skill has quality score below 40 — why (no pipeline-generated resources), how to improve

**CLI problems:**
- `npx skill-mall create` exits immediately — syntax error, how to quote topics with special characters
- `confirm-research` says "research-result.json not found" — run `create` first, check slug matches
- CLI hangs after starting — LLM provider is slow, `Ctrl+C` and check provider status
- `deploy` says "Skill not found" — category/slug format, `list` command to see available

**Authentication problems:**
- "Sign in with GitHub" goes to error page — client ID wrong, callback URL mismatch, how to re-register OAuth app
- Signed in but reviews won't submit — install signal check (deploy the skill first)
- Session expires immediately — NEXTAUTH_SECRET not set, cookie blocked by browser

**Build and development problems:**
- `npm run build` fails — the 10 most common TypeScript errors and their fixes
- Database migration fails — SQLite version, file permissions, existing corrupted db
- Tests fail unexpectedly — clear node_modules and reinstall, check Node.js version

**Quality score problems:**
- Score is 0 — SKILL.md parsing failed, check frontmatter YAML syntax
- Score won't go above 60 — no resources/prompts/ directory, pipeline-generated skills vs hand-crafted
- "Linked skill not found" feedback — the linked skill slug doesn't exist in the catalog

**Allowed files:**
```
docs/guide/troubleshooting.md
```

**Verify:**
- Word count >= 3,000
- Contains >= 25 specific problem entries in the correct format
- Every fix suggestion works (test each one)
- No entry says "contact support" without a specific contact method

**Stop if:**
- A fix suggestion doesn't work — don't document broken advice
- Need files outside allowed_files

---

### T420 — Glossary

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/guide/glossary.md` — definitions for every term a user encounters in SkillMall, written in plain English. Cross-linked throughout the other guide docs.

**Required entries — minimum 40 terms, alphabetically sorted:**

Each entry: `**Term** — definition in 1-3 sentences. If there's a related concept, say: "See also: [Related Term]"`

**Terms that must be defined:**
AgentSkills spec, allowed_files (GoalBuddy), artifact, artifact structure, artifact type (matrix/canvas/grid/list/flowchart/analysis), Better-SQLite3, build metadata, Chain of Thought, CLAUDE.md, Claude Code, Codex, collection (skill pack), Cursor, deploy, description trigger, effectiveness score, fork, frontmatter, GoalBuddy, SKILL.md, invoke (a skill), install event, install signal, knowledge base (RAG), linked skills, meta prompt, Nothing design system, Ollama, phase plan, pipeline (5-stage), prompt engineering, provider, quality score, RAG (Retrieval-Augmented Generation), research engine, research result, ResearchTool, ResearchUnverified flag, Skill Builder, skill catalog, slug, SQLite, starter template, Vitest, WAL mode, Worker task, Zod schema.

**Tone:** Plain English. Write for someone who just discovered SkillMall today. No jargon in the definitions unless you define the jargon first.

**Allowed files:**
```
docs/guide/glossary.md
```

**Verify:**
- Word count >= 2,000
- >= 40 defined terms, alphabetically sorted
- Every term used in other guide docs is defined here
- No circular definitions (term A defined using term B which is defined using term A)

**Stop if:**
- Need files outside allowed_files

---

### T428 — Replace Existing Stub Docs

**Type:** Worker | **Minimum:** N/A (replacement task)

**Objective:** The existing `docs/user/` and `docs/reference/` directories contain stub documents created in Phases 1 and 2 (typically 500-700 words each). These must be either replaced with the new comprehensive versions or explicitly redirected to the new Phase 4 docs.

**Decision rule:**
- If Phase 4 has a doc that covers the same topic: delete the stub, add a redirect notice to the new location
- If Phase 4 doesn't cover the topic: keep the stub and expand it to Phase 4 standards (2,000+ words)

**Stubs to evaluate and handle:**

| File | Phase 4 replacement | Action |
|---|---|---|
| `docs/user/configuring-providers.md` | T401 covers this | Replace with link to docs/developer/getting-started.md#configure-llm-provider |
| `docs/user/using-the-wizard.md` | T413 | Replace with link to docs/guide/tutorials/wizard-tutorial.md |
| `docs/user/using-the-cli.md` | T414 | Replace with link to docs/guide/tutorials/cli-tutorial.md |
| `docs/reference/pipeline-architecture.md` | T402 | Replace with link to docs/developer/architecture.md |
| `docs/reference/provider-catalog.md` | T401, T406 | Replace with link to docs/developer/getting-started.md and extending.md |
| `docs/reference/research-result-schema.md` | T402 | Replace with link to docs/developer/architecture.md#research-engine |
| `docs/reference/prompt-file-format.md` | T418 | Expand to 2,000+ words if not covered by T418 |
| `docs/reference/quality-score-rubric.md` | T416 | Replace with link |
| `docs/reference/api-routes.md` | T403 | Replace with link |
| `docs/user/mcp-server.md` | T403 | Absorb into API reference |
| `docs/reference/database-schema.md` | T402 | Replace with link |
| `docs/reference/collection-format.md` | T417 | Replace with link |
| `docs/user/publishing-skills.md` | T405, T404 | Replace with link |
| `docs/user/multi-agent-deploy.md` | T414 | Replace with link |
| `docs/user/community-guide.md` | T411 | Replace with link |
| `docs/user/budget-analyzer.md` (Phase 3) | T416 | Absorb into quality guide |
| `docs/user/domain-starter-templates.md` (Phase 3) | T412 | Absorb into quick start |
| `docs/user/multilingual-support.md` (Phase 3) | T415 | Absorb into customizing guide |
| `docs/reference/build-metadata.md` (Phase 3) | T402 | Absorb into architecture |

**How to handle redirects:** Replace file content with:
```markdown
# [Original Title]

This page has moved. See: [New Page Title](new/path.md)

The content previously on this page is now part of the [comprehensive Phase 4 documentation](../developer/getting-started.md).
```

**Allowed files:**
```
docs/user/
docs/reference/
```

**Verify:**
- No stub file remains at < 500 words without either being expanded or replaced with a redirect
- All redirect links resolve to existing Phase 4 files

**Stop if:**
- A topic has no Phase 4 coverage — expand the stub to 2,000+ words instead of redirecting to nothing
- Need files outside allowed_files

---

### T429 — Developer FAQ + Common Patterns

**Type:** Worker | **Minimum:** 2,000 words

**Objective:** Write `docs/developer/faq.md` — answers to the questions developers actually ask, plus a patterns reference for common implementation decisions.

**Required sections:**

**Frequently Asked Questions** — minimum 20 Q&As covering the real questions:

- Q: "Why does the Research Engine make 60+ LLM calls for a 20-tool domain?" A: One extraction call + one sample per tool + one framework selection per tool + one prompt body per tool + optimizer per prompt. For 20 tools: 1 + 20 + 20 + 20 + 20 = 81 calls. This is expected. For fast iteration use Groq.
- Q: "Why SQLite instead of Postgres/Supabase?" A: Local-first design philosophy. No cloud dependency, no billing, works offline, instant setup, WAL mode handles concurrent reads well for the expected load.
- Q: "Why better-sqlite3 instead of a SQL ORM?" A: Synchronous API is appropriate for SQLite, no abstraction overhead, direct parameterized queries are readable and safe.
- Q: "How do I add a new skill category?" A: Update `lib/categories.ts` and `VALID_CATEGORIES` in `lib/validators.ts`. Re-run tests.
- Q: "Why does the Claude Code provider use a subprocess instead of the SDK?" A: The user explicitly does not want Anthropic SDK or API calls. The `claude --print` CLI subprocess is the correct integration.
- Q: "Why Tailwind v4 with CSS custom properties instead of Tailwind's standard token system?" A: Nothing design system uses CSS custom properties for runtime theming (data-theme switching). Tailwind v4's `@theme` block maps to these.
- Q: "How do I test my changes without making real LLM calls?" A: Use `MockLLMClient` from `lib/__tests__/mocks/mock-llm-client.ts`. All pipeline functions accept an `LLMClient` parameter.
- Q: "Why does `lib/pipeline.ts` use `atomicWrite` with temp+rename instead of writing directly?" A: Prevents partially-written skill directories on failure. POSIX `rename()` is atomic on the same filesystem.
- Q: "How does the CLI share code with the Next.js app?" A: The CLI imports from `@/lib/` which resolves to the root `lib/` via tsup's path aliases. Both the CLI and API routes use the same pipeline functions.
- Q: "Why is sessionStorage used for wizard state instead of React state?" A: Survives browser refresh. Using only React state loses all wizard progress on F5.
- Q: "Can SkillMall run in a Docker container?" A: Yes, with the caveat that `better-sqlite3` requires native compilation. Use `node:20-alpine` with `python3`, `make`, and `g++` installed for the build.
- Q: "Why does the Prompt Engine make two LLM calls per tool (selection + body)?" A: Selection from candidates uses small context + low token count (JSON output). Body generation is the full prompt. Separating them produces better results than a single combined call.

**Common Implementation Patterns:**

Show reusable code patterns for the 5 most common extension scenarios:
1. Adding a new library that wraps the LLM client
2. Adding a new field to SKILL.md frontmatter
3. Adding a new quality score dimension
4. Adding a new MCP tool
5. Adding a new tab to the skill detail page

**Allowed files:**
```
docs/developer/faq.md
```

**Verify:**
- Word count >= 2,000
- >= 20 Q&A entries
- Code snippets in patterns section are copy-paste working
- Stop if: any Q&A answer is incorrect — verify against codebase

**Stop if:** Need files outside allowed_files

---

### T430 — Security Guide

**Type:** Worker | **Minimum:** 1,500 words

**Objective:** Write `docs/developer/security.md` — SkillMall's security model, known attack surfaces, and how defenses are implemented. Required reading before contributing code that touches auth, user input, or database writes.

**Required sections:**

**Input validation** — every entry point is Zod-validated. Show the pattern. Explain what happens when validation fails (400 + details, never 500 for user errors).

**SQL injection prevention** — parameterized queries only, never string concatenation. Show the correct pattern vs the wrong pattern with explicit "NEVER DO THIS" label.

**Path traversal prevention** — codebase extractor validates that target directories stay within `process.cwd()`. How the check works.

**Prompt injection** — the test input sanitization in the Skill Testing Framework (removes ``` and [INST] markers). Why this matters — a malicious test case could escape the evaluator prompt.

**GitHub OAuth security** — CSRF state parameter, short-lived state cookie (5 minutes), state mismatch → 400. Session token is 32 bytes of cryptographic randomness. No access tokens stored.

**Stripe webhook security** — raw body required for signature verification. What happens if you accidentally parse the body as JSON first (signature fails). The `export const runtime = 'nodejs'` requirement.

**Author identity verification** — before applying any self-improvement suggestion, `session.github_login === skill.author`. What happens if this check is skipped (any authenticated user could modify any skill).

**Known limitations** — be honest:
- Install signal verification is catalog-level, not per-user (a user can review without having personally installed, just without the skill having any install events at all)
- Phase 4 doesn't include rate limiting (add before production)
- The Claude Code CLI subprocess executes the user's prompt — prompt injection from skill content could affect the regeneration output

**Allowed files:**
```
docs/developer/security.md
```

**Verify:** Word count >= 1,500 | Every code pattern shown is from the actual codebase

**Stop if:** Need files outside allowed_files

---

## Additional Content Requirements Per Task

The following additions apply to tasks already specified above — expanding the content specification to meet comprehensive standards.

### T412 Expansion (Quick Start)

Add to the required sections:
- **"When things go wrong" sidebar** after each step — the #1 most likely problem at that step and its exact fix. Example: after `npm install`, if the user sees a `better-sqlite3` build error, show: "Run `npm install --build-from-source` or check that Python 3 and make are installed."
- **The actual localhost:3000 homepage** — describe in 200+ words what the user sees when they first open the app: the hero section, the counter row, the "What is a skill?" section, and the catalog grid. This replaces the need for screenshots.
- **Invoke the skill in Claude Code** — show the exact `/` slash command invocation. Describe what happens: "Claude Code reads the SKILL.md file and knows the full 16-step development loop. When you invoke it on a PR review task, Claude will run through all 16 steps automatically."

### T413 Expansion (Wizard Tutorial)

Add to the required sections:
- **What each step is doing behind the scenes** — sidebar explanations showing the API call that fires at each step transition. "When you click Confirm Research, SkillMall calls POST /api/confirm-research with your research result and metadata. This runs the Skill Builder and Prompt Engine in parallel — the same pipeline as the CLI."
- **The generated file structure** — after creation, show the complete directory tree for the Jobs-to-Be-Done skill and explain what every file is for.
- **Reading the quality score breakdown** — describe the quality panel on the detail page, explain what each dimension means for the specific skill just created.

### T421 Expansion (Landing Page Copy)

Add:
- **Email capture sequence** — 3-email drip sequence for users who sign up for updates: Email 1 (immediate): "Your first skill in 60 seconds." Email 2 (day 3): "The skill catalog is growing." Email 3 (day 7): "Share your first skill."
- **Social media post templates** — 5 Twitter/X posts, 2 LinkedIn posts, all with specific hooks and calls to action
- **GitHub README badge copy** — the exact markdown for the SkillMall badge, with hook text

### T423 Expansion (Use Cases)

Each case study must include:
- **Before state** — specific time/effort required without SkillMall
- **After state** — specific time/effort with SkillMall
- **The skill specification** — exact topic, source URLs used, category, resulting tool count
- **Sample output** — 100-200 words of what the skill actually produces when invoked (real output, not marketing fluff)


## Documentation File Tree

```
docs/
  developer/
    getting-started.md      (T401, 3000+ words)
    architecture.md         (T402, 4000+ words)
    api-reference.md        (T403, 5000+ words)
    cli-reference.md        (T404, 3000+ words)
    contributing.md         (T405, 2500+ words)
    extending.md            (T406, 2000+ words)
    deployment.md           (T407, 2000+ words)
    faq.md                  (T429, 2000+ words)
    security.md             (T430, 1500+ words)
  guide/
    introduction.md         (T411, 2500+ words)
    quick-start.md          (T412, 2000+ words)
    understanding-quality.md (T416, 2000+ words)
    using-collections.md    (T417, 1500+ words)
    prompt-optimization.md  (T418, 2000+ words)
    troubleshooting.md      (T419, 3000+ words)
    glossary.md             (T420, 2000+ words)
    tutorials/
      wizard-tutorial.md    (T413, 3000+ words)
      cli-tutorial.md       (T414, 2500+ words)
      customizing-skills.md (T415, 2000+ words)
  marketing/
    landing-page-copy.md    (T421, 2500+ words)
    value-proposition.md    (T422, 2000+ words)
    use-cases.md            (T423, 3500+ words)
    comparison.md           (T424, 2000+ words)
    press-kit.md            (T425, 1500+ words)
```

**Additionally:** `docs/user/` and `docs/reference/` stubs are replaced or redirected by T428.

**Total minimum word count: ~67,000 words** across 20 new documents. That is a complete documentation suite. Not 2KB stubs. Not 500-word references. Real, comprehensive documentation that a developer can onboard from, a beginner can learn from, and a journalist can quote from.

---

## Completion Proof

- All 20 new content documents exist and are above their minimum word counts
- All `docs/user/` and `docs/reference/` stubs replaced or redirected (T428)
- T426 docs infrastructure renders at `/docs` with navigation, syntax highlighting, and search
- T427 audit passes with every command verified
- T429 (FAQ) and T430 (security) complete
- T419 (troubleshooting) has >= 25 problem entries
- T420 (glossary) has >= 40 defined terms
- Every CLI command in every tutorial works on a fresh clone of the repo
- Every API curl example returns the documented response
- `npm run build` succeeds with docs pages included
- Total word count of all docs >= 67,000 words
