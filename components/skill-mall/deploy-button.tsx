"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Agent = {
  id: string;
  label: string;
  command: (slug: string) => string;
};

const AGENTS: Agent[] = [
  { id: "claude-global",   label: "Claude Code — global",  command: (p) => `cp -r ${p} ~/.claude/skills/` },
  { id: "claude-project",  label: "Claude Code — project", command: (p) => `cp -r ${p} .claude/skills/` },
  { id: "cursor-global",   label: "Cursor — global",       command: (p) => `cp -r ${p} ~/.cursor/skills/` },
  { id: "cursor-project",  label: "Cursor — project",      command: (p) => `cp -r ${p} .cursor/skills/` },
  { id: "agents-global",   label: ".agents — global",      command: (p) => `cp -r ${p} ~/.agents/skills/` },
  { id: "agents-project",  label: ".agents — project",     command: (p) => `cp -r ${p} .agents/skills/` },
];

type Props = {
  skillPath: string;
  className?: string;
};

export function DeployButton({ skillPath, className }: Props) {
  const [selected, setSelected] = useState<Agent>(AGENTS[0]);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const command = selected.command(skillPath);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Agent selector */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="border border-sm-border px-3 py-2 text-[10px] tracking-widest text-sm-secondary transition-colors hover:border-sm-primary hover:text-sm-primary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ TARGET: {selected.label.toUpperCase()} ▾ ]
        </button>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-0 border border-sm-border bg-sm-surface">
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => { setSelected(agent); setOpen(false); }}
                className={cn(
                  "block w-full px-4 py-2.5 text-left text-[10px] tracking-widest transition-colors hover:bg-sm-bg",
                  selected.id === agent.id ? "text-sm-display" : "text-sm-secondary"
                )}
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                {agent.label.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Command + copy */}
      <div className="flex items-center gap-0 border border-sm-border">
        <code
          className="flex-1 select-all px-4 py-3 text-xs text-sm-primary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {command}
        </code>
        <button
          onClick={copy}
          className="border-l border-sm-border px-4 py-3 text-[10px] tracking-widest text-sm-secondary transition-colors hover:bg-sm-bg hover:text-sm-primary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {copied ? "[ COPIED ]" : "[ COPY ]"}
        </button>
      </div>

      <p className="text-[10px] text-sm-disabled">
        Works with Claude Code, Cursor, Codex, Gemini CLI, and any AgentSkills-compatible agent.
      </p>
    </div>
  );
}
