# SkillMall

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

## Setup

```bash
git clone https://github.com/jamesdsizemore/SkillMall
cd SkillMall
npm install
npm run prepare
npm run dev
```

## Documentation

- [Configuring Providers](docs/user/configuring-providers.md)
- [Using the Wizard](docs/user/using-the-wizard.md)
- [Using the CLI](docs/user/using-the-cli.md)
- [Pipeline Architecture](docs/reference/pipeline-architecture.md)
- [Provider Catalog](docs/reference/provider-catalog.md)
- [ResearchResult Schema](docs/reference/research-result-schema.md)
- [Prompt File Format](docs/reference/prompt-file-format.md)
- [Quality Score Rubric](docs/reference/quality-score-rubric.md)
- [API Routes](docs/reference/api-routes.md)

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

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
