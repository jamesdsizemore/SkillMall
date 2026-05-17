# Augment — Setup Guide

> AI coding assistant with codebase understanding. [augmentcode.com](https://augmentcode.com)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.augment/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .augment/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent augment
npx skill-mall deploy <category>/<skill-name> --agent augment --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.augment/skills/` |
| Project | `.augment/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Augment matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Augment to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.augment/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/augment.md](../skill-creation/augment.md).
