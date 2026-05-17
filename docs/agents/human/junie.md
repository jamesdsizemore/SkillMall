# Junie — Setup Guide

> JetBrains AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.junie/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .junie/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent junie
npx skill-mall deploy <category>/<skill-name> --agent junie --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.junie/skills/` |
| Project | `.junie/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Junie matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Junie to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.junie/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/junie.md](../skill-creation/junie.md).
