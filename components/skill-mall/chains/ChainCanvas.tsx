"use client";

import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { useState, useCallback } from "react";
import type { Skill } from "@/lib/skills";
import { ChainEdgeConfig } from "./ChainEdgeConfig";
import type { ChainStep } from "@/lib/chains";

interface SkillNodeData {
  skill: Skill;
}

function SkillNode({ data }: { data: SkillNodeData }) {
  return (
    <div className="border border-sm-border bg-sm-surface px-4 py-3 min-w-[200px]">
      <Handle type="target" position={Position.Left} />
      <p
        className="text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ {data.skill.category.toUpperCase()} ]
      </p>
      <p className="text-sm font-semibold text-sm-display">{data.skill.name}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { skillNode: SkillNode };

type Props = {
  availableSkills: Skill[];
  onChainReady: (slug: string, steps: ChainStep[]) => void;
};

export function ChainCanvas({ availableSkills, onChainReady }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<SkillNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [chainName, setChainName] = useState("");
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) => addEdge({ ...c, data: { passesAs: "context_append" } }, eds)),
    [setEdges]
  );

  const addSkill = (skill: Skill) => {
    const id = `skill-${skill.slug}-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "skillNode",
        position: { x: nds.length * 280, y: 100 },
        data: { skill },
      },
    ]);
  };

  const buildChain = async () => {
    if (!chainName.trim() || nodes.length < 2) return;
    const slug = chainName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
    const steps: ChainStep[] = sorted.map((n, i) => ({
      order: i + 1,
      skillSlug: `${n.data.skill.category}/${n.data.skill.slug}`,
      passesAs: "context_append" as const,
    }));

    setStatus("Building chain...");
    try {
      const res = await fetch("/api/create-chain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: { name: chainName, slug, steps },
          metadata: { slug, category: "chains", tags: [], targetAgents: ["claude-code"] },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(`Error: ${(err as { error?: string }).error ?? "Failed"}`);
        return;
      }
      setStatus(`Chain "${chainName}" created!`);
      onChainReady(slug, steps);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] relative">
      {/* Skill sidebar */}
      <div className="w-64 border-r border-sm-border bg-sm-surface overflow-y-auto p-3 shrink-0">
        <p
          className="mb-3 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ADD SKILLS ]
        </p>
        {availableSkills.map((s) => (
          <button
            key={`${s.category}/${s.slug}`}
            onClick={() => addSkill(s)}
            className="w-full text-left border border-sm-border p-2 mb-1 hover:border-sm-display text-sm text-sm-secondary hover:text-sm-primary transition-colors"
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_, e) => setSelectedEdge(e)}
          fitView
          className="bg-sm-bg"
        >
          <Background gap={16} size={1} color="#1f2937" />
          <Controls />
        </ReactFlow>

        {/* Chain name + build button */}
        <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-sm-surface border border-sm-border p-3">
          <input
            value={chainName}
            onChange={(e) => setChainName(e.target.value)}
            placeholder="chain name..."
            className="bg-transparent text-sm text-sm-primary outline-none border-b border-sm-border py-1 min-w-[160px]"
          />
          <button
            onClick={buildChain}
            disabled={!chainName.trim() || nodes.length < 2}
            className="bg-sm-display px-4 py-2 text-[10px] tracking-widest text-sm-bg disabled:opacity-30 transition-opacity"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ BUILD CHAIN ]
          </button>
        </div>

        {status && (
          <div className="absolute bottom-20 left-4 border border-sm-border bg-sm-surface px-3 py-2 text-xs text-sm-secondary">
            {status}
          </div>
        )}
      </div>

      {/* Edge config panel */}
      {selectedEdge && (
        <ChainEdgeConfig
          edge={selectedEdge}
          onUpdate={(cfg) => {
            setEdges((eds) =>
              eds.map((e) =>
                e.id === selectedEdge.id ? { ...e, data: cfg } : e
              )
            );
            setSelectedEdge(null);
          }}
          onClose={() => setSelectedEdge(null)}
        />
      )}
    </div>
  );
}
