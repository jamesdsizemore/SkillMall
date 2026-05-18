# Agent Compatibility

SkillMall skills follow the [AgentSkills open standard](https://agentskills.io). Every skill in the catalog works with any compatible agent by default. This page documents agent-specific behavior and known differences.

> **See also:** [CLI Reference — deploy command](../developer/cli-reference.md#deploy) for deploy flags including `--all-agents`, `--agents`, and `--scope project`. The [Developer Getting Started guide](../developer/getting-started.md) covers configuring all 5 supported LLM providers. The [Architecture guide](../developer/architecture.md) explains how skills are stored and served efficiently.

For detailed, per-agent skill creation guidance, see [docs/agents/](../agents/README.md).

## Supported agents

| Agent | Skills path (global) | Skills path (project) |
|-------|---------------------|----------------------|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Cursor | `~/.cursor/skills/` | `.agents/skills/` |
| GitHub Copilot | `~/.copilot/skills/` | `.agents/skills/` |
| OpenAI Codex | `~/.codex/skills/` | `.agents/skills/` |
| Gemini CLI | `~/.gemini/skills/` | `.agents/skills/` |
| Continue | `~/.continue/skills/` | `.continue/skills/` |
| Goose | `~/.config/goose/skills/` | `.goose/skills/` |
| Cline | `~/.agents/skills/` | `.agents/skills/` |
| Amp | `~/.config/agents/skills/` | `.agents/skills/` |
| Windsurf | `~/.codeium/skills/` | `.codeium/skills/` |

The `npx skills` CLI from [vercel-labs/skills](https://github.com/vercel-labs/skills) supports 50+ agents and handles path detection automatically.

## Feature compatibility

| Feature | Claude Code | Cursor | Copilot | Codex |
|---------|------------|--------|---------|-------|
| Auto-discovery from `name` + `description` | Yes | Yes | Yes | Yes |
| Shell scripts in `scripts/` | Yes | Yes | Varies | Varies |
| `allowed-tools` | Yes | No | No | No |
| `disable-model-invocation` | Yes | No | No | No |
| `when_to_use` | Yes | No | No | No |
| `context: fork` | Yes | No | No | No |
| Dynamic context injection (`!` commands) | Yes | No | No | No |
| `argument-hint` | Yes | Partial | No | No |

## Writing cross-agent skills

Follow these rules to maximize compatibility:

**Do:**
- Use only `name`, `description`, `license`, `compatibility`, `metadata` at the top level
- Write the skill body as plain Markdown instructions
- Include both `bash` and `powershell` variants for terminal commands
- Put all agent-specific features in commented-out blocks or documented as optional
- Note agent requirements in `compatibility` if the skill requires a specific tool or environment

**Avoid:**
- Hardcoding agent-specific paths (use `~/.agents/skills/` as the primary reference)
- Using dynamic context injection (`!`  commands) without noting the Claude Code requirement
- Using Claude Code-only frontmatter fields as if they apply universally

## Claude Code-specific features

Claude Code extends the AgentSkills spec. When you use these features, note them in `compatibility`:

```yaml
compatibility: "Uses dynamic context injection — requires Claude Code. Other agents: skip shell-injection steps."
```

## The `compatibility` field

Use `compatibility` to communicate environment requirements to users:

```yaml
# Requires specific tools
compatibility: "Requires git, jq, and the GitHub CLI (gh)."

# Requires network access
compatibility: "Requires internet access to call the GitHub API."

# Agent-specific features
compatibility: "Dynamic context injection requires Claude Code. All other features work universally."

# No special requirements — omit the field entirely
```
