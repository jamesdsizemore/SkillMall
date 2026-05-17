# OpenHands — Setup Guide

> Formerly OpenDevin. Open-source autonomous AI agent. [github.com/All-Hands-AI/OpenHands](https://github.com/All-Hands-AI/OpenHands)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.openhands/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .openhands/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent openhands
npx skill-mall deploy <category>/<skill-name> --agent openhands --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.openhands/skills/` |
| Project | `.openhands/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — OpenHands matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in OpenHands to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.openhands/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/openhands.md](../skill-creation/openhands.md).
