import { NextRequest, NextResponse } from "next/server";
import { getVersionHistory } from "@/lib/version-history";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const skillPath = req.nextUrl.searchParams.get("path");

  if (!skillPath) {
    return NextResponse.json({ error: "path parameter required" }, { status: 400 });
  }

  const entries = getVersionHistory(skillPath);
  return NextResponse.json({ entries });
}
