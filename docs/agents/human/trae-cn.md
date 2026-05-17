# Trae CN — Setup Guide

> ByteDance AI coding agent (China region). Project path is shared with `trae`; global path differs.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.trae-cn/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .trae/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent trae-cn
npx skill-mall deploy <category>/<skill-name> --agent trae-cn --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.trae-cn/skills/` |
| Project | `.trae/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — Trae CN matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in Trae CN to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.trae-cn/skills/<skill-name>
```

## Known quirks

Project path `.trae/skills` is shared with the `trae` agent. Global path is `~/.trae-cn/skills`.

For skill creation guidance, see [skill-creation/trae-cn.md](../skill-creation/trae-cn.md).
