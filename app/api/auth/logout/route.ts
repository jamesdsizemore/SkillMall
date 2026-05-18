import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/github";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("sm_session")?.value;

  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set("sm_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return response;
}
