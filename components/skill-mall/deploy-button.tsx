"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Agent = {
  id: string;
  label: string;
  scope: "global" | "project";
  command: (slug: string) => string;
};

const AGENTS: Agent[] = [
  {
    id: "agents-global",
    label: ".agents/skills (global)",
    scope: "global",
    command: (slug) => `cp -r skills/${slug} ~/.agents/skills/`,
  },
  {
    id: "agents-project",
    label: ".agents/skills (project)",
    scope: "project",
    command: (slug) => `cp -r skills/${slug} .agents/skills/`,
  },
  {
    id: "claude-global",
    label: "Claude Code (global)",
    scope: "global",
    command: (slug) => `cp -r skills/${slug} ~/.claude/skills/`,
  },
  {
    id: "claude-project",
    label: "Claude Code (project)",
    scope: "project",
    command: (slug) => `cp -r skills/${slug} .claude/skills/`,
  },
  {
    id: "cursor-global",
    label: "Cursor (global)",
    scope: "global",
    command: (slug) => `cp -r skills/${slug} ~/.cursor/skills/`,
  },
  {
    id: "cursor-project",
    label: "Cursor (project)",
    scope: "project",
    command: (slug) => `cp -r skills/${slug} .cursor/skills/`,
  },
];

type Props = {
  skillPath: string;
  className?: string;
};

export function DeployButton({ skillPath, className }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AGENTS[0]);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const command = selectedAgent.command(skillPath);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setDropdownOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setDropdownOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Agent selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
        >
          <span>Target: {selectedAgent.label}</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-zinc-500 transition-transform",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg shadow-black/30">
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleSelect(agent)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-zinc-800",
                  selectedAgent.id === agent.id
                    ? "text-zinc-100"
                    : "text-zinc-400"
                )}
              >
                <span
                  className={cn(
                    "rounded px-1 py-0.5 text-[10px]",
                    agent.scope === "global"
                      ? "bg-zinc-700 text-zinc-400"
                      : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {agent.scope}
                </span>
                {agent.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Command display + copy */}
      <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3">
        <code className="flex-1 select-all font-mono text-xs text-zinc-300">
          {command}
        </code>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-600 active:scale-95"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] text-zinc-600">
        Works with Claude Code, Cursor, GitHub Copilot, Codex, and any{" "}
        <a
          href="https://agentskills.io"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-zinc-400"
        >
          AgentSkills-compatible
        </a>{" "}
        agent.
      </p>
    </div>
  );
}
