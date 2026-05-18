# SkillMall Press Kit

## About SkillMall

### 50-Word Version

SkillMall is an open-source catalog of agent skills — structured instruction files that give AI coding assistants repeatable, shareable behaviors. One skill deploys to Claude Code, Cursor, GitHub Copilot, Gemini CLI, and any AgentSkills-compatible agent without modification. Twenty-six skills across eight categories. MIT licensed. Self-hosted.

---

### 100-Word Version

SkillMall is an open-source repository and catalog for agent skills — structured SKILL.md files that extend AI coding assistants with repeatable, shareable behaviors. Built on the AgentSkills open standard, each skill works across Claude Code, Cursor, GitHub Copilot, Codex, Gemini CLI, and any compatible agent without modification.

The catalog covers twenty-six skills across eight categories: development, design, writing, research, productivity, infrastructure, AI, and business. Skills ship with templates, completed examples, and a web catalog at skill-mall.com. The full stack is MIT licensed. Teams deploy in under a minute. No vendor account required.

---

### 300-Word Version

SkillMall is an open-source repository and web catalog for agent skills — structured SKILL.md files that give AI coding assistants repeatable, shareable behaviors. Every skill follows the AgentSkills open standard, which means a skill written once deploys without modification to Claude Code, Cursor, GitHub Copilot, Codex, Gemini CLI, and every other compatible agent.

The problem SkillMall solves is one every AI-augmented team hits: developers write the same instructions to their coding assistant over and over, one session at a time. Different engineers write different instructions for the same tasks. Knowledge doesn't transfer. Senior patterns don't scale. SkillMall replaces that ad-hoc system with a structured catalog that teams can deploy, version, and share.

The catalog ships with twenty-six skills across eight categories. Development skills cover code review, debugging, and commit writing. Productivity skills include phased implementation planning and feature inventory management. Business skills apply frameworks like Blue Ocean Strategy and Porter's Five Forces directly inside the developer workflow. Writing skills handle API documentation, technical writing, and onboarding guides. Every skill includes a SKILL.md instruction file, a human-readable README, output templates, and completed samples.

The web catalog at skill-mall.com provides full-text search, category navigation, and copy-paste deploy commands. The CLI — available as `npx skill-mall` — supports listing, searching, scaffolding, and deploying skills from the terminal. A `create` command accepts a natural-language description of what the skill should do, finds related existing skills as context, and scaffolds a complete new skill.

SkillMall is MIT licensed, self-hosted, and has no dependency on any particular LLM provider. The repository accepts contributions via pull request. The AgentSkills open standard it implements is maintained independently at agentskills.io, ensuring skills written for SkillMall remain portable as the agent ecosystem evolves.

---

## Key Facts

- **Founded:** 2026
- **License:** MIT
- **Standard:** AgentSkills open standard (agentskills.io)
- **Skill count:** 26 skills across 8 categories
- **Categories:** development, design, writing, research, productivity, infrastructure, ai, business
- **Supported agents:** Claude Code, Cursor, GitHub Copilot, Codex, Gemini CLI (any AgentSkills-compatible agent)
- **LLM providers supported:** OpenAI, Claude (Anthropic), Google Gemini, Groq, Ollama
- **Technology stack:** Next.js 15, TypeScript, SQLite, pure-JS vector search (no native extensions)
- **Distribution:** npx skill-mall CLI + web catalog
- **Repository:** github.com/[org]/skill-mall
- **Web catalog:** skill-mall.com
- **Contribution model:** open pull request, MIT licensed

---

## Technical Differentiators

*For technical publications, developer blogs, and engineering podcasts.*

**Research-first pipeline with fully structured output.** The `create` command does not generate a skill from a single prompt. It runs a multi-stage pipeline: discovery (finding related existing skills via semantic search), analysis (extracting patterns from related skills), and generation (producing frontmatter, instructions, templates, and samples in one pass). The pipeline makes more than sixty LLM calls across these stages, each producing structured JSON that feeds the next. The result is a skill that matches catalog conventions rather than hallucinating a novel format.

**Pure-JS vector search — no native extensions.** SkillMall's skill discovery and semantic search run entirely in JavaScript. No FAISS bindings, no native addons, no compilation step. The vector index builds from a plain SQLite file at startup and runs without any external process. This means the CLI works on every platform that runs Node without a build toolchain, and the web catalog deploys to any serverless edge runtime without worrying about binary compatibility.

**Atomic writes via temp-and-rename.** Every write operation in SkillMall — whether generating a new skill, updating the AGENTS.md index, or writing a template — uses a write-to-temp-then-rename pattern. The destination file is either the old version or the new version. A crash mid-write cannot produce a corrupt half-written file. This matters in a system where the AGENTS.md catalog is auto-generated on every commit and read by AI agents that have no error recovery for malformed input.

