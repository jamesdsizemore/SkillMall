import { NextRequest, NextResponse } from "next/server";
import { AuthConfigurationError, getGitHubAuthUrl, isAuthDisabled } from "@/lib/auth/github";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (isAuthDisabled()) {
    return NextResponse.redirect(new URL("/settings", req.nextUrl.origin));
  }

  let authUrl: { url: string; state: string };
  try {
    authUrl = getGitHubAuthUrl({ origin: req.nextUrl.origin });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        {
          error: "configuration_error",
          message: error.message,
        },
        { status: 500 }
      );
    }
    throw error;
  }

  const response = NextResponse.redirect(authUrl.url);

  // Store state in short-lived httpOnly cookie for CSRF validation in callback
  response.cookies.set("oauth_state", authUrl.state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return response;
}
