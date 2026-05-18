import { NextResponse } from "next/server";
import { getGitHubAuthUrl } from "@/lib/auth/github";

export const runtime = "nodejs";

export async function GET() {
  const { url, state } = getGitHubAuthUrl();

  const response = NextResponse.redirect(url);

  // Store state in short-lived httpOnly cookie for CSRF validation in callback
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return response;
}
