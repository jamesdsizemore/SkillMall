export interface AgentDef {
  id: string;
  name: string;
  skillsDir: (home: string) => string;
}

// Primary agents — full 54 from vercel-labs/skills registry can be added incrementally.
// These 7 cover the most widely deployed agents.
export const AGENT_REGISTRY: AgentDef[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    skillsDir: (h) => `${h}/.claude/skills`,
  },
  {
    id: "cursor",
    name: "Cursor",
    skillsDir: (h) => `${h}/.cursor/skills`,
  },
  {
    id: "codex",
    name: "Codex",
    skillsDir: (h) => `${h}/.codex/skills`,
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    skillsDir: (h) => `${h}/.gemini/skills`,
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    skillsDir: (h) => `${h}/.copilot/skills`,
  },
  {
    id: "continue",
    name: "Continue",
    skillsDir: (h) => `${h}/.continue/skills`,
  },
  {
    id: "agents",
    name: "AgentSkills (universal)",
    skillsDir: (h) => `${h}/.agents/skills`,
  },
];
