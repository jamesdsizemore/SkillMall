# Antigravity — Setup Guide

> AI agent in the Gemini ecosystem.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.gemini/antigravity/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent antigravity
npx skill-mall deploy <category>/<skill-name> --agent antigravity --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.gemini/antigravity/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Antigravity matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Antigravity to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.gemini/antigravity/skills/<skill-name>
```

## Known quirks

Global path is nested inside the Gemini home directory: `~/.gemini/antigravity/skills`.

For skill creation guidance, see [skill-creation/antigravity.md](../skill-creation/antigravity.md).
