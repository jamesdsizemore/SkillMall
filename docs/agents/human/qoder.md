# Qoder — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.qoder/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .qoder/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent qoder
npx skill-mall deploy <category>/<skill-name> --agent qoder --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.qoder/skills/` |
| Project | `.qoder/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Qoder matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Qoder to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.qoder/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/qoder.md](../skill-creation/qoder.md).
