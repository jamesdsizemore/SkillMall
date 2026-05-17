---
# REQUIRED — AgentSkills open standard (agentskills.io)
# Works with Claude Code, Cursor, GitHub Copilot, Codex, Gemini CLI, and any compatible agent.

# max 64 chars · lowercase letters, numbers, hyphens · no leading/trailing/consecutive hyphens
name: skill-name

# max 1024 chars per spec. Use imperative: "Use when..." — put the trigger phrase FIRST.
# Claude Code best practice: keep under 150 chars to avoid skill-listing budget truncation.
description: "Use when [trigger]. Produces [output]."

# OPTIONAL spec fields
license: MIT
# compatibility: "Requires Python 3.11+, internet access." (omit if no special requirements)

# SkillMall catalog metadata — read by the catalog UI, not by agents
metadata:
  version: "1.0.0"
  author: your-github-username
  category: development
  tags: "tag-one, tag-two"
  linked-skills: "related-skill-name"

# OPTIONAL — Claude Code extensions (safe to leave in; other agents ignore unknown fields)
# when_to_use: "Additional trigger phrases for Claude Code's skill listing."
# allowed-tools: "Read Bash(git *)"
# disable-model-invocation: false
# argument-hint: "[optional-arg]"
---

# Skill Name

One to two sentence overview. What this skill does and what it produces.

## When to Use

- Trigger: user asks "..."
- Trigger: user wants to ...
- Do NOT use when: ...

## What This Produces

- Primary output: describe the artifact
- Secondary output: describe any side effects

## Instructions

### Step 1 — Gather context

What the agent should read or check first.

### Step 2 — Core work

The main directives. Be specific. Use imperative voice.
Include both shell (bash) and PowerShell variants for any terminal commands.

### Step 3 — Verify and return

How the agent confirms the output is correct before responding.

## Supporting Files

Reference supporting files so the agent knows to load them:

- Template: [resources/templates/output-template.md](resources/templates/output-template.md)
- Sample: [resources/samples/sample-output.md](resources/samples/sample-output.md)
- Script: [scripts/run.sh](scripts/run.sh)

## Linked Skills

- `related-skill-name` — chain after this skill to extend the output
