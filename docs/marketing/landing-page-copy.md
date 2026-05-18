# SkillMall Landing Page Copy

---

## 1. HERO SECTION

**Headline:**
Stop rewriting instructions. Deploy skills that actually stick.

**Subheadline:**
One command installs structured AI skills into Claude Code, Cursor, Codex, Gemini CLI, and more.

**Primary CTA:**
Browse the catalog

**Secondary CTA:**
Deploy your first skill

---

## 2. PROBLEM STATEMENT PARAGRAPH

Every session starts from zero. You paste the same code review rules into the chat. You re-explain your project's testing conventions. Your teammate writes a completely different prompt for the same task. The AI gets it right once and forgets it by morning. You spend a quarter of your prompting time rebuilding context that should already be there, and the larger your team grows, the worse the inconsistency gets. There is no system for this — just a pile of notes in Notion that nobody reads.

---

## 3. PRODUCT OVERVIEW PARAGRAPH

SkillMall is an open catalog of structured AI skills following the AgentSkills open standard. A skill is a directory with a SKILL.md file: frontmatter that tells your agent what the skill is for, and a markdown body with the exact instructions the agent should follow. Install a skill once and it is available in every session without copying and pasting anything. The catalog ships with 26 skills across 8 categories — code review, commit writing, debugging, sprint planning, onboarding guides, and more — and you can generate a custom skill from any URL or description in under two minutes using the research pipeline. Skills are plain files. You own them. They live in version control with the rest of your code.

---

## 4. THREE CORE FEATURES

### Feature 1: Research-first skill generation

Writing a skill from scratch takes 30 minutes of trial and error. The SkillMall pipeline cuts that to under two minutes. Give it a topic and optional source URLs. The research engine fetches the content, extracts the relevant text, and runs it through a 5-stage generation pipeline that produces a complete SKILL.md, supporting scripts, sample outputs, and prompt files — all validated and written atomically so a failed run never leaves corrupted output behind. Works with OpenAI, Gemini, Groq, Ollama, or the Claude Code CLI with no separate API key required.

### Feature 2: One-command deployment to any agent

A skill you cannot deploy is a skill that does nothing. SkillMall ships a CLI that detects which agents are installed on your machine and copies the skill to the right directory for each one. One command, no path lookup, no manual copying. `npx skill-mall deploy productivity/code-review` drops the skill into `~/.claude/skills/`, `~/.cursor/skills/`, `~/.codex/skills/`, and wherever else it belongs. Scope it to a single project with `--scope project`. Deploy to a specific agent with `--agents claude-code`. The CLI handles all 10 supported agents, including Continue, Goose, Cline, Amp, and Windsurf.

### Feature 3: Open standard, works everywhere your team works

Skills follow the AgentSkills open standard. The core fields — `name`, `description`, `license`, `metadata` — are plain YAML that every compatible agent understands. You write a skill once and it runs in Claude Code, Cursor, GitHub Copilot, OpenAI Codex, Gemini CLI, and any other agent that implements the standard. Claude Code-specific extensions like `when_to_use`, `allowed-tools`, and dynamic context injection are supported and documented — they are simply ignored by other agents. Your skills are not locked to any provider, any model, or any tool.

---

## 5. SOCIAL PROOF STRUCTURE

---

> "Before SkillMall, every engineer on my team had a different mental model of what 'code review' meant to the AI. One person's prompt checked for test coverage. Another's checked for naming conventions. Neither was consistent session to session. After we deployed the same code-review skill to the whole team, the feedback quality evened out within a week. The AI was finally working from the same rulebook we were."
>
> — [Senior Software Engineer, fintech company] — *replace with real attribution*
> Focus: code review consistency across a distributed team

---

> "I used to spend half a day getting a new hire's AI assistant calibrated to our stack. Walk them through the conventions, explain the testing philosophy, show them how we write commit messages. Now I tell them to run three deploy commands and they're working with the same skill set the rest of the team uses from day one. Onboarding the AI is no longer a separate task."
>
> — [Engineering Team Lead, SaaS company] — *replace with real attribution*
> Focus: onboarding speed and team consistency

---

> "I work with four clients simultaneously and each one has completely different conventions, review standards, and delivery formats. Keeping that context in my head while switching between them is exhausting. With SkillMall I keep a separate skill collection per client scoped to each project directory. The AI knows which context to use before I type the first word. Context switching went from a 15-minute warm-up to zero."
>
> — [Independent software consultant] — *replace with real attribution*
> Focus: client context isolation and switching overhead

---

## 6. HOW IT WORKS

