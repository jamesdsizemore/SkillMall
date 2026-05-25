import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import os from "os";
import fs from "fs";

// Create a test database with the sessions table
const TEST_DB_PATH = path.join(os.tmpdir(), `auth-test-${process.pid}.db`);

let testDb: Database.Database;
const originalEnv = { ...process.env };

beforeAll(() => {
  fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
  testDb = new Database(TEST_DB_PATH);
  testDb.pragma("journal_mode = WAL");
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      github_id TEXT NOT NULL,
      github_login TEXT NOT NULL,
      scopes TEXT NOT NULL DEFAULT 'read:user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

// Helpers that operate on our test DB directly (no module mocking)
function createTestSession(githubId: string, githubLogin: string): string {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  testDb.prepare(
    "INSERT INTO sessions (id, github_id, github_login, expires_at) VALUES (?, ?, ?, ?)"
  ).run(id, githubId, githubLogin, expiresAt);
  return id;
}

function getTestSession(token: string) {
  return testDb.prepare(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')"
  ).get(token);
}

function deleteTestSession(token: string) {
  testDb.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

describe("session management (SQLite direct)", () => {
  it("createSession stores a 64-char hex token", () => {
    const token = createTestSession("123", "testuser");
    expect(typeof token).toBe("string");
    expect(token.length).toBe(64);
  });

  it("getSession returns session for valid token", () => {
    const token = createTestSession("456", "anotheruser");
    const session = getTestSession(token) as { github_login: string } | undefined;
    expect(session).toBeDefined();
    expect(session!.github_login).toBe("anotheruser");
  });

  it("getSession returns undefined for unknown token", () => {
    const session = getTestSession("nonexistent-token-xyz");
    expect(session).toBeUndefined();
  });

  it("deleteSession removes the session", () => {
    const token = createTestSession("789", "deleteuser");
    expect(getTestSession(token)).toBeDefined();
    deleteTestSession(token);
    expect(getTestSession(token)).toBeUndefined();
  });
});

describe("getGitHubAuthUrl", () => {
  it("returns a GitHub OAuth URL with correct structure", async () => {
    process.env.GITHUB_CLIENT_ID = "test-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const { getGitHubAuthUrl } = await import("../auth/github");
    const { url, state } = getGitHubAuthUrl();

    expect(url).toContain("github.com/login/oauth/authorize");
    expect(url).toContain("test-client-id");
    expect(url).toContain("callback%2Fgithub");
    expect(typeof state).toBe("string");
    expect(state.length).toBe(32);
  });

  it("uses the request origin when NEXT_PUBLIC_APP_URL is not configured", async () => {
    process.env.GITHUB_CLIENT_ID = "test-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
    delete process.env.NEXT_PUBLIC_APP_URL;

    const { getGitHubAuthUrl } = await import("../auth/github");
    const { url } = getGitHubAuthUrl({ origin: "http://localhost:3123" });
    const parsed = new URL(url);

    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:3123/api/auth/callback/github");
    expect(url).not.toContain("undefined");
  });

  it("throws a configuration error instead of generating client_id=undefined", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";

    const { getGitHubAuthUrl, AuthConfigurationError } = await import("../auth/github");

    expect(() => getGitHubAuthUrl({ origin: "http://localhost:3123" })).toThrow(AuthConfigurationError);
  });
});
