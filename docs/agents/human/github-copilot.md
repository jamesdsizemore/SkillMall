# GitHub Copilot — Setup Guide

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.copilot/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent github-copilot
npx skill-mall deploy <category>/<skill-name> --agent github-copilot --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.copilot/skills/` |
| Project | `.agents/skills/` |

## Invoking a skill

```
# In Copilot Chat, use # prefix
#skill-name

# Or describe the task — Copilot matches against the skill description
```

## Verifying a skill is loaded

Open Copilot Chat and type `#`. Installed skills appear in the completion list.

## Updating a skill

Re-copy the skill directory. Changes take effect in the next Copilot Chat session.

## Removing a skill

```bash
rm -rf ~/.copilot/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/github-copilot.md](../skill-creation/github-copilot.md).
