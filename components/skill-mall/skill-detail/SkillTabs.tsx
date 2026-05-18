"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/skills";

const TABS = ["OVERVIEW", "SKILL.MD", "HISTORY", "TRIGGER ANALYSIS"] as const;
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

        {active === "TRIGGER ANALYSIS" && (
          <TriggerPanel category={skill.category} slug={skill.slug} />
        )}
      </div>
    </div>
  );
}

function TriggerPanel({ category, slug }: { category: string; slug: string }) {
  const [result, setResult] = React.useState<import('@/lib/trigger-evaluator').TriggerEvalResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/eval-triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, slug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Evaluation failed');
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-sm-secondary">
          Evaluate how reliably this skill&apos;s description triggers agents. Generates 10 positive + 10 negative test queries.
        </p>
        <button
          onClick={run}
          className="bg-sm-display px-5 py-2.5 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity"
          style={{ fontFamily: 'var(--font-space-mono, monospace)' }}
        >
          [ RUN TRIGGER ANALYSIS ]
        </button>
        {error && <p className="text-[9px] tracking-widest text-sm-accent" style={{ fontFamily: 'var(--font-space-mono, monospace)' }}>{error}</p>}
      </div>
    );
  }

  if (loading) {
    return <p className="text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: 'var(--font-space-mono, monospace)' }}>[ ANALYZING... ]</p>;
  }

  if (!result) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['TRUE POSITIVE', result.truePositiveRate + '%'],
          ['FALSE POSITIVE', result.falsePositiveRate + '%'],
          ['OVERALL ACCURACY', result.overallAccuracy + '%'],
          ['FAILING QUERIES', String(result.failingQueries.length)],
        ].map(([label, value]) => (
          <div key={label} className="border border-sm-border p-3">
            <p className="text-[9px] tracking-widest text-sm-disabled mb-1" style={{ fontFamily: 'var(--font-space-mono, monospace)' }}>{label}</p>
            <p className="text-2xl font-black text-sm-display" style={{ fontFamily: '"Doto", monospace' }}>{value}</p>
          </div>
        ))}
      </div>
      {result.failingQueries.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] tracking-widest text-sm-secondary" style={{ fontFamily: 'var(--font-space-mono, monospace)' }}>[ FAILING QUERIES ]</p>
          {result.failingQueries.map((q, i) => (
            <div key={i} className="border border-sm-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] tracking-widest text-sm-accent" style={{ fontFamily: 'var(--font-space-mono, monospace)' }}>[ {q.type === 'fn' ? 'FALSE NEGATIVE' : 'FALSE POSITIVE'} ]</span>
              </div>
              <p className="text-sm text-sm-primary mb-1">{q.query}</p>
              <p className="text-xs text-sm-secondary">{q.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ skillPath }: { skillPath: string }) {
  const [entries, setEntries] = React.useState<import("@/lib/version-history").VersionEntry[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
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
