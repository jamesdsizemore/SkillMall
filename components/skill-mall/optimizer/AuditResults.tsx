"use client";

import type { PromptAudit } from "@/lib/prompt-optimizer";

type Props = {
  audit: PromptAudit;
  originalPrompt: string;
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {label}
        </span>
        <span
          className="text-[9px] tracking-widest text-sm-display"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {score}/100
        </span>
      </div>
      <div className="h-0.5 w-full bg-sm-border">
        <div
          className="h-full bg-sm-blue transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function AuditResults({ audit, originalPrompt }: Props) {
  return (
    <div className="space-y-8">
      {/* Score summary */}
      <div className="border border-sm-border bg-sm-surface p-6 space-y-4">
        <p
          className="text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ AUDIT RESULTS ]
        </p>
        <ScoreBar score={audit.tokenEfficiencyScore} label="TOKEN EFFICIENCY" />
        <ScoreBar score={audit.intentCompletenessScore} label="INTENT COMPLETENESS" />
        <ScoreBar score={audit.outputClarityScore} label="OUTPUT CLARITY" />
        <ScoreBar score={audit.triggerSharpnessScore} label="TRIGGER SHARPNESS" />

        <div
          className="flex items-center gap-4 pt-2 text-[9px] tracking-widest"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          <span className="text-sm-secondary">
            TOKENS: {audit.tokenCountBefore} → {audit.tokenCountAfter}
          </span>
          {audit.tokenReductionPercent > 0 && (
            <span className="text-sm-blue">[ -{audit.tokenReductionPercent}% ]</span>
          )}
        </div>
      </div>

      {/* Missing intent dimensions */}
      {audit.intentDimensionsMissing.length > 0 && (
        <div className="border border-sm-border p-4 space-y-3">
          <p
            className="text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ MISSING INTENT DIMENSIONS ]
          </p>
          {audit.intentDimensionsMissing.map((dim) => (
            <div key={dim} className="space-y-1">
              <span
                className="text-[10px] tracking-widest text-sm-accent"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                {dim.toUpperCase()}
              </span>
              {audit.intentSuggestions[dim] && (
                <p className="text-xs text-sm-secondary pl-2">
                  {audit.intentSuggestions[dim]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Trigger suggestion */}
      {audit.triggerSuggestion && (
        <div className="border border-sm-border p-4">
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ SUGGESTED OPENING ]
          </p>
          <p className="text-sm text-sm-primary">{audit.triggerSuggestion}</p>
        </div>
      )}

      {/* Word diff */}
      <WordDiff original={originalPrompt} optimized={audit.optimizedPrompt} />
    </div>
  );
}

function WordDiff({ original, optimized }: { original: string; optimized: string }) {
  if (original === optimized) return null;

  return (
    <div className="space-y-3">
      <p
        className="text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ OPTIMIZED PROMPT ]
      </p>
      <div className="border border-sm-border bg-sm-surface p-4">
        <pre className="whitespace-pre-wrap text-sm text-sm-primary leading-relaxed">
          {optimized}
        </pre>
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(optimized)}
        className="text-[9px] tracking-widest text-sm-blue hover:text-sm-display transition-colors"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ COPY OPTIMIZED PROMPT ]
      </button>
    </div>
  );
}
