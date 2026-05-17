# Goose — Setup Guide

> Open-source AI coding agent by Block. [block.github.io/goose](https://block.github.io/goose)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.config/goose/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .goose/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent goose
npx skill-mall deploy <category>/<skill-name> --agent goose --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.config/goose/skills/` |
| Project | `.goose/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Goose matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Goose to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.config/goose/skills/<skill-name>
```

## Known quirks

Global path uses XDG config: `~/.config/goose/skills`.

For skill creation guidance, see [skill-creation/goose.md](../skill-creation/goose.md).
