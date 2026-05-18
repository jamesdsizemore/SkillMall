type Props = {
  skillName: string;
  priceCents: number;
  marketplaceReady: boolean;
};

export function PremiumTeaser({ skillName, priceCents, marketplaceReady }: Props) {
  if (!marketplaceReady) {
    return (
      <div className="border border-sm-border p-6 text-center">
        <p
          className="text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ PREMIUM SKILL — MARKETPLACE COMING SOON ]
        </p>
        <p className="mt-2 text-sm text-sm-secondary">
          {skillName} is a premium skill. The marketplace is not yet available.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-sm-display p-6 text-center">
      <p
        className="text-[9px] tracking-widest text-sm-display mb-2"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ PREMIUM SKILL ]
      </p>
      <p className="mb-4 text-sm text-sm-secondary">
        {skillName} requires a one-time purchase to deploy.
      </p>
      <div
        className="text-3xl font-black text-sm-display mb-4"
        style={{ fontFamily: '"Doto", monospace' }}
      >
        ${(priceCents / 100).toFixed(2)}
      </div>
      <a
        href="/api/marketplace/checkout"
        className="inline-block bg-sm-display px-8 py-3 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ PURCHASE ]
      </a>
    </div>
  );
}
