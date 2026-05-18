# Phase 2 Plan — Community and Ecosystem

**STOP. Read this entire document before touching a single file.**

This document is self-contained. Every implementation decision is made here. Every TypeScript type, SQL schema, API contract, algorithm, and file structure is embedded directly. You do not need to read any other document to execute this plan. If something seems underspecified, re-read this document. If it is genuinely missing, stop and surface the gap — do not invent.

---

## Goal

Transform SkillMall from a solo tool into a community platform. Phase 2 adds: ratings and reviews, skill collections and packs, forking, publishing to skills.sh, multi-agent deploy, an MCP server, trending analytics, a description trigger evaluator, and skill version history.

## Gate Into Phase 2

**All of the following must be true before any Phase 2 task activates:**

- Phase 1 completion audit (T018) returned `full_outcome_complete: true`
- James confirms Phase 1 is stable in production (no critical bugs open)
- GitHub OAuth app credentials provisioned (client ID + secret from github.com/settings/developers)

## Outcome

A user can:
1. Rate and review any skill they have deployed (requires GitHub OAuth and verified install signal)
2. Deploy a curated skill collection in one command (`npx skill-mall deploy-pack`)
3. Fork any skill into their own directory with tracked lineage
4. Publish a skill to skills.sh via CLI OAuth flow
5. Deploy a skill to all detected agents in one command (`npx skill-mall deploy --all-agents`)
6. Query the skill catalog from any MCP-compatible agent via `/api/mcp`
7. View trending skills and contributor analytics (aggregate only, no PII)
8. Evaluate how reliably their skill description triggers agents
9. Browse a skill's full git changelog with semantic diff descriptions

## Completion Proof

- `npm run build` exits 0
- `npm test` exits 0
- `npx tsc --noEmit` exits 0
- SQLite database initializes cleanly on fresh install (`npm run db:migrate`)
- GitHub OAuth round-trip works: login → callback → session cookie set
- Review submission works: authenticated user with install signal → review stored → appears on detail page
- Collection deploy works: `npx skill-mall deploy-pack full-stack-developer-kit --agent claude-code`
- Fork works: `npx skill-mall fork business/blue-ocean-strategy my-version` creates independent copy with `forked_from` frontmatter
- MCP works: `GET /api/mcp` responds with tool list; `POST /api/mcp` with `search_skills` tool call returns matching skills
- skills.sh publish: OAuth flow opens browser, completes, posts skill (manual test)
- Multi-agent deploy: `npx skill-mall deploy --all-agents` detects at least 2 agents on dev machine
- Trending page renders with real data
- Phase 2 doc deliverables complete and >= 500 words each

## Likely Misfire

Starting Phase 2 before Phase 1 is stable. Building features that require GitHub OAuth before OAuth is verified working. Building community features in the wrong order — the SQLite schema (T101) and OAuth (T102) must be done first since almost everything else depends on them.

## Non-Goals for Phase 2

- Supabase (explicitly excluded — SQLite is the backend)
- pgvector or any vector database
- Skill chains (Phase 3)
- RAG-enhanced skills (Phase 3)
- Self-improvement loop (Phase 3)
- Marketplace / monetization (Phase 3)
- Prompt ELO Tester (permanently deferred)

---

## Development Workflow

**Every Worker task follows this 16-step loop without exception:**

1. Read the task's Implementation section in this document completely before writing any code
2. Map dependencies — identify parallel vs serial work within the task
3. Establish TypeScript contracts before implementation
4. Dispatch parallel subagents where write scopes are disjoint
5. Write Vitest tests alongside or before implementation
6. `npx tsc --noEmit` — must exit 0 before proceeding
7. `npm run lint` — must exit 0 before proceeding
8. `npm run build` — must succeed before proceeding
9. First code review
10. Fix all issues from review
11. Second code review — confirm all issues resolved
12. Smoke test at `localhost:3000`
13. Security check — **mandatory for every Phase 2 task** (all tasks touch auth, database writes, or user data)
14. Update documentation for changed interfaces
15. Final review against task acceptance criteria
16. `git commit && git push`

**Security check is mandatory for every Phase 2 Worker task.** Phase 2 introduces user authentication, database writes, and third-party OAuth. Every task must check: SQL injection (use parameterized queries only — never string interpolation), session token exposure in logs, OAuth state parameter CSRF protection, path traversal in any file write.

---

## Stack Additions for Phase 2

Phase 1 stack carries forward unchanged. Phase 2 adds:

| Addition | Package | Purpose |
|---|---|---|
| SQLite | `better-sqlite3` + `@types/better-sqlite3` | Ratings, reviews, install events, sessions |
| GitHub OAuth | Manual implementation (no next-auth) | Reviewer identity verification |
| MCP protocol | Manual implementation | `/api/mcp` route for agent catalog access |
| Agent detection | Custom filesystem scanner | Multi-agent deploy |

**No new UI framework. No new CSS library. No Supabase. No Prisma** — raw SQL via `better-sqlite3` for full control and zero abstraction overhead.

Database file location: `data/skillmall.db` (gitignored)
Migration files: `db/migrations/` (committed, SQL only)
Migration runner: `npm run db:migrate` (custom script at `scripts/migrate.js`)

---

## SQLite Schema

### Full Migration: `db/migrations/001_initial.sql`

```sql
-- Sessions for GitHub OAuth
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                          -- random 32-byte hex token
  github_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT 'read:user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL                      -- ISO 8601, 7 days from creation
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Install events: aggregate only, zero PII
CREATE TABLE IF NOT EXISTS install_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  agent_type TEXT NOT NULL,                     -- 'claude-code', 'cursor', 'codex', 'gemini-cli', 'other'
  installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_install_events_slug ON install_events(skill_slug);
CREATE INDEX IF NOT EXISTS idx_install_events_installed ON install_events(installed_at);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  reviewer_github_id TEXT NOT NULL,
  reviewer_login TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 150),
  is_generic INTEGER NOT NULL DEFAULT 0,        -- 1 = deprioritized in display
  has_install_signal INTEGER NOT NULL DEFAULT 0, -- 1 = verified install before review
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_slug, reviewer_github_id)        -- one review per skill per user
);
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(skill_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at);
```

### Database Client: `lib/db/client.ts`

```typescript
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'skillmall.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')   // Write-Ahead Logging for better concurrency
    _db.pragma('foreign_keys = ON')
  }
  return _db
}
```

### TypeScript Types: `lib/db/types.ts`

```typescript
export interface Session {
  id: string
  github_id: string
  github_login: string
  scopes: string
  created_at: string
  expires_at: string
}

export interface InstallEvent {
  id: number
  skill_slug: string
  agent_type: string
  installed_at: string
}

export interface Review {
  id: number
  skill_slug: string
  reviewer_github_id: string
  reviewer_login: string
  rating: number
  body: string
  is_generic: number
  has_install_signal: number
  created_at: string
}

export type AgentType = 'claude-code' | 'cursor' | 'codex' | 'gemini-cli' | 'other'
```

### Migration Script: `scripts/migrate.js`

```javascript
#!/usr/bin/env node
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(process.cwd(), 'data', 'skillmall.db')
const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations')

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const applied = new Set(
  db.prepare('SELECT filename FROM schema_migrations').all().map(r => r.filename)
)

const migrations = fs.readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort()

for (const file of migrations) {
  if (applied.has(file)) continue
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
  db.exec(sql)
  db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file)
  console.log(`Applied: ${file}`)
}

console.log('Migrations complete.')
```

