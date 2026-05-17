# Pi — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.pi/agent/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .pi/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent pi
npx skill-mall deploy <category>/<skill-name> --agent pi --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.pi/agent/skills/` |
| Project | `.pi/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Pi matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Pi to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.pi/agent/skills/<skill-name>
```

## Known quirks

Global path uses a nested structure: `~/.pi/agent/skills`.

For skill creation guidance, see [skill-creation/pi.md](../skill-creation/pi.md).
