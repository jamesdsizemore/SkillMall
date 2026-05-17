const PILLARS = [
  {
    index: "01",
    title: "Structured instructions",
    body: "A SKILL.md file with frontmatter the agent reads at session start. Trigger phrases, compatibility notes, and the exact instructions the agent follows.",
  },
  {
    index: "02",
    title: "Artifact templates",
    body: "Blank, annotated templates for every tool the skill produces — matrices, canvases, grids, checklists. Paste into any agent and get a structured output immediately.",
  },
  {
    index: "03",
    title: "Self-contained prompts",
    body: "Framework-selected prompts with every structure embedded inline. No external file references. Paste into Claude, GPT-4o, or Gemini — works the same.",
  },
] as const;

export function WhatIsASkill() {
  return (
    <section className="border-b border-sm-border bg-sm-surface px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p
          className="mb-8 text-[10px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ WHAT IS A SKILL ]
        </p>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.index} className="flex flex-col gap-4">
              <div
                className="text-4xl font-black text-sm-border"
                style={{ fontFamily: '"Doto", monospace' }}
              >
                {p.index}
              </div>
              <div className="h-px w-8 bg-sm-display" />
              <h3 className="text-sm font-semibold text-sm-display">{p.title}</h3>
              <p className="text-sm leading-relaxed text-sm-secondary">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
