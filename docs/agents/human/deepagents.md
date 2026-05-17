# Deep Agents — Setup Guide

> AI agents platform.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.deepagents/agent/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent deepagents
npx skill-mall deploy <category>/<skill-name> --agent deepagents --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.deepagents/agent/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Deep Agents matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Deep Agents to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.deepagents/agent/skills/<skill-name>
```

## Known quirks

Global path uses a nested structure: `~/.deepagents/agent/skills`.

For skill creation guidance, see [skill-creation/deepagents.md](../skill-creation/deepagents.md).
