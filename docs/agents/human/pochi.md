# Pochi — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.pochi/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .pochi/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent pochi
npx skill-mall deploy <category>/<skill-name> --agent pochi --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.pochi/skills/` |
| Project | `.pochi/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Pochi matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Pochi to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.pochi/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/pochi.md](../skill-creation/pochi.md).
