"use client";

import React, { useEffect, useState } from "react";
import type { StarterInfo } from "@/app/api/starters/route";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="text-[9px] tracking-widest text-sm-secondary hover:text-sm-display transition-colors"
      style={{ fontFamily: "var(--font-space-mono, monospace)" }}
    >
      {copied ? "[ COPIED ]" : "[ COPY ]"}
    </button>
  );
}

function TemplateCard({ starter }: { starter: StarterInfo }) {
  const [expanded, setExpanded] = useState(false);
  const cmd = `npx skill-mall new --from-template ${starter.slug} my-${starter.slug}`;

  return (
    <div className="border border-sm-border bg-sm-surface">
      <button
        className="w-full p-4 text-left hover:bg-sm-bg transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm-display text-sm">{starter.domain}</p>
            {starter.description && (
              <p className="mt-0.5 text-xs text-sm-secondary line-clamp-2">{starter.description}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className="border border-sm-border px-2 py-0.5 text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              {starter.category.toUpperCase()}
            </span>
            {starter.fillInCount > 0 && (
              <span
                className="text-[9px] tracking-widest text-sm-disabled"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                {starter.fillInCount} FILL-INS
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-sm-border p-4">
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ USE THIS TEMPLATE ]
          </p>
          <div className="flex items-center justify-between gap-3 border border-sm-border bg-sm-bg px-3 py-2">
            <code className="text-xs text-sm-primary break-all">{cmd}</code>
            <CopyButton text={cmd} />
          </div>
          {starter.targetAgents.length > 0 && (
            <p
              className="mt-2 text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              WORKS WITH: {starter.targetAgents.join(" · ").toUpperCase()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function TemplateBrowser() {
  const [starters, setStarters] = useState<StarterInfo[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/starters")
      .then((r) => r.json())
      .then((d) => setStarters(d.starters ?? []))
      .catch(() => setStarters([]));
  }, []);

  const filtered = starters?.filter(
    (s) =>
      !query ||
      s.domain.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
  );

  if (!starters) {
    return (
      <p
        className="text-[9px] tracking-widest text-sm-disabled"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ LOADING... ]
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter templates..."
          className="w-full border-b border-sm-border bg-transparent py-2 text-sm text-sm-primary outline-none placeholder:text-sm-disabled focus:border-sm-display transition-colors"
        />
      </div>

      {filtered?.length === 0 ? (
        <p className="text-sm text-sm-secondary">No templates match.</p>
      ) : (
        <div className="space-y-2">
          {filtered?.map((s) => (
            <TemplateCard key={s.slug} starter={s} />
          ))}
        </div>
      )}
    </div>
  );
}
