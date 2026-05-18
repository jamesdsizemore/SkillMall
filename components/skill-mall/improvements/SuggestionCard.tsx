"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

type Suggestion = {
  id: number;
  suggestion_body: string;
  status: "pending" | "approved" | "rejected";
  generated_from_feedback_count: number;
  created_at: string;
};

type Props = {
  suggestion: Suggestion;
  skillSlug: string;
  skillCategory: string;
  isAuthor: boolean;
};

export function SuggestionCard({ suggestion, skillSlug, skillCategory, isAuthor }: Props) {
  const [status, setStatus] = useState(suggestion.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: "approve" | "reject") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/improvements/${suggestion.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillSlug, skillCategory }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError((err as { error?: string }).error ?? `${action} failed`);
        return;
      }
      setStatus(action === "approve" ? "approved" : "rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<string, string> = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-sm-disabled",
  };

  return (
    <div className="border border-sm-border bg-sm-surface p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <p
          className={cn("text-[9px] tracking-widest", statusColor[status])}
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ {status.toUpperCase()} ] — generated from {suggestion.generated_from_feedback_count} submissions
        </p>
        <p
          className="text-[8px] text-sm-disabled shrink-0"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {suggestion.created_at.slice(0, 10)}
        </p>
      </div>

      <p className="text-sm text-sm-primary leading-relaxed mb-3">{suggestion.suggestion_body}</p>

      {error && (
        <p
          className="text-[9px] tracking-widest text-sm-accent mb-2"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {error}
        </p>
      )}

      {isAuthor && status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => act("approve")}
            disabled={loading}
            className="bg-sm-display px-4 py-1.5 text-[9px] tracking-widest text-sm-bg disabled:opacity-30 hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            {loading ? "..." : "[ APPLY ]"}
          </button>
          <button
            onClick={() => act("reject")}
            disabled={loading}
            className="border border-sm-border px-4 py-1.5 text-[9px] tracking-widest text-sm-secondary disabled:opacity-30 hover:border-sm-primary transition-colors"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ REJECT ]
          </button>
        </div>
      )}
    </div>
  );
}
