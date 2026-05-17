# Mux — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.mux/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .mux/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent mux
npx skill-mall deploy <category>/<skill-name> --agent mux --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.mux/skills/` |
| Project | `.mux/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Mux matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Mux to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.mux/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/mux.md](../skill-creation/mux.md).
