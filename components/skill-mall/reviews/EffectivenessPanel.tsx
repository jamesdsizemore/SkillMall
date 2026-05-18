"use client";

type Props = {
  effectivenessScore: number | null;
  installCount: number;
  reviewCount: number;
};

export function EffectivenessPanel({
  effectivenessScore,
  installCount,
  reviewCount,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Effectiveness score — separate from install count */}
      <div className="border border-sm-border p-3">
        <p
          className="mb-1 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ EFFECTIVENESS ]
        </p>
        <p
          className="text-3xl font-black text-sm-display leading-none"
          style={{ fontFamily: '"Doto", monospace' }}
        >
          {effectivenessScore !== null ? effectivenessScore.toFixed(1) : "--"}
        </p>
        <p
          className="mt-1 text-[9px] text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {reviewCount} review{reviewCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Install count — separate from effectiveness */}
      <div className="border border-sm-border p-3">
        <p
          className="mb-1 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ INSTALLS ]
        </p>
        <p
          className="text-3xl font-black text-sm-display leading-none"
          style={{ fontFamily: '"Doto", monospace' }}
        >
          {installCount}
        </p>
        <p
          className="mt-1 text-[9px] text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          all time
        </p>
      </div>
    </div>
  );
}
