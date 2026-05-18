#!/usr/bin/env node
'use strict'

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(process.cwd(), 'data', 'skillmall.db')
const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations')

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const applied = new Set(
  db.prepare('SELECT filename FROM schema_migrations ORDER BY filename').all().map(r => r.filename)
)

const migrations = fs.readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort()

let count = 0
for (const file of migrations) {
  if (applied.has(file)) continue
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
  db.exec(sql)
  db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file)
  console.log('Applied: ' + file)
  count++
}

console.log(count === 0 ? 'No new migrations.' : count + ' migration(s) applied.')

db.close()
