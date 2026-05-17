# SkillMall — Feature Roadmap & Implementation Phases

This document tracks every feature decision where Phase 1 ships first and Phase 2+ is planned. Updated whenever a phasing decision is made. Do not delete entries — change status and add notes.

---

## How to Read This

| Column | Meaning |
|--------|---------|
| Feature | The capability being built |
| Phase 1 | What ships first |
| Phase 2+ | What comes next |
| Status | `planned` → `in-progress` → `shipped` → `phase-2-planned` |
| Rationale | Why we phased it this way |

---

## Active Phasing Decisions

### Research-First Skill Creation

| | |
|--|--|
| **Feature** | Skill creation with automated domain research |
| **Phase 1** | UI Research Wizard — in-catalog wizard with URL input, visual confirmation of found tools/frameworks, one-click skill generation |
| **Phase 2** | Hybrid CLI + UI — shared `research-engine` library powers both `npx skill-mall create` (CLI) and the wizard. CLI adds `--urls` flag and `--no-confirm` for scripting |
| **Status** | `planned` |
| **Rationale** | UI wizard first ensures the confirmation step (seeing what was found before committing) is built and tested before adding CLI parity. CLI without a confirm step risks silently generating wrong artifacts. |
| **Phase 2 trigger** | After Phase 1 ships and the research-engine library is stable enough to expose directly |

---

### Skill Creation Interface

| | |
|--|--|
| **Feature** | How users create new skills |
| **Phase 1** | CLI scaffold (`bash scripts/new-skill.sh`, `npx skill-mall new`) — fast, offline, developer-focused |
| **Phase 2** | UI Skill Creation Wizard — multi-step form in the web catalog with live SKILL.md preview and real-time validation |
| **Status** | `phase-1-shipped` |
| **Rationale** | CLI shipped in initial build. UI wizard is the higher-value interface but requires more design and a backend |

---

### Agent Deployment

| | |
|--|--|
| **Feature** | Deploying skills to coding agents |
| **Phase 1** | Single-agent deploy via CLI (`npx skill-mall deploy --agent <name>`) and manual copy commands in the UI |
| **Phase 2** | Multi-agent deploy — detects all installed agents on the machine and deploys to all of them in one command |
| **Status** | `planned` |
| **Rationale** | Single-agent deploy is straightforward. Multi-agent requires agent detection logic (checking for ~/.claude, ~/.cursor, etc.) which adds complexity |

---

### Prompt Generation

| | |
|--|--|
| **Feature** | Generating example prompts for each skill |
| **Phase 1** | Dynamic prompt generation per skill at creation time, stored in `resources/prompts/`. Count scales with domain complexity (tool-specific prompts + category prompts + meta use-case prompts). Framework selected per prompt by evaluating all 40+ PE frameworks against each tool's characteristics — no hardcoded defaults. All prompts fully self-contained. Generated from SKILL.md content + research data. |
| **Status** | `planned` |
| **Rationale** | ELO Tester (originally Phase 2) has been moved to Future Development — see below. |

---

### Skills.sh Integration

| | |
|--|--|
| **Feature** | Relationship between SkillMall and skills.sh |
| **Phase 1** | Discovery only — `npx skill-mall find <query>` searches the skills.sh API for related skills before creating a new one |
| **Phase 2** | Full publish — push skills from SkillMall directly to the skills.sh public registry via `npx skill-mall publish` |
| **Status** | `phase-1-shipped` |
| **Rationale** | Read-only API integration is low-risk. Publishing requires authentication, validation against skills.sh standards, and a publish workflow |

---

## Backlog (Not Yet Phased)

Features where the phasing approach is not yet decided. Update when a decision is made.

| Feature | Notes |
|---------|-------|
| Skill Quality Score | Automated rubric displayed on skill cards |
| Agent Budget Analyzer | Simulate skill listing budget under load |
| Skill Dependency Graph | Force-directed graph of skill relationships |
| Ratings & Reviews | Community feedback per skill |
| Skill Collections / Packs | Curated bundles of related skills |
| Skill Forking | Fork + customize + track lineage |
| Trending Dashboard | Analytics on install velocity and search click-through |
| CI/CD Validation Action | GitHub Action for PR skill validation |
| npm Package Publisher | Package skills as npm modules |
| Skill Chain Builder | Visual canvas for multi-skill workflows |
| Skill Testing Framework | Test cases + pass rate scoring |
| RAG-Enhanced Skills | Attach document knowledge bases |
| Description Trigger Evaluator | Test descriptions against 20 sample queries |
| Multilingual Skill Support | Translated SKILL.md per locale |
| Skill Marketplace | Optional monetization layer |
| SkillMall MCP Server | Expose catalog as MCP server |
| Skill Self-Improvement Loop | Feedback-driven auto-improvement |
| Prompt Optimizer | Token efficiency audit + rewrite |
| Prompt Template Library | Reusable PE patterns by category |
| Domain Starter Templates | Pre-built SKILL.md starters for common use cases |
| Codebase-to-Skill Extractor | Extract patterns from codebases |
| Skill Version History | Diff view + changelog per version |
| AI-Assisted Skill Writer | Generate full SKILL.md from description |

---

## Future Development — Out of Current Scope

Features that have been explicitly deferred. Not abandoned — tracked here so they are not forgotten and can be revisited when the conditions that blocked them change.

---

### Prompt ELO Tester

| | |
|--|--|
| **Feature** | Generate multiple prompt variants for a skill, execute each against test cases, rank by output quality using an ELO rating system, surface the highest-performing prompts |
| **Why deferred** | Requires active LLM API credentials configured in the CLI. Each test run makes N variants × M test cases API calls — real cost, real latency, scales poorly without rate limiting and cost controls. The infrastructure to execute, capture, and compare LLM outputs is a significant independent build that would delay the core system. |
| **Condition to revisit** | Skill Testing Framework (Phase 2) is shipped and proven. The test case format and evaluation logic are stable. A cost estimation and budget cap mechanism is designed. Users have expressed demand for prompt quality comparison beyond what the Optimizer provides. |
| **Dependencies when it returns** | Skill Testing Framework (test case format + success criteria schema). LLM API abstraction layer (provider-agnostic: Claude, GPT-4, Gemini). Cost estimation per run before execution. |
| **Status** | `future — not in current scope` |

---

*Last updated: 2026-05-17*
