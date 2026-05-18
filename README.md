# SkillMall

[![Validate Skills](https://github.com/jamesdsizemore/SkillMall/actions/workflows/validate-skills.yml/badge.svg)](https://github.com/jamesdsizemore/SkillMall/actions/workflows/validate-skills.yml)

An open-source catalog and generation platform for AI agent skills. Create production-quality skills from any URL or description using a research-first pipeline. Works with Claude Code, Cursor, Codex, Gemini CLI, and any AgentSkills-compatible agent.

## Pipeline Overview

```
Input (topic + URLs)
    │
    ▼
Research Engine ──── fetches URLs, extracts tools with LLM
    │
    ├──────────────────────────┐
    ▼                          ▼
Skill Builder            Prompt Engine
(SKILL.md, templates,    (framework selection,
 samples, scripts)        prompt generation)
    │                          │
    └──────────────────────────┘
                  │ merged
                  ▼
         Validation → Write to skills/
```

## Quick Start — Create a Skill

**Step 1: Configure your LLM provider**

```bash
# Claude Code CLI (no API key needed — uses existing auth)
npx skill-mall configure --provider claude-code

# Or OpenAI
npx skill-mall configure --provider openai --key sk-...

# Or via web UI at http://localhost:3000/settings/providers
```

**Step 2: Create**

```bash
# Research-first (recommended)
npx skill-mall create "blue ocean strategy" \
  --urls https://blueoceanstrategy.com/tools/ \
  --category business

# Review the extracted tools
cat skill-builder-output/blue-ocean-strategy/research-result.json

# Build and write the skill
npx skill-mall confirm-research blue-ocean-strategy
```

**Or use the browser wizard:**

```bash
npm run dev
# Open http://localhost:3000/skills/create
```

## Browse and Deploy

```bash
npm run dev
# Open http://localhost:3000 to search the catalog

# Deploy a skill to Claude Code
npx skill-mall deploy business/blue-ocean-strategy
```

## Developer Setup

```bash
git clone https://github.com/jamesdsizemore/SkillMall
cd SkillMall
npm install
cd cli && npm install && cd ..
npm run db:migrate
npm run dev
```

**Requirements:** Node.js 20+, npm 10+

**Full developer documentation:** [docs/developer/getting-started.md](docs/developer/getting-started.md)

Topics covered: all 5 LLM provider configurations, GitHub OAuth setup, database management, project structure with explanations, architecture overview (pipeline, RAG with pure-JS cosine similarity, Nothing design system), test suite guide, complete environment variable reference.

## Documentation

### Developer
- [Getting Started](docs/developer/getting-started.md) — clone, configure, run, first contribution
- [Architecture](docs/developer/architecture.md) — internal system design, provider abstraction, database
- [API Reference](docs/developer/api-reference.md) — all API routes with schemas and curl examples
- [CLI Reference](docs/developer/cli-reference.md) — all CLI commands with flags and expected outputs
- [Contributing](docs/developer/contributing.md) — skill contribution workflow, code standards, PR process
- [Extending SkillMall](docs/developer/extending.md) — adding providers, commands, routes, quality dimensions
- [Deployment](docs/developer/deployment.md) — Vercel, Railway, VPS, env vars, SQLite in production
- [FAQ](docs/developer/faq.md) — why SQLite, why multi-provider, how to add a category, and more
- [Security](docs/developer/security.md) — input validation, SQL injection prevention, auth security

### User Guide
- [Introduction](docs/guide/introduction.md) — what SkillMall is, key concepts, user personas
- [Quick Start](docs/guide/quick-start.md) — zero to deployed skill in 10 minutes
- [Wizard Tutorial](docs/guide/tutorials/wizard-tutorial.md) — creating a skill via the web wizard
- [CLI Tutorial](docs/guide/tutorials/cli-tutorial.md) — creating a skill via the command line
- [Customizing Skills](docs/guide/tutorials/customizing-skills.md) — forking and personalizing skills
- [Understanding Quality Scores](docs/guide/understanding-quality.md) — the 5-dimension rubric
- [Using Collections](docs/guide/using-collections.md) — starter packs and custom collections
- [Prompt Optimization](docs/guide/prompt-optimization.md) — framework library, optimizer, overrides
- [Troubleshooting](docs/guide/troubleshooting.md) — 25+ specific problems with step-by-step fixes
- [Glossary](docs/guide/glossary.md) — 40+ defined terms

### Marketing
- [Landing Page Copy](docs/marketing/landing-page-copy.md)
- [Value Proposition](docs/marketing/value-proposition.md)
- [Use Cases](docs/marketing/use-cases.md)
- [Comparison Guide](docs/marketing/comparison.md)
- [Press Kit](docs/marketing/press-kit.md)

## Skill Structure

Every skill follows this layout:

```
skills/<category>/<skill-name>/
├── SKILL.md              # Instructions the agent receives on invoke (required)
├── README.md             # Human overview (required)
├── scripts/              # Shell scripts
└── resources/
    ├── templates/        # Blank artifact templates
    ├── samples/          # Completed example outputs
    └── prompts/          # Framework-selected, self-contained prompts
```

## Categories

| Category | Description |
|---|---|
| `development` | Coding, debugging, testing, refactoring |
| `design` | UI/UX, design systems, visual assets |
| `writing` | Documentation, PRDs, content, communication |
| `research` | Investigation, data analysis, competitive research |
| `productivity` | Task management, planning, workflow automation |
| `infrastructure` | DevOps, CI/CD, deployment, cloud |
| `ai` | Prompt engineering, agent design, ML workflows |
| `business` | Strategy, operations, stakeholder communication |

## Contributing

See [docs/developer/contributing.md](docs/developer/contributing.md) for the full contribution guide including skill quality standards, code conventions, and the 16-step development loop.

## License

MIT
