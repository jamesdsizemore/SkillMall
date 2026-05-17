# CodeArts Agent — Setup Guide

> Huawei CodeArts AI coding agent.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.codeartsdoer/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .codeartsdoer/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent codearts-agent
npx skill-mall deploy <category>/<skill-name> --agent codearts-agent --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.codeartsdoer/skills/` |
| Project | `.codeartsdoer/skills/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — CodeArts Agent matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in CodeArts Agent to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf ~/.codeartsdoer/skills/<skill-name>
```

## Known quirks

Project path uses `.codeartsdoer/skills` — note the unusual directory name.

For skill creation guidance, see [skill-creation/codearts-agent.md](../skill-creation/codearts-agent.md).
