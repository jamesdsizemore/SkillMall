"use client";

import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { useRouter } from "next/navigation";
import type { SkillGraph } from "@/lib/graph";
import { GraphNodeRenderer } from "./GraphNode";

const nodeTypes = { skillNode: GraphNodeRenderer };

const CATEGORY_COLORS: Record<string, string> = {
  development: "#3b82f6",
  design: "#ec4899",
  writing: "#f59e0b",
  research: "#8b5cf6",
  productivity: "#10b981",
  infrastructure: "#06b6d4",
  ai: "#f97316",
  business: "#ef4444",
};

function layoutNodes(nodes: SkillGraph["nodes"]): Node[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  return nodes.map((n, i) => ({
    id: n.id,
    type: "skillNode",
    position: {
      x: (i % cols) * 220 + (Math.random() * 40 - 20),
      y: Math.floor(i / cols) * 140 + (Math.random() * 20 - 10),
    },
    data: {
      label: n.label,
      category: n.category,
      description: n.description,
      isHub: n.isHub,
      isOrphan: n.isOrphan,
      connectionCount: n.connectionCount,
      clusterId: n.clusterId,
    },
  }));
}

function toFlowEdges(edges: SkillGraph["edges"]): Edge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: { stroke: "#374151", strokeWidth: 1 },
    animated: false,
  }));
}

type Props = {
  graph: SkillGraph;
};

export function DependencyGraph({ graph }: Props) {
  const router = useRouter();
  const allCategories = useMemo(
    () => Array.from(new Set(graph.nodes.map(n => n.category))).sort(),
    [graph.nodes]
  );
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const visibleNodeIds = useMemo(
    () => new Set(graph.nodes.filter(n => !hiddenCategories.has(n.category)).map(n => n.id)),
    [graph.nodes, hiddenCategories]
  );

  const initialNodes = useMemo(() => layoutNodes(graph.nodes), [graph.nodes]);
  const initialEdges = useMemo(() => toFlowEdges(graph.edges), [graph.edges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const filteredNodes = useMemo(
    () => nodes.map(n => ({ ...n, hidden: !visibleNodeIds.has(n.id) })),
    [nodes, visibleNodeIds]
  );
  const filteredEdges = useMemo(
    () => edges.map(e => ({ ...e, hidden: !visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target) })),
    [edges, visibleNodeIds]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const found = graph.nodes.find(n => n.id === node.id);
      if (found) router.push(`/skills/${found.category}/${found.id}`);
    },
    [graph.nodes, router]
  );

  return (
    <div>
      {/* Category filter */}
      <div className="mb-3 flex flex-wrap gap-2">
        {allCategories.map(cat => {
          const active = !hiddenCategories.has(cat);
          const color = CATEGORY_COLORS[cat] ?? "#6b7280";
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                borderColor: active ? color : "#374151",
                color: active ? color : "#6b7280",
                backgroundColor: active ? `${color}15` : "transparent",
              }}
              className="border px-2 py-0.5 text-[9px] tracking-widest transition-all"
              title={`${active ? "Hide" : "Show"} ${cat} skills`}
            >
              {cat.toUpperCase()}
            </button>
          );
        })}
        {hiddenCategories.size > 0 && (
          <button
            onClick={() => setHiddenCategories(new Set())}
            className="border border-sm-border px-2 py-0.5 text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors"
          >
            SHOW ALL
          </button>
        )}
      </div>

      <div style={{ width: "100%", height: 600, background: "#0a0a0a", border: "1px solid #1f2937" }}>
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          attributionPosition="bottom-right"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f2937" />
          <Controls style={{ background: "#111", border: "1px solid #1f2937" }} />
          <MiniMap
            style={{ background: "#0a0a0a", border: "1px solid #1f2937" }}
            nodeColor={(n) => {
              if (!visibleNodeIds.has(n.id)) return "#1f2937";
              const found = graph.nodes.find(gn => gn.id === n.id);
              return found ? (CATEGORY_COLORS[found.category] ?? "#6b7280") : "#374151";
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
