import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/github";
import { createReview, hasInstallSignal } from "@/lib/reviews";
import { logInstallEvent } from "@/lib/analytics";

export const runtime = "nodejs";

const ReviewBodySchema = z.object({
  skillSlug: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1).max(150),
});

export async function POST(req: NextRequest) {
  // Auth required
  const token = req.cookies.get("sm_session")?.value;
  const session = token ? getSession(token) : null;

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ReviewBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { skillSlug, rating, body: reviewBody } = parsed.data;

  // Check install signal (catalog-level, not per-user in Phase 2)
  const signal = hasInstallSignal(skillSlug);

  try {
    const review = createReview({
      skillSlug,
      reviewerGithubId: session.github_id,
      reviewerLogin: session.github_login,
      rating,
      body: reviewBody,
      hasInstallSignal: signal,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create review";

    if (message.includes("already reviewed")) {
      return NextResponse.json({ error: "conflict", message }, { status: 409 });
    }

    return NextResponse.json({ error: "internal_error", message }, { status: 500 });
  }
}
