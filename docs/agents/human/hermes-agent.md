# Hermes Agent — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.hermes/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .hermes/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent hermes-agent
npx skill-mall deploy <category>/<skill-name> --agent hermes-agent --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.hermes/skills/` |
| Project | `.hermes/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Hermes Agent matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Hermes Agent to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.hermes/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/hermes-agent.md](../skill-creation/hermes-agent.md).
