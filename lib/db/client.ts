import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'skillmall.db')

let _db: Database.Database | null = null

// TODO(S14): Run db/migrations/*.sql at startup so fresh deployments don't hit "no such table" errors.
// Pattern: read migrations in numeric order, track applied migrations in a schema_versions table,
// apply only new ones idempotently. Do not rely on manual migration runs for correctness.

// TODO(S16): Run PRAGMA wal_checkpoint(TRUNCATE) on a background interval (e.g. every 15 min) or
// on graceful shutdown to prevent unbounded WAL file growth under heavy write workloads.

/** Get the singleton database connection. WAL mode enabled for better concurrency. */
export function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
  }
  return _db
}
