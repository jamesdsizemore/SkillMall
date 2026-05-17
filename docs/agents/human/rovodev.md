# Rovo Dev — Setup Guide

> Atlassian Rovo Dev AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.rovodev/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .rovodev/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent rovodev
npx skill-mall deploy <category>/<skill-name> --agent rovodev --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.rovodev/skills/` |
| Project | `.rovodev/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Rovo Dev matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Rovo Dev to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.rovodev/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/rovodev.md](../skill-creation/rovodev.md).
