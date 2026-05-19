"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";

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

type GraphNodeData = {
  label: string;
  category: string;
  description: string;
  isHub: boolean;
  isOrphan: boolean;
  connectionCount: number;
  clusterId: number | null;
};

function GraphNodeComponent({ data }: { data: GraphNodeData }) {
  const color = CATEGORY_COLORS[data.category] ?? "#6b7280";
  const borderStyle = data.isOrphan
    ? "2px dashed #4b5563"
    : data.isHub
    ? `2px solid ${color}`
    : `1px solid ${color}40`;

  const clusterRing = data.clusterId != null
    ? `0 0 0 3px #f59e0b60, ${data.isHub ? `0 0 12px ${color}40` : "none"}`
    : data.isHub
    ? `0 0 12px ${color}40`
    : "none";

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        title={data.description}   // Native tooltip — no extra dependency
        style={{
          border: borderStyle,
          backgroundColor: data.isHub ? `${color}20` : "#111",
          color: "#e5e7eb",
          padding: "6px 10px",
          borderRadius: 2,
          fontSize: 11,
          fontFamily: "monospace",
          minWidth: 100,
          maxWidth: 160,
          textAlign: "center",
          boxShadow: clusterRing,
          opacity: data.isOrphan ? 0.6 : 1,
          cursor: "pointer",
        }}
      >
        <div style={{ color, fontSize: 9, letterSpacing: 2, marginBottom: 2 }}>
          {data.category.toUpperCase()}
        </div>
        <div style={{ wordBreak: "break-word", lineHeight: 1.3 }}>
          {data.label}
        </div>
        {data.connectionCount > 0 && (
          <div style={{ color: "#6b7280", fontSize: 9, marginTop: 2 }}>
            {data.connectionCount} link{data.connectionCount !== 1 ? "s" : ""}
          </div>
        )}
        {data.clusterId != null && (
          <div style={{ color: "#f59e0b", fontSize: 9, marginTop: 2, letterSpacing: 1 }}>
            CLUSTER {data.clusterId}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

export const GraphNodeRenderer = memo(GraphNodeComponent);
