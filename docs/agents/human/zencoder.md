# Zencoder — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.zencoder/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .zencoder/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent zencoder
npx skill-mall deploy <category>/<skill-name> --agent zencoder --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.zencoder/skills/` |
| Project | `.zencoder/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Zencoder matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Zencoder to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.zencoder/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/zencoder.md](../skill-creation/zencoder.md).
