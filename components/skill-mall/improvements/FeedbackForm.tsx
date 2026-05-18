"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  skillSlug: string;
};

export function FeedbackForm({ skillSlug }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyTooLong = body.length > 200;

  const handleSubmit = async () => {
    if (!satisfaction) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillSlug, satisfaction, body: body || undefined }),
      });

      if (res.status === 401) {
        setError("Sign in to leave feedback.");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError((err as { error?: string }).error ?? "Submission failed.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="border border-sm-border p-4">
        <p
          className="text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ FEEDBACK SUBMITTED — THANK YOU ]
        </p>
      </div>
    );
  }

  return (
    <div className="border border-sm-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors flex items-center justify-between"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        <span>[ LEAVE FEEDBACK ]</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-sm-border p-4 space-y-4">
          {/* Satisfaction stars */}
          <div>
            <p
              className="mb-2 text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              SATISFACTION (1-5)
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setSatisfaction(n)}
                  className={cn(
                    "w-8 h-8 border text-sm font-semibold transition-colors",
                    satisfaction === n
                      ? "border-sm-display text-sm-display bg-sm-display/10"
                      : "border-sm-border text-sm-secondary hover:border-sm-primary"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div>
            <p
              className="mb-1 text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              OPTIONAL NOTES ({body.length}/200)
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What worked well? What would improve this skill?"
              rows={3}
              className={cn(
                "w-full border bg-transparent px-3 py-2 text-sm text-sm-primary outline-none resize-none",
                bodyTooLong ? "border-sm-accent" : "border-sm-border focus:border-sm-display"
              )}
            />
            {bodyTooLong && (
              <p
                className="text-[9px] tracking-widest text-sm-accent"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                {body.length - 200} chars over limit
              </p>
            )}
          </div>

          {error && (
            <p
              className="text-[9px] tracking-widest text-sm-accent"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!satisfaction || bodyTooLong || submitting}
            className="bg-sm-display px-5 py-2.5 text-[10px] tracking-widest text-sm-bg disabled:opacity-30 transition-opacity hover:opacity-80"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            {submitting ? "[ SUBMITTING... ]" : "[ SUBMIT FEEDBACK ]"}
          </button>
        </div>
      )}
    </div>
  );
}
