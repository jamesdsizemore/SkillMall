# AiderDesk — Setup Guide

> Desktop interface for the Aider AI coding assistant.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.aider-desk/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .aider-desk/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent aider-desk
npx skill-mall deploy <category>/<skill-name> --agent aider-desk --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.aider-desk/skills/` |
| Project | `.aider-desk/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — AiderDesk matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in AiderDesk to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.aider-desk/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/aider-desk.md](../skill-creation/aider-desk.md).
