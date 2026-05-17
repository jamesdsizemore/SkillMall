# Codemaker — Setup Guide

> AI coding assistant.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.codemaker/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .codemaker/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent codemaker
npx skill-mall deploy <category>/<skill-name> --agent codemaker --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.codemaker/skills/` |
| Project | `.codemaker/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Codemaker matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Codemaker to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.codemaker/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/codemaker.md](../skill-creation/codemaker.md).
