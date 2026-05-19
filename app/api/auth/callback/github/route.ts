import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  createSession,
} from "@/lib/auth/github";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // CSRF check — validate state against cookie
  const storedState = req.cookies.get("oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.json(
      { error: "invalid_state", message: "OAuth state mismatch or missing code" },
      { status: 400 }
    );
  }

  try {
    const token = await exchangeCodeForToken(code);
    const user = await fetchGitHubUser(token);
    const sessionId = createSession(String(user.id), user.login);

    const response = NextResponse.redirect(
      new URL("/dashboard", req.nextUrl.origin)
    );

    // Set session cookie
    response.cookies.set("sm_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Clear the state cookie
    response.cookies.set("oauth_state", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[auth] GitHub OAuth callback failed:", err);
    return NextResponse.json({ error: "oauth_failed", message: "Authentication failed" }, { status: 500 });
  }
}
