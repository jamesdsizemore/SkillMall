import crypto from "crypto";
import { getDb } from "../db/client";
import type { Session } from "../db/types";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Generate the GitHub OAuth authorization URL with a CSRF state token. */
export function getGitHubAuthUrl(): { url: string; state: string } {
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${APP_URL}/api/auth/callback/github`,
    scope: "read:user",
    state,
  });
  return {
    url: `https://github.com/login/oauth/authorize?${params}`,
    state,
  };
}

/** Exchange OAuth code for a GitHub access token. */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(data.error ?? "GitHub OAuth token exchange failed");
  }
  return data.access_token;
}

/** Fetch GitHub user identity using an access token. */
export async function fetchGitHubUser(
  token: string
): Promise<{ id: number; login: string }> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub user fetch failed: HTTP ${res.status}`);
  }
  const user = (await res.json()) as { id: number; login: string };
  return { id: user.id, login: user.login };
}

/** Create a session in SQLite and return the session token. */
export function createSession(githubId: string, githubLogin: string): string {
  const db = getDb();
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  db.prepare(
    "INSERT INTO sessions (id, github_id, github_login, expires_at) VALUES (?, ?, ?, ?)"
  ).run(id, githubId, githubLogin, expiresAt);

  return id;
}

/** Look up a session by token. Returns null if not found or expired. */
export function getSession(token: string): Session | null {
  const db = getDb();
  const session = db
    .prepare(
      "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')"
    )
    .get(token) as Session | undefined;
  return session ?? null;
}

/** Delete a session (logout). */
export function deleteSession(token: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}
