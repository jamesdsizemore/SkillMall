import type Database from 'better-sqlite3'

export interface MigrationResult {
  applied: string[]
  skipped: string[]
}

export function ensureMigrationTable(db: Database.Database): void
export function getAppliedMigrations(db: Database.Database): Set<string>
export function getMigrationFiles(repoRoot?: string): string[]
export function runMigrations(
  db: Database.Database,
  options?: { repoRoot?: string }
): MigrationResult
