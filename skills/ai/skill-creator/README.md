# skill-creator

> Create a new SkillMall skill by searching skills.sh for related examples first, then scaffolding a complete SKILL.md.

## Overview

This skill automates the process of building a new Claude Code skill. It searches skills.sh for related existing skills, uses them as context and inspiration, then walks Claude through creating a fully-formed SkillMall skill — including frontmatter, body, supporting files, and validation.

## What It Produces

| Artifact | Description |
|----------|-------------|
| `SKILL.md` | Frontmatter-complete skill file with description ≤ 150 chars |
| `README.md` | Human-readable overview of the new skill |
| `resources/templates/` | Output template(s) for the new skill |
| `resources/samples/` | Completed example output |
| Validation report | Output of `validate-skill.sh` confirming the skill is ready |

## When to Use

Use this skill when:
- A user says "I need a skill that does X"
- A user says "create a skill for Y"
- A user wants to add a new skill to SkillMall
- You need to scaffold a skill without manually copying the template

Do not use when:
- The user just wants to edit an existing skill
- The user is asking about skills in general (use the catalog UI instead)

## Linked Skills

| Skill | When to Chain | What It Adds |
|-------|---------------|--------------|
| `validate-skill` | After — to verify the output | Confirms character limits and required fields |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/find-skills.sh` | Calls `skills.sh/api/search` and formats results as markdown for dynamic context injection |

## The find-skills Integration

When invoked, this skill calls `find-skills.sh` via dynamic context injection before Claude sees anything. The script:

1. URL-encodes the user's query
2. Calls `https://skills.sh/api/search?q=<query>&limit=8`
3. Formats results as markdown (name, source, install count)
4. Injects them into the skill context alongside the instructions

Claude then uses the found skills to inform the new skill's structure, description style, and approach — without the user having to manually search.

## Frontmatter Character Limits

This skill enforces SkillMall's character limits, which are grounded in Claude Code's internal truncation behavior:

| Field | Limit | Why |
|-------|-------|-----|
| `name` | 64 chars | Official Claude Code maximum |
| `description` | 150 chars | Fits within the 1,536-char combined cap without risk of truncation |
| `when_to_use` | 150 chars | Appended to description; same effective budget |

Skills with longer descriptions get silently truncated when `skillListingBudgetFraction` overflows (1% of context window by default, ~1,500 tokens). Front-loading the key trigger phrase in the first 80 characters ensures the most important part survives any truncation.

## Example Output

When a user says "I need a skill for writing commit messages":

The skill will:
1. Search skills.sh for "commit message writing" → find 3–5 related results
2. Determine: `name: commit-writer`, `category: development`
3. Write: `description: Write conventional commit messages from staged diff. Summarizes changes and flags risky edits.` (116 chars)
4. Scaffold `skills/development/commit-writer/` with full structure
5. Validate and report the deploy command
