# Getting Started

SkillMall is a catalog of [Agent Skills](https://agentskills.io) — structured Markdown files that extend what AI coding agents can do. The same skill works in Claude Code, Cursor, GitHub Copilot, OpenAI Codex, and any other AgentSkills-compatible agent.

## Prerequisites

- Node.js 18+
- An AI coding agent (Claude Code, Cursor, Copilot, Codex, or similar)
- Git

## Browse the catalog

```bash
git clone https://github.com/jamesdsizemore/SkillMall
cd SkillMall
npm install
npm run dev
```

Open `http://localhost:3000` to browse all skills locally.

## Deploy your first skill

1. Find a skill in the catalog
2. Copy it to your agent's skills directory

```bash
# Universal (GitHub Copilot, Codex, most agents)
cp -r skills/<category>/<skill-name> ~/.agents/skills/

# Claude Code (personal/global)
cp -r skills/<category>/<skill-name> ~/.claude/skills/

# Cursor (personal/global)
cp -r skills/<category>/<skill-name> ~/.cursor/skills/
```

3. Invoke the skill

```
# In your agent's chat, type:
/<skill-name>
```

Or just describe a task — if the skill's description matches, the agent loads it automatically.

## Use the CLI

The `skill-mall` CLI makes deploying, searching, and creating skills faster:

```bash
# Install globally
npm install -g skill-mall

# Or use without installing
npx skill-mall
```

See [CLI Reference](cli.md) for all commands.

## Next steps

- [Deploying Skills](deploying-skills.md) — agent-specific paths and options
- [Creating Skills](creating-skills.md) — how to build your own
- [Frontmatter Spec](../reference/frontmatter.md) — full field reference
