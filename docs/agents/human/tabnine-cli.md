# Tabnine CLI — Setup Guide

> Tabnine AI coding CLI. [tabnine.com](https://tabnine.com)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.tabnine/agent/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .tabnine/agent/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent tabnine-cli
npx skill-mall deploy <category>/<skill-name> --agent tabnine-cli --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.tabnine/agent/skills/` |
| Project | `.tabnine/agent/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Tabnine CLI matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Tabnine CLI to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.tabnine/agent/skills/<skill-name>
```

## Known quirks

Both project and global paths use a nested `agent/skills` structure.

For skill creation guidance, see [skill-creation/tabnine-cli.md](../skill-creation/tabnine-cli.md).
