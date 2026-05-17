"use client";

import { useState } from "react";

type ResearchTool = {
  name: string;
  category: string;
  description: string;
  artifactType: string;
  inputs: string[];
  outputs: string[];
  howUsed: string;
};

type ResearchResult = {
  topic: string;
  tools: ResearchTool[];
  summary: string;
};

type Props = {
  researchResult: ResearchResult;
  selectedToolNames: string[];
  onToggleTool: (name: string) => void;
  onNext: () => void;
  isLoading: boolean;
};

export function Step2Research({
  researchResult,
  selectedToolNames,
  onToggleTool,
  onNext,
  isLoading,
}: Props) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleExpanded = (name: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const visibleTools = showAll ? researchResult.tools : researchResult.tools.slice(0, 5);
  const hiddenCount = researchResult.tools.length - 5;

  // Continue is enabled only when at least one DETAILS has been expanded
  const canContinue = expandedTools.size > 0 && !isLoading;

  // Estimated prompt count
  const categories = new Set(researchResult.tools.map((t) => t.category)).size;
  const promptCount = researchResult.tools.length + categories + 5;

  return (
    <div className="space-y-8">
      {/* Two-column layout: tool count panel (dark) + summary (light) */}
      <div className="grid grid-cols-1 gap-0 border border-sm-border sm:grid-cols-3">
        {/* Left — dark panel with Doto number */}
        <div className="bg-sm-display p-6 dot-grid-texture flex flex-col justify-between">
          <div>
            <p
              className="mb-2 text-[9px] tracking-widest text-sm-bg/60"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ TOOLS FOUND ]
            </p>
            <div
              className="text-7xl font-black leading-none text-sm-bg"
              style={{ fontFamily: '"Doto", monospace' }}
            >
              {researchResult.tools.length.toString().padStart(2, "0")}
            </div>
          </div>
          <p
            className="mt-4 text-[9px] tracking-widest text-sm-bg/60"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            ~{promptCount} PROMPTS WILL BE GENERATED
          </p>
        </div>

        {/* Right — summary */}
        <div className="sm:col-span-2 p-6">
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ RESEARCH SUMMARY ]
          </p>
          <p className="text-sm leading-relaxed text-sm-primary">{researchResult.summary}</p>
        </div>
      </div>

      {/* Instruction */}
      <p
        className="text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ REVIEW EXTRACTED TOOLS — EXPAND DETAILS TO ENABLE CONTINUE ]
      </p>

      {/* Tool cards */}
      <div className="space-y-2">
        {visibleTools.map((tool) => {
          const isExpanded = expandedTools.has(tool.name);
          return (
            <div key={tool.name} className="border border-sm-border bg-sm-surface">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => toggleExpanded(tool.name)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-sm-display">{tool.name}</span>
                  <span
                    className="text-[9px] tracking-widest text-sm-disabled"
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    [ {tool.category.toUpperCase()} ] [ {tool.artifactType.toUpperCase()} ]
                  </span>
                </div>
                <span
                  className="text-[9px] tracking-widest text-sm-secondary"
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                >
                  {isExpanded ? "[ HIDE ]" : "[ DETAILS ]"}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-sm-border px-4 py-4 space-y-3">
                  <p className="text-xs text-sm-secondary">{tool.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p
                        className="mb-1 text-[9px] tracking-widest text-sm-disabled"
                        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                      >
                        [ INPUTS ]
                      </p>
                      <ul className="space-y-0.5 text-sm-secondary">
                        {tool.inputs.map((inp) => <li key={inp}>— {inp}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p
                        className="mb-1 text-[9px] tracking-widest text-sm-disabled"
                        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                      >
                        [ OUTPUTS ]
                      </p>
                      <ul className="space-y-0.5 text-sm-secondary">
                        {tool.outputs.map((out) => <li key={out}>— {out}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Show more */}
        {!showAll && hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-2 text-[9px] tracking-widest text-sm-blue hover:text-sm-display transition-colors"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ + ADD {hiddenCount} MORE TOOLS ]
          </button>
        )}
      </div>

      {/* Continue button — disabled until at least one DETAILS expanded */}
      <div className="flex items-center gap-4">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-sm-display px-6 py-3 text-[10px] tracking-widest text-sm-bg transition-opacity disabled:opacity-30 hover:opacity-80"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {isLoading ? "[ BUILDING... ]" : "[ CONFIRM RESEARCH → ]"}
        </button>
        {!canContinue && (
          <span
            className="text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ EXPAND AT LEAST ONE TOOL TO CONTINUE ]
          </span>
        )}
      </div>
    </div>
  );
}
