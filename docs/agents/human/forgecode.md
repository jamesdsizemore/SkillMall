# ForgeCode — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.forge/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .forge/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent forgecode
npx skill-mall deploy <category>/<skill-name> --agent forgecode --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.forge/skills/` |
| Project | `.forge/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — ForgeCode matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in ForgeCode to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.forge/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/forgecode.md](../skill-creation/forgecode.md).
