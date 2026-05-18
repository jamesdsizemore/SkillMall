"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/skills";

const TABS = ["OVERVIEW", "SKILL.MD", "HISTORY"] as const;
type Tab = typeof TABS[number];

type Props = {
  skill: Skill;
  readme: string | null;
};

export function SkillTabs({ skill, readme }: Props) {
  const [active, setActive] = useState<Tab>("OVERVIEW");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-sm-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "px-4 py-2.5 text-[10px] tracking-widest transition-colors border-b-2 -mb-px",
              active === tab
                ? "border-sm-display text-sm-display"
                : "border-transparent text-sm-secondary hover:text-sm-primary"
            )}
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ {tab} ]
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-6">
        {active === "OVERVIEW" && (
          <div className="space-y-6">
            {readme ? (
              <div>
                <p
                  className="mb-3 text-[9px] tracking-widest text-sm-disabled"
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                >
                  [ README ]
                </p>
                <div className="border border-sm-border bg-sm-surface p-5">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-sm-secondary">
                    {readme}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm text-sm-disabled">{skill.description}</p>
            )}
          </div>
        )}

        {active === "SKILL.MD" && (
          <div className="border border-sm-border bg-sm-surface">
            <div
              className="flex items-center justify-between border-b border-sm-border px-4 py-2"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              <span className="text-[9px] tracking-widest text-sm-secondary">[ SKILL.MD ]</span>
              <span className="text-[9px] text-sm-disabled">{skill.path}</span>
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-sm-secondary">
              {skill.content}
            </pre>
          </div>
        )}

        {active === "HISTORY" && (
          <HistoryPanel skillPath={skill.path} />
        )}
      </div>
    </div>
  );
}

function HistoryPanel({ skillPath }: { skillPath: string }) {
  const [entries, setEntries] = React.useState<import("@/lib/version-history").VersionEntry[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/version-history?path=${encodeURIComponent(skillPath)}`)
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [skillPath]);

  if (loading) {
    return (
      <p className="text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
        [ LOADING... ]
      </p>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="text-sm text-sm-secondary">No version history found for this skill.</p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div key={entry.hash} className="border border-sm-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-widest text-sm-secondary" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
              [ {entry.hash} ] {entry.date}
            </span>
            <span className="text-[9px] text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
              {entry.author}
            </span>
          </div>
          <p className="text-sm text-sm-primary mb-1">{entry.message}</p>
          <p className="text-[9px] text-sm-secondary" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
            {entry.semanticDiff}
          </p>
        </div>
      ))}
    </div>
  );
}
