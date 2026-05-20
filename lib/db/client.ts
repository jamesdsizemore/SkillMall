import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { runMigrations } from './migrator'

const DB_PATH = process.env.SKILL_MALL_DB_PATH ?? path.join(process.cwd(), 'data', 'skillmall.db')

let _db: Database.Database | null = null

/**
 * Get the singleton database connection.
 * Opening the Local Data Store also ensures migrations have been applied.
 */
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

export function closeDbForTests(): void {
  _db?.close()
  _db = null
}