Add to `package.json` scripts: `"db:migrate": "node scripts/migrate.js"`

---

## GitHub OAuth Implementation

### How it works (no next-auth, no external lib)

1. User clicks "Sign in with GitHub" → redirected to GitHub OAuth authorize URL
2. GitHub redirects back to `/api/auth/callback/github?code=...&state=...`
3. Server exchanges code for access token (POST to GitHub token endpoint)
4. Server fetches user identity (`GET https://api.github.com/user`)
5. Server creates a session row in SQLite, sets session cookie
6. All authenticated routes check cookie → look up session → validate expiry

### Environment Variables Required

```
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=<random 32-char string for session signing>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### File: `lib/auth/github.ts`

```typescript
import { getDb } from '../db/client'
import crypto from 'crypto'
import type { Session } from '../db/types'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Generate the GitHub OAuth authorization URL with a CSRF state token. */
export function getGitHubAuthUrl(): { url: string; state: string } {
  const state = crypto.randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${APP_URL}/api/auth/callback/github`,
    scope: 'read:user',
    state,
  })
  return {
    url: `https://github.com/login/oauth/authorize?${params}`,
    state,
  }
}

/** Exchange OAuth code for a GitHub access token. */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  })
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(data.error ?? 'GitHub OAuth token exchange failed')
  return data.access_token
}

/** Fetch GitHub user identity using an access token. */
export async function fetchGitHubUser(token: string): Promise<{ id: number; login: string }> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub user fetch failed: HTTP ${res.status}`)
  const user = await res.json() as { id: number; login: string }
  return { id: user.id, login: user.login }
}

/** Create a session in SQLite and return the session token. */
export function createSession(githubId: string, githubLogin: string): string {
  const db = getDb()
  const id = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  db.prepare(`
    INSERT INTO sessions (id, github_id, github_login, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, githubId, githubLogin, expiresAt)

  return id
}

/** Look up a session by token. Returns null if not found or expired. */
export function getSession(token: string): Session | null {
  const db = getDb()
  const session = db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime(\'now\')'
  ).get(token) as Session | undefined
  return session ?? null
}

/** Delete a session (logout). */
export function deleteSession(token: string): void {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE id = ?').run(token)
}
```

### Session Cookie Spec

- Name: `sm_session`
- HttpOnly: true
- Secure: true in production, false in development
- SameSite: Strict
- MaxAge: 7 days (604800 seconds)
- Path: /

### File: `lib/auth/middleware.ts`

```typescript
import { cookies } from 'next/headers'
import { getSession } from './github'
import type { Session } from '../db/types'

/** Get the current session from the request cookie. Returns null if not authenticated. */
export async function getCurrentSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sm_session')?.value
  if (!token) return null
  return getSession(token)
}

/** Require authentication — returns session or throws 401 response. */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession()
  if (!session) throw new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  return session
}
```

### API Routes for Auth

**GET /api/auth/login**
- Generates state token, stores in session cookie (httpOnly, short-lived)
- Redirects to GitHub OAuth URL

**GET /api/auth/callback/github?code=...&state=...**
- Validates state against cookie value (CSRF protection)
- Exchanges code for token
- Fetches GitHub user
- Creates session in SQLite
- Sets `sm_session` cookie
- Redirects to `/`

**POST /api/auth/logout**
- Deletes session from SQLite
- Clears cookie
- Returns 200

---

## Install Event Tracking

Install events are logged when a user deploys a skill. Zero PII — no user identity stored, only the skill slug and agent type.

### File: `lib/analytics.ts`

```typescript
import { getDb } from './db/client'
import type { AgentType } from './db/types'

/** Log a skill installation event (no user identity, aggregate only). */
export function logInstallEvent(skillSlug: string, agentType: AgentType): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO install_events (skill_slug, agent_type) VALUES (?, ?)'
  ).run(skillSlug, agentType)
}

/** Get install count for a skill (all time). */
export function getInstallCount(skillSlug: string): number {
  const db = getDb()
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM install_events WHERE skill_slug = ?'
  ).get(skillSlug) as { count: number }
  return row.count
}

/** Get 7-day install velocity for a skill. */
export function getInstallVelocity7d(skillSlug: string): number {
  const db = getDb()
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM install_events
    WHERE skill_slug = ?
    AND installed_at > datetime('now', '-7 days')
  `).get(skillSlug) as { count: number }
  return row.count
}

/** Get top N skills by 7-day install velocity. */
export function getTrending7d(limit = 10): Array<{ skill_slug: string; velocity: number }> {
  const db = getDb()
  return db.prepare(`
    SELECT skill_slug, COUNT(*) as velocity
    FROM install_events
    WHERE installed_at > datetime('now', '-7 days')
    GROUP BY skill_slug
    ORDER BY velocity DESC
    LIMIT ?
  `).all(limit) as Array<{ skill_slug: string; velocity: number }>
}

/** Get install counts per agent type for a specific skill (contributor dashboard). */
export function getInstallsByAgentType(skillSlug: string): Record<string, number> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT agent_type, COUNT(*) as count
    FROM install_events
    WHERE skill_slug = ?
    GROUP BY agent_type
  `).all(skillSlug) as Array<{ agent_type: string; count: number }>

  return Object.fromEntries(rows.map(r => [r.agent_type, r.count]))
}

