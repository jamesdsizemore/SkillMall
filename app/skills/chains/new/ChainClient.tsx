"use client";

import dynamic from "next/dynamic";
import type { Skill } from "@/lib/skills";

const ChainCanvas = dynamic(
  () =>
    import("@/components/skill-mall/chains/ChainCanvas").then(
      (m) => m.ChainCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center h-96"
        style={{ background: "#0a0a0a" }}
      >
        <p
          className="text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ LOADING CANVAS... ]
        </p>
      </div>
    ),
  }
);

export function ChainClient({ availableSkills }: { availableSkills: Skill[] }) {
  return (
    <ChainCanvas
      availableSkills={availableSkills}
      onChainReady={(slug) => {
        window.location.href = `/skills/chains/${slug}`;
      }}
    />
  );
}
