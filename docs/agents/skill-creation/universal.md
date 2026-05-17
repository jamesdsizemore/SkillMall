# Universal Skills

How to write a skill that works across all AgentSkills-compatible agents without modification.

## What "universal" means

A universal skill uses only the fields defined in the [AgentSkills open standard](https://agentskills.io/specification) and makes no assumptions about which agent will load it. Any compatible agent — Claude Code, Cursor, Codex, Copilot, Gemini CLI, Continue — can read and execute a universal skill without error.

## The safe subset of frontmatter

Use only these fields in a universal skill:

```yaml
---
name: skill-name
description: "Use when... One-line summary under 150 chars."
license: MIT
compatibility: "Note any tool or environment requirements here. Omit if none."
metadata:
  version: "1.0.0"
  author: your-github-username
  category: development
  tags: "tag-one, tag-two"
  linked-skills: "other-skill-name"
---
```

All other top-level frontmatter fields (`when_to_use`, `disable-model-invocation`, `user-invocable`, `argument-hint`, `arguments`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`) are agent-specific. Using them in a universal skill will either produce warnings or be silently ignored, depending on the agent. Either outcome means your skill is no longer predictably portable.

## The 150-character description rule

**Keep `description` under 150 characters.** This is the most important rule for universal compatibility.

Every coding agent implements a skill listing budget — a limit on how much context skill listings consume before the agent starts compressing or truncating them. The AgentSkills spec allows up to 1,024 characters as a technical maximum, but no real agent presents descriptions that long unmodified. In practice, descriptions over 150 characters risk silent truncation when the agent's context fills with many skills loaded concurrently.

The effect of truncation is invisible: the skill still loads, but the description the agent sees is incomplete. This degrades trigger accuracy — the agent may not recognize when the skill applies.

Rules for writing descriptions under 150 chars:

- Put the primary trigger phrase in the first 80 characters.
- Use imperative voice: "Use when writing a commit message" not "This skill helps you write commit messages."
- State the condition, not the mechanism: describe when to invoke, not how it works.
- Do not repeat the skill name in the description.

Bad (186 chars):
```
Helps you write well-structured commit messages by analyzing your staged diff, identifying what changed, and producing a semantic commit message that follows conventional commits format.
```

Good (89 chars):
```
Use when writing a commit message. Analyzes staged diff and produces a semantic message.
```

## What to include in the skill body

The skill body is plain Markdown. Every agent parses it the same way. Structure it consistently:

```markdown
# Skill Name

Brief description. One to three sentences.

## When to Use

- Specific condition 1
- Specific condition 2
- Phrases a user might say that indicate this skill applies

## What This Produces

- Primary output artifact
- Secondary outputs

## Instructions

### Step 1 — [Name]
Directed behavior. Be concrete.

### Step 2 — [Name]
The main work.

### Step 3 — Verification
How to verify output before returning to the user.
```

Avoid agent-specific syntax in the body. Dynamic context injection using `!` commands (e.g., `!git log --oneline -10`) is a Claude Code extension — do not include it in a universal skill body.

## When to write a universal skill

Write a universal skill when:

- The skill's behavior does not require agent-specific features to be useful.
- You want the skill to be deployable from SkillMall to any agent.
- The skill's instructions are general enough that any capable agent can follow them without specialized tooling.
- You are contributing to SkillMall and want maximum catalog reach.

Write an agent-specific skill when:

- The skill's core behavior depends on dynamic context injection, subagent forking, tool restrictions, or another feature only one agent supports.
- The skill is a thin wrapper around a specific agent's workflow that would be meaningless on another agent.
- You are building a private skill for a single team and that team uses one agent exclusively.

A useful middle path: write the skill as universal, then add agent-specific fields in commented blocks or documented as optional. Users on Claude Code get the enhanced behavior; users on other agents get the universal behavior.

## How to test a universal skill

There is no single test harness for all agents. Test universally by:

1. Validating the frontmatter YAML parses without errors.
2. Confirming `description` is under 150 characters.
3. Confirming no agent-specific fields are present at the top level.
4. Loading the skill in at least one agent and verifying it triggers correctly.
5. Reading the skill body and asking: "Would any capable language model be able to follow these instructions without access to agent-specific APIs?"

If the answer to step 5 is yes, the skill is universal.

## What to put in the `compatibility` field

Use `compatibility` to communicate requirements that may not be available in all environments:

```yaml
# Requires specific CLI tools
compatibility: "Requires git and the GitHub CLI (gh)."

# Requires network access
compatibility: "Requires internet access to call the GitHub API."

# Platform-specific
compatibility: "Shell scripts use bash. On Windows, run in WSL or Git Bash."

# No special requirements — omit the field entirely
```

Do not use `compatibility` to describe agent requirements unless the skill genuinely cannot run on a specific agent. If the skill works universally, omit the field.

## Universal skill checklist

Before publishing a universal skill:

- [ ] `name` is kebab-case, under 64 chars
- [ ] `description` is under 150 chars with the trigger phrase in the first 80
- [ ] Only `name`, `description`, `license`, `compatibility`, and `metadata` appear at the top level
- [ ] No `!` commands or dynamic injection in the body
- [ ] Body uses plain Markdown with no agent-specific syntax
- [ ] `compatibility` notes any tool or environment requirements
- [ ] Skill has been tested in at least one agent
