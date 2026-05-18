// T102 STUB — will be replaced with full GitHub OAuth implementation when
// GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are provisioned in .env.local

import type { Session } from "../db/types";

export function getGitHubAuthUrl(): { url: string; state: string } {
  throw new Error(
    "GitHub OAuth not configured. Register an OAuth app at github.com/settings/developers " +
      "and add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env.local, then implement T102."
  );
}

export async function exchangeCodeForToken(_code: string): Promise<string> {
  throw new Error("GitHub OAuth not configured. See T102.");
}

export async function fetchGitHubUser(
  _token: string
): Promise<{ id: number; login: string }> {
  throw new Error("GitHub OAuth not configured. See T102.");
}

export function createSession(
  _githubId: string,
  _githubLogin: string
): string {
  throw new Error("GitHub OAuth not configured. See T102.");
}

export function getSession(_token: string): Session | null {
  // Returns null until T102 is implemented — causes all auth-gated pages to redirect
  return null;
}

export function deleteSession(_token: string): void {
  // No-op until T102
}