**Step 1: Find or generate a skill.**
Browse the catalog at skill-mall.dev or run `npx skill-mall find "code review"` to search from the terminal. If nothing fits, run `npx skill-mall create "description of what you need"` — the research pipeline generates a complete skill in under two minutes. You can point it at any URL to ground the output in real documentation.

**Step 2: Deploy it to your agents.**
Run `npx skill-mall deploy <category/skill-name>`. The CLI detects every compatible agent installed on your machine and copies the skill to each one automatically. Use `--scope project` to limit the skill to the current repository. Use `--agents claude-code` to target a single agent.

**Step 3: Use it in any session.**
Open your agent. The skill is already loaded — no slash commands, no setup, no context pasting. Your agent discovers it by name and description. Invoke it by asking for what it does or by its name directly. It works the same way in every session and on every machine where the skill is deployed.

**Step 4: Contribute or keep it private.**
Skills are plain directories. Commit them to your repository for team sharing. Open a pull request to add them to the public catalog. Or keep them local in `~/.claude/skills/` or `~/.agents/skills/` and share them however you share files. There is no account required to use or create skills.

---

## 7. FAQ

**Is it free?**
Yes. SkillMall is open source under the MIT license. The catalog, the CLI, and the skill format are free to use, fork, and modify. The research pipeline uses whichever LLM provider you configure — if you use Ollama or the Claude Code CLI provider, you pay nothing beyond what you already pay for those tools. If you use OpenAI, Gemini, or Groq, you pay those providers' standard API rates for the tokens the pipeline uses during generation. Generating a skill typically uses fewer than 10,000 tokens.

**Does it work with my agent?**
Probably yes. SkillMall officially supports Claude Code, Cursor, GitHub Copilot, OpenAI Codex, Gemini CLI, Continue, Goose, Cline, Amp, and Windsurf out of the box. The CLI detects which of these are installed and deploys to each automatically. The broader AgentSkills open standard covers 55 additional agents documented in `docs/agents/`. If your agent reads skills from a directory and understands YAML frontmatter with `name` and `description` fields, skills will work. If it does not appear in the catalog, open an issue and we will add compatibility documentation.

**What if I do not have an API key?**
You have two zero-key options. First, if you have Claude Code installed and logged in, set your provider to `claude-code` in `~/.skill-mall/config.json` — the CLI calls the `claude` binary directly using your existing Claude Code authentication. No Anthropic API key. No HTTP calls to api.anthropic.com. Second, install Ollama, pull a model with `ollama pull llama3.1`, and set your provider to `ollama`. Both options run entirely local or through existing auth. If you only want to use pre-built skills from the catalog and never generate new ones, no API key is ever needed — just install and deploy.

**Can I use skills my team creates?**
Yes, and this is one of the primary use cases. Commit your skills directory to your repository and your team members run `npx skill-mall deploy` from the repo root to install them. Skills live in `skills/<category>/<name>/` by default, but you can point the CLI at any directory. For project-scoped skills that only apply in a specific repository, use `--scope project` when deploying — the skill installs into `.claude/skills/` or `.agents/skills/` instead of the global path, so it is only active when you are working in that project.

**What is the research pipeline?**
The research pipeline is a 5-stage system that turns a topic description and optional source URLs into a complete, validated skill. Stage 1 accepts your input. Stage 2 fetches your URLs in parallel, extracts the relevant text content (stripping navigation and scripts), caps each URL at 8,000 characters, and calls your configured LLM to extract a structured research result. Stage 3 builds the skill directory — SKILL.md, README.md, template files, sample outputs, and shell scripts. Stage 4 generates prompt files for each tool the research identified, selecting from 40-plus frameworks based on artifact type and domain. Stages 3 and 4 run in parallel. Stage 5 validates the output and writes everything atomically so a failure mid-write never corrupts your skills directory. If no URLs are provided, the pipeline uses the LLM's training knowledge and marks the result as unverified. If a URL fails to fetch, the pipeline fails loudly rather than silently substituting hallucinated content.

**Is my data private?**
Skills are local files stored in your home directory or your project directory. SkillMall does not collect skill content, does not transmit your skills to any server, and does not require an account. When you run the research pipeline, your topic and URL content are sent to whichever LLM provider you configured — the same data you would send if you typed the prompt yourself. If you use the `ollama` or `claude-code` provider, nothing leaves your machine or your existing provider relationship. The catalog web app at skill-mall.dev does not require a login and does not track usage beyond standard web server logs.

---

## 8. FINAL CTA SECTION

