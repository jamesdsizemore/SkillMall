# Droid — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.factory/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .factory/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent droid
npx skill-mall deploy <category>/<skill-name> --agent droid --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.factory/skills/` |
| Project | `.factory/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Droid matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Droid to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.factory/skills/<skill-name>
```

## Known quirks

Project path uses `.factory/skills` — note the non-standard directory name.

For skill creation guidance, see [skill-creation/droid.md](../skill-creation/droid.md).
