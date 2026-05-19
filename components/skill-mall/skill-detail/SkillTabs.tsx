"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/skills";
import { PromptCard } from "./PromptCard";

const TABS = ["OVERVIEW", "SKILL.MD", "PROMPTS", "HISTORY", "TRIGGER ANALYSIS", "BUDGET ANALYSIS"] as const;
type Tab = typeof TABS[number];

type Props = {
  skill: Skill;
  readme: string | null;
  availableLocales?: string[];
  testCount?: number;
};

export function SkillTabs({ skill, readme, availableLocales = [], testCount = 0 }: Props) {
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

        {active === "PROMPTS" && (
          <PromptsPanel category={skill.category} slug={skill.slug} />
        )}

        {active === "TRIGGER ANALYSIS" && (
          <TriggerPanel category={skill.category} slug={skill.slug} />
        )}

        {active === "BUDGET ANALYSIS" && (
          <BudgetPanel category={skill.category} slug={skill.slug} />
        )}
      </div>

      {availableLocales.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className="text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ TRANSLATIONS ]
          </span>
          {availableLocales.map(locale => (
            <span
              key={locale}
              className="border border-sm-border px-2 py-0.5 text-[9px] tracking-widest text-sm-secondary"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              title={`npx skill-mall deploy ${skill.category}/${skill.slug} --lang ${locale}`}
            >
              {locale}
            </span>
          ))}
        </div>
      )}

      {testCount > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <span
            className="border border-sm-border px-2 py-0.5 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ {testCount} TEST {testCount === 1 ? "CASE" : "CASES"} ]
          </span>
          <span
            className="text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            npx skill-mall test {skill.category}/{skill.slug}
          </span>
        </div>
      )}
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