/** Get skills with accelerating velocity (>50% growth in past 7 days vs prior 7 days). */
export function getRising(): Array<{ skill_slug: string; velocity: number; growth_pct: number }> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT
      skill_slug,
      SUM(CASE WHEN installed_at > datetime('now', '-7 days') THEN 1 ELSE 0 END) as recent,
      SUM(CASE WHEN installed_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days') THEN 1 ELSE 0 END) as prior
    FROM install_events
    WHERE installed_at > datetime('now', '-14 days')
    GROUP BY skill_slug
    HAVING recent > 0 AND prior > 0 AND (CAST(recent AS REAL) / prior) > 1.5
    ORDER BY (CAST(recent AS REAL) / prior) DESC
    LIMIT 20
  `).all() as Array<{ skill_slug: string; recent: number; prior: number }>

  return rows.map(r => ({
    skill_slug: r.skill_slug,
    velocity: r.recent,
    growth_pct: Math.round(((r.recent - r.prior) / r.prior) * 100),
  }))
}
```

---

## Ratings and Reviews

### File: `lib/reviews.ts`

```typescript
import { getDb } from './db/client'
import type { Review } from './db/types'

const GENERIC_PHRASES = ['great skill', 'very useful', 'good skill', 'nice', 'awesome', 'love it', 'excellent', '👍']

function isGenericReview(body: string): boolean {
  const lower = body.toLowerCase().trim()
  return GENERIC_PHRASES.some(p => lower === p || lower.startsWith(p + ' ') || lower.endsWith(' ' + p))
}

/** Check if a reviewer has a verified install signal for the skill. */
export function hasInstallSignal(skillSlug: string, githubId: string): boolean {
  // We don't store github_id in install_events (no PII) — so we check if
  // ANY review from this user exists (they installed at least once) OR
  // we use a separate verified_installs table approach.
  // For Phase 2: install signal is verified by requiring the session exists
  // and the skill has at least one install event. Strict per-user verification
  // requires a separate table — added in this schema as a future enhancement.
  // For now: allow review if authenticated. Strict verification is Phase 3.
  const db = getDb()
  const count = db.prepare(
    'SELECT COUNT(*) as count FROM install_events WHERE skill_slug = ?'
  ).get(skillSlug) as { count: number }
  return count.count > 0
}

/** Submit a review. Throws if reviewer already reviewed this skill. */
export function createReview(params: {
  skillSlug: string
  reviewerGithubId: string
  reviewerLogin: string
  rating: number
  body: string
  hasInstallSignal: boolean
}): Review {
  const db = getDb()
  const isGeneric = isGenericReview(params.body) ? 1 : 0

  const stmt = db.prepare(`
    INSERT INTO reviews (skill_slug, reviewer_github_id, reviewer_login, rating, body, is_generic, has_install_signal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  try {
    stmt.run(
      params.skillSlug,
      params.reviewerGithubId,
      params.reviewerLogin,
      params.rating,
      params.body,
      isGeneric,
      params.hasInstallSignal ? 1 : 0
    )
  } catch (err) {
    if (String(err).includes('UNIQUE constraint failed')) {
      throw new Error('You have already reviewed this skill')
    }
    throw err
  }

  return db.prepare('SELECT * FROM reviews WHERE skill_slug = ? AND reviewer_github_id = ?')
    .get(params.skillSlug, params.reviewerGithubId) as Review
}

/** Get reviews for a skill. Specific reviews appear before generic ones. */
export function getReviews(skillSlug: string): Review[] {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM reviews
    WHERE skill_slug = ?
    ORDER BY is_generic ASC, created_at DESC
  `).all(skillSlug) as Review[]
}

/** Compute effectiveness score: quality-weighted average (specific reviews weight 2x generic). */
export function getEffectivenessScore(skillSlug: string): number | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT
      SUM(rating * CASE WHEN is_generic = 0 THEN 2.0 ELSE 1.0 END) as weighted_sum,
      SUM(CASE WHEN is_generic = 0 THEN 2.0 ELSE 1.0 END) as weight_total
    FROM reviews
    WHERE skill_slug = ?
  `).get(skillSlug) as { weighted_sum: number | null; weight_total: number | null }

  if (!row.weighted_sum || !row.weight_total) return null
  return Math.round((row.weighted_sum / row.weight_total) * 10) / 10
}

/** Get review count. */
export function getReviewCount(skillSlug: string): number {
  const db = getDb()
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM reviews WHERE skill_slug = ?'
  ).get(skillSlug) as { count: number }
  return row.count
}
```

### API Routes for Reviews

**POST /api/reviews**

```typescript
// Body: { skillSlug: string; rating: number; body: string }
// Auth: requires sm_session cookie (401 if missing)
// Install signal: required (403 if skill has no install events)
// Zod validation: rating 1-5, body 1-150 chars
// Returns: { review: Review } on success
// Errors:
//   401 — not authenticated
//   403 — no install signal
//   400 — invalid input
//   409 — already reviewed this skill
```

**GET /api/reviews/[skillSlug]**

```typescript
// No auth required
// Returns: {
//   reviews: Review[]
//   effectivenessScore: number | null
//   reviewCount: number
//   installCount: number
// }
```

---

## Skill Collections

### Collection File Format: `collections/<pack-name>/collection.json`

```typescript
interface Collection {
  name: string
  slug: string                      // kebab-case, unique
  description: string
  author: string                    // GitHub username
  skills: Array<{
    slug: string                    // 'category/skill-name' format
    order: number
    note: string | null             // installation note for this skill
  }>
}
```

### Starter Collections (committed to repo)

```
collections/
├── full-stack-developer-kit/
│   └── collection.json
├── strategic-business-pack/
│   └── collection.json
└── documentation-suite/
    └── collection.json
```

**full-stack-developer-kit/collection.json:**
```json
{
  "name": "Full-Stack Developer Kit",
  "slug": "full-stack-developer-kit",
  "description": "Essential skills for full-stack development workflows",
  "author": "skill-mall-core",
  "skills": [
    { "slug": "ai/skill-creator", "order": 1, "note": "Install first" },
    { "slug": "productivity/development-workflow", "order": 2, "note": null },
    { "slug": "productivity/phased-implementation-plan", "order": 3, "note": null }
  ]
}
```

### File: `lib/collections.ts`

```typescript
import fs from 'fs'
import path from 'path'

export interface Collection {
  name: string
  slug: string
  description: string
  author: string
  skills: Array<{ slug: string; order: number; note: string | null }>
}

export function getAllCollections(): Collection[] {
  const collectionsDir = path.join(process.cwd(), 'collections')
  if (!fs.existsSync(collectionsDir)) return []

  return fs.readdirSync(collectionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const jsonPath = path.join(collectionsDir, d.name, 'collection.json')
      if (!fs.existsSync(jsonPath)) return null
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Collection
    })
    .filter((c): c is Collection => c !== null)
}

export function getCollection(slug: string): Collection | null {
  const all = getAllCollections()
  return all.find(c => c.slug === slug) ?? null
}

export function validateCollection(collection: Collection, allSkillSlugs: Set<string>): string[] {
  const errors: string[] = []
  const fullSlugs = new Set(
    [...allSkillSlugs].flatMap(slug => {
      // allSkillSlugs contains just 'skill-name' — we also need 'category/skill-name'
      return [slug]
    })
  )

  for (const skill of collection.skills) {
    const skillName = skill.slug.split('/').pop() ?? skill.slug
    if (!allSkillSlugs.has(skillName) && !allSkillSlugs.has(skill.slug)) {
      errors.push(`Skill "${skill.slug}" not found in catalog`)
    }
  }

  if (!collection.name) errors.push('name is required')
  if (!collection.slug || !/^[a-z0-9-]+$/.test(collection.slug)) errors.push('slug must be kebab-case')
  if (!collection.skills || collection.skills.length < 1) errors.push('at least 1 skill required')

  return errors
}
```

### CLI: `npx skill-mall deploy-pack <slug> --agent <agent>`

```typescript
// 1. Load collection from collections/<slug>/collection.json
// 2. Validate all skill slugs exist
// 3. Deploy each skill in order (sorted by order field)
// 4. Print per-skill status: [ SKILL NAME ] → deployed | not found | failed
// Exit codes: 0 = all deployed, 1 = some failed
```

---

## Skill Forking

### SKILL.md Frontmatter Extensions

```yaml
metadata:
  forked_from: "blue-ocean-strategy@1.2.0"        # single-level fork
  fork_chain:                                      # multi-level fork
    - "blue-ocean-strategy@1.2.0"
    - "my-startup-blue-ocean@1.0.0"
```

### File: `lib/forking.ts`

```typescript
import fs from 'fs'
import path from 'path'
import { getSkill } from './skills'

export interface ForkResult {
  sourceSlug: string
  sourceVersion: string
  newSlug: string
  newPath: string
}