**Headline:**
Your first skill takes two minutes. Your hundredth session will be better for it.

**Subheadline:**
Deploy from the catalog or generate one from scratch. Works immediately with the agents you already use.

**CTA Button:**
Get started free

---

## 9. THREE-EMAIL DRIP SEQUENCE

---

### Email 1 — Day 0, post-signup

**Subject:** Your first SkillMall skill is one command away

Welcome. You signed up for SkillMall, which means you're either tired of rewriting the same instructions or you've already spent too long calibrating an AI assistant that forgot everything by morning. Either way, you're in the right place.

Here's the fastest path to your first win.

**Step 1: Install the CLI.**

```
npm install -g skill-mall
```

**Step 2: Browse the catalog.**

```
npx skill-mall find "code review"
```

Or visit skill-mall.dev and browse by category.

**Step 3: Deploy a skill.**

```
npx skill-mall deploy development/code-review
```

That's it. Open Claude Code, Cursor, or whichever agent you use. The skill is already there. Ask it to review your last pull request.

If nothing in the catalog fits your workflow, run this:

```
npx skill-mall create "what you need the skill to do"
```

The pipeline will build one from scratch in under two minutes. No API key required if you're using Claude Code or Ollama.

One more thing: skills are just directories. If you find one that's close but not quite right, edit the SKILL.md directly. It's plain markdown. You don't need our permission.

Reply to this email if you hit anything unexpected. I read every reply.

— The SkillMall team

---

### Email 2 — Day 3

**Subject:** Did you deploy your first skill?

Three days ago you signed up for SkillMall. If you deployed a skill and it's already saving you time, you can ignore this email — you've got it.

If you haven't gotten to it yet, here's why it's worth five minutes today.

**The most common blocker we hear: "I wasn't sure which skill to start with."**

Start with whichever one matches something you do every week. If you write commit messages, deploy `development/commit-writer`. If you review pull requests, deploy `development/code-review`. If you're always writing technical docs, deploy `writing/technical-documentation`. These are the skills that pay back immediately because they intercept tasks you were already going to do anyway.

**The second most common blocker: "I have Claude Code but no API key for the pipeline."**

You don't need one. Run this:

```
echo '{"provider": "claude-code"}' > ~/.skill-mall/config.json
```

Now the pipeline uses your existing Claude Code login. Generate a skill:

```
npx skill-mall create "incident postmortem template for SaaS teams"
```

**What good looks like at day 3:**
- One skill deployed and in active use
- The skill invoked at least twice without you having to explain context from scratch
- An edit to the SKILL.md that makes it more specific to your stack

If you're at that point, you're ahead of the curve. The next step is deploying to your whole team — which we'll cover in Email 3.

If you're stuck, reply here and tell me what you tried. I'll help directly.

---

### Email 3 — Day 7

**Subject:** The stuff SkillMall users do in week two

One week in. If the basics are working — skills deployed, sessions starting from context instead of from zero — you're ready for the parts that compound.

**Skill collections**

You can organize skills into collections with a `collection.yaml` file. A collection is a named group of skills you can deploy as a unit. If your team has a standard development workflow — code review, commit writing, PR writing, test generation — put them in a collection and deploy all of them with one command. New teammates run one install and get the full stack.

See `docs/reference/collection-format.md` for the format.

**Skill chains**

Skills can chain into each other. A chain is a sequence of skills where the output of one becomes the input of the next. The most common pattern is: research skill feeds into a planning skill feeds into an implementation skill. Document the chain in `resources/chains/` and reference it in the SKILL.md body. The AI follows the sequence without you directing traffic between steps.

See `docs/reference/chain-format.md` for the format.

**Skill improvement**

The pipeline that built your skill can improve it. Run:

```
npx skill-mall optimize productivity/my-skill
```

The optimizer reviews the existing SKILL.md, the samples, and the prompt files, identifies structural weaknesses, and proposes targeted edits. You approve or reject each change. The skill gets better without you rewriting it from scratch.

**Contributing to the catalog**

If you've built something that would help other teams, open a pull request. The catalog is MIT-licensed and the contribution process is a standard fork and PR flow — no CLAs, no review committee. The only requirement is that your skill passes the validator:

```
npx skill-mall validate
```

Thanks for being here in the first week. The project is growing fast and the skill catalog gets more useful with every contribution.

---

## 10. TWITTER/X POST TEMPLATES

---

**Template 1 — Developer productivity angle**

I spent 20 minutes last week writing the same AI instructions I wrote the week before.

Then I found SkillMall. One SKILL.md file. One deploy command. Now it's there every session, in every agent, without me repeating myself.

