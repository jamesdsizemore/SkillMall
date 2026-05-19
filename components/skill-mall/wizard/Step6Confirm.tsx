"use client";

import { useState } from "react";

type FileEntry = { path: string; content: string };

type Props = {
  files: FileEntry[];
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
};

export function Step6Confirm({ files, isLoading, error, onConfirm, onBack }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <p
        className="text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ DIRECTORY PREVIEW — {files.length} FILES ]
      </p>

      <div className="border border-sm-border bg-sm-surface">
        {files.map((file) => {
          const isExpanded = expanded.has(file.path);
          return (
            <div key={file.path} className="border-b border-sm-border last:border-b-0">
              <button
                className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-sm-bg transition-colors"
                onClick={() => toggleExpanded(file.path)}
              >
                <span
                  className="text-[10px] tracking-wide text-sm-secondary"
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                >
                  {file.path}
                </span>
                <span
                  className="ml-4 shrink-0 text-[9px] tracking-widest text-sm-disabled hover:text-sm-secondary transition-colors"
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                >
                  {isExpanded ? "[ HIDE ]" : "[ PREVIEW ]"}
                </span>
              </button>
              {isExpanded && (
                <div className="border-t border-sm-border bg-sm-bg">
                  <pre className="max-h-64 overflow-y-auto p-4 text-xs leading-relaxed text-sm-secondary whitespace-pre-wrap">
                    {file.content || "(empty file)"}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p
          className="text-[10px] tracking-widest text-sm-accent"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ERROR: {error.toUpperCase()} ]
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="border border-sm-border px-5 py-2.5 text-[10px] tracking-widest text-sm-secondary hover:border-sm-primary transition-colors disabled:opacity-30"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ← BACK ]
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-sm-display px-6 py-2.5 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity disabled:opacity-30"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {isLoading ? "[ CREATING SKILL... ]" : "[ CREATE SKILL ]"}
        </button>
      </div>
    </div>
  );
}
