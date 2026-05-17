# OpenCode — Setup Guide

> Open-source terminal AI coding agent. [opencode.ai](https://opencode.ai)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.config/opencode/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent opencode
npx skill-mall deploy <category>/<skill-name> --agent opencode --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.config/opencode/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — OpenCode matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in OpenCode to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.config/opencode/skills/<skill-name>
```

## Known quirks

Global path uses XDG config: `~/.config/opencode/skills`.

For skill creation guidance, see [skill-creation/opencode.md](../skill-creation/opencode.md).
