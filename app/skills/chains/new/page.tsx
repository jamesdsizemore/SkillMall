import { getAllSkills } from "@/lib/skills";
import { ChainClient } from "./ChainClient";

export const metadata = {
  title: "New Skill Chain — SkillMall",
  description: "Compose a multi-skill workflow using the visual chain builder.",
};

export default function NewChainPage() {
  const skills = getAllSkills();

  return (
    <div className="bg-sm-bg min-h-screen">
      <div className="border-b border-sm-border px-6 py-4">
        <p
          className="mb-1 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SKILL CHAIN BUILDER ]
        </p>
        <h1 className="text-xl font-bold text-sm-display">New Chain</h1>
        <p className="text-xs text-sm-secondary mt-1">
          Add skills from the sidebar, connect them with edges, name the chain,
          then click Build Chain.
        </p>
      </div>

      <ChainClient availableSkills={skills} />
    </div>
  );
}