/** Fork a skill into a new directory with forked_from frontmatter tracking. */
export function forkSkill(
  sourceCategory: string,
  sourceSlug: string,
  newSlug: string,
  targetCategory?: string
): ForkResult {
  const source = getSkill(sourceCategory, sourceSlug)
  if (!source) throw new Error(`Skill not found: ${sourceCategory}/${sourceSlug}`)

  const effectiveCategory = targetCategory ?? sourceCategory
  const sourceDir = path.dirname(source.path)
  const destDir = path.join(process.cwd(), 'skills', effectiveCategory, newSlug)

  if (fs.existsSync(destDir)) {
    throw new Error(`Destination already exists: skills/${effectiveCategory}/${newSlug}`)
  }

  copyDirRecursive(sourceDir, destDir)

  // Update SKILL.md with forked_from
  const skillMdPath = path.join(destDir, 'SKILL.md')
  const existing = getExistingForkChain(source)
  const newForkEntry = `${sourceSlug}@${source.version}`

  let content = fs.readFileSync(skillMdPath, 'utf-8')

  // Update name field
  content = content.replace(/^name:\s*.+$/m, `name: ${newSlug}`)

  // Add fork metadata
  const forkYaml = existing.length > 0
    ? `  forked_from: "${newForkEntry}"\n  fork_chain:\n${[...existing, newForkEntry].map(e => `    - "${e}"`).join('\n')}`
    : `  forked_from: "${newForkEntry}"`

  if (content.includes('metadata:')) {
    content = content.replace(/^metadata:\n/m, `metadata:\n${forkYaml}\n`)
  } else {
    content = content.replace(/^---$/m, `---\nmetadata:\n${forkYaml}`)
  }

  fs.writeFileSync(skillMdPath, content, 'utf-8')

  return {
    sourceSlug,
    sourceVersion: source.version,
    newSlug,
    newPath: destDir,
  }
}

function getExistingForkChain(skill: ReturnType<typeof getSkill>): string[] {
  if (!skill?.content) return []
  const match = skill.content.match(/fork_chain:\s*\n((?:\s+-\s+.+\n?)+)/)
  if (!match) return []
  return match[1].trim().split('\n').map(l => l.replace(/^\s+-\s+"?/, '').replace(/"?$/, ''))
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath)
    else fs.copyFileSync(srcPath, destPath)
  }
}
```

---

## Multi-Agent Deploy

### Agent Registry

Based on the 54 agents from vercel-labs/skills. Detection checks for the agent's home directory on the filesystem.

### File: `lib/agents/registry.ts`

```typescript
export interface AgentDef {
  id: string
  name: string
  skillsDir: (home: string) => string   // path relative to user home or absolute
}

// 54 agents from vercel-labs/skills registry. Includes the most widely used:
export const AGENT_REGISTRY: AgentDef[] = [
  { id: 'claude-code', name: 'Claude Code', skillsDir: (h) => `${h}/.claude/skills` },
  { id: 'cursor', name: 'Cursor', skillsDir: (h) => `${h}/.cursor/skills` },
  { id: 'codex', name: 'Codex', skillsDir: (h) => `${h}/.codex/skills` },
  { id: 'gemini-cli', name: 'Gemini CLI', skillsDir: (h) => `${h}/.gemini/skills` },
  { id: 'copilot', name: 'GitHub Copilot', skillsDir: (h) => `${h}/.copilot/skills` },
  { id: 'continue', name: 'Continue', skillsDir: (h) => `${h}/.continue/skills` },
  { id: 'agents', name: 'AgentSkills (universal)', skillsDir: (h) => `${h}/.agents/skills` },
  // ... remaining 47 agents follow the same pattern with their known home dirs
]
```

### File: `lib/agents/detector.ts`

```typescript
import fs from 'fs'
import os from 'os'
import { AGENT_REGISTRY } from './registry'

export interface DetectedAgent {
  id: string
  name: string
  skillsDir: string
  detected: boolean
}

/** Detect which agents are installed by checking filesystem for their home directories. */
export function detectAgents(): DetectedAgent[] {
  const home = os.homedir()
  return AGENT_REGISTRY.map(agent => {
    const dir = agent.skillsDir(home)
    const detected = fs.existsSync(dir)
    return { id: agent.id, name: agent.name, skillsDir: dir, detected }
  })
}

