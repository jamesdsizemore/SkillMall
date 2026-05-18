"use client";

import { useState } from "react";

type Props = {
  category: string;
  slug: string;
};

export function ForkButton({ category, slug }: Props) {
  const [open, setOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleFork = async () => {
    if (!newSlug.trim() || !/^[a-z0-9-]+$/.test(newSlug)) {
      setError("Slug must be kebab-case (lowercase letters, numbers, hyphens)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fork-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, slug, newSlug }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Fork failed (${res.status})`);
      }

      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fork failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <span
        className="text-[9px] tracking-widest text-sm-blue"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ FORKED — check skills/{category}/{newSlug}/ ]
      </span>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors border border-sm-border px-3 py-1.5"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ FORK ]
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="border-b border-sm-border focus-within:border-sm-display transition-colors">
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="new-skill-name"
              className="bg-transparent text-sm text-sm-primary outline-none placeholder:text-sm-disabled py-1 w-40"
              autoFocus
            />
          </div>
          <button
            onClick={handleFork}
            disabled={loading || !newSlug.trim()}
            className="text-[9px] tracking-widest text-sm-bg bg-sm-display px-3 py-1.5 disabled:opacity-30 hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            {loading ? "[ ... ]" : "[ CREATE FORK ]"}
          </button>
          <button
            onClick={() => { setOpen(false); setError(null); }}
            className="text-[9px] tracking-widest text-sm-disabled hover:text-sm-primary transition-colors"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ CANCEL ]
          </button>
        </div>
      )}
      {error && (
        <p
          className="mt-1 text-[9px] tracking-widest text-sm-accent"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
