import { NextRequest, NextResponse } from "next/server";
import { getReviews, getEffectivenessScore, getReviewCount } from "@/lib/reviews";
import { getInstallCount } from "@/lib/analytics";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ skillSlug: string }>;
};

export async function GET(_req: NextRequest, { params }: Props) {
  const { skillSlug } = await params;

  const reviews = getReviews(skillSlug);
  const effectivenessScore = getEffectivenessScore(skillSlug);
  const reviewCount = getReviewCount(skillSlug);
  const installCount = getInstallCount(skillSlug);

  return NextResponse.json({
    reviews,
    effectivenessScore,
    reviewCount,
    installCount,
  });
}
