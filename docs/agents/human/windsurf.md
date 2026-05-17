# Windsurf — Setup Guide

> Codeium's AI-powered IDE. [codeium.com/windsurf](https://codeium.com/windsurf)

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.codeium/windsurf/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .windsurf/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent windsurf
npx skill-mall deploy <category>/<skill-name> --agent windsurf --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.codeium/windsurf/skills/` |
| Project | `.windsurf/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Windsurf matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Windsurf to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.codeium/windsurf/skills/<skill-name>
```

## Known quirks

Global path is nested under Codeium home: `~/.codeium/windsurf/skills`.

For skill creation guidance, see [skill-creation/windsurf.md](../skill-creation/windsurf.md).
