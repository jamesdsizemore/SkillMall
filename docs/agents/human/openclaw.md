# OpenClaw — Setup Guide

> AI coding agent with OpenClaw compatibility layer.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.openclaw/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent openclaw
npx skill-mall deploy <category>/<skill-name> --agent openclaw --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.openclaw/skills/` |
| Project | `skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — OpenClaw matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in OpenClaw to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.openclaw/skills/<skill-name>
```

## Known quirks

Project path is `skills/` at the repo root — not a dotfile directory. Also responds to `~/.clawdbot` and `~/.moltbot`.

For skill creation guidance, see [skill-creation/openclaw.md](../skill-creation/openclaw.md).
