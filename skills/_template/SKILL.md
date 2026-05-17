---
# REQUIRED — max 64 chars, lowercase letters, numbers, hyphens only
name: skill-name

# REQUIRED — max 150 chars. Put the key use case FIRST (truncation starts here).
description: One-line key use case. Under 150 chars. Front-load the trigger phrase.

# OPTIONAL — max 150 chars. Appended to description in skill listing. Same char budget.
when_to_use: "Trigger phrases: 'do X', 'help me with Y', 'run Z'"

# SkillMall metadata (not read by Claude Code — used by catalog only)
version: 1.0.0
category: development
tags:
  - tag-one
  - tag-two
author: your-github-username
license: MIT
linked_skills:
  - related-skill-name

# OPTIONAL Claude Code behavior flags
disable-model-invocation: false
user-invocable: true
# allowed-tools: Read Bash(git *)
# argument-hint: "[optional-arg]"
# context: fork
# agent: Explore
---

# Skill Name

One to two sentence overview. State what this skill does and what it produces.

## When to Use

- Specific trigger: user asks "..."
- Specific trigger: user wants to ...
- Anti-pattern: do NOT use when ...

## What This Produces

- Primary output: describe the artifact
- Secondary output: describe any side effects

## Instructions

### Step 1 — Gather context

What Claude should read or check first.

### Step 2 — Core work

The main directives. Be specific. Use imperative voice.

### Step 3 — Verify and return

How Claude confirms the output is correct before responding.

## Supporting Files

Reference any supporting files here so Claude knows to load them:

- For the output template, see [resources/templates/output-template.md](resources/templates/output-template.md)
- For a completed example, see [resources/samples/sample-output.md](resources/samples/sample-output.md)
- To run automation, execute [scripts/run.sh](scripts/run.sh)

## Linked Skills

- `related-skill-name` — chain after this skill to extend the output
