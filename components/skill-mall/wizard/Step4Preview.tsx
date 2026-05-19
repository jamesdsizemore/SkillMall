"use client";

import { useState, useMemo } from "react";

const DESC_MAX = 1024;

function extractDescription(content: string): string {
  const match = content.match(/^description:\s*"?(.*?)"?\s*$/m);
  return match ? match[1].trim() : "";
}

type Props = {
  skillMdPreview: string;
  onNext: () => void;
  onBack: () => void;
};

export function Step4Preview({ skillMdPreview, onNext, onBack }: Props) {
  const [content, setContent] = useState(skillMdPreview);

  const description = useMemo(() => extractDescription(content), [content]);
  const descLen = description.length;
  const overLimit = descLen > DESC_MAX;

  return (
    <div className="space-y-6">
      <p
        className="text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ SKILL.MD PREVIEW — EDITABLE ]
      </p>

      <div className="border border-sm-border bg-sm-surface">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full resize-none bg-transparent p-5 font-mono text-xs leading-relaxed text-sm-secondary outline-none focus:text-sm-primary"
          rows={28}
          spellCheck={false}
        />
      </div>

      {/* Description char counter */}
      <div className="flex items-center gap-3">
        <span
          className="text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ DESCRIPTION ]
        </span>
        <span
          className={`text-[9px] tracking-widest ${overLimit ? "text-sm-accent" : "text-sm-secondary"}`}
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {descLen} / {DESC_MAX} CHARS
          {overLimit && " — EXCEEDS LIMIT"}
        </span>
        <div
          className="h-1 flex-1 bg-sm-border"
          title={`${descLen}/${DESC_MAX}`}
        >
          <div
            className={`h-full transition-all ${overLimit ? "bg-sm-accent" : "bg-sm-blue"}`}
            style={{ width: `${Math.min((descLen / DESC_MAX) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="border border-sm-border px-5 py-2.5 text-[10px] tracking-widest text-sm-secondary hover:border-sm-primary transition-colors"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ← BACK ]
        </button>
        <button
          onClick={onNext}
          className="bg-sm-display px-6 py-2.5 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SELECT PROMPTS → ]
        </button>
      </div>
    </div>
  );
}
