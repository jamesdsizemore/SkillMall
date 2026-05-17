# Replit — Setup Guide

> Replit AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.config/agents/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent replit
npx skill-mall deploy <category>/<skill-name> --agent replit --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.config/agents/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Replit matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Replit to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.config/agents/skills/<skill-name>
```

## Known quirks

Uses the shared `~/.config/agents/skills` global path.

For skill creation guidance, see [skill-creation/replit.md](../skill-creation/replit.md).
