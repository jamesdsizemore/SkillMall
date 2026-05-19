import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'skillmall.db')
const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations')

let _db: Database.Database | null = null

// TODO(S16): Run PRAGMA wal_checkpoint(TRUNCATE) on a background interval (e.g. every 15 min) or
// on graceful shutdown to prevent unbounded WAL file growth under heavy write workloads.

function runMigrations(db: Database.Database): void {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run()

  if (!fs.existsSync(MIGRATIONS_DIR)) return

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const already = db.prepare('SELECT 1 FROM schema_migrations WHERE filename = ?').get(file)
    if (already) continue
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
    db.exec(sql)
    db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file)
  }
}

/** Get the singleton database connection. WAL mode enabled for better concurrency. */
export function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    runMigrations(_db)
  }
  return _db
}
