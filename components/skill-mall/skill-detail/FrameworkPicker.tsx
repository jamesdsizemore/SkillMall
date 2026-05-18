"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_FRAMEWORKS = [
  "Chain of Thought",
  "Tree of Thoughts",
  "First Principles",
  "Socratic Method",
  "Six Thinking Hats",
  "SCAMPER",
];

const ALL_FRAMEWORKS = [
  ...DEFAULT_FRAMEWORKS,
  "Devil's Advocate",
  "Red Team / Blue Team",
  "SWOT Analysis",
  "Root Cause Analysis",
  "Five Whys",
  "Eisenhower Matrix",
  "MoSCoW Prioritization",
  "RICE Scoring",
  "Jobs to Be Done",
  "Design Thinking",
  "Lean Startup",
  "Blue Ocean Strategy",
  "Porter's Five Forces",
  "PEST Analysis",
  "Ansoff Matrix",
  "BCG Matrix",
  "OKR Framework",
  "Agile / Scrum",
  "Kanban",
  "Cynefin Framework",
  "Wardley Mapping",
  "Systems Thinking",
  "Structured Analytic Techniques",
  "Lateral Thinking",
  "Reverse Brainstorming",
  "Mind Mapping",
  "Affinity Diagramming",
  "Nominal Group Technique",
  "Delphi Method",
  "Scenario Planning",
  "Futures Wheel",
  "Impact / Effort Matrix",
  "Value Stream Mapping",
  "Structured Output",
  "Artifact Production",
  "PMI (Plus Minus Interesting)",
  "STAR Method",
  "PREP Method",
  "Pyramid Principle",
];

type Props = {
  currentFramework: string;
  onSelect: (framework: string) => void;
  onClose: () => void;
};

export function FrameworkPicker({ currentFramework, onSelect, onClose }: Props) {
  const [showAll, setShowAll] = useState(false);
  const frameworks = showAll ? ALL_FRAMEWORKS : DEFAULT_FRAMEWORKS;

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
              fw === currentFramework
                ? "text-sm-display"
                : "text-sm-secondary"
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
          {showAll ? "[ SHOW FEWER ]" : `[ + ${ALL_FRAMEWORKS.length - DEFAULT_FRAMEWORKS.length} MORE ]`}
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
