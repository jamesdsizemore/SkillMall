# Introduction to SkillMall

Welcome to SkillMall — an open-source catalog and generation platform for AI agent skills. This guide explains what SkillMall is, why it exists, and whether it's right for you.

## Table of Contents

1. [What is SkillMall?](#what-is-skillmall)
2. [What is an AI agent skill?](#what-is-an-ai-agent-skill)
3. [How skills work](#how-skills-work)
4. [Who is SkillMall for?](#who-is-skillmall-for)
5. [The four main actions](#the-four-main-actions)
6. [Skills across multiple agents](#skills-across-multiple-agents)
7. [A 10-minute preview of what's possible](#a-10-minute-preview)
8. [Is SkillMall right for you?](#is-skillmall-right-for-you)

---

## What is SkillMall?

SkillMall is a platform for creating, discovering, sharing, and deploying **AI agent skills** — structured instruction files that extend what AI coding assistants (like Claude Code, Cursor, Codex, and Gemini CLI) can do.

Think of it like an app store, but for AI behaviors. Instead of downloading apps that run on your phone, you download skills that run inside your AI assistant. Once a skill is deployed, invoking it is as simple as typing its name in a conversation.

SkillMall solves a real problem: as AI assistants become more capable, users spend significant time writing the same detailed instructions over and over — "use the Blue Ocean Strategy framework and produce an ERRC grid" or "follow our team's code review process, which requires functions under 30 lines and explicit null handling." Skills capture these instructions once, make them reusable, and make them shareable.

---

## What is an AI agent skill?

An AI agent skill is a text file — specifically, a `SKILL.md` file — that contains structured instructions for an AI agent. When you invoke a skill by name (e.g., `/blue-ocean-strategy` in Claude Code), the agent reads the skill's contents and uses them to guide its response.

Here's what a skill looks like:

```
---
name: blue-ocean-strategy
description: "Apply Blue Ocean Strategy: ERRC grid, Strategy Canvas, and non-customer analysis."
---

# Blue Ocean Strategy

Use this skill when you need to identify uncontested market spaces and make competition irrelevant.

## When to use

Apply this when:
- Evaluating a new market entry
- Questioning assumptions about an existing competitive strategy
- Looking for growth beyond existing market boundaries

## The ERRC Grid

Start with the Four Actions Framework...
[the rest of the skill instructions]
```

The `description` field is what the agent reads when deciding whether to invoke this skill. The body is what guides the agent's behavior after invocation. A good skill is specific, actionable, and produces a named output (like an ERRC grid or a strategy canvas).

---

## How skills work

When you deploy a skill to Claude Code and then start a new conversation:

1. Claude Code reads all your installed skills at session start
2. As you chat, Claude considers whether any skill is relevant to your request
3. If your message matches a skill's description (e.g., "help me think about competing in a crowded market"), Claude invokes the skill automatically and follows its instructions
4. The skill's framework guides Claude's approach — it produces an ERRC grid, for example, rather than generic competitive analysis advice

The match between your request and the skill is based on the skill's `description` field. SkillMall's **trigger accuracy evaluator** helps you test and improve how reliably your skill is invoked for the right requests.

You can also invoke a skill explicitly by name: type `/blue-ocean-strategy` and Claude will immediately engage the skill regardless of the conversational context.

---

## Who is SkillMall for?

SkillMall serves three distinct groups of people:

### Alex — the individual developer

**Profile:** Senior software engineer at a growing startup. Has been using Claude Code for six months. Writes the same debugging instructions every time they start a new session. Wishes Claude would just know to follow their team's code review standards.

**What Alex does with SkillMall:**
- Browses the catalog to find ready-made skills for code review, incident postmortem, and debugging session workflows
- Deploys them with one command (`npx skill-mall deploy development/code-review`)
- Forks the code-review skill to add their team's specific rules ("all functions must have explicit error handling, no magic numbers outside constants files")
- Shares the forked skill with the rest of the engineering team

**Result:** The whole team's Claude Code sessions follow the same review standard without anyone having to type it out. New engineers onboard faster.

### Sarah — the team lead at a consulting firm

**Profile:** Engineering manager at a 15-person product consultancy. Her team works across 5–6 different client projects simultaneously, each with different technology stacks, design systems, and business domains. Starting a new project means days of context-building before AI assistants are useful.

**What Sarah does with SkillMall:**
- Creates skills for each client's technology stack and conventions
- Creates business-domain skills for each client's industry (healthcare regulations, SaaS metrics, etc.)
- Deploys client-specific skill packs to relevant team members with `npx skill-mall deploy-pack`
- Contributes general-purpose skills back to the public catalog

**Result:** When a new engineer joins a client project, they deploy the client's skill pack and immediately have an AI assistant that knows the client's context.

### Marcus — the open-source maintainer

**Profile:** Maintains several popular TypeScript libraries. Spends significant time answering the same questions: "how do I configure X," "is this the right approach for Y," "what's the migration path from version 2 to 3."

**What Marcus does with SkillMall:**
- Creates a skill for each of his libraries that encodes the project's conventions and common patterns
- Publishes the skills to the public catalog with a link in the README
- Uses the self-improvement loop to refine skills based on user feedback

**Result:** Users who deploy his library skills get context-aware AI assistance that follows the project's actual patterns instead of generic advice.

---

## The Four Main Actions

SkillMall supports four primary workflows:

### 1. Browse and discover

The catalog at `http://localhost:3000` (or your deployed instance) lists all available skills organized by category. Use the search bar to find skills by name, tag, or description keyword. Click any skill to see its full content, quality score, version history, and community reviews.

### 2. Deploy

Found a skill you want to use? Deploy it in one command:

```bash
npx skill-mall deploy business/blue-ocean-strategy
```

For Claude Code, this copies the skill to `~/.claude/skills/`. The next time you start a Claude Code session, the skill is available. For other agents (Cursor, Codex, Gemini CLI), add the `--all-agents` flag to deploy to all detected agents simultaneously.

### 3. Create

Generate a new skill from any authoritative source using the research-first pipeline:

```bash
npx skill-mall create "blue ocean strategy" \
  --urls https://blueoceanstrategy.com/tools/
```

The pipeline fetches the URLs, extracts named tools and methodologies using an LLM, and generates a complete skill with SKILL.md, templates, samples, and framework-specific prompts. The whole process takes 2–5 minutes.

Or use the browser wizard at `http://localhost:3000/skills/create` for an interactive, guided experience.

### 4. Share

Contribute skills to the public catalog by opening a pull request. The CI pipeline validates your skill's quality score (minimum 70/100 required for merge) and tests that it follows the AgentSkills specification.

---

## Skills Across Multiple Agents

SkillMall skills follow the [AgentSkills open standard](https://agentskills.io) — the same skill file works across Claude Code, Cursor, Codex, Gemini CLI, and any other compatible agent. The `SKILL.md` format uses standard YAML frontmatter and markdown content that every agent can read.

The deploy command detects which agents are installed and copies skill files to each agent's expected directory:

| Agent | Skills directory |
|---|---|
| Claude Code | `~/.claude/skills/` |
| Cursor | `~/.cursor/skills/` |
| Codex | `~/.codex/skills/` |
| Gemini CLI | `~/.gemini/skills/` |
| GitHub Copilot | `~/.agents/skills/` |

Deploy to all of them at once:

```bash
npx skill-mall deploy business/blue-ocean-strategy --all-agents
```

---

## A 10-Minute Preview

Here's what you can accomplish in 10 minutes with SkillMall:

**Minutes 1–2: Install and configure**

```bash
npm install -g npx
npx skill-mall configure --provider claude-code
```

**Minutes 2–4: Browse and deploy a skill**

```bash
npm run dev
# Open http://localhost:3000
# Find a skill you want — let's say code-review
npx skill-mall deploy development/code-review
```

**Minutes 4–6: Use the skill in Claude Code**

Open Claude Code and start a new conversation. Ask: "I have a pull request that adds authentication middleware — can you review it with the code review standards?" Claude invokes the code-review skill automatically and produces a structured review.

**Minutes 6–9: Create your own skill**

```bash
npx skill-mall create "incident postmortem" \
  --urls https://sre.google/workbook/postmortem-analysis/
```

Wait 2–3 minutes for the pipeline to run. Review the extracted tools and confirm the build.

**Minute 9–10: Deploy and use your new skill**

```bash
npx skill-mall deploy development/incident-postmortem
```

Ask Claude Code: "We just had a production incident — help me write a postmortem." The skill guides a structured blameless postmortem.

In 10 minutes, you've gone from zero to two working skills that change how your AI assistant behaves for code review and incident response.

What would have taken 20–30 minutes of writing detailed instructions every single session is now automatic. And because the skills are files that live in your `~/.claude/skills/` directory, they persist across sessions, across projects, and across machines if you sync your dotfiles.

The more skills you accumulate, the more context your AI assistant has. A developer who has deployed 10–15 domain-specific skills effectively has an assistant that understands their work environment as well as a senior colleague would — one who knows the code review process, the debugging methodology, the documentation standards, and the strategic frameworks the team uses.

---

## Is SkillMall Right for You?

SkillMall is a good fit if:

- You use AI coding assistants regularly (Claude Code, Cursor, Codex, or similar)
- You find yourself repeating the same instructions across sessions
- Your team has established workflows that AI assistants don't automatically know
- You work in domains with specific methodologies (strategy, engineering, legal, design)
- You want AI assistance that knows your conventions, not generic advice

SkillMall may not be what you need if:

- You only use AI assistants occasionally and don't have recurring workflows
- You're looking for a fully hosted service with no setup required (SkillMall is self-hosted)
- You need real-time data (skills are static instruction files, not live data connectors)
- Your team uses AI assistants that don't support the AgentSkills format

Still not sure? The catalog is free to browse. Deploy one skill, use it for a week, and see if it changes how you work.

**The best way to evaluate SkillMall is to try the code-review skill.** It takes less than 30 seconds to deploy and starts working immediately in your next AI session. If you do a code review with Claude Code before and after deploying the skill, the difference in specificity and output consistency is immediately apparent. Either it changes how you work or it simply doesn't — and you'll know within a day of trying it.

---

## Understanding the Skill Catalog

The SkillMall catalog ships with 26 skills across 8 categories. These are real, production-quality skills that you can deploy and use immediately — they're not demos. Let's take a quick tour of what's available by category.

**AI (Artificial Intelligence)**
Skills for working with AI systems: writing agent skills, prompt engineering, and AI workflow design. The `skill-creator` skill (meta!) helps Claude Code generate new skills. The `development-workflow` skill encodes the 16-step development loop used in this project.

**Business**
Strategic analysis frameworks: Blue Ocean Strategy (ERRC grid + Strategy Canvas), competitive analysis with Porter's Five Forces, stakeholder communication templates, and OKR framework support.

**Development**
Code-level workflows: code review, PR description writing, conventional commit messages, debugging sessions, incident postmortems, and architecture decision records.

**Design**
UI/UX methodology: design thinking (Stanford d.school 5-stage process), user story mapping (Jeff Patton method), and sprint planning (Scrum guide-aligned).

**Infrastructure**
DevOps and deployment patterns: these are currently underrepresented in the catalog and represent an opportunity for community contributions.

**Productivity**
Time and work management: OKR frameworks, sprint planning, and user story mapping (also in design — some skills bridge multiple categories).

**Research**
Data and analysis: tidy data analysis (Wickham 2014), design thinking, and quantitative research methods.

**Writing**
Documentation and communication: technical documentation (Divio system), API documentation, stakeholder status updates, and onboarding guide creation.

The `_starters/` directory contains 20 additional domain starter templates — 80%-complete skills that you customize by filling in team-specific details. These cover code review, PR writing, commit messages, debugging, incident postmortems, ADRs, test writing, OKRs, user story mapping, sprint planning, Blue Ocean Strategy, competitive analysis, product requirements, onboarding guides, content strategy, design thinking, data analysis, and more.

---

## How Quality Scores Work

Every skill in the SkillMall catalog has a quality score from 0 to 100, displayed prominently on the skill detail page. This score reflects how well the skill follows the AgentSkills best practices across five dimensions:

- **Description quality (25 pts)**: Does the description start with an action verb? Is it under 150 characters? Is it specific enough to trigger reliably?
- **Content completeness (25 pts)**: Does the skill body have sufficient depth? Is it structured with headings? Does it include examples?
- **Frontmatter health (20 pts)**: Are all metadata fields filled in? Version, author, category, tags?
- **Resource richness (20 pts)**: Does the skill include templates, samples, or framework-specific prompts?
- **Link health (10 pts)**: Do all `linked-skills` references point to real skills in the catalog?

A score of 70+ is required for PR merge. The research-first pipeline (`npx skill-mall create + confirm-research`) typically generates skills scoring 80–90 by including templates, samples, and prompts automatically.

You can improve any skill's score by addressing the specific deductions shown on the skill detail page.

---

## The Community Layer

SkillMall has community features that make the catalog better over time.

**Reviews:** Authenticated users (GitHub login required) can leave 1–5 star reviews with up to 150 characters of feedback. Reviews help other users understand whether a skill is actually useful in practice, not just theoretically sound.

**Install tracking:** Every time a skill is deployed with `npx skill-mall deploy`, an anonymous install event is recorded (skill slug + agent type, no PII). Install velocity appears on trending pages and helps surface skills that are actively being used.

**Forking:** Any skill can be forked to create an independent copy. Forks track their lineage in frontmatter (`forked_from`), making it easy to see where customized skills came from. Fork counts appear on skill detail pages.

**Self-improvement:** When a skill has 10 or more feedback submissions, the skill author can request an LLM-generated improvement suggestion. The author reviews the suggestion and chooses to apply or reject it — no automatic changes are ever made to a skill without the author's explicit approval.

---

## Next Steps

- **[Quick Start](./quick-start.md)** — zero to deployed skill in 10 minutes (step-by-step)
- **[Wizard Tutorial](./tutorials/wizard-tutorial.md)** — create a skill using the browser wizard
- **[CLI Tutorial](./tutorials/cli-tutorial.md)** — create a skill using the command line
- **[Understanding Quality Scores](./understanding-quality.md)** — the full quality rubric explained
- **[Glossary](./glossary.md)** — definitions for all terms used in SkillMall
