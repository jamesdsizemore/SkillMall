# Qwen Code — Setup Guide

> Alibaba Qwen AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.qwen/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .qwen/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent qwen-code
npx skill-mall deploy <category>/<skill-name> --agent qwen-code --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.qwen/skills/` |
| Project | `.qwen/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Qwen Code matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Qwen Code to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.qwen/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/qwen-code.md](../skill-creation/qwen-code.md).
