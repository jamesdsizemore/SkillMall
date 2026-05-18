import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { forkSkill } from "@/lib/forking";
import { getSession } from "@/lib/auth/github";

const ForkBodySchema = z.object({
  category: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
  newSlug: z.string().regex(/^[a-z0-9-]+$/).max(64),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("sm_session")?.value;
  const session = token ? getSession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ForkBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { category, slug, newSlug } = parsed.data;

  // Security: ensure newSlug doesn't contain path traversal
  if (newSlug.includes("..") || newSlug.includes("/")) {
    return NextResponse.json({ error: "invalid_input", message: "Invalid slug" }, { status: 400 });
  }

  try {
    const result = forkSkill(category, slug, newSlug);
    return NextResponse.json({
      sourceSlug: result.sourceSlug,
      newSlug: result.newSlug,
      category: result.category,
      path: result.newPath,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "fork_failed", message: err instanceof Error ? err.message : "Fork failed" },
      { status: 422 }
    );
  }
}
