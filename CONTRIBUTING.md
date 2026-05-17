# Contributing to SkillMall

Thank you for contributing. SkillMall is an open-source catalog of Claude Code skills. Every contribution adds a reusable, structured skill that anyone can deploy.

## Prerequisites

- Node.js 18+
- Git
- A working Claude Code installation (to test your skill)

## Setup

```bash
git clone https://github.com/<owner>/skill-mall
cd skill-mall
npm install
npm run dev
```

Run `http://localhost:3000` to browse the catalog locally.

## Adding a Skill

### 1. Choose a category

| Category | What belongs here |
|----------|-------------------|
| `development` | Coding, debugging, testing, refactoring, code review |
| `design` | UI/UX design, design systems, Figma workflows, visual assets |
| `writing` | Documentation, PRDs, changelogs, content, communication |
| `research` | Investigation, data analysis, competitive research |
| `productivity` | Task management, planning, workflow automation |
| `infrastructure` | DevOps, CI/CD, deployment, monitoring, cloud |
| `ai` | Prompt engineering, agent design, ML workflows |
| `business` | Strategy, operations, stakeholder communication |

### 2. Scaffold the skill

```bash
bash scripts/new-skill.sh <category> <skill-name>
```

The skill name must be kebab-case and unique across all skills.

### 3. Fill in SKILL.md

The most important file. This is the content Claude receives when the skill is invoked.

Required frontmatter fields:

```yaml
---
name: your-skill-name
description: One-line summary of what this skill does and when to use it.
version: 1.0.0
category: development
tags:
  - tag-one
  - tag-two
author: your-github-username
---
```

The body should include:
- **When to Use** — conditions that should trigger this skill
- **What This Produces** — the artifact or output
- **Instructions** — step-by-step directives for Claude
- References to templates (`resources/templates/`) and scripts (`scripts/`)

### 4. Fill in README.md

Human-readable. Describes:
- What the skill produces
- When to use it vs. when not to
- Linked skills that compound the output
- Example output

### 5. Add resources (optional but encouraged)

| Path | Purpose |
|------|---------|
| `scripts/` | Shell scripts Claude should run as part of the skill |
| `resources/templates/` | Output templates for Claude to fill in |
| `resources/samples/` | Completed examples of good output |

### 6. Test your skill locally

```bash
# Copy to your Claude Code skills directory
cp -r skills/<category>/<skill-name> ~/.claude/skills/

# In a Claude Code session, invoke it
/<skill-name>
```

Verify the skill produces what it claims and that the instructions are clear.

### 7. Commit and open a PR

AGENTS.md regenerates automatically on commit via the Husky pre-commit hook.

```bash
git add skills/<category>/<skill-name>
git commit -m "feat: add <skill-name> skill"
gh pr create
```

## Quality Bar

PRs must meet this bar to be merged:

- [ ] SKILL.md has complete frontmatter (all required fields)
- [ ] Description is specific — says *what* it does, not just that it exists
- [ ] Instructions are actionable — Claude should be able to follow them without guessing
- [ ] README describes what a good output looks like
- [ ] If the skill produces a structured artifact, a template is included
- [ ] Tags are lowercase and match the skill's actual scope (2–6 tags)
- [ ] Linked skills exist in the catalog
- [ ] Skill has been tested in a live Claude Code session

## Updating a Skill

Edit the files directly. Bump `version` in the SKILL.md frontmatter following semver:
- `patch` — typo fixes, clarifications
- `minor` — new sections, improved instructions, added resources
- `major` — changed behavior, new output format, breaking changes

## Code of Conduct

Be direct. Be specific. Do not submit skills you have not tested. Do not pad skill names with vague superlatives.