function PromptsPanel({ category, slug }: { category: string; slug: string }) {
  const [prompts, setPrompts] = React.useState<Array<{
    file: string; name: string; framework: string; originalFramework: string;
    type: string; complexity: string; whenToUse: string; produces: string[];
  }> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/regen-prompt?category=${encodeURIComponent(category)}&slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => setPrompts(d.prompts ?? []))
      .catch(() => setPrompts([]))
      .finally(() => setLoading(false));
  }, [category, slug]);

  if (loading) {
    return (
      <p className="text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
        [ LOADING... ]
      </p>
    );
  }

  if (!prompts || prompts.length === 0) {
    return (
      <p className="text-sm text-sm-secondary">No prompt files found for this skill.</p>
    );
  }

  // Plain-English labels for prompt type groupings (T263: must not show raw type keys)
  const USE_CASE_LABELS: Record<string, string> = {
    "tool-specific": "Apply a tool",
    "meta": "Explore an angle",
    "category": "Shift the lens",
    "other": "Other prompts",
  };

  // Group by use-case type
  const groups: Record<string, typeof prompts> = {};
  for (const p of prompts) {
    const key = p.type ?? 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-sm-secondary">
        Click a framework badge to regenerate the prompt with a different reasoning approach.
        Original framework is always preserved.
      </p>
      {Object.entries(groups).map(([type, typePrompts]) => (
        <div key={type}>
          <p
            className="mb-3 text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ {(USE_CASE_LABELS[type] ?? type).toUpperCase()} ]
          </p>
          <div className="space-y-2">
            {typePrompts.map(p => (
              <PromptCard
                key={p.file}
                {...p}
                category={category}
                slug={slug}
                onFrameworkChange={(newFw) => {
                  setPrompts(prev => prev?.map(pp =>
                    pp.file === p.file ? { ...pp, framework: newFw } : pp
                  ) ?? null);
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const AGENT_OPTIONS = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor',      label: 'Cursor' },
  { value: 'gemini-cli',  label: 'Gemini CLI' },
  { value: 'copilot',     label: 'GitHub Copilot' },
  { value: 'codex',       label: 'Codex' },
  { value: 'other',       label: 'Other / Unknown' },
];

function BudgetPanel({ category, slug }: { category: string; slug: string }) {
  const [agent, setAgent] = React.useState('claude-code');
  const [result, setResult] = React.useState<import('@/lib/budget-analyzer').AgentBudgetAnalysis | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchAnalysis = React.useCallback(async (selectedAgent: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/budget-check?category=${encodeURIComponent(category)}&slug=${encodeURIComponent(slug)}&agent=${encodeURIComponent(selectedAgent)}`
      );
      if (res.ok) setResult(await res.json() as import('@/lib/budget-analyzer').AgentBudgetAnalysis);
    } finally {
      setLoading(false);
    }
  }, [category, slug]);

  React.useEffect(() => { fetchAnalysis('claude-code'); }, [fetchAnalysis]);

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setAgent(v);
    fetchAnalysis(v);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-sm-secondary">
        Simulate how much of this skill&apos;s description each agent sees as more skills are installed alongside it.
      </p>

      {/* Agent selector */}
      <div className="space-y-2">
        <label
          className="block text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ TARGET AGENT ]
        </label>
        <select
          value={agent}
          onChange={handleAgentChange}
          className="w-full border border-sm-border bg-sm-surface px-3 py-2 text-sm text-sm-primary outline-none focus:border-sm-display transition-colors"
        >
          {AGENT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
          [ ANALYZING... ]
        </p>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* Description length stat */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
              [ DESC LENGTH ]
            </span>
            <span className="text-xl font-black text-sm-display" style={{ fontFamily: '"Doto", monospace' }}>
              {result.descriptionLength}
            </span>
            {result.triggerPhrase && (
              <>
                <span className="text-[9px] tracking-widest text-sm-disabled" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
                  [ TRIGGER ]
                </span>
                <span className="text-xs text-sm-secondary">&ldquo;{result.triggerPhrase}&rdquo;</span>
              </>
            )}
          </div>

          {/* 4-level table */}
          <div className="border border-sm-border">
            <div className="grid grid-cols-4 border-b border-sm-border bg-sm-bg px-4 py-2 text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
              <span>INSTALLED</span>
              <span>CHARS</span>
              <span>VISIBLE</span>
              <span>TRIGGER</span>
            </div>
            {result.levels.map(level => (
              <div key={level.installedCount}
                className="grid grid-cols-4 border-b border-sm-border px-4 py-2.5 last:border-b-0">
                <span className="text-sm font-black text-sm-display" style={{ fontFamily: '"Doto", monospace' }}>
                  {level.installedCount}
                </span>
                <span className="text-xs text-sm-secondary">{level.charsAvailable}</span>
                <span className={`text-[10px] tracking-widest ${level.visible ? 'text-sm-blue' : 'text-sm-accent'}`}
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
                  {level.visible ? '[ FULL ]' : '[ TRUNCATED ]'}
                </span>
                <span className={`text-[10px] tracking-widest ${level.triggerPreserved ? 'text-sm-blue' : 'text-sm-accent'}`}
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
                  {level.triggerPreserved ? '[ OK ]' : '[ LOST ]'}
                </span>
              </div>
            ))}
          </div>

          {/* Worst-case visible text */}
          {result.levels[result.levels.length - 1] && (
            <div className="border border-sm-border">
              <div className="border-b border-sm-border px-4 py-2 text-[9px] tracking-widest text-sm-secondary"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
                [ AT 50 INSTALLED SKILLS ]
              </div>
              <pre className="p-4 text-xs leading-relaxed text-sm-primary whitespace-pre-wrap">
                {result.levels[result.levels.length - 1].visibleText}
              </pre>
              {result.levels[result.levels.length - 1].truncatedText && (
                <pre className="border-t border-sm-accent px-4 py-2 text-xs leading-relaxed text-sm-secondary opacity-50 whitespace-pre-wrap">
                  {result.levels[result.levels.length - 1].truncatedText}
                </pre>
              )}
            </div>
          )}

          {result.rewriteSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] tracking-widest text-sm-secondary" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
                [ SUGGESTIONS ]
              </p>
              {result.rewriteSuggestions.map((s, i) => (
                <div key={i} className="border border-sm-border p-3 text-sm text-sm-secondary">{s}</div>
              ))}
            </div>
          )}

          {result.rewriteSuggestions.length === 0 && (
            <p className="text-[9px] tracking-widest text-sm-blue" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
              [ PASSES ALL LOAD LEVELS — NO REWRITE NEEDED ]
            </p>
          )}
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
