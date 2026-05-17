# SkillMall

An open-source catalog of Claude Code skills. Searchable, categorized, and ready to deploy.

## What is a skill?

A Claude Code skill is a structured Markdown file that directs Claude's behavior for a specific task. When invoked in Claude Code, the skill content is loaded into context and Claude follows its instructions. Skills ship with scripts, templates, and samples to produce consistent, repeatable output.

## Browse the catalog

```
npm run dev
```

Open `http://localhost:3000` to search and browse all skills locally.

## Deploy a skill

Find a skill in the catalog, then copy it to your Claude Code skills directory:

```bash
cp -r skills/<category>/<skill-name> ~/.claude/skills/
```

Invoke it in Claude Code:

```
/<skill-name>
```

## Add a skill

```bash
# Scaffold
bash scripts/new-skill.sh <category> <skill-name>

# Fill in SKILL.md, README.md, and optional resources
# Then commit — AGENTS.md regenerates automatically
git add skills/<category>/<skill-name>
git commit -m "feat: add <skill-name>"
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide and quality bar.

## Categories

| Category | Description |
|----------|-------------|
| `development` | Coding, debugging, testing, refactoring |
| `design` | UI/UX, design systems, visual assets |
| `writing` | Documentation, PRDs, content, communication |
| `research` | Investigation, data analysis, competitive research |
| `productivity` | Task management, planning, workflow automation |
| `infrastructure` | DevOps, CI/CD, deployment, cloud |
| `ai` | Prompt engineering, agent design, ML workflows |
| `business` | Strategy, operations, stakeholder communication |

## Skill structure

Every skill follows this layout:

```
skills/<category>/<skill-name>/
├── SKILL.md              # Instructions Claude receives on invoke (required)
├── README.md             # Human overview — what it produces, when to use it (required)
├── scripts/              # Shell scripts that augment the skill workflow
└── resources/
    ├── templates/        # Reusable output templates
    └── samples/          # Completed example outputs
```

## Setup

```bash
git clone https://github.com/<owner>/skill-mall
cd skill-mall
git init  # if not already a git repo
npm install
npm run prepare  # installs Husky pre-commit hook
npm run dev
```

## License

MIT
