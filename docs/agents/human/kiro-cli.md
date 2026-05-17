# Kiro CLI — Setup Guide

> Amazon Kiro AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.kiro/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .kiro/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent kiro-cli
npx skill-mall deploy <category>/<skill-name> --agent kiro-cli --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.kiro/skills/` |
| Project | `.kiro/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Kiro CLI matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Kiro CLI to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.kiro/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/kiro-cli.md](../skill-creation/kiro-cli.md).
