"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { FrameworkPicker } from "./FrameworkPicker";

// Infer artifact type from the produces filenames for FrameworkPicker defaults
function inferArtifactType(produces: string[]): string | undefined {
  const combined = produces.join(' ').toLowerCase();
  if (combined.includes('matrix')) return 'matrix';
  if (combined.includes('canvas')) return 'canvas';
  if (combined.includes('grid')) return 'grid';
  if (combined.includes('flowchart') || combined.includes('flow')) return 'flowchart';
  if (combined.includes('analysis') || combined.includes('report')) return 'analysis';
  if (combined.includes('list') || combined.includes('profile')) return 'list';
  return undefined;
}

const COMPLEXITY_COLORS: Record<string, string> = {
  quick: "bg-blue-500",
  thorough: "bg-gray-500",
  exhaustive: "bg-red-500",
};

const USE_CASE_LABELS: Record<string, string> = {
  "tool-specific": "Apply a tool",
  "meta": "Explore an angle",
  "category": "Shift the lens",
};

type Props = {
  name: string;
  framework: string;
  originalFramework: string;
  type: string;
  complexity: string;
  whenToUse: string;
  produces: string[];
  category: string;
  slug: string;
  file: string;
  onFrameworkChange: (newFramework: string) => void;
};

export function PromptCard({
  name,
  framework,
  originalFramework,
  type,
  complexity,
  whenToUse,
  produces,
  category,
  slug,
  file,
  onFrameworkChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dotColor = COMPLEXITY_COLORS[complexity] ?? "bg-gray-500";
  const useCase = USE_CASE_LABELS[type] ?? type;

  const handleFrameworkSelect = async (newFramework: string) => {
    if (newFramework === framework) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/regen-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, slug, promptFile: file, framework: newFramework }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Regeneration failed");
      }
      onFrameworkChange(newFramework);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-sm-border bg-sm-surface">
      {/* Card header row */}
      <div className="flex items-center gap-3 p-3">
        {/* Complexity dot */}
        <span
          className={cn("mt-0.5 h-2 w-2 flex-shrink-0 rounded-full", dotColor)}
          title={complexity}
        />

        {/* Use-case label + name — fixed-width so names align */}
        <div className="min-w-0 flex-1">
          <p
            className="text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            {useCase.toUpperCase()}
          </p>
          <p className="truncate text-sm font-medium text-sm-primary">{name}</p>
          {whenToUse && (
            <p className="mt-0.5 text-xs text-sm-secondary">{whenToUse}</p>
          )}
        </div>

        {/* Framework badge */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="border border-sm-border px-2 py-0.5 text-[9px] tracking-widest text-sm-secondary hover:border-sm-display hover:text-sm-display transition-colors"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            title="Change reasoning framework"
          >
            {loading ? "..." : framework.split(",")[0].trim()}
          </button>
          {pickerOpen && (
            <FrameworkPicker
              currentFramework={framework}
              artifactType={inferArtifactType(produces)}
              onSelect={handleFrameworkSelect}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="text-[9px] tracking-widest text-sm-disabled hover:text-sm-secondary transition-colors"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {open ? "▲" : "▼"}
        </button>
      </div>

      {error && (
        <p
          className="px-3 pb-2 text-[9px] tracking-widest text-sm-accent"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {error}
        </p>
      )}

      {/* Expanded details */}
      {open && (
        <div className="border-t border-sm-border px-3 py-2">
          <p
            className="mb-1 text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ FRAMEWORK DETAILS ]
          </p>
          <p className="text-xs text-sm-secondary">
            <span className="text-sm-disabled">Current:</span> {framework}
          </p>
          {originalFramework && originalFramework !== framework && (
            <p className="text-xs text-sm-secondary">
              <span className="text-sm-disabled">Original:</span> {originalFramework}
            </p>
          )}
          {produces.length > 0 && (
            <div className="mt-2">
              <p
                className="mb-1 text-[9px] tracking-widest text-sm-disabled"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ PRODUCES ]
              </p>
              {produces.map(p => (
                <p key={p} className="text-xs text-sm-secondary">
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
