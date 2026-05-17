# MCPJam — Setup Guide

> MCP-first AI coding environment.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.mcpjam/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .mcpjam/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent mcpjam
npx skill-mall deploy <category>/<skill-name> --agent mcpjam --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.mcpjam/skills/` |
| Project | `.mcpjam/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — MCPJam matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in MCPJam to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.mcpjam/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/mcpjam.md](../skill-creation/mcpjam.md).
