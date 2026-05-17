# Claude Code — Setup Guide

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> ~/.claude/skills/

# Project-level (this project only, commit to version control)
cp -r skills/<category>/<skill-name> .claude/skills/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent claude-code
npx skill-mall deploy <category>/<skill-name> --agent claude-code --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `~/.claude/skills/` |
| Project | `.claude/skills/` |
| Enterprise | Managed settings (see Claude Code docs) |

Claude Code also discovers skills from parent directories up to the repo root, and from nested subdirectories when you work in them.

## Invoking a skill

```
# Direct invocation
/skill-name

# Natural language (Claude loads the skill automatically)
"summarize my changes"
```

## Verifying a skill is loaded

```
/skills
```

Or ask: "What skills are available?"

Run `/doctor` to check whether the skill listing budget is overflowing.

## Updating a skill

Re-copy the skill directory over the existing one:

```bash
cp -r skills/<category>/<skill-name> ~/.claude/skills/
```

Changes take effect in the current session without restarting.

## Removing a skill

```bash
rm -rf ~/.claude/skills/<skill-name>
```

## Troubleshooting

**Skill not appearing**: Check that the directory name matches the `name` field in `SKILL.md`. Restart Claude Code if you created the `~/.claude/skills/` directory for the first time.

**Skill not triggering**: The description may not match your phrasing. Invoke directly with `/skill-name` to test. Check `/doctor` to see if descriptions are being truncated by the skill listing budget.

**Skill triggers too often**: Add `disable-model-invocation: true` to the SKILL.md frontmatter to require manual invocation only.

For skill creation guidance, see [skill-creation/claude-code.md](../skill-creation/claude-code.md).
