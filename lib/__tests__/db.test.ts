import { describe, it, expect, afterAll } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

describe("SQLite schema", () => {
  const tmpDb = path.join(os.tmpdir(), `skillmall-test-${Date.now()}.db`);

  afterAll(() => {
    try { fs.unlinkSync(tmpDb) } catch {}
    try { fs.unlinkSync(tmpDb + '-shm') } catch {}
    try { fs.unlinkSync(tmpDb + '-wal') } catch {}
  });

  function createTestDb() {
    const db = new Database(tmpDb);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const migration = fs.readFileSync(
      path.join(process.cwd(), 'db/migrations/001_initial.sql'),
      'utf-8'
    );
    db.exec(migration);
    return db;
  }

  it("creates sessions table with correct columns", () => {
    const db = createTestDb();
    const info = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
    const cols = info.map(r => r.name);
    expect(cols).toContain("id");
    expect(cols).toContain("github_id");
    expect(cols).toContain("github_login");
    expect(cols).toContain("expires_at");
    db.close();
  });

  it("creates install_events table with zero-PII columns only", () => {
    const db = createTestDb();
    const info = db.prepare("PRAGMA table_info(install_events)").all() as Array<{ name: string }>;
    const cols = info.map(r => r.name);
    expect(cols).toContain("skill_slug");
    expect(cols).toContain("agent_type");
    expect(cols).toContain("installed_at");
    expect(cols).not.toContain("user_id");
    expect(cols).not.toContain("github_id");
    db.close();
  });

  it("creates reviews table with UNIQUE constraint on skill_slug + reviewer_github_id", () => {
    const db = createTestDb();

    db.prepare(`
      INSERT INTO reviews (skill_slug, reviewer_github_id, reviewer_login, rating, body)
      VALUES ('test-skill', 'user123', 'testuser', 5, 'Great skill!')
    `).run();

    expect(() => {
      db.prepare(`
        INSERT INTO reviews (skill_slug, reviewer_github_id, reviewer_login, rating, body)
        VALUES ('test-skill', 'user123', 'testuser', 4, 'Second review')
      `).run();
    }).toThrow();

    db.close();
  });

  it("rejects reviews with rating outside 1-5", () => {
    const db = createTestDb();
    expect(() => {
      db.prepare(`
        INSERT INTO reviews (skill_slug, reviewer_github_id, reviewer_login, rating, body)
        VALUES ('test-skill', 'user456', 'testuser2', 6, 'Out of range')
      `).run();
    }).toThrow();
    db.close();
  });

  it("rejects reviews with body > 150 chars", () => {
    const db = createTestDb();
    const longBody = "x".repeat(151);
    expect(() => {
      db.prepare(`
        INSERT INTO reviews (skill_slug, reviewer_github_id, reviewer_login, rating, body)
        VALUES ('test-skill', 'user789', 'testuser3', 3, ?)
      `).run(longBody);
    }).toThrow();
    db.close();
  });

  it("migration is idempotent when run twice", () => {
    const db = createTestDb();
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'db/migrations/001_initial.sql'),
      'utf-8'
    );
    // Should not throw when tables already exist (IF NOT EXISTS)
    expect(() => db.exec(migration)).not.toThrow();
    db.close();
  });
});
