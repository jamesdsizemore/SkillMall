import { cn } from "@/lib/utils";

type Tier = "free" | "sponsored" | "premium";

const TIER_STYLES: Record<Tier, string> = {
  free: "border-sm-border text-sm-disabled",
  sponsored: "border-blue-500/40 text-blue-400",
  premium: "border-sm-display text-sm-display",
};

type Props = {
  tier: Tier;
  priceCents?: number;
};

export function TierBadge({ tier, priceCents = 0 }: Props) {
  if (tier === "free") return null;

  const priceDisplay =
    tier === "premium" && priceCents > 0
      ? ` · $${(priceCents / 100).toFixed(2)}`
      : "";

  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 text-[8px] tracking-widest",
        TIER_STYLES[tier]
      )}
      style={{ fontFamily: "var(--font-space-mono, monospace)" }}
    >
      {tier.toUpperCase()}{priceDisplay}
    </span>
  );
}
