# Amp — Setup Guide

> AI coding agent by Sourcegraph.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.config/agents/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent amp
npx skill-mall deploy <category>/<skill-name> --agent amp --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.config/agents/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Amp matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Amp to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.config/agents/skills/<skill-name>
```

## Known quirks

Uses the XDG config home for global skills: `~/.config/agents/skills`.

For skill creation guidance, see [skill-creation/amp.md](../skill-creation/amp.md).
