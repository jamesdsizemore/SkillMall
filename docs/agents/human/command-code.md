# Command Code — Setup Guide

> AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.commandcode/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .commandcode/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent command-code
npx skill-mall deploy <category>/<skill-name> --agent command-code --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.commandcode/skills/` |
| Project | `.commandcode/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Command Code matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Command Code to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.commandcode/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/command-code.md](../skill-creation/command-code.md).
