# Warp — Setup Guide

> AI-powered terminal. [warp.dev](https://warp.dev)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.agents/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent warp
npx skill-mall deploy <category>/<skill-name> --agent warp --scope project
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

Or describe your task — Warp matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Warp to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.agents/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/warp.md](../skill-creation/warp.md).
