# Kilo Code — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.kilocode/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .kilocode/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent kilo
npx skill-mall deploy <category>/<skill-name> --agent kilo --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.kilocode/skills/` |
| Project | `.kilocode/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Kilo Code matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Kilo Code to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.kilocode/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/kilo.md](../skill-creation/kilo.md).
