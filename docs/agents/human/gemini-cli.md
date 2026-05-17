# Gemini CLI — Setup Guide

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.gemini/skills/

# Project-level (this project only)
cp -r skills/<category>/<skill-name> .agents/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent gemini-cli
npx skill-mall deploy <category>/<skill-name> --agent gemini-cli --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.gemini/skills/` |
| Project | `.agents/skills/` |

## Project context file

Gemini CLI uses `GEMINI.md` as its project context file (analogous to `CLAUDE.md` for Claude Code). Create `.gemini/GEMINI.md` in your project to give Gemini CLI persistent project context.

## Invoking a skill

```
/skill-name

# Or describe your task — Gemini CLI matches against the skill description
```

## Verifying a skill is loaded

Type `/` in the Gemini CLI interface to see available skills.

## Updating a skill

Re-copy the skill directory. Changes take effect in the next Gemini CLI session.

## Removing a skill

```bash
rm -rf ~/.gemini/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/gemini-cli.md](../skill-creation/gemini-cli.md).
