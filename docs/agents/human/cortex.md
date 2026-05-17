# Cortex Code — Setup Guide

> Snowflake Cortex AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.snowflake/cortex/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .cortex/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent cortex
npx skill-mall deploy <category>/<skill-name> --agent cortex --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.snowflake/cortex/skills/` |
| Project | `.cortex/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Cortex Code matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Cortex Code to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.snowflake/cortex/skills/<skill-name>
```

## Known quirks

Global path is nested under Snowflake home: `~/.snowflake/cortex/skills`.

For skill creation guidance, see [skill-creation/cortex.md](../skill-creation/cortex.md).
