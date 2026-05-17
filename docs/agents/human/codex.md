# OpenAI Codex — Setup Guide

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.codex/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent codex
npx skill-mall deploy <category>/<skill-name> --agent codex --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.codex/skills/` |
| Project | `.agents/skills/` |

The `CODEX_HOME` environment variable overrides the global path if set.

## Invoking a skill

```
/skill-name

# Or describe your task — Codex matches against the skill description
```

## Verifying a skill is loaded

Type `/` in the Codex interface to see available skills.

## Updating a skill

Re-copy the skill directory. Changes take effect in the next Codex session.

## Removing a skill

```bash
rm -rf ~/.codex/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/codex.md](../skill-creation/codex.md).
