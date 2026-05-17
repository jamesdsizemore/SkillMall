# Neovate — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.neovate/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .neovate/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent neovate
npx skill-mall deploy <category>/<skill-name> --agent neovate --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.neovate/skills/` |
| Project | `.neovate/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Neovate matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Neovate to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.neovate/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/neovate.md](../skill-creation/neovate.md).
