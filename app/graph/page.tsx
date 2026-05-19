import { getAllSkills } from "@/lib/skills";
import { computeGraph } from "@/lib/graph";
import { GraphClient } from "./GraphClient";

export const metadata = {
  title: "Skill Dependency Graph — SkillMall",
  description: "Force-directed graph showing skill relationships via linked-skills connections.",
};

export default function GraphPage() {
  const skills = getAllSkills();
  const graph = computeGraph(skills);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <p
          className="mb-1 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SKILL DEPENDENCY GRAPH ]
        </p>
        <h1 className="text-2xl font-black text-sm-display">
          {graph.nodes.length} Skills
        </h1>
        <p className="mt-1 text-sm text-sm-secondary">
          {graph.edges.length} connection{graph.edges.length !== 1 ? "s" : ""} via linked-skills.
          Hub skills (4+ connections) are highlighted. Orphans (0 connections) are dashed.
          {graph.clusterCount > 0 && ` ${graph.clusterCount} cluster${graph.clusterCount !== 1 ? "s" : ""} detected — candidates for Skill Collections.`}
          Hover any node for description. Click to open.
        </p>
      </div>

      <GraphClient graph={graph} />

      <div className="mt-4 flex flex-wrap gap-4 text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
        <span>HUB: solid border + glow (4+ connections)</span>
        <span>ORPHAN: dashed border (0 connections)</span>
        {graph.clusterCount > 0 && <span>CLUSTER: amber ring — Collection candidate</span>}
        <span>Colors: category — use filter buttons to isolate</span>
      </div>
    </div>
  );
}
