/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

function getMigrationsDir(repoRoot = process.cwd()) {
  return path.join(repoRoot, 'db', 'migrations')
}

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

function getAppliedMigrations(db) {
  ensureMigrationTable(db)
  return new Set(
    db.prepare('SELECT filename FROM schema_migrations ORDER BY filename')
      .all()
      .map((row) => row.filename)
  )
}

function getMigrationFiles(repoRoot = process.cwd()) {
  const migrationsDir = getMigrationsDir(repoRoot)
  if (!fs.existsSync(migrationsDir)) return []

  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
}

function runMigrations(db, options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd()
  const migrationsDir = getMigrationsDir(repoRoot)
  const applied = getAppliedMigrations(db)
  const files = getMigrationFiles(repoRoot)
  const appliedNow = []

  for (const file of files) {
    if (applied.has(file)) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    const applyMigration = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file)
    })
    applyMigration()
    appliedNow.push(file)
  }

  return {
    applied: appliedNow,
    skipped: files.filter((file) => !appliedNow.includes(file)),
  }
}

module.exports = {
  ensureMigrationTable,
  getAppliedMigrations,
  getMigrationFiles,
  runMigrations,
}