**AgentSkills open standard compatibility.** SkillMall does not invent its own format. Every skill follows the AgentSkills open standard frontmatter specification, which defines required fields (`name`, `description`), optional fields (`license`, `compatibility`), and extension conventions for agent-specific features. This means skills contributed to SkillMall are portable to any tool that implements the standard, and skills from other AgentSkills-compatible catalogs can be imported into SkillMall without reformatting.

**Self-hosted, no vendor lock-in.** The entire stack — catalog, search, CLI, and skill generation pipeline — runs without an account on any external service. Teams can fork the repository, configure their preferred LLM provider (OpenAI, Anthropic, Gemini, Groq, or a local Ollama instance), and run a fully private internal skill catalog with no data leaving their infrastructure. The five-provider support is not a feature list — it is an explicit architectural commitment to avoiding lock-in at the infrastructure layer.

---

## Media-Ready One-Liners

*Five versions for five contexts. Use the full sentence as written — these are engineered for clarity in the specific medium.*

**Developer podcast (productivity, coding workflow):**
"SkillMall is a catalog of drop-in instruction files that give your AI coding assistant the same repeatable behavior every time — like a package manager for how your AI works, not just what it runs."

**Business publication (team efficiency, ROI):**
"SkillMall lets engineering teams encode their senior developers' best practices into sharable files that every AI coding assistant on the team applies automatically — turning individual expertise into team-wide output."

**Tech blog (open source, architecture):**
"SkillMall is an MIT-licensed, self-hosted catalog built on the AgentSkills open standard — a single skill file deploys unchanged to Claude Code, Cursor, Copilot, and Gemini CLI, with no reformatting and no vendor account required."

**Product newsletter (new capability, practical benefit):**
"Instead of retyping your instructions to your AI assistant every session, SkillMall lets you write them once, share them with your team, and deploy them in under a minute to any major coding agent."

**General audience (simple, no jargon):**
"SkillMall is a library of instruction sets for AI coding tools — the same way a recipe tells a chef exactly how to cook a dish, a skill tells your AI assistant exactly how to handle a specific type of task."

---

## Journalist FAQ

**"What problem does SkillMall solve?"**

Every developer who uses an AI coding assistant has written the same instructions in a system prompt at least a dozen times. "When reviewing code, check for these things." "When writing a postmortem, use this structure." Those instructions live in no version control system, transfer to no new team member, and produce different results on different days depending on how they were worded that session. SkillMall gives those instructions a durable, versioned, shareable format — and provides a catalog so teams do not have to write common skills from scratch.

**"How is this different from just writing system prompts?"**

System prompts are unstructured text in a configuration field. They are not versioned alongside code, not shareable with a one-liner deploy command, not discoverable in a searchable catalog, and not portable across agents. SkillMall skills are structured files with defined frontmatter, committed to a repository, deployed like a package, and readable by any AgentSkills-compatible agent without modification. The format difference is the difference between a sticky note and a git-tracked runbook.

**"Is this just for Claude Code?"**

No. Every skill in the catalog follows the AgentSkills open standard, which defines a format that works across Claude Code, Cursor, GitHub Copilot, Codex, and Gemini CLI. A skill written for SkillMall copies to any of these agents without modification. The Claude Code frontmatter extensions (`when_to_use`, `allowed-tools`) are optional additions that non-Claude agents safely ignore — they do not break compatibility.

**"Why open source?"**

The core value of a skill catalog is network effects: more skills make the catalog more useful for everyone. A proprietary catalog has a ceiling determined by one team's capacity. An open catalog has a ceiling determined by every developer who uses AI coding tools. MIT licensing removes every possible barrier to contribution and adoption. Teams running private forks can contribute improvements back without legal review. The AgentSkills standard being maintained independently of SkillMall reinforces the same philosophy: the format belongs to the ecosystem, not to any single company.

**"What's the monetization plan?"**

The open-source repository is and will remain MIT licensed with no feature restrictions. Potential commercial paths include hosted catalog infrastructure for enterprises that want a private skill registry with access control and audit logs, managed skill creation pipelines for teams that want the `create` command without running their own LLM provider configuration, and professional services for teams building custom skill libraries. No commercial decisions have been finalized. The priority in the current phase is catalog quality and ecosystem adoption.

---

## Contact

**Press inquiries:**
[press@skill-mall.com] — placeholder

**Technical inquiries:**
[tech@skill-mall.com] — placeholder

**GitHub:**
github.com/[org]/skill-mall

**Web catalog:**
skill-mall.com

**AgentSkills open standard:**
agentskills.io
