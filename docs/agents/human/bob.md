# IBM Bob — Setup Guide

> IBM's AI coding assistant.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.bob/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .bob/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent bob
npx skill-mall deploy <category>/<skill-name> --agent bob --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.bob/skills/` |
| Project | `.bob/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — IBM Bob matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in IBM Bob to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.bob/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/bob.md](../skill-creation/bob.md).
