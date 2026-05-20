import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "../db/types";
import type { Skill } from "../skills";
import { getSession } from "./github";

export const SESSION_COOKIE_NAME = "sm_session";

export function getSessionFromRequest(req: NextRequest): Session | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getSession(token) : null;
}

export async function getSessionFromCookies(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token ? getSession(token) : null;
}

export function authenticationRequiredResponse(
  message = "Authentication required"
): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function isSkillAuthor(session: Session, skill: Pick<Skill, "author">): boolean {
  return Boolean(skill.author) && skill.author === session.github_login;
}

export function requireSkillAuthor(
  session: Session,
  skill: Pick<Skill, "author">,
  message: string
): NextResponse | null {
  return isSkillAuthor(session, skill) ? null : forbiddenResponse(message);
}

export function requireSkillAuthorWhenPresent(
  session: Session,
  skill: Pick<Skill, "author">,
  message: string
): NextResponse | null {
  if (!skill.author || skill.author === session.github_login) return null;
  return forbiddenResponse(message);
}