/** Deploy a skill directory to all detected agents. */
export function deployToAgents(
  skillPath: string,
  agentIds?: string[]
): Array<{ agent: DetectedAgent; success: boolean; error?: string }> {
  const agents = detectAgents().filter(a => {
    if (!a.detected) return false
    if (agentIds && agentIds.length > 0) return agentIds.includes(a.id)
    return true
  })

  return agents.map(agent => {
    try {
      const destDir = path.join(agent.skillsDir, path.basename(skillPath))
      copyDirRecursive(skillPath, destDir)
      return { agent, success: true }
    } catch (err) {
      return { agent, success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
```

### CLI: `npx skill-mall deploy --all-agents` and `--agents`

```bash
npx skill-mall deploy business/blue-ocean-strategy --all-agents
# Output:
# Deploying blue-ocean-strategy...
#
#   claude-code   detected   deployed ✓
#   cursor        detected   deployed ✓
#   gemini-cli    not detected — skipped
#   codex         not detected — skipped
#
# Deployed to 2 of 4 checked agents.

npx skill-mall deploy business/blue-ocean-strategy --agents claude-code,cursor
```

---

## SkillMall MCP Server

### Protocol

The MCP server implements the Model Context Protocol. It exposes the skill catalog as a set of tools that any MCP-compatible agent can call from within a conversation.

**Endpoint:** `POST /api/mcp`
**Format:** JSON-RPC 2.0

### Exposed Tools

```typescript
// Tool 1: search_skills
// Input: { query: string; category?: string }
// Output: Array<{ slug: string; category: string; name: string; description: string; tags: string[] }>

// Tool 2: get_skill
// Input: { category: string; slug: string }
// Output: Full skill data including content

// Tool 3: get_prompts
// Input: { category: string; slug: string }
// Output: Array<{ path: string; framework: string; type: string; complexity: string }>

// Tool 4: list_categories
// Input: {}
// Output: Array<{ slug: string; skillCount: number }>

// Tool 5: deploy_skill
// Input: { slug: string; category: string; agent: string; scope: 'global' | 'project' }
// Output: { success: boolean; path: string }
```

### File: `app/api/mcp/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, getSkill, getSkillsByCategory } from '@/lib/skills'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

const TOOLS = [
  {
    name: 'search_skills',
    description: 'Search the SkillMall catalog for skills matching a query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Filter by category (optional)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_skill',
    description: 'Get full details for a specific skill',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        slug: { type: 'string' },
      },
      required: ['category', 'slug'],
    },
  },
  {
    name: 'list_categories',
    description: 'List all skill categories with skill counts',
    inputSchema: { type: 'object', properties: {} },
  },
]

function handleTool(name: string, params: Record<string, unknown>) {
  if (name === 'search_skills') {
    const query = String(params.query ?? '').toLowerCase()
    const category = params.category ? String(params.category) : undefined
    return getAllSkills().filter(s => {
      const matchesCat = !category || s.category === category
      const matchesQuery = s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some(t => t.includes(query))
      return matchesCat && matchesQuery
    }).slice(0, 20).map(s => ({
      slug: s.slug, category: s.category, name: s.name,
      description: s.description, tags: s.tags,
    }))
  }

  if (name === 'get_skill') {
    const skill = getSkill(String(params.category), String(params.slug))
    return skill ?? { error: 'Skill not found' }
  }

  if (name === 'list_categories') {
    return getSkillsByCategory().map(c => ({ slug: c.slug, skillCount: c.skills.length }))
  }

  return { error: `Unknown tool: ${name}` }
}

export async function GET() {
  return NextResponse.json({
    name: 'skillmall',
    version: '1.0.0',
    tools: TOOLS,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as JsonRpcRequest

  if (body.method === 'tools/list') {
    return NextResponse.json({
      jsonrpc: '2.0', id: body.id,
      result: { tools: TOOLS },
    })
  }

  if (body.method === 'tools/call') {
    const { name, arguments: args } = body.params as { name: string; arguments: Record<string, unknown> }
    const result = handleTool(name, args ?? {})
    return NextResponse.json({
      jsonrpc: '2.0', id: body.id,
      result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
    })
  }

  return NextResponse.json({
    jsonrpc: '2.0', id: body.id,
    error: { code: -32601, message: 'Method not found' },
  })
}
```

**MCP config entry for users:**
```json
{
  "mcpServers": {
    "skillmall": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

---

## Publish to skills.sh

### Pre-publish Validation Requirements

1. Quality score >= 70 (computed by `computeQualityScore`)
2. `description` <= 1024 chars
3. `name` matches directory name
4. `metadata.license` present in SKILL.md

### CLI: `npx skill-mall publish <slug> --registry skills.sh`

```typescript
// 1. Resolve skill from catalog
// 2. Run pre-publish validation (all 4 checks must pass)
// 3. Open skills.sh OAuth flow in browser
// 4. Exchange code for token
// 5. POST skill data to skills.sh API
// 6. Write metadata.skills_sh_id and metadata.skills_sh_url to SKILL.md frontmatter
// Exit 1 if validation fails (print specific failing checks)
// Exit 1 if OAuth fails
```

### SKILL.md frontmatter additions after publish:

```yaml
metadata:
  skills_sh_id: "abc123"
  skills_sh_url: "https://skills.sh/skills/abc123"
```

---

## Skill Version History

### How it works

Reads `git log` for the skill's directory and parses commits into a structured changelog. Semantic diff is derived from which files changed (not a raw git diff).

### File: `lib/version-history.ts`

```typescript
import { execSync } from 'child_process'
import path from 'path'

export interface VersionEntry {
  hash: string
  date: string
  author: string
  message: string
  semanticDiff: string    // plain-language description of what changed
  filesChanged: string[]
}

export function getVersionHistory(skillPath: string): VersionEntry[] {
  const skillDir = path.dirname(skillPath)
  const relDir = path.relative(process.cwd(), skillDir)

  try {
    const log = execSync(
      `git log --follow --format="%H|%ai|%an|%s" -- "${relDir}"`,
      { cwd: process.cwd(), encoding: 'utf-8' }
    ).trim()

    if (!log) return []

    return log.split('\n').map(line => {
      const [hash, date, author, ...msgParts] = line.split('|')
      const message = msgParts.join('|')

      // Get files changed in this commit for this skill directory
      const files = execSync(
        `git diff-tree --no-commit-id -r --name-only "${hash}" -- "${relDir}"`,
        { cwd: process.cwd(), encoding: 'utf-8' }
      ).trim().split('\n').filter(Boolean)

      return {
        hash: hash.slice(0, 8),
        date: date.slice(0, 10),
        author,
        message,
        semanticDiff: deriveSemanticDiff(files),
        filesChanged: files,
      }
    })
  } catch {
    return []
  }
}

function deriveSemanticDiff(files: string[]): string {
  const changed: string[] = []
  if (files.some(f => f.endsWith('SKILL.md'))) changed.push('skill instructions updated')
  if (files.some(f => f.includes('resources/templates/'))) changed.push('templates updated')
  if (files.some(f => f.includes('resources/samples/'))) changed.push('samples updated')
  if (files.some(f => f.includes('resources/prompts/'))) changed.push('prompts updated')
  if (files.some(f => f.includes('scripts/'))) changed.push('scripts updated')
  if (files.some(f => f.endsWith('README.md'))) changed.push('README updated')
  return changed.length > 0 ? changed.join(', ') : 'files updated'
}
```

---

## Description Trigger Evaluator

### How it works

Generates 10 positive and 10 negative test queries from the skill's domain and description. Simulates agent skill selection by scoring each query against the description. Reports accuracy rates.

### File: `lib/trigger-evaluator.ts`

```typescript
import type { LLMClient } from './providers'
import type { Skill } from './skills'
import { z } from 'zod'

export interface TriggerEvalResult {
  truePositiveRate: number    // % of positive queries that triggered
  falsePositiveRate: number   // % of negative queries that incorrectly triggered
  falseNegativeRate: number   // % of positive queries that failed
  overallAccuracy: number     // weighted combination
  positiveQueries: Array<{ query: string; triggered: boolean }>
  negativeQueries: Array<{ query: string; triggered: boolean }>
  failingQueries: Array<{ query: string; type: 'fn' | 'fp'; suggestion: string }>
}

const QueryGenSchema = z.object({
  positive: z.array(z.string()).length(10),
  negative: z.array(z.string()).length(10),
})

const EvalSchema = z.object({
  results: z.array(z.object({
    query: z.string(),
    would_trigger: z.boolean(),
    confidence: z.number(),
  })),
})

export async function evaluateTriggers(
  skill: Skill,
  client: LLMClient
): Promise<TriggerEvalResult> {
  // Step 1: Generate 20 queries
  const genPrompt = `Generate evaluation queries for this AI agent skill:

Skill name: ${skill.name}
Skill description: "${skill.description}"
Category: ${skill.category}

Generate exactly 10 "positive" queries (user messages that SHOULD trigger this skill) and
exactly 10 "negative" queries (user messages that should NOT trigger this skill).

Return JSON only:
{"positive": ["query1", ...], "negative": ["query1", ...]}`

  const genRaw = await client.complete(genPrompt, {
    responseFormat: 'json_object',
    temperature: 0.5,
    maxTokens: 1000,
    systemPrompt: 'You are a prompt engineering expert generating test queries. Return only valid JSON.',
  })

  const queries = QueryGenSchema.parse(JSON.parse(genRaw))

  // Step 2: Evaluate each query against the skill description
  const evalPrompt = (allQueries: string[]) => `
Given this AI agent skill:
Name: ${skill.name}
Description: "${skill.description}"

For each user query below, determine if an AI agent would select this skill to fulfill the request.

Queries:
${allQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Return JSON:
{"results": [{"query": "...", "would_trigger": true/false, "confidence": 0.0-1.0}, ...]}`

  const allQueries = [...queries.positive, ...queries.negative]
  const evalRaw = await client.complete(evalPrompt(allQueries), {
    responseFormat: 'json_object',
    temperature: 0.1,
    maxTokens: 1500,
    systemPrompt: 'You simulate agent skill selection behavior. Return only valid JSON.',
  })

  const evalResult = EvalSchema.parse(JSON.parse(evalRaw))

  const positiveResults = evalResult.results.slice(0, 10)
  const negativeResults = evalResult.results.slice(10)

  const truePositives = positiveResults.filter(r => r.would_trigger).length
  const falsePositives = negativeResults.filter(r => r.would_trigger).length
  const falseNegatives = positiveResults.filter(r => !r.would_trigger).length

  const truePositiveRate = Math.round((truePositives / 10) * 100)
  const falsePositiveRate = Math.round((falsePositives / 10) * 100)
  const falseNegativeRate = Math.round((falseNegatives / 10) * 100)
  const overallAccuracy = Math.round((truePositives + (10 - falsePositives)) / 20 * 100)

  const failingQueries = [
    ...positiveResults.filter(r => !r.would_trigger).map(r => ({
      query: r.query, type: 'fn' as const,
      suggestion: 'Add this scenario\'s keywords to the description or when_to_use field',
    })),
    ...negativeResults.filter(r => r.would_trigger).map(r => ({
      query: r.query, type: 'fp' as const,
      suggestion: 'Narrow the description to exclude this scenario',
    })),
  ]

  return {
    truePositiveRate,
    falsePositiveRate,
    falseNegativeRate,
    overallAccuracy,
    positiveQueries: positiveResults.map(r => ({ query: r.query, triggered: r.would_trigger })),
    negativeQueries: negativeResults.map(r => ({ query: r.query, triggered: r.would_trigger })),
    failingQueries,
  }
}
```

### API Route: `POST /api/eval-triggers`

```typescript
// Body: { category: string; slug: string }
// Auth: not required
// Returns: TriggerEvalResult
// Warning threshold: accuracy < 80% logs a warning in the response
```

---

## Trending Dashboard

### Pages

**`/trending`** — Top 10 by 7-day install velocity
**`/trending/rising`** — Skills with >50% velocity acceleration
**`/dashboard`** — Contributor private view (authenticated; shows only their skills)

All analytics are aggregate — no user identity in any query.

---

## Task Cards

---

### T101 — SQLite Schema and Migration Runner

**Type:** Worker
**Depends on:** Phase 1 complete (T018 passed)

**Objective:** Set up SQLite database with `better-sqlite3`, write the migration runner script, apply the initial migration, and add the database client and types.

**Implementation:** Follow the "SQLite Schema" section in this document exactly. Create `db/migrations/001_initial.sql` with the three table definitions (sessions, install_events, reviews). Create `scripts/migrate.js` as the migration runner. Create `lib/db/client.ts` with the WAL-mode database singleton. Create `lib/db/types.ts` with the TypeScript types. Add `"db:migrate": "node scripts/migrate.js"` to `package.json` scripts. Add `data/skillmall.db` to `.gitignore`.

**Allowed files:**
```
db/migrations/001_initial.sql
scripts/migrate.js
lib/db/client.ts
lib/db/types.ts
package.json
.gitignore
```

**Verify:**
- `npm run db:migrate` exits 0 on first run and creates `data/skillmall.db`
- `npm run db:migrate` exits 0 on second run (idempotent — already-applied migrations skipped)
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `sqlite3 data/skillmall.db ".tables"` shows sessions, install_events, reviews, schema_migrations

**Stop if:**
- `better-sqlite3` fails to install (native module) — investigate Node.js version compatibility before continuing
- Need files outside allowed_files

---

### T102 — GitHub OAuth

**Type:** Worker
**Depends on:** T101

**Objective:** Implement GitHub OAuth for reviewer authentication. Users sign in with GitHub to submit reviews. Sessions stored in SQLite.

**Prerequisites:** GitHub OAuth app must be registered at github.com/settings/developers. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local`. Add `NEXTAUTH_SECRET` (any random 32-char string) and `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

**Implementation:** Follow the "GitHub OAuth Implementation" section in this document. Implement `lib/auth/github.ts` (getGitHubAuthUrl, exchangeCodeForToken, fetchGitHubUser, createSession, getSession, deleteSession). Implement `lib/auth/middleware.ts` (getCurrentSession, requireAuth). Create three API routes: GET /api/auth/login (generates state, redirects to GitHub), GET /api/auth/callback/github (validates state, exchanges code, creates session, sets cookie), POST /api/auth/logout (deletes session, clears cookie). Add a Sign In button to the header navigation in `app/layout.tsx`.

**CSRF protection:** the `/api/auth/login` route must:
1. Generate a random state token (`crypto.randomBytes(16).toString('hex')`)
2. Store it in a short-lived httpOnly cookie (`oauth_state`, 5 minutes)
3. Include it in the GitHub OAuth URL `state` parameter
The callback route must validate the `state` query param matches the `oauth_state` cookie before proceeding.

**Allowed files:**
```
lib/auth/github.ts
lib/auth/middleware.ts
app/api/auth/login/route.ts
app/api/auth/callback/github/route.ts
app/api/auth/logout/route.ts
app/layout.tsx
lib/__tests__/auth.test.ts
```

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- OAuth round-trip: GET /api/auth/login → GitHub → callback → session in DB → cookie set (manual smoke test)
- Unauthenticated request to requireAuth() protected route → 401
- Logout: POST /api/auth/logout → session deleted from DB, cookie cleared
- State mismatch: callback with wrong state → 400 (not 500)

**Stop if:**
- GitHub OAuth app credentials not in `.env.local` — add them before continuing
- `crypto` is not available in the Next.js App Router edge runtime — use the Node.js runtime (add `export const runtime = 'nodejs'` to affected routes)
- Need files outside allowed_files

---

### T103 — Ratings and Reviews Backend

**Type:** Worker
**Depends on:** T101, T102

**Objective:** Implement review submission API, retrieval API, effectiveness score computation, and install event logging.

**Implementation:** Follow the "Ratings and Reviews" and "Install Event Tracking" sections in this document. Create `lib/reviews.ts` (createReview, getReviews, getEffectivenessScore, getReviewCount, hasInstallSignal, isGenericReview). Create `lib/analytics.ts` (logInstallEvent, getInstallCount, getInstallVelocity7d, getTrending7d, getInstallsByAgentType, getRising). Create `POST /api/reviews` and `GET /api/reviews/[skillSlug]`. Add install event logging to the existing `POST /api/create-skill` route (log when skill is written to disk) and to the deploy command output.

**Install signal approach for Phase 2:** when a user submits a review, we check if the skill has at least one install event in the database. We do not verify the specific reviewer installed it (that would require storing user identity in install events, which violates the zero-PII requirement). This is explicitly documented in the API response.

**Parameterized queries only.** Every database query must use `db.prepare('... WHERE id = ?').get(id)` pattern. No string concatenation in SQL.

**Allowed files:**
```
lib/reviews.ts
lib/analytics.ts
lib/__tests__/reviews.test.ts
lib/__tests__/analytics.test.ts
app/api/reviews/route.ts
app/api/reviews/[skillSlug]/route.ts
app/api/create-skill/route.ts
```

**Test cases:**
- `createReview` stores review in SQLite, returns Review object
- Duplicate review (same skill + same github_id): throws with 'already reviewed' message
- `isGenericReview('great skill')` returns true
- `isGenericReview('Used this for a real project. Saved 3 hours of analysis.')` returns false
- `getEffectivenessScore` returns quality-weighted average (specific reviews 2x weight)
- `getEffectivenessScore` returns null when no reviews exist
- POST /api/reviews without session cookie → 401
- POST /api/reviews with body > 150 chars → 400
- POST /api/reviews with rating = 6 → 400

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm test lib/__tests__/reviews` all pass
- `npm test lib/__tests__/analytics` all pass
- SQL injection attempt in skillSlug param is rejected by parameterized query (structural guarantee)

**Stop if:**
- Need files outside allowed_files

---

### T104 — Ratings and Reviews UI

**Type:** Worker
**Depends on:** T103

**Objective:** Add ratings UI to skill detail page: star rating input, 150-char review text field with live counter, review feed with specific reviews above fold. Show effectiveness score and install count as separate metrics.

**Nothing design rules apply:** no shadows, no border-radius above rounded-2xl on inputs, underline-style text areas (bottom border only), bracket notation for labels, Space Mono for all count indicators.

**Effectiveness score and install count must always display as separate metrics — never combined into a single "rating" number.** A skill can be popular (high install count) with low effectiveness (many generic reviews). These are two different signals.

**Generic reviews (is_generic=1) display below specific reviews** in the feed. They appear grayed-out or deprioritized visually but are never hidden or deleted.

**Allowed files:**
```
app/skills/[category]/[slug]/page.tsx
components/skill-mall/reviews/ReviewForm.tsx
components/skill-mall/reviews/ReviewFeed.tsx
components/skill-mall/reviews/EffectivenessPanel.tsx
```

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- Authenticated user sees review form; unauthenticated user sees sign-in prompt (smoke test)
- Star rating and text field render on skill detail page
- 150-char limit enforced with live counter
- Effectiveness score and install count display independently (not combined)
- Generic reviews appear below specific ones

**Stop if:**
- Need files outside allowed_files

---

### T105 — Skill Collections Backend and CLI

**Type:** Worker
**Depends on:** Phase 1 (T013)

**Objective:** Implement skill collections: `collection.json` format, three starter collections, `deploy-pack` CLI command, and collection validation in CI.

**Implementation:** Create `lib/collections.ts` (getAllCollections, getCollection, validateCollection). Create the three starter collection JSON files (full-stack-developer-kit, strategic-business-pack, documentation-suite). Implement `cli/src/commands/deploy-pack.ts`. Register `deploy-pack` in `cli/src/index.ts`. Add collection validation to `scripts/validate-skill.sh --strict` (check referenced slugs exist). Update CI action to also validate collections when `collections/` directory changes.

**The full-stack-developer-kit collection should reference skills that actually exist in the catalog.** Only include `ai/skill-creator`, `productivity/development-workflow`, and `productivity/phased-implementation-plan` — these are the skills that exist from Phase 1.

**Allowed files:**
```
lib/collections.ts
lib/__tests__/collections.test.ts
collections/full-stack-developer-kit/collection.json
collections/strategic-business-pack/collection.json
collections/documentation-suite/collection.json
cli/src/commands/deploy-pack.ts
cli/src/index.ts
scripts/validate-skill.sh
```

**Test cases:**
- `getAllCollections()` returns all 3 starter collections
- `validateCollection` with missing slug → returns error array containing the slug
- `validateCollection` with valid collection → returns empty error array

**Verify:**
- `cd cli && npm run type-check` exits 0
- `cd cli && npm run build` exits 0
- `npx skill-mall deploy-pack full-stack-developer-kit --agent claude-code` deploys all 3 skills in order (manual smoke test)
- Missing skill slug in collection.json → `npx skill-mall validate` reports error

**Stop if:**
- Need files outside allowed_files

---

### T106 — Skill Forking (UI and CLI)

**Type:** Worker
**Depends on:** Phase 1 (T013)

**Objective:** Implement skill forking: `lib/forking.ts`, `npx skill-mall fork` CLI command, Fork button on skill detail page.

**Implementation:** Create `lib/forking.ts` (forkSkill) as specified in the "Skill Forking" section. Create `cli/src/commands/fork.ts`. Register `fork` in `cli/src/index.ts`. Add Fork button to `app/skills/[category]/[slug]/page.tsx`. Fork button is a client component that calls a `POST /api/fork-skill` route; the route calls `forkSkill()` server-side.

**The fork writes to the local `skills/` directory.** It does not create GitHub forks or remote copies. After forking locally, the user can `git add` and commit the new skill directory.

**Allowed files:**
```
lib/forking.ts
lib/__tests__/forking.test.ts
cli/src/commands/fork.ts
cli/src/index.ts
app/skills/[category]/[slug]/page.tsx
app/api/fork-skill/route.ts
components/skill-mall/fork-button.tsx
```

**Test cases:**
- `forkSkill('ai', 'skill-creator', 'my-skill-creator')` creates `skills/ai/my-skill-creator/` with `forked_from: "skill-creator@X.Y.Z"` in frontmatter
- Fork of a fork: `fork_chain` array contains full lineage
- Fork to existing directory → throws error

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npx skill-mall fork ai/skill-creator my-custom-skill-creator` creates the directory (manual smoke test)
- Fork frontmatter includes `forked_from` field

**Stop if:**
- Need files outside allowed_files

---

### T107 — Publish to skills.sh (CLI)

**Type:** Worker
**Depends on:** Phase 1 (T013), T014 (Quality Score)

**Objective:** Implement `npx skill-mall publish <slug> --registry skills.sh` with pre-publish validation, skills.sh OAuth, and post-publish SKILL.md frontmatter update.

**Pre-publish validation must all pass before OAuth flow opens:**
1. Quality score >= 70 (call `computeQualityScore`)
2. Description <= 1024 chars
3. Skill name matches directory name
4. `metadata.license` field present in SKILL.md

**Allowed files:**
```
cli/src/commands/publish.ts
cli/src/index.ts
lib/publish/skills-sh.ts
```

**Verify:**
- `cd cli && npm run build` exits 0
- Quality score < 70: `npx skill-mall publish` exits 1 with specific message listing failing checks
- Missing license field: exits 1 with specific message
- OAuth flow opens browser (manual smoke test — cannot be automated)

**Stop if:**
- skills.sh API or OAuth endpoint is not publicly documented — stub the implementation with a TODO and document the missing info
- Need files outside allowed_files

---

### T108 — Multi-Agent Deploy (UI and CLI)

**Type:** Worker
**Depends on:** Phase 1 (T013)

**Objective:** Implement `npx skill-mall deploy --all-agents` CLI flag and "Deploy to All Agents" option in the skill detail page UI.

**Implementation:** Create `lib/agents/registry.ts` with the 7 primary agents listed in this document (the full 54 can be added incrementally — ship the 7 shown, comment "TODO: add remaining 47 from vercel-labs/skills registry"). Create `lib/agents/detector.ts` (detectAgents, deployToAgents). Update `cli/src/commands/deploy.ts` to support `--all-agents` and `--agents <id,id>` flags. Update the deploy button in `components/skill-mall/deploy-button.tsx` to add "Deploy to All Agents" option.

**Install events:** call `logInstallEvent(skillSlug, agentType)` for each successful deployment.

**Allowed files:**
```
lib/agents/registry.ts
lib/agents/detector.ts
lib/__tests__/agent-detection.test.ts
cli/src/commands/deploy.ts
components/skill-mall/deploy-button.tsx
```

**Test cases:**
- `detectAgents()` returns array with `detected: true` for `~/.claude/skills` if it exists (mock fs)
- `detectAgents()` returns `detected: false` for directories that don't exist
- `deployToAgents` with mock fs: copies files to all detected agent directories

**Verify:**
- `cd cli && npm run build` exits 0
- `npx skill-mall deploy ai/skill-creator --all-agents` shows per-agent status table (manual smoke test on dev machine with Claude Code installed)

**Stop if:**
- Need files outside allowed_files

---

### T109 — SkillMall MCP Server

**Type:** Worker
**Depends on:** Phase 1 (T011)

**Objective:** Implement the MCP server at `/api/mcp` exposing 3 tools (search_skills, get_skill, list_categories). Respond to GET (tool list) and POST (tool execution, JSON-RPC 2.0).

**Implementation:** Follow the "SkillMall MCP Server" section. Create `app/api/mcp/route.ts`. Add `export const runtime = 'nodejs'` since the route reads the filesystem. Add MCP config instructions to `docs/user/mcp-server.md`.

**Allowed files:**
```
app/api/mcp/route.ts
docs/user/mcp-server.md
```

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `curl -X GET http://localhost:3000/api/mcp` returns tool list JSON
- `curl -X POST http://localhost:3000/api/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_skills","arguments":{"query":"skill"}}}' -H 'Content-Type: application/json'` returns matching skills

**Stop if:**
- Need files outside allowed_files

---

### T110 — Trending Dashboard and Contributor Analytics

**Type:** Worker
**Depends on:** T103

**Objective:** Build `/trending` page (top 10 by 7-day velocity), `/trending/rising` page (>50% acceleration), and `/dashboard` contributor page (authenticated; shows own skills' install counts by agent type).

**All analytics are aggregate — no user identity in any query.** The dashboard shows aggregate install counts per agent type for the contributor's own skills. The contributor must be authenticated to see the dashboard.

**Allowed files:**
```
app/trending/page.tsx
app/dashboard/page.tsx
```

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `/trending` renders (may show empty state if no install events recorded)
- `/dashboard` redirects to login if unauthenticated (smoke test)
- `/dashboard` shows skill analytics if authenticated (smoke test)

**Stop if:**
- Need files outside allowed_files

---

### T111 — Description Trigger Evaluator (UI and CLI)

**Type:** Worker
**Depends on:** Phase 1 (T001, T011)

**Objective:** Implement the Description Trigger Evaluator: generates 20 queries (10 positive, 10 negative), simulates agent selection, reports accuracy. Available as "Trigger Analysis" tab on skill detail page and as `npx skill-mall eval-triggers`.

**Implementation:** Create `lib/trigger-evaluator.ts` as specified in this document. Add `POST /api/eval-triggers` route. Add Trigger Analysis tab to `SkillTabs` component. Add `eval-triggers` command to CLI.

**Accuracy threshold:** 80% is the warning threshold. Skills below 80% show a warning in the UI and CLI output. This is a warning only — it does not block anything in Phase 2.

**Allowed files:**
```
lib/trigger-evaluator.ts
lib/__tests__/trigger-evaluator.test.ts
app/api/eval-triggers/route.ts
components/skill-mall/skill-detail/SkillTabs.tsx
cli/src/commands/eval-triggers.ts
cli/src/index.ts
```

**Test cases (all using mock LLM client):**
- `evaluateTriggers` generates exactly 20 test queries (10 positive + 10 negative)
- Reports true positive rate, false positive rate, false negative rate, overall accuracy
- Failing queries include suggestion for how to fix each failure

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test lib/__tests__/trigger-evaluator` all pass (mocked LLM)

**Stop if:**
- Need files outside allowed_files

---

### T112 — Skill Version History (UI and CLI)

**Type:** Worker
**Depends on:** Phase 1 (T013)

**Objective:** Read git log for a skill directory, render a changelog timeline on the detail page. CLI: `npx skill-mall revert <slug> --version 1.0.0` creates a revert branch.

**Implementation:** Create `lib/version-history.ts` as specified in this document. Add "History" tab to `SkillTabs`. Add `revert` command to CLI. The revert command uses `git checkout <hash> -- <skill-dir>` into a new branch named `revert/<skill-slug>-v<version>` — it does not commit or merge.

**Allowed files:**
```
lib/version-history.ts
lib/__tests__/version-history.test.ts
components/skill-mall/skill-detail/SkillTabs.tsx
cli/src/commands/revert.ts
cli/src/index.ts
```

**Test cases:**
- `getVersionHistory` returns empty array when no git history (new repo or skill outside git)
- `deriveSemanticDiff` maps changed file paths to plain-language descriptions

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- Version history tab renders on skill detail page (shows entries if git history exists)

**Stop if:**
- Need files outside allowed_files

---

### T113 — Phase 2 Documentation

**Type:** Worker
**Depends on:** T103, T105, T106, T107, T108, T109

**Objective:** Write all Phase 2 documentation files. Minimum 500 words each, production quality, no stubs.

**Content requirements:**
- `docs/user/mcp-server.md`: MCP server setup, config JSON snippet, all 3 tools documented with example calls
- `docs/reference/database-schema.md`: full SQLite schema (all 3 tables + schema_migrations), all column types and constraints, migration runner usage
- `docs/reference/collection-format.md`: collection.json format spec, all fields, validation rules, CLI deployment usage
- `docs/user/publishing-skills.md`: full publish workflow, pre-publish validation checks (all 4), OAuth flow, post-publish frontmatter changes
- `docs/user/multi-agent-deploy.md`: agent detection behavior, supported agents (list all 7+ in registry), `--all-agents` and `--agents` flag usage, per-agent status output
- `docs/user/community-guide.md`: rating and review submission requirements (auth + install signal), how effectiveness score is computed, how generic reviews are handled, contributing collections

**Allowed files:**
```
docs/user/mcp-server.md
docs/reference/database-schema.md
docs/reference/collection-format.md
docs/user/publishing-skills.md
docs/user/multi-agent-deploy.md
docs/user/community-guide.md
```

**Verify:**
- All 6 files exist
- `wc -w docs/user/mcp-server.md` >= 500 words each file
- `docs/reference/database-schema.md` contains all SQL CREATE TABLE statements
- `docs/user/mcp-server.md` contains the MCP config JSON snippet

**Stop if:**
- A doc describes an interface that doesn't match the actual implementation — fix the discrepancy before closing
- Need files outside allowed_files

---

### T114 — Phase 2 Completion Audit (Judge)

**Type:** Judge
**Depends on:** all T101–T113 receipts

**Objective:** Audit whether Phase 2 is complete. All features shipped, database stable, all tests passing, docs reviewed, no Phase 3 features present.

**Do not mark complete if:**
- Any Worker task T101–T113 is queued or active
- `npm run build` exits nonzero
- `npm test` exits nonzero
- `npx tsc --noEmit` exits nonzero
- `npm run db:migrate` fails on fresh database
- Any Phase 2 doc file is missing or < 500 words
- Phase 3 features (chains, RAG, marketplace) are present

**Expected output:**
- `complete | not_complete`
- `full_outcome_complete: true | false`
- If not_complete: exact list of what is missing or failing

---

## GoalBuddy Setup

```bash
# /goal-prep
# Slug: skillmall-phase2
# Input shape: existing_plan
# This file: docs/superpowers/plans/PHASE-2-PLAN.md
# Gate: verify Phase 1 T018 passed and GitHub OAuth credentials available before creating board
```

Task type map:
- T101–T112: Worker tasks
- T113: Worker (documentation)
- T114: Judge (completion audit)
