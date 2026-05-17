"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export function HeroSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;
    el.style.animation = "scanReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards";
  }, []);

  return (
    <section className="border-b border-sm-border bg-sm-bg px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p
          className="mb-4 text-xs tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ AGENT SKILLS CATALOG ]
        </p>

        <h1
          ref={headlineRef}
          className="mb-6 text-4xl font-bold leading-tight tracking-tight text-sm-display sm:text-5xl lg:text-6xl"
          style={{ opacity: 0 }}
        >
          Skills that extend
          <br />
          any AI agent.
        </h1>

        <p className="mb-10 max-w-lg text-base leading-relaxed text-sm-secondary">
          Structured SKILL.md files that work across Claude Code, Cursor, Codex,
          Gemini CLI, and any compatible agent. Research-first generation. Production
          quality out of the box.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="#catalog"
            className="inline-flex items-center gap-2 bg-sm-display px-5 py-2.5 text-sm font-semibold text-sm-bg transition-opacity hover:opacity-80"
          >
            Browse Skills
          </Link>
          <Link
            href="/skills/create"
            className="inline-flex items-center gap-2 border border-sm-border px-5 py-2.5 text-sm font-semibold text-sm-primary transition-colors hover:border-sm-display"
          >
            Create a Skill
          </Link>
        </div>
      </div>
    </section>
  );
}
