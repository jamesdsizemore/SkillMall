# Kode — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.kode/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .kode/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent kode
npx skill-mall deploy <category>/<skill-name> --agent kode --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.kode/skills/` |
| Project | `.kode/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Kode matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Kode to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.kode/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/kode.md](../skill-creation/kode.md).
