"use client";

import type { Edge } from "reactflow";
import { cn } from "@/lib/utils";

type PassesAs = "context_append" | "context_replace" | "named_variable";

interface EdgeConfig {
  passesAs: PassesAs;
  namedVariable?: string;
  instructions?: string;
}

type Props = {
  edge: Edge;
  onUpdate: (config: EdgeConfig) => void;
  onClose: () => void;
};

export function ChainEdgeConfig({ edge, onUpdate, onClose }: Props) {
  const current = (edge.data as EdgeConfig | undefined) ?? { passesAs: "context_append" };

  const handleChange = (field: keyof EdgeConfig, value: string) => {
    onUpdate({ ...current, [field]: value });
  };

  return (
    <div className="absolute right-0 top-0 h-full w-72 border-l border-sm-border bg-sm-surface p-4 flex flex-col gap-4 z-10">
      <div className="flex items-center justify-between">
        <p
          className="text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ EDGE CONFIG ]
        </p>
        <button
          onClick={onClose}
          className="text-[9px] tracking-widest text-sm-disabled hover:text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ CLOSE ]
        </button>
      </div>

      <div>
        <p className="mb-2 text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          PASSES AS
        </p>
        {(["context_append", "context_replace", "named_variable"] as PassesAs[]).map(opt => (
          <button
            key={opt}
            onClick={() => handleChange("passesAs", opt)}
            className={cn(
              "block w-full text-left px-3 py-2 mb-1 text-xs border transition-colors",
              current.passesAs === opt
                ? "border-sm-display text-sm-display"
                : "border-sm-border text-sm-secondary hover:border-sm-primary"
            )}
          >
            {opt}
          </button>
        ))}
      </div>

      {current.passesAs === "named_variable" && (
        <div>
          <p className="mb-1 text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
            VARIABLE NAME
          </p>
          <input
            value={current.namedVariable ?? ""}
            onChange={e => handleChange("namedVariable", e.target.value)}
            placeholder="e.g. analysis_result"
            className="w-full border border-sm-border bg-transparent px-2 py-1 text-sm text-sm-primary outline-none focus:border-sm-display"
          />
        </div>
      )}

      <div>
        <p className="mb-1 text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          INSTRUCTIONS (optional)
        </p>
        <textarea
          value={current.instructions ?? ""}
          onChange={e => handleChange("instructions", e.target.value)}
          placeholder="Additional context for this step..."
          rows={3}
          className="w-full border border-sm-border bg-transparent px-2 py-1 text-sm text-sm-primary outline-none focus:border-sm-display resize-none"
        />
      </div>
    </div>
  );
}
