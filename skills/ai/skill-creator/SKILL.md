---
name: skill-creator
description: Create a new SkillMall skill by searching skills.sh for related examples first.
when_to_use: "Trigger: 'create a skill for X', 'I need a skill that does Y', 'build me a skill'"
version: 1.0.0
category: ai
tags:
  - skill-creation
  - discovery
  - scaffolding
author: jamesdsizemore
license: MIT
disable-model-invocation: false
user-invocable: true
argument-hint: "[skill description or topic]"
---

# Skill Creator

Creates a new SkillMall-format skill. Searches skills.sh for related existing skills first, uses them as context, then scaffolds a complete SKILL.md following the SkillMall template.

## Step 1 — Search skills.sh for related skills

Run this first to discover what already exists:

!`bash ${CLAUDE_SKILL_DIR}/scripts/find-skills.sh "$ARGUMENTS"`

## Step 2 — Analyze the results

Review the found skills above. For each relevant result:
- Note the name, description, and category
- Identify patterns in how similar skills are structured
- Note what they produce and how they handle arguments

If no skills were found, proceed with the user's description only.

## Step 3 — Determine the new skill's metadata

Based on the user's request and the found skills, determine:

| Field | Constraint | Action |
|-------|-----------|--------|
| `name` | ≤ 64 chars, kebab-case | Derive from user's description |
| `description` | ≤ 150 chars, trigger phrase FIRST | Write a precise, front-loaded description |
| `when_to_use` | ≤ 150 chars | List 2–3 specific trigger phrases |
| `category` | One of: development, design, writing, research, productivity, infrastructure, ai, business | Choose the best fit |
| `tags` | 2–6 lowercase tags | Derive from the skill's scope |

**Critical**: descriptions that exceed 150 characters are silently truncated in Claude Code's skill listing budget (`skillListingBudgetFraction`). Put the most important trigger keyword in the first 80 characters.

## Step 4 — Scaffold the skill

Run the scaffold command with the determined name and category:

```bash
bash scripts/new-skill.sh <category> <skill-name>
```

Then open the generated SKILL.md and fill in:
1. The final frontmatter (description, when_to_use, tags, author)
2. The instructions body — be specific, use imperative voice, keep under 500 lines
3. References to any supporting files

## Step 5 — Create supporting files

Based on what the skill produces, create:
- `resources/templates/` — output structure Claude should fill in
- `resources/samples/` — one completed example showing ideal output
- `scripts/` — any shell scripts that automate repetitive parts

## Step 6 — Validate and report

Run validation:

```bash
bash scripts/validate-skill.sh skills/<category>/<skill-name>
```

Report to the user:
- The skill directory path
- The deploy command: `cp -r skills/<cat>/<name> ~/.claude/skills/`
- Any validation warnings
- Linked skills that would compound the output
