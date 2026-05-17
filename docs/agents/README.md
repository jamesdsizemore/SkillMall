# Agent Reference Docs

Per-agent reference material for creating SkillMall-compatible skills. Use these docs when creating a skill that targets a specific agent, or when you need to know an agent's exact paths, supported fields, and native extensions.

## Agent index

| Agent | Doc | Project path | Global path | Native extensions |
|-------|-----|-------------|-------------|-------------------|
| Claude Code | [claude-code.md](claude-code.md) | `.claude/skills/` | `~/.claude/skills/` | Yes — extensive |
| Cursor | [cursor.md](cursor.md) | `.agents/skills/` | `~/.cursor/skills/` | No |
| OpenAI Codex | [codex.md](codex.md) | `.agents/skills/` | `~/.codex/skills/` | No |
| GitHub Copilot | [github-copilot.md](github-copilot.md) | `.agents/skills/` | `~/.copilot/skills/` | No |
| Gemini CLI | [gemini-cli.md](gemini-cli.md) | `.agents/skills/` | `~/.gemini/skills/` | No |
| Continue | [continue.md](continue.md) | `.continue/skills/` | `~/.continue/skills/` | No |

## Writing for multiple agents

If your skill must work on all agents, start with [universal.md](universal.md). It defines the safe subset of frontmatter, lists what to avoid, and explains when to write a universal skill versus an agent-specific one.

If your skill targets a single agent and you want to use its native features, go directly to that agent's doc.

## Relationship to other docs

- Frontmatter field definitions: [../reference/frontmatter.md](../reference/frontmatter.md)
- Cross-agent feature matrix: [../reference/agent-compatibility.md](../reference/agent-compatibility.md)
- General skill creation workflow: [../user/creating-skills.md](../user/creating-skills.md)
