# Continue — Setup Guide

Continue is a VS Code and JetBrains extension. Note: Continue uses `.continue/skills/` as its project path — not `.agents/skills/` like most other agents.

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.continue/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .continue/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent continue
npx skill-mall deploy <category>/<skill-name> --agent continue --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.continue/skills/` |
| Project | `.continue/skills/` |

## Invoking a skill

```
/skill-name

# Or describe your task — Continue matches against the skill description
```

## Verifying a skill is loaded

Open the Continue panel in VS Code/JetBrains and type `/` to see available skills.

## Updating a skill

Re-copy the skill directory. Reload the Continue extension or restart your editor for changes to take effect.

## Removing a skill

```bash
rm -rf ~/.continue/skills/<skill-name>
```

For skill creation guidance, see [skill-creation/continue.md](../skill-creation/continue.md).
