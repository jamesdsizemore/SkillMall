"use client";

import React, { useCallback, useMemo } from "react";
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
      isHub: n.isHub,
      isOrphan: n.isOrphan,
      connectionCount: n.connectionCount,
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
  const initialNodes = useMemo(() => layoutNodes(graph.nodes), [graph.nodes]);
  const initialEdges = useMemo(() => toFlowEdges(graph.edges), [graph.edges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // slug format is "category/skill-name" — need to find the category
      // Node id is the slug; we navigate to /skills/[category]/[slug]
      const found = graph.nodes.find(n => n.id === node.id);
      if (found) {
        router.push(`/skills/${found.category}/${found.id}`);
      }
    },
    [graph.nodes, router]
  );

  return (
    <div style={{ width: "100%", height: 600, background: "#0a0a0a", border: "1px solid #1f2937" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
            const found = graph.nodes.find(gn => gn.id === n.id);
            if (!found) return "#374151";
            const colors: Record<string, string> = {
              development: "#3b82f6", design: "#ec4899", writing: "#f59e0b",
              research: "#8b5cf6", productivity: "#10b981", infrastructure: "#06b6d4",
              ai: "#f97316", business: "#ef4444",
            };
            return colors[found.category] ?? "#6b7280";
          }}
        />
      </ReactFlow>
    </div>
  );
}
