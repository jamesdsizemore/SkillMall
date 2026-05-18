"use client";

import { useState } from "react";
import { PromptInput } from "@/components/skill-mall/optimizer/PromptInput";
import { AuditResults } from "@/components/skill-mall/optimizer/AuditResults";
import type { PromptAudit } from "@/lib/prompt-optimizer";

export default function OptimizePage() {
  const [audit, setAudit] = useState<PromptAudit | null>(null);
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setOriginalPrompt(prompt);

    try {
      const res = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Optimization failed (${res.status})`);
      }

      const result: PromptAudit = await res.json();
      setAudit(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p
          className="mb-2 text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ TOOLS / PROMPT OPTIMIZER ]
        </p>
        <h1 className="mb-2 text-2xl font-bold text-sm-display">Prompt Optimizer</h1>
        <p className="mb-10 text-sm text-sm-secondary">
          Audit any prompt for token efficiency, intent completeness, output clarity, and trigger sharpness.
        </p>

        <PromptInput onSubmit={handleOptimize} isLoading={isLoading} />

        {error && (
          <p
            className="mt-4 text-[10px] tracking-widest text-sm-accent"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ ERROR: {error.toUpperCase()} ]
          </p>
        )}

        {audit && !isLoading && (
          <div className="mt-10">
            <AuditResults audit={audit} originalPrompt={originalPrompt} />
          </div>
        )}
      </div>
    </div>
  );
}
