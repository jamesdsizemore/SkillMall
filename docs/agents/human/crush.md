# Crush — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.config/crush/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .crush/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent crush
npx skill-mall deploy <category>/<skill-name> --agent crush --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.config/crush/skills/` |
| Project | `.crush/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Crush matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Crush to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.config/crush/skills/<skill-name>
```

## Known quirks

Global path uses XDG config: `~/.config/crush/skills`.

For skill creation guidance, see [skill-creation/crush.md](../skill-creation/crush.md).
