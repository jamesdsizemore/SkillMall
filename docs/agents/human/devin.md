# Devin for Terminal — Setup Guide

> Terminal interface for Devin AI. [cognition.ai](https://cognition.ai)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.config/devin/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .devin/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent devin
npx skill-mall deploy <category>/<skill-name> --agent devin --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.config/devin/skills/` |
| Project | `.devin/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Devin for Terminal matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Devin for Terminal to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.config/devin/skills/<skill-name>
```

## Known quirks

Global path uses XDG config: `~/.config/devin/skills`.

For skill creation guidance, see [skill-creation/devin.md](../skill-creation/devin.md).
