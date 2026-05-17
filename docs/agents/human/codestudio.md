# Code Studio — Setup Guide

> AI coding studio environment.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.codestudio/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .codestudio/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent codestudio
npx skill-mall deploy <category>/<skill-name> --agent codestudio --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.codestudio/skills/` |
| Project | `.codestudio/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Code Studio matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Code Studio to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.codestudio/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/codestudio.md](../skill-creation/codestudio.md).
