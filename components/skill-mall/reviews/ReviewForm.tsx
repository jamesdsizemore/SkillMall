"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  skillSlug: string;
  isAuthenticated: boolean;
};

export function ReviewForm({ skillSlug, isAuthenticated }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="border border-sm-border p-4 text-center">
        <p className="mb-3 text-sm text-sm-secondary">
          Sign in with GitHub to leave a review.
        </p>
        <a
          href="/api/auth/login"
          className="inline-block bg-sm-display px-5 py-2 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SIGN IN WITH GITHUB ]
        </a>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0 || !body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillSlug, rating, body: body.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message ?? `Submission failed (${res.status})`
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-sm-border bg-sm-surface p-4 space-y-4">
      <p
        className="text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ WRITE A REVIEW ]
      </p>

      {/* Star rating */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-xl transition-colors ${
              star <= rating ? "text-sm-display" : "text-sm-border"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Review body */}
      <div>
        <div className="border-b border-sm-border focus-within:border-sm-display transition-colors">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 150))}
            placeholder="What worked and what did not? Be specific."
            rows={3}
            className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none placeholder:text-sm-disabled resize-none"
          />
        </div>
        <p
          className="mt-1 text-right text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {body.length} / 150
        </p>
      </div>

      {error && (
        <p
          className="text-[9px] tracking-widest text-sm-accent"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ {error.toUpperCase()} ]
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || !body.trim() || submitting}
        className="bg-sm-display px-5 py-2 text-[10px] tracking-widest text-sm-bg transition-opacity disabled:opacity-30 hover:opacity-80"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        {submitting ? "[ SUBMITTING... ]" : "[ SUBMIT REVIEW ]"}
      </button>
    </div>
  );
}
