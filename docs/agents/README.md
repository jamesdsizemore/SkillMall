# Agent Reference Docs

Two distinct sets of documentation, kept separate by audience and purpose.

---

## `human/` — Setup and deployment guides

For developers installing and using SkillMall skills in their agent. Covers install paths, invocation syntax, verification, and troubleshooting.

| Agent | Guide | Project path | Global path |
|-------|-------|-------------|-------------|
| Claude Code | [human/claude-code.md](human/claude-code.md) | `.claude/skills/` | `~/.claude/skills/` |
| Cursor | [human/cursor.md](human/cursor.md) | `.agents/skills/` | `~/.cursor/skills/` |
| GitHub Copilot | [human/github-copilot.md](human/github-copilot.md) | `.agents/skills/` | `~/.copilot/skills/` |
| OpenAI Codex | [human/codex.md](human/codex.md) | `.agents/skills/` | `~/.codex/skills/` |
| Gemini CLI | [human/gemini-cli.md](human/gemini-cli.md) | `.agents/skills/` | `~/.gemini/skills/` |
| Continue | [human/continue.md](human/continue.md) | `.continue/skills/` | `~/.continue/skills/` |

---

## `skill-creation/` — Skill authoring reference for AI agents

For coding agents asked to create a skill targeting a specific agent. Load the relevant document to know that agent's exact frontmatter fields, native extensions, character limits, and authoring rules.

| Document | When to load it |
|----------|----------------|
| [skill-creation/universal.md](skill-creation/universal.md) | Creating a skill that works across all agents |
| [skill-creation/claude-code.md](skill-creation/claude-code.md) | Creating a Claude Code-native skill |
| [skill-creation/cursor.md](skill-creation/cursor.md) | Creating a skill targeting Cursor |
| [skill-creation/github-copilot.md](skill-creation/github-copilot.md) | Creating a skill targeting GitHub Copilot |
| [skill-creation/codex.md](skill-creation/codex.md) | Creating a skill targeting OpenAI Codex |
| [skill-creation/gemini-cli.md](skill-creation/gemini-cli.md) | Creating a skill targeting Gemini CLI |
| [skill-creation/continue.md](skill-creation/continue.md) | Creating a skill targeting Continue |

---

## Which document to load

**Human developer** setting up SkillMall with a specific agent → `human/<agent>.md`

**Coding agent** asked to create a skill:
- Universal skill (works everywhere) → load `skill-creation/universal.md`
- Agent-specific skill → load `skill-creation/<target-agent>.md`
- Default to universal unless agent-specific features are explicitly required

---

## More agents

[vercel-labs/skills](https://github.com/vercel-labs/skills) supports 50+ agents. For any agent not listed here, use the universal skill format. Full path reference: [../reference/agent-compatibility.md](../reference/agent-compatibility.md)
