# Deploying Skills

> **This page has moved.** The full deploy documentation is in the [CLI Reference — deploy command](../developer/cli-reference.md#deploy).

---

SkillMall skills follow the [AgentSkills open standard](https://agentskills.io) and work with any compatible agent.

## Deploy with the CLI (recommended)

```bash
# Deploy to Claude Code (default)
npx skill-mall deploy business/blue-ocean-strategy

# Deploy to all detected agents
npx skill-mall deploy business/blue-ocean-strategy --all-agents

# Deploy to project directory (not user home)
npx skill-mall deploy business/blue-ocean-strategy --scope project

# Deploy a localized version
npx skill-mall deploy business/blue-ocean-strategy --lang es
```

The CLI automatically detects which agents are installed and deploys to the correct directory for each.

## Deploy manually

Copy the skill directory to your agent's skills folder:

| Agent | Directory |
|---|---|
| Claude Code | `~/.claude/skills/` |
| Cursor | `~/.cursor/skills/` |
| Codex | `~/.codex/skills/` |
| Gemini CLI | `~/.gemini/skills/` |
| GitHub Copilot | `~/.agents/skills/` |

```bash
# Manual deploy to Claude Code
cp -r skills/business/blue-ocean-strategy ~/.claude/skills/
```

## Deploy a collection

Deploy a curated set of related skills at once:

```bash
npx skill-mall deploy-pack full-stack-developer-kit
npx skill-mall deploy-pack strategic-business-pack --agent cursor
```

Collections are defined in `collections/<slug>/collection.json`. See [Using Collections](../guide/using-collections.md) for the full guide.

## Deploy scope: user vs project

By default, skills are deployed to your user home directory (`~/.claude/skills/`) and are available in all your Claude Code sessions.

With `--scope project`, skills are deployed to `.claude/skills/` in your current working directory — useful for team projects where skills should be project-local and committed to the repository.

## After deploying

Invoke the skill in your next agent session:

- **Claude Code:** Type `/blue-ocean-strategy` or ask about competitive strategy
- **Cursor:** The skill is available in your next chat session
- Other agents: Refer to your agent's documentation for skill invocation

For complete documentation of all deploy flags and options, see [CLI Reference — deploy](../developer/cli-reference.md#deploy).
