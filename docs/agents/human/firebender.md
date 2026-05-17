# Firebender — Setup Guide

> AI coding agent for VS Code.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.firebender/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent firebender
npx skill-mall deploy <category>/<skill-name> --agent firebender --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.firebender/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Firebender matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Firebender to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.firebender/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/firebender.md](../skill-creation/firebender.md).
