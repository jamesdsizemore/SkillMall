# Mistral Vibe — Setup Guide

> Mistral AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.vibe/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .vibe/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent mistral-vibe
npx skill-mall deploy <category>/<skill-name> --agent mistral-vibe --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.vibe/skills/` |
| Project | `.vibe/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Mistral Vibe matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Mistral Vibe to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.vibe/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/mistral-vibe.md](../skill-creation/mistral-vibe.md).
