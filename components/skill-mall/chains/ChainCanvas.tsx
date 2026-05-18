"use client";

import React from "react";
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

interface EdgeConfig {
  passesAs: "context_append" | "context_replace" | "named_variable";
  namedVariable?: string;
  instructions?: string;
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

  const nodeCounter = React.useRef(0);

  const addSkill = (skill: Skill) => {
    const id = `skill-${skill.slug}-${++nodeCounter.current}`;
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

    // Build incoming edge map: targetNodeId → { sourceNodeId, edgeData }
    const inEdgeMap = new Map<string, { sourceId: string; data: EdgeConfig }>();
    for (const e of edges) {
      if (e.source && e.target) {
        inEdgeMap.set(e.target, {
          sourceId: e.source,
          data: (e.data as EdgeConfig | undefined) ?? { passesAs: "context_append" },
        });
      }
    }

    // Build outgoing edge map: sourceNodeId → targetNodeId
    const outEdgeMap = new Map<string, string>();
    for (const e of edges) {
      if (e.source && e.target) outEdgeMap.set(e.source, e.target);
    }

    // Find start: no incoming edge
    const startNode = nodes.find((n) => !inEdgeMap.has(n.id));
    if (!startNode) {
      setStatus("Error: cycle detected — chain must have a clear starting node");
      return;
    }

    // Walk chain in edge-connection order
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const ordered: Node<SkillNodeData>[] = [];
    const visited = new Set<string>();
    let current: Node<SkillNodeData> | undefined = startNode;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      ordered.push(current);
      const nextId = outEdgeMap.get(current.id);
      current = nextId ? nodeMap.get(nextId) : undefined;
    }

    if (ordered.length !== nodes.length) {
      setStatus("Error: not all skills are connected — check for disconnected nodes");
      return;
    }

    const steps: ChainStep[] = ordered.map((n, i) => {
      const inEdge = inEdgeMap.get(n.id);
      const cfg: EdgeConfig = inEdge?.data ?? { passesAs: "context_append" };
      const sourceNode = inEdge ? nodeMap.get(inEdge.sourceId) : undefined;
      return {
        order: i + 1,
        skillSlug: `${n.data.skill.category}/${n.data.skill.slug}`,
        passesAs: cfg.passesAs,
        ...(sourceNode ? { usesOutput: sourceNode.data.skill.slug } : {}),
        ...(cfg.namedVariable ? { namedVariable: cfg.namedVariable } : {}),
        ...(cfg.instructions ? { instructions: cfg.instructions } : {}),
      };
    });

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
