# SkillMall

SkillMall is an open-source repository and catalog for agent skills following the [AgentSkills open standard](https://agentskills.io). Skills are structured SKILL.md files that extend AI coding agent capabilities. The same skill works across Claude Code, Cursor, GitHub Copilot, Codex, Gemini CLI, and any compatible agent.

## Repository structure

```
skill-mall/
├── skills/                     # All skills, organized by category
│   ├── _template/              # Copy this to scaffold a new skill
│   ├── development/
│   ├── design/
│   ├── writing/
│   ├── research/
│   ├── productivity/
│   ├── infrastructure/
│   ├── ai/
│   └── business/
├── scripts/
│   ├── new-skill.sh            # Scaffold a new skill from _template
│   ├── sync-agents.sh          # Regenerate AGENTS.md (runs on commit via Husky)
│   └── validate-skill.sh       # Validate SKILL.md frontmatter
├── cli/                        # npx skill-mall CLI package
│   └── src/commands/           # list, find, deploy, new, validate, create
├── app/                        # Next.js 15 catalog web UI
│   ├── page.tsx                # Homepage: search + category nav + skill grid
│   ├── skills/[category]/[slug]/ # Skill detail page
│   └── contributing/           # Contributing guide page
├── components/skill-mall/      # UI components
├── lib/
│   ├── skills.ts               # Parses SKILL.md files for the web catalog
│   └── categories.ts           # Category metadata (colors, icons)
├── docs/
│   ├── user/                   # User guides (getting started, deploying, CLI)
│   ├── reference/              # Technical reference (frontmatter spec, compatibility)
│   └── agents/                 # Per-agent reference docs for skill creation
├── AGENTS.md                   # Auto-generated skill catalog index
└── CONTRIBUTING.md             # How to contribute a skill
```

## Skill format (AgentSkills open standard)

Every skill is a directory with a required `SKILL.md` and optional supporting files:

```
skills/<category>/<skill-name>/
├── SKILL.md                    # Required: frontmatter + instructions
├── README.md                   # Required by SkillMall: human overview
├── scripts/                    # Optional: shell scripts
└── resources/
    ├── templates/              # Optional: output templates
    └── samples/                # Optional: completed examples
```

### SKILL.md frontmatter

```yaml
---
# Required (AgentSkills spec)
name: skill-name               # max 64 chars, kebab-case, matches directory name
description: "Use when ..."    # max 1024 chars spec / 150 chars effective (universal best practice)

# Optional spec fields
license: MIT
compatibility: "Note special requirements here. Omit if universally compatible."

# SkillMall catalog metadata (read by catalog UI, ignored by agents)
metadata:
  version: "1.0.0"
  author: github-username
  category: development        # development|design|writing|research|productivity|infrastructure|ai|business
  tags: "tag-one, tag-two"
  linked-skills: "other-skill-name"

# Claude Code extensions (optional; other agents ignore unknown fields)
# when_to_use: "Additional trigger phrases"
# allowed-tools: "Read Bash(git *)"
# disable-model-invocation: false
---
```

**Character limits**: The AgentSkills spec allows descriptions up to 1024 chars. However, all coding agents implement skill listing budgets and silently truncate descriptions that exceed the budget when context fills with many skills. Keep `description` under 150 chars universally. Put the primary trigger phrase in the first 80 characters.

**Name rules**: lowercase letters, numbers, and hyphens only. No leading, trailing, or consecutive hyphens. Must match the directory name exactly.

## Adding a skill

```bash
# Scaffold from template
bash scripts/new-skill.sh <category> <skill-name>

# Edit the generated SKILL.md and README.md
# Then validate
bash scripts/validate-skill.sh skills/<category>/<skill-name>

# Commit — AGENTS.md regenerates automatically
git add skills/<category>/<skill-name>
git commit -m "feat: add <skill-name> skill"
```

Or use the CLI:

```bash
npx skill-mall create "description of what the skill should do"
```

The `create` command searches skills.sh for related existing skills, uses them as context, then scaffolds a complete SkillMall skill.

## Deploying skills (for catalog users, not contributors)

```bash
# Universal
cp -r skills/<category>/<name> ~/.agents/skills/

# Claude Code
cp -r skills/<category>/<name> ~/.claude/skills/

# Cursor
cp -r skills/<category>/<name> ~/.cursor/skills/
```

Or use the CLI: `npx skill-mall deploy <category>/<name> --agent <agent>`

## Validation rules

Run `bash scripts/validate-skill.sh` or `npm run validate` before committing.

- `name`: required, max 64 chars, kebab-case, matches directory name
- `description`: required, max 1024 chars (spec), warn above 150 chars (universal best practice)
- `when_to_use` (if present): max 150 chars
- `README.md`: must be present alongside SKILL.md

## Web catalog

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build
```

Skills are parsed from `skills/` at build time using `lib/skills.ts` (gray-matter).

## CLI

```bash
npx skill-mall list              # List all skills
npx skill-mall find <query>      # Search skills.sh
npx skill-mall deploy <cat/name> # Deploy to an agent
npx skill-mall new <cat> <name>  # Scaffold a new skill
npx skill-mall validate          # Validate all frontmatter
npx skill-mall create "<desc>"   # Find related + scaffold new skill
```

## Agent-specific skill creation

See `docs/agents/` for per-agent reference material:
- `docs/agents/claude-code.md` — Claude Code frontmatter extensions and native features
- `docs/agents/cursor.md` — Cursor skill creation reference
- `docs/agents/codex.md` — Codex skill creation reference
- `docs/agents/github-copilot.md` — Copilot skill creation reference
- `docs/agents/gemini-cli.md` — Gemini CLI reference
- `docs/agents/universal.md` — How to write skills that work everywhere

## AGENTS.md

`AGENTS.md` is auto-generated by `scripts/sync-agents.sh`. Do not edit it manually. It regenerates automatically on every commit that touches `skills/` via the Husky pre-commit hook.
