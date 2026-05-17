# Deploying Skills

SkillMall skills follow the [AgentSkills open standard](https://agentskills.io) and work with any compatible agent. Copy a skill's directory to the right location for your agent.

## Agent paths

| Agent | Global (personal) | Project |
|-------|-------------------|---------|
| Universal | `~/.agents/skills/` | `.agents/skills/` |
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Cursor | `~/.cursor/skills/` | `.cursor/skills/` |
| GitHub Copilot | `~/.agents/skills/` | `.agents/skills/` |
| OpenAI Codex | `~/.agents/skills/` | `.agents/skills/` |
| Gemini CLI | `~/.gemini/skills/` | `.gemini/skills/` |

**Global** skills are available in all your projects. **Project** skills are available only in the current directory (checked into version control).

## Deploy with the CLI

The `npx skill-mall deploy` command handles the copy and target selection:

```bash
# Deploy to universal path (default)
npx skill-mall deploy development/my-skill

# Deploy to a specific agent
npx skill-mall deploy development/my-skill --agent claude-code
npx skill-mall deploy development/my-skill --agent cursor

# Deploy as a project skill (current directory)
npx skill-mall deploy development/my-skill --agent claude-code --scope project
```

## Deploy manually

```bash
# Copy from the SkillMall catalog
cp -r skills/development/my-skill ~/.claude/skills/

# Verify it's visible in Claude Code
# Open Claude Code and run:
/my-skill
```

## Project vs global skills

Use **global** when:
- You want a skill available in every project
- The skill is general-purpose (e.g., a code review skill)

Use **project** when:
- The skill contains project-specific knowledge
- You want to share it with your team via version control
- The skill references project-specific files or scripts

## Live reload

Most agents detect skill file changes without restarting. Claude Code watches skill directories and picks up edits within the current session. Cursor and Copilot behave similarly. If a skill does not appear after copying, restart your agent session.

## Verifying deployment

After deploying, verify the skill is visible:

| Agent | Command |
|-------|---------|
| Claude Code | `/skills` or ask "what skills are available?" |
| Cursor | Type `/` in agent chat to see available skills |
| GitHub Copilot | Type `#` in Copilot Chat |

## Removing a skill

Delete the skill directory:

```bash
rm -rf ~/.claude/skills/my-skill
```
