# Dexto — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.agents/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent dexto
npx skill-mall deploy <category>/<skill-name> --agent dexto --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.agents/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Dexto matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Dexto to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.agents/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/dexto.md](../skill-creation/dexto.md).
