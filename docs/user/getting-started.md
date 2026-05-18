# Getting Started

> **This page has moved.** The full Getting Started guide is now at [docs/developer/getting-started.md](../developer/getting-started.md).
> The user-facing quick start tutorial is at [docs/guide/quick-start.md](../guide/quick-start.md).

---

## Quick navigation

**New to SkillMall?** → [Introduction](../guide/introduction.md) — plain-language overview, user personas, 10-minute preview

**Developer setting up the codebase?** → [Developer Getting Started](../developer/getting-started.md) — clone, configure, run, first contribution walkthrough

**Just want to deploy a skill?** → [Quick Start Tutorial](../guide/quick-start.md) — zero to deployed skill in 10 minutes

**Want to create a skill?** → [Wizard Tutorial](../guide/tutorials/wizard-tutorial.md) or [CLI Tutorial](../guide/tutorials/cli-tutorial.md)

---

## Brief overview

SkillMall is a catalog of [Agent Skills](https://agentskills.io) — structured Markdown files that extend what AI coding agents can do. The same skill works in Claude Code, Cursor, GitHub Copilot, OpenAI Codex, Gemini CLI, and any other AgentSkills-compatible agent.

A skill is a `SKILL.md` file that contains instructions, templates, and examples that guide an AI agent's behavior for a specific task. When you invoke a skill (e.g., `/blue-ocean-strategy` in Claude Code), the agent reads the skill's contents and uses them to structure its response.

Skills are:
- **Portable** — follow the AgentSkills open standard, work across 5+ agents
- **Versioned** — committed to git, reviewed via PR, tracked with git blame
- **Composable** — link related skills with `linked-skills` in frontmatter
- **Quality-scored** — every skill has a 0-100 quality score across 5 dimensions

## Installing your first skill

```bash
# Deploy the Blue Ocean Strategy skill to Claude Code
npx skill-mall deploy business/blue-ocean-strategy
```

The next time you start a Claude Code session, the skill is available. Ask Claude to "apply the Blue Ocean Strategy framework" and it will follow the skill's structured methodology.

## Creating a skill

```bash
# Research-first pipeline
npx skill-mall create "incident postmortem" \
  --urls https://sre.google/workbook/postmortem-analysis/ \
  --category development

# Build and deploy
npx skill-mall confirm-research incident-postmortem
npx skill-mall deploy development/incident-postmortem
```

For the full walkthrough with screenshots, error recovery guidance, and explanation of every step, see [docs/guide/quick-start.md](../guide/quick-start.md).
