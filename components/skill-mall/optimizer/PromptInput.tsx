"use client";

import { useState } from "react";

type Props = {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
};

export function PromptInput({ onSubmit, isLoading }: Props) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-4">
      <label
        className="block text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ PROMPT TEXT ]
      </label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste your prompt here..."
        rows={8}
        className="w-full border border-sm-border bg-sm-surface p-4 text-sm text-sm-primary outline-none placeholder:text-sm-disabled focus:border-sm-display transition-colors resize-none"
      />
      <div className="flex items-center gap-4">
        <button
          onClick={() => value.trim() && onSubmit(value.trim())}
          disabled={!value.trim() || isLoading}
          className="bg-sm-display px-6 py-2.5 text-[10px] tracking-widest text-sm-bg transition-opacity disabled:opacity-30 hover:opacity-80"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {isLoading ? "[ OPTIMIZING... ]" : "[ OPTIMIZE → ]"}
        </button>
        {value.trim() && (
          <span
            className="text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            {value.trim().split(/\s+/).length} WORDS
          </span>
        )}
      </div>
    </div>
  );
}
