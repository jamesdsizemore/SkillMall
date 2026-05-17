# AdaL — Setup Guide

> AI development assistant.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.adal/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .adal/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent adal
npx skill-mall deploy <category>/<skill-name> --agent adal --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.adal/skills/` |
| Project | `.adal/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — AdaL matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in AdaL to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.adal/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/adal.md](../skill-creation/adal.md).
