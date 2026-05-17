---
name: skill-creator
description: "Use when asked to create a new skill. Searches skills.sh, then scaffolds a SkillMall-format skill."
license: MIT
compatibility: "Dynamic context injection (Step 1) requires Claude Code. Other agents: skip Step 1 and proceed from Step 2."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: ai
  tags: "skill-creation, discovery, scaffolding"

# Claude Code extensions
when_to_use: "'create a skill for X', 'I need a skill that does Y', 'build me a skill'"
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
| Field | Constraint | Action |
|-------|-----------|--------|
| `name` | ≤ 64 chars, kebab-case, no consecutive hyphens | Derive from user's description |
| `description` | ≤ 1024 chars (spec); ≤ 150 for Claude Code efficiency | Imperative: "Use when..." — trigger phrase FIRST |
| `license` | Short license name | Default: MIT |
| `compatibility` | Note agent-specific requirements only if needed | Omit if universally compatible |
| `metadata.category` | development, design, writing, research, productivity, infrastructure, ai, business | Choose best fit |
| `metadata.tags` | 2–6 lowercase, comma-separated | Derive from scope |

**Description length**: the AgentSkills spec allows up to 1024 chars, but keep descriptions under 150 chars. All coding agents implement skill listing budgets and silently truncate descriptions that exceed the budget when context fills with many skills. Put the key trigger phrase in the first 80 chars.

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
- Universal deploy: `cp -r skills/<cat>/<name> ~/.agents/skills/`
- Claude Code deploy: `cp -r skills/<cat>/<name> ~/.claude/skills/`
- Cursor deploy: `cp -r skills/<cat>/<name> ~/.cursor/skills/`
- Any validation warnings
- Linked skills that would compound the output
