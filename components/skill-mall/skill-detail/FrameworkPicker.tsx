"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

// All 40+ PE frameworks from spec §2 PE Framework Library
const ALL_FRAMEWORKS = [
  // Reasoning
  "Chain of Thought",
  "Zero-Shot CoT",
  "Tree of Thoughts",
  "Graph of Thoughts",
  "Self-Consistency",
  "Least-to-Most",
  "Step-Back Prompting",
  "Analogical Prompting",
  "Skeleton-of-Thought",
  "Metacognitive Prompting",
  "ReAct",
  "PAL",
  // Context
  "Role / Expert Persona",
  "Few-Shot",
  "Zero-Shot",
  "One-Shot",
  "Many-Shot",
  "Generated Knowledge",
  "Contrastive CoT",
  "Active Prompting",
  // Structure
  "Instruction Engineering",
  "Task Decomposition",
  "Structured Output",
  "Prompt Chaining",
  "Constrained Generation",
  "Negative Prompting",
  "Directional Stimulus",
  "Template / Variable",
  // Output
  "Artifact Production",
  "Maieutic Prompting",
  "Expert Prompting",
  "Emotional Prompting",
  "Batch Prompting",
  "Structured Decomposition",
  // Meta / Optimization
  "Self-Critique",
  "Auto-CoT",
  "Complexity-Based Prompting",
  "Token Efficiency Audit",
  "9-Dimension Intent Extraction",
];

// Artifact-type-appropriate defaults (spec §2.3: "default view shows frameworks appropriate for that artifact type")
const ARTIFACT_DEFAULTS: Record<string, string[]> = {
  matrix:    ["Structured Output", "Artifact Production", "Chain of Thought", "Constrained Generation", "Task Decomposition", "Role / Expert Persona"],
  canvas:    ["Structured Output", "Artifact Production", "Role / Expert Persona", "Few-Shot", "Structured Decomposition", "Chain of Thought"],
  grid:      ["Structured Output", "Constrained Generation", "Batch Prompting", "Chain of Thought", "Artifact Production", "Task Decomposition"],
  analysis:  ["Chain of Thought", "Role / Expert Persona", "Step-Back Prompting", "Self-Critique", "Tree of Thoughts", "9-Dimension Intent Extraction"],
  flowchart: ["Task Decomposition", "Chain of Thought", "Structured Output", "Prompt Chaining", "Least-to-Most", "Directional Stimulus"],
  list:      ["Instruction Engineering", "Constrained Generation", "Structured Output", "Batch Prompting", "Zero-Shot", "Chain of Thought"],
};

const FALLBACK_DEFAULTS = ["Chain of Thought", "Structured Output", "Role / Expert Persona", "Few-Shot", "Artifact Production", "Constrained Generation"];

type Props = {
  currentFramework: string;
  artifactType?: string;
  onSelect: (framework: string) => void;
  onClose: () => void;
};

export function FrameworkPicker({ currentFramework, artifactType, onSelect, onClose }: Props) {
  const [showAll, setShowAll] = useState(false);
  const defaults = artifactType ? (ARTIFACT_DEFAULTS[artifactType] ?? FALLBACK_DEFAULTS) : FALLBACK_DEFAULTS;
  const frameworks = showAll ? ALL_FRAMEWORKS : defaults;

  return (
    <div
      className="absolute z-10 mt-1 w-64 border border-sm-border bg-sm-surface shadow-lg"
      role="listbox"
      aria-label="Select reasoning framework"
    >
      <div className="border-b border-sm-border p-2">
        <p
          className="text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SELECT FRAMEWORK ]
        </p>
        {artifactType && !showAll && (
          <p
            className="mt-0.5 text-[9px] text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            Showing best for: {artifactType}
          </p>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {frameworks.map(fw => (
          <button
            key={fw}
            role="option"
            aria-selected={fw === currentFramework}
            onClick={() => { onSelect(fw); onClose(); }}
            className={cn(
              "w-full px-3 py-2 text-left text-xs transition-colors hover:bg-sm-bg",
              fw === currentFramework ? "text-sm-display" : "text-sm-secondary"
            )}
          >
            {fw === currentFramework ? "▸ " : "  "}{fw}
          </button>
        ))}
      </div>
      <div className="border-t border-sm-border p-2">
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {showAll ? "[ SHOW DEFAULTS ]" : `[ + ${ALL_FRAMEWORKS.length - defaults.length} MORE FRAMEWORKS ]`}
        </button>
      </div>
      <div className="border-t border-sm-border p-2">
        <button
          onClick={onClose}
          className="text-[9px] tracking-widest text-sm-disabled hover:text-sm-secondary transition-colors"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ CANCEL ]
        </button>
      </div>
    </div>
  );
}
