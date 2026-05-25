import crypto from "crypto";
import { getDb } from "../db/client";
import type { Session } from "../db/types";

export class AuthConfigurationError extends Error {
  constructor(message = "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.") {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

function configuredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value || value === "undefined" || value === "null") return null;
  return value;
}

function envFlag(value: string | null): boolean | null {
  if (value === null) return null;
  if (["0", "false", "off", "no"].includes(value.toLowerCase())) return false;
  return true;
}

function hasGitHubOAuthConfig(): boolean {
  return Boolean(configuredEnv("GITHUB_CLIENT_ID") && configuredEnv("GITHUB_CLIENT_SECRET"));
}

export function isAuthDisabled(): boolean {
  const explicit = envFlag(configuredEnv("SKILL_MALL_AUTH_DISABLED"));
  if (explicit !== null) return explicit;
  return !hasGitHubOAuthConfig();
}

export function disabledAuthSession(): Session {
  return {
    id: "auth-disabled",
    github_id: "auth-disabled",
    github_login: configuredEnv("SKILL_MALL_AUTH_DISABLED_LOGIN") ?? "local-dev",
    scopes: "auth:disabled read:user",
    created_at: "2026-05-21T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
  };
}

export function isDisabledAuthSession(session: Session | null | undefined): boolean {
  return session?.id === "auth-disabled";
}

function appUrl(origin?: string): string {
  return (configuredEnv("NEXT_PUBLIC_APP_URL") ?? origin ?? "http://localhost:3000").replace(/\/+$/, "");
}

function githubOAuthConfig(origin?: string): {
  clientId: string;
  clientSecret: string;
  appUrl: string;
} {
  const clientId = configuredEnv("GITHUB_CLIENT_ID");
  const clientSecret = configuredEnv("GITHUB_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new AuthConfigurationError();
  return {
    clientId,
    clientSecret,
    appUrl: appUrl(origin),
  };
}

/** Generate the GitHub OAuth authorization URL with a CSRF state token. */
export function getGitHubAuthUrl(input: { origin?: string } = {}): { url: string; state: string } {
  const config = githubOAuthConfig(input.origin);
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${config.appUrl}/api/auth/callback/github`,
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
  const config = githubOAuthConfig();
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }),
    signal: AbortSignal.timeout(10_000),
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
    signal: AbortSignal.timeout(10_000),
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
