"use client";

import dynamic from "next/dynamic";
import type { SkillGraph } from "@/lib/graph";

const DependencyGraph = dynamic(
  () => import("@/components/skill-mall/graph/DependencyGraph").then(m => m.DependencyGraph),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center"
        style={{ height: 600, background: "#0a0a0a", border: "1px solid #1f2937" }}
      >
        <p
          className="text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ LOADING GRAPH... ]
        </p>
      </div>
    ),
  }
);

export function GraphClient({ graph }: { graph: SkillGraph }) {
  return <DependencyGraph graph={graph} />;
}
