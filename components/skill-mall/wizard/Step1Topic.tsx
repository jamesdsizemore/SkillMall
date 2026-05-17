"use client";

import { useState } from "react";

type Props = {
  topic: string;
  sourceUrls: string[];
  onTopicChange: (v: string) => void;
  onUrlAdd: (url: string) => void;
  onUrlRemove: (index: number) => void;
  onNext: () => void;
  isLoading: boolean;
  error: string | null;
};

export function Step1Topic({
  topic,
  sourceUrls,
  onTopicChange,
  onUrlAdd,
  onUrlRemove,
  onNext,
  isLoading,
  error,
}: Props) {
  const [newUrl, setNewUrl] = useState("");

  const handleAddUrl = () => {
    if (newUrl.trim()) {
      onUrlAdd(newUrl.trim());
      setNewUrl("");
    }
  };

  return (
    <div className="space-y-10">
      {/* Topic field — primary, 22px */}
      <div>
        <label
          className="mb-2 block text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SKILL TOPIC ]
        </label>
        <div className="border-b border-sm-border focus-within:border-sm-display transition-colors">
          <input
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            placeholder="e.g. Blue Ocean Strategy"
            className="w-full bg-transparent py-3 text-[22px] font-semibold text-sm-display outline-none placeholder:text-sm-border"
            autoFocus
          />
        </div>
        <p className="mt-2 text-xs text-sm-disabled">
          The domain, methodology, or workflow you want to build a skill for.
        </p>
      </div>

      {/* Source URLs */}
      <div>
        <label
          className="mb-2 block text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SOURCE URLS — OPTIONAL ]
        </label>

        {/* Existing URLs */}
        {sourceUrls.map((url, i) => (
          <div key={i} className="mb-2 flex items-center gap-3 border-b border-sm-border py-2">
            <span className="flex-1 text-sm text-sm-primary">{url}</span>
            <button
              onClick={() => onUrlRemove(i)}
              className="text-[9px] tracking-widest text-sm-disabled hover:text-sm-accent transition-colors"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ REMOVE ]
            </button>
          </div>
        ))}

        {/* Add new URL */}
        <div className="flex items-center gap-3 border-b border-sm-border focus-within:border-sm-display transition-colors py-2">
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            placeholder="https://..."
            className="flex-1 bg-transparent text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
          />
        </div>

        <button
          onClick={handleAddUrl}
          className="mt-3 text-[9px] tracking-widest text-sm-blue hover:text-sm-display transition-colors"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ + ADD SOURCE URL ]
        </button>

        <p className="mt-2 text-xs text-sm-disabled">
          Providing authoritative URLs produces more accurate results. Without URLs the research uses training knowledge only.
        </p>
      </div>

      {error && (
        <p
          className="text-[10px] tracking-widest text-sm-accent"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ERROR: {error.toUpperCase()} ]
        </p>
      )}

      {/* CTA */}
      <div>
        <button
          onClick={onNext}
          disabled={!topic.trim() || isLoading}
          className="bg-sm-display px-6 py-3 text-[10px] tracking-widest text-sm-bg transition-opacity disabled:opacity-30 hover:opacity-80"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {isLoading ? "[ RESEARCHING... ]" : "[ RESEARCH TOPIC →  ]"}
        </button>
      </div>
    </div>
  );
}
