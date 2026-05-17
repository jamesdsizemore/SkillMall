# CodeBuddy — Setup Guide

> Tencent Cloud AI coding assistant.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.codebuddy/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .codebuddy/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent codebuddy
npx skill-mall deploy <category>/<skill-name> --agent codebuddy --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.codebuddy/skills/` |
| Project | `.codebuddy/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — CodeBuddy matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in CodeBuddy to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.codebuddy/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/codebuddy.md](../skill-creation/codebuddy.md).
