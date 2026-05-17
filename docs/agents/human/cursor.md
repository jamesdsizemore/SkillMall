# Cursor — Setup Guide

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.cursor/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent cursor
npx skill-mall deploy <category>/<skill-name> --agent cursor --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.cursor/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
# Type / in Cursor's agent chat to see available skills
/skill-name

# Natural language
"do X" — Cursor matches against the skill description
```

## Verifying a skill is loaded

Type `/` in Cursor's agent chat panel. Installed skills appear in the autocomplete list.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next Cursor session.

## Removing a skill

```bash
rm -rf ~/.cursor/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/cursor.md](../skill-creation/cursor.md).