Open source. MIT. No account.
skill-mall.dev

[280 characters max — verify before use]

---

**Template 2 — Team workflow angle**

The hardest part of using AI on a team isn't the prompts.

It's that everyone writes different prompts for the same tasks, and none of them persist between sessions.

SkillMall fixes this. Deploy the same skills to every agent on your team. One format. Works in Claude Code, Cursor, Codex, and Gemini CLI.

skill-mall.dev

---

**Template 3 — Open source angle**

SkillMall just hit the open source catalog milestone.

Skills in: code review, commit writing, debugging, sprint planning, onboarding guides, technical docs, competitive analysis, product requirements, and more.

Plain markdown files. MIT license. No lock-in.

github.com/jamesdsizemore/skill-mall

---

**Template 4 — vs. custom prompts angle**

Custom prompts vs. SkillMall skills:

Custom prompts:
- Paste every session
- Different across teammates
- Live in Notion or nowhere
- Lost when you close the tab

SkillMall skills:
- Installed once, available always
- Shared via git
- Work across 10+ agents
- You own the files

Same concept. Very different experience.

---

**Template 5 — Tutorial angle**

How to add a permanent code review skill to Claude Code in 60 seconds:

1. npm install -g skill-mall
2. npx skill-mall find "code review"
3. npx skill-mall deploy development/code-review
4. Open Claude Code
5. Ask it to review your last PR

No config. No API key. It's already there.

Try it: skill-mall.dev

---

## 11. LINKEDIN POST TEMPLATES

---

**Template 1 — Engineering productivity**

I've watched developers spend 15 to 20 minutes at the start of each AI session rebuilding context that should already be there.

The testing conventions. The review checklist. The commit message format. The escalation protocol. All of it typed again, every time, into a chat window that starts from zero.

This is not a prompting problem. It's a tooling problem.

SkillMall is an open catalog of structured AI skills that installs persistently into your coding agent. A skill is a SKILL.md file — frontmatter that identifies the skill, markdown body that gives the agent its instructions. Deploy it once with `npx skill-mall deploy` and it's available in every session: Claude Code, Cursor, GitHub Copilot, OpenAI Codex, Gemini CLI, and more.

The catalog ships with skills for code review, debugging, commit writing, technical documentation, sprint planning, incident postmortems, and a dozen other workflows. The generation pipeline can produce a custom skill from a URL or description in under two minutes.

Skills are plain files. They live in version control. Your team can share them the same way you share any other code.

If you've ever re-explained your stack's conventions to an AI for the third time this week, there's a faster way now.

MIT license. No account required. skill-mall.dev

---

**Template 2 — Engineering management / team leads**

Onboarding a new engineer's AI assistant takes longer than onboarding the engineer.

You walk them through the code review conventions. You explain the commit message format. You show them the debugging workflow the team uses. You tell them how the AI should handle escalations. All of that needs to get into the model's context before it's useful — and none of it persists between sessions, so the next engineer starts from scratch too.

SkillMall is an open-source skill catalog built on the AgentSkills open standard. A skill is a structured markdown file that installs into any compatible AI coding agent. Your team runs one deploy command and every agent on every machine has the same starting context.

The practical result: the AI works from your team's actual conventions rather than its generic training data. Code review feedback is consistent. Commit messages match your format. Onboarding new hires means giving them three commands, not a 45-minute session explaining the company's prompt philosophy.

The catalog has 26 skills across 8 categories today. Every skill is plain markdown, MIT licensed, and stored in a directory you control. We built it because we couldn't find anything else that solved the team consistency problem without locking you into a vendor.

If your team is using AI coding agents and finding the experience inconsistent across people and sessions, this is worth 10 minutes to try.

github.com/jamesdsizemore/skill-mall

---

## 12. GITHUB README BADGE MARKDOWN

```markdown
[![SkillMall](https://img.shields.io/badge/skills-SkillMall-5c6ac4?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6TTIgMTdsOCA0IDgtNHYtNWwtOCA0LTgtNHoiLz48L3N2Zz4=)](https://skill-mall.dev)
```

Plain link fallback (if badges are disabled):

```markdown
[Skills powered by SkillMall](https://skill-mall.dev)
```

Usage: add to your project's README.md to indicate that your repository ships structured AI skills via the AgentSkills open standard. Link directly to your `skills/` directory by appending the path:

```markdown
[![SkillMall](https://img.shields.io/badge/skills-SkillMall-5c6ac4?style=flat-square)](https://github.com/your-org/your-repo/tree/main/skills)
```
