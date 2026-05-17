# Trae — Setup Guide

> ByteDance AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.trae/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .trae/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent trae
npx skill-mall deploy <category>/<skill-name> --agent trae --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.trae/skills/` |
| Project | `.trae/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Trae matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Trae to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.trae/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/trae.md](../skill-creation/trae.md).
