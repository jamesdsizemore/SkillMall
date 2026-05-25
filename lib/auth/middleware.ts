// T102 STUB — will be replaced with full implementation when GitHub OAuth is configured

import { cookies } from "next/headers";
import { disabledAuthSession, getSession, isAuthDisabled } from "./github";
import type { Session } from "../db/types";

export async function getCurrentSession(): Promise<Session | null> {
  if (isAuthDisabled()) return disabledAuthSession();
  const cookieStore = await cookies();
  const token = cookieStore.get("sm_session")?.value;
  if (!token) return null;
  return getSession(token);
}

export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  return session;
}
