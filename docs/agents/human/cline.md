# Cline — Setup Guide

> Autonomous AI coding agent for VS Code. [github.com/cline/cline](https://github.com/cline/cline)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.agents/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent cline
npx skill-mall deploy <category>/<skill-name> --agent cline --scope project
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

Or describe your task — Cline matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Cline to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.agents/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/cline.md](../skill-creation/cline.md).
