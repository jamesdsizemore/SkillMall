# iFlow CLI — Setup Guide

> AI coding agent CLI.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.iflow/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .iflow/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent iflow-cli
npx skill-mall deploy <category>/<skill-name> --agent iflow-cli --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.iflow/skills/` |
| Project | `.iflow/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — iFlow CLI matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in iFlow CLI to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.iflow/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/iflow-cli.md](../skill-creation/iflow-cli.md).
