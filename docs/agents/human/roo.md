# Roo Code — Setup Guide

> AI coding agent for VS Code.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.roo/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .roo/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent roo
npx skill-mall deploy <category>/<skill-name> --agent roo --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.roo/skills/` |
| Project | `.roo/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Roo Code matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Roo Code to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.roo/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/roo.md](../skill-creation/roo.md).
