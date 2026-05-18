# Database Schema

SkillMall Phase 2 uses SQLite via `better-sqlite3`. No cloud database. No Supabase. The database file lives at `data/skillmall.db` (gitignored) and is created automatically on first run.

## Setup

```bash
npm run db:migrate
```

This applies all pending migrations from `db/migrations/` in filename order. Idempotent — safe to run multiple times. Creates the database file if it doesn't exist.

## Migration Files

All migrations are plain SQL files in `db/migrations/`. They are committed to the repository. The migration runner applies them in alphabetical order and records each applied migration in the `schema_migrations` table.

---

## Tables

### sessions

Stores GitHub OAuth sessions. Sessions expire after 7 days.

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,           -- random 32-byte hex token
  github_id TEXT NOT NULL,       -- GitHub user numeric ID
  github_login TEXT NOT NULL,    -- GitHub username
  scopes TEXT NOT NULL DEFAULT 'read:user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL       -- ISO 8601, 7 days from creation
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
```

**Notes:**
- `id` is the session token set in the `sm_session` httpOnly cookie
- Sessions are validated by checking `expires_at > datetime('now')`
- Expired sessions are left in the table until explicit cleanup
- No access tokens are stored — only the GitHub user identity

---

### install_events

Records skill installation events. **Zero PII.** No user identity is stored in this table.

```sql
CREATE TABLE IF NOT EXISTS install_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,      -- e.g. "skill-creator"
  agent_type TEXT NOT NULL,      -- 'claude-code' | 'cursor' | 'codex' | 'gemini-cli' | 'other'
  installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_install_events_slug ON install_events(skill_slug);
CREATE INDEX IF NOT EXISTS idx_install_events_installed ON install_events(installed_at);
```

**Notes:**
- Events are logged by `lib/analytics.ts:logInstallEvent()` on every successful skill deployment
- `agent_type` comes from the deploy command (`--agent` flag or auto-detected)
- No user identity, IP address, or session reference is stored — aggregate analytics only
- Used by trending computations, rising detection, and contributor dashboards

---

### reviews

Stores skill ratings and reviews.

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  reviewer_github_id TEXT NOT NULL,
  reviewer_login TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 150),
  is_generic INTEGER NOT NULL DEFAULT 0,        -- 1 = deprioritized in display
  has_install_signal INTEGER NOT NULL DEFAULT 0, -- 1 = verified skill has installs
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_slug, reviewer_github_id)         -- one review per skill per user
);
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(skill_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at);
```

**Constraints enforced by the database:**
- `rating` must be 1–5 (CHECK constraint)
- `body` must be 1–150 characters (CHECK constraint)
- One review per (skill, reviewer) pair (UNIQUE constraint) — attempting a second review returns SQLITE_CONSTRAINT_UNIQUE

**Generic review detection:**
The `is_generic` flag is set by `lib/reviews.ts:isGenericReview()` when the review body matches common generic phrases ("great skill", "very useful", etc.). Generic reviews are stored and displayed but sorted below specific reviews.

**Install signal:**
`has_install_signal` is set to 1 when the skill has at least one `install_events` record. This is a catalog-level signal, not per-user — Phase 2 does not track which specific user installed which skill.

---

### schema_migrations

Tracks which migration files have been applied. Created by the migration runner automatically.

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

---

## Database Client

File: `lib/db/client.ts`

```typescript
import Database from 'better-sqlite3'

const DB_PATH = path.join(process.cwd(), 'data', 'skillmall.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')   // Write-Ahead Logging
    _db.pragma('foreign_keys = ON')
  }
  return _db
}
```

WAL mode is enabled for better read concurrency. `foreign_keys = ON` is set but no foreign key relationships are defined in Phase 2 — this is future-proofing for Phase 3.

---

## Query Safety

**All queries use parameterized statements.** String concatenation in SQL is never used. The correct pattern:

```typescript
// Correct
db.prepare('SELECT * FROM reviews WHERE skill_slug = ?').all(skillSlug)

// Never do this
db.exec(`SELECT * FROM reviews WHERE skill_slug = '${skillSlug}'`) // vulnerable to SQL injection
```

---

## Production Considerations

SQLite WAL mode requires the database file to be on a local filesystem. This works on any VPS, dedicated server, or local development setup. It does not work on Vercel's read-only filesystem — Phase 2 is designed for local-first or self-hosted deployments where the filesystem is writable.

For cloud deployments, the migration path is to Turso (LibSQL — SQLite-compatible, cloud-hosted, serverless). The `better-sqlite3` API is compatible with `@libsql/client` for basic operations, making migration straightforward.
