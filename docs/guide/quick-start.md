# Quick Start: Zero to Deployed Skill in 10 Minutes

This tutorial takes you from a blank terminal to a working AI skill deployed inside Claude Code. No prior experience with SkillMall or AI agent skills required. By the end, you will have the code-review skill running in Claude Code and know exactly what to type to invoke it.

**Time required:** 10 minutes  
**What you will have:** SkillMall running locally at `http://localhost:3000`, and the `code-review` skill deployed and working in Claude Code.

---

## Prerequisites

Before you start, confirm you have the following installed on your machine.

### Node.js 20 or later

Open a terminal and run:

```bash
node --version
```

You should see something like `v20.18.0` or `v22.x.x`. If you see `v18.x.x` or lower, or if the command is not found, download Node.js from [nodejs.org](https://nodejs.org) and install the LTS version.

### npm 10 or later

npm installs alongside Node.js. Check your version:

```bash
npm --version
```

You should see `10.x.x` or higher. If you see `9.x.x` or lower, run `npm install -g npm@latest` to upgrade.

### A Claude Code session

SkillMall works with any agent that supports the AgentSkills format (Cursor, Codex, Gemini CLI), but this tutorial uses Claude Code as the target agent because it is the simplest setup — no additional API key is needed.

If you do not have Claude Code installed, follow Anthropic's installation guide at [claude.ai/code](https://claude.ai/code) before continuing.

---

## Step 1: Clone the Repository and Install Dependencies

This step gets the SkillMall codebase onto your machine and installs everything it needs to run.

```bash
git clone https://github.com/jamesdsizemore/SkillMall && cd SkillMall && npm install && cd cli && npm install && cd ..
```

Breaking this down:

- `git clone ...` downloads the repository
- `cd SkillMall` moves into the project directory
- `npm install` installs the Next.js web app dependencies (this takes 30–60 seconds the first time)
- `cd cli && npm install` installs the CLI tool dependencies separately, then returns to the project root

When the install completes, your terminal will show something like:

```
added 312 packages, and audited 313 packages in 28s

86 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

The exact numbers will differ. That is normal.

> **When things go wrong**
>
> **"npm WARN deprecated ..."** — You may see deprecation warnings for older packages. These are informational only. They do not affect functionality. Ignore them and continue.
>
> **"ENOENT: no such file or directory, open '.env.local'"** — This is expected. SkillMall looks for an `.env.local` file for optional configuration. The application creates what it needs automatically; you do not need to create this file manually.
>
> **"git: command not found"** — Git is not installed. Install it from [git-scm.com](https://git-scm.com) and retry.
>
> **"EACCES: permission denied"** — You are trying to install into a system directory. Run `npm install` without `sudo`. If the problem persists, fix your npm permissions using the [official guide](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

---

## Step 2: Configure Your LLM Provider

SkillMall uses a language model for its skill-generation features (the `create` command and browser wizard). You need to tell it which AI provider to use.

SkillMall supports five providers. Choose the one that fits your situation:

### Option A: Claude Code (recommended for Claude Code users)

If you already use Claude Code, this is the simplest option. No API key required — SkillMall uses Claude Code's existing authentication.

```bash
npx skill-mall configure --provider claude-code
```

Expected output:
```
  Configured: claude-code / claude-sonnet-4-6
```

That is it. No key entry, no additional setup.

### Option B: OpenAI

```bash
npx skill-mall configure --provider openai --key sk-your-key-here
```

The default model is `gpt-4o`. To use a different model, add `--model gpt-4o-mini`.

### Option C: Google Gemini

```bash
npx skill-mall configure --provider gemini --key AIza-your-key-here
```

The default model is `gemini-2.0-flash-exp`.

### Option D: Groq

Groq is a good option if you want fast, cheap generation. The default model is `llama-3.3-70b-versatile`.

```bash
npx skill-mall configure --provider groq --key gsk_your-key-here
```

### Option E: Ollama (fully local, no API key)

If you have [Ollama](https://ollama.ai) running locally, SkillMall can use it. Ollama must be running before you use any generation features.

```bash
npx skill-mall configure --provider ollama
```

The default model is `llama3.1`. To use a different model: `npx skill-mall configure --provider ollama --model mistral`.

---

### Interactive configuration

If you prefer a menu-driven setup, run `npx skill-mall configure` without any flags. An interactive prompt will ask you to select a provider and enter any required API key:

```
  skill-mall configure

  Select LLM provider:
  > OpenAI (gpt-4o)
    Claude Code CLI
    Google Gemini
    Groq
    Ollama (local)
```

Your configuration is saved to `~/.skill-mall/config.json` and persists across sessions.

> **When things go wrong**
>
> **"Provider not configured"** — You tried to run a generation command without configuring a provider first. Run `npx skill-mall configure --provider claude-code` (or your preferred provider), then retry.
>
> **"Module not found: Error: Can't resolve '...'"** — The CLI dependencies are not installed. Return to the `cli/` directory and run `npm install`, then try again from the project root.

---

## Step 3: Run the Database Migration

SkillMall uses a local SQLite database to store skill metadata, quality scores, install events, and community reviews. Before running the app for the first time, you need to create the database tables.

```bash
npm run db:migrate
```

Expected output on a fresh install:

```
Applied: 001_initial.sql
Applied: 002_phase3.sql
Applied: 003_fork_events.sql
Applied: 004_rag_embedding_column.sql
4 migration(s) applied.
```

The database file is created at `data/skillmall.db`. This file is local to your machine and is not committed to git.

> **When things go wrong**
>
> **"No new migrations."** — This is not an error. It means you have already run migrations and the database is up to date. This is what you will see on every run after the first. You can proceed normally.
>
> **"SQLITE_ERROR: ..."** — This usually means something is wrong with the Node.js installation or the `better-sqlite3` native binding was not compiled for your Node.js version. Check that `node --version` reports 20 or higher. If the version is correct, try deleting `node_modules/` and running `npm install` again to recompile the native binding.

---

## Step 4: Start the Development Server

```bash
npm run dev
```

The output will look like:

```
  ▲ Next.js 16.2.6
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.x:3000

 ✓ Starting...
 ✓ Ready in 2.1s
```

Open your browser and navigate to `http://localhost:3000`.

> **When things go wrong**
>
> **"Error: listen EADDRINUSE: address already in use :::3000"** — Port 3000 is in use by another process. Either stop the other process, or start SkillMall on a different port: `PORT=3001 npm run dev`. Then open `http://localhost:3001` instead.
>
> **"SyntaxError: Cannot use import statement"** — Node.js version is too old. Run `node --version` and confirm it is 20 or higher.

---

## Step 5: What You See at localhost:3000

When the page loads, you are looking at the SkillMall skill catalog. Here is what you will see and what each part does.

### The hero section

The top of the page has a short description of SkillMall and a prominent "Browse Skills" button that scrolls down to the catalog. Below the hero, a stat bar shows the current counts: how many skills are in the catalog, how many categories exist, and how many AI agents are supported (the number is currently 54, reflecting the range of agents that are compatible with the AgentSkills format).

### The "What is a Skill?" section

Directly below the stats is a brief explainer card. This is intended for first-time visitors. It describes what a skill is and how deploying one changes your agent's behavior. Once you are comfortable with the concept, you can scroll past it.

### The search bar

A search input sits at the top of the catalog section, just below the explainer. It filters skills in real time as you type. Search by skill name, description text, or tag. For example, typing "review" will surface the code-review skill.

### The category navigation

A row of category filters runs below the search bar. The categories are: All, AI, Business, Design, Development, Infrastructure, Productivity, Research, and Writing. Clicking a category shows only the skills in that category. "All" is selected by default.

### The skill grid

The main content area is a grid of skill cards. Each card shows:

- **Skill name** — large, bold, and formatted as a clickable link
- **Category badge** — a colored pill showing which category the skill belongs to
- **Description** — the first sentence or two of the skill's description field
- **Tags** — small label chips for searchability (e.g., "code-review", "pull-request", "engineering-practices")
- **Quality score** — a number from 0 to 100 in the top-right corner of the card, shown as a circular badge. A score of 70 or higher means the skill meets the minimum standard for the public catalog. Higher scores reflect more complete frontmatter, better descriptions, and richer supporting resources.

The catalog currently contains 27 skills. The majority are in `_starters/` — these are 80%-complete templates you customize for your team. The fully built skills appear in the category-filtered views.

### Skill detail page

Clicking any skill card opens the detail page. Here you will see the full SKILL.md content, the quality score with dimension-by-dimension breakdown, version history, and (when implemented) community reviews. This is also where you will find the exact deploy command for that skill.

---

## Step 6: Deploy a Skill to Claude Code

You have browsed the catalog and you are ready to deploy your first skill. This step copies the skill file to the directory where Claude Code looks for skills.

In your terminal (you can leave `npm run dev` running in a separate tab — or stop it with Ctrl+C and run the deploy, then restart it):

```bash
npx skill-mall deploy development/code-review
```

Wait — the `code-review` skill lives in `skills/_starters/code-review/`, not `skills/development/`. The deploy command searches both the category directories and `_starters/`. If you look at the catalog and the skill you want is in `_starters/`, you can deploy it using its name directly:

```bash
npx skill-mall deploy code-review
```

Expected output:

```
Deploying code-review to /Users/yourname/.claude/skills

  Deployed to: /Users/yourname/.claude/skills/code-review

  Invoke this skill in Claude Code with:
    /code-review
```

That is it. The skill is now installed.

What happened: the deploy command found the `code-review` skill directory, copied its `SKILL.md` (and any supporting files) into `~/.claude/skills/code-review/`, and told you the exact command to invoke it.

> **When things go wrong**
>
> **"Skill not found: development/code-review"** — The `development/` category is currently empty in the skills directory. The code-review skill lives in `_starters/`. Run `npx skill-mall deploy code-review` (without the category prefix) instead.
>
> **"Skill not found: ..."** — Double-check the spelling. Run `npx skill-mall list` to see all available skill slugs. Slugs are lowercase, hyphen-separated, and must match the directory name exactly.
>
> **"EACCES: permission denied ... ~/.claude/skills"** — The `~/.claude/skills/` directory does not exist yet, or your user does not have write access to it. Create it manually: `mkdir -p ~/.claude/skills`. Then retry the deploy command.
>
> **"requireRepoRoot: not inside a SkillMall repo"** — The deploy command must be run from inside the SkillMall project directory. Make sure your terminal is in the `SkillMall/` folder (`cd SkillMall`), then retry.

---

## Step 7: Use the Skill in Claude Code

Start a new Claude Code session. You can do this by opening a new terminal window in your project directory and running `claude`, or by starting a new chat in the Claude Code interface.

The skill takes effect in new sessions — Claude Code reads installed skills at session start. If you already have a Claude Code session open, start a fresh one.

### Invoking explicitly by name

Type the slash command:

```
/code-review
```

Claude Code will respond immediately with something like:

> Starting a structured code review. Share the code or pull request link you want reviewed, and tell me the context: what does this change do, and is there anything specific you want me to focus on?

Claude is now operating in code-review mode. It will follow the steps defined in the skill: checking correctness, tests, design, and readability in sequence, writing comments with explicit severity levels and specific suggestions.

### Invoking by description

You do not need to use the slash command. Because Claude Code reads the skill's `description` field, it will automatically invoke the skill when your message matches the trigger. Try:

```
I have a pull request that adds authentication middleware — can you review it using our team's standards?
```

Claude will recognize this as a code review request and apply the skill's framework without you explicitly invoking it.

### What is different when the skill is active

Without the skill, Claude Code gives generic code review advice. With the skill, every review follows a specific structure:

1. Claude reads the PR description and linked issue before looking at the implementation (Step 1 in the skill)
2. Claude checks correctness first — edge cases, error paths, concurrent access (Step 2)
3. Claude then evaluates tests for behavior coverage, not implementation coupling (Step 3)
4. Claude evaluates design — is this the right abstraction, is it in the right place (Step 4)
5. Claude checks readability — honest naming, comments that explain why not what (Step 5)

Each comment Claude writes includes what is wrong, why it matters, and a specific suggestion for how to fix it. Comments are labeled with severity levels. Vague feedback like "refactor this" or "I don't like this" does not appear.

This consistency is the practical value of skills. The review framework is encoded once in the SKILL.md file, and every session automatically applies it.

---

## What to Do Next

You have completed the quick start. Here is where to go from here, depending on what you want to do.

### Browse and deploy more skills

Run `npm run dev` and browse `http://localhost:3000`. The catalog has 27 skills across categories. Look at the skill detail pages for quality scores — skills scoring above 80 are the most polished.

Deploy any skill with:

```bash
npx skill-mall deploy <slug>
```

For example, to deploy the `commit-writer` skill:

```bash
npx skill-mall deploy commit-writer
```

Then in Claude Code: `git add .` and ask "write a commit message for these changes." Claude will follow the conventional commits format specified in the skill.

### Create a skill from your own process

If you have a workflow that you repeat in every session — a debugging approach, a specific writing format, a team code style — you can create a skill for it. The `create` command generates a complete skill from a description and optional source URLs:

```bash
npx skill-mall create "incident postmortem following the blameless SRE approach"
```

Or use the browser wizard at `http://localhost:3000/skills/create` for a guided, step-by-step experience.

### Deploy to multiple agents

If you also use Cursor, Codex, or Gemini CLI, you can deploy a skill to all detected agents at once:

```bash
npx skill-mall deploy code-review --all-agents
```

SkillMall detects which agents are installed and copies the skill to each agent's skills directory.

### Customize the code-review skill for your team

The deployed skill lives at `~/.claude/skills/code-review/SKILL.md`. Open it in any text editor. You will see placeholder text like `[FILL-IN: team-review-criteria]`. Replace these with your team's actual standards — maximum function length, naming conventions, required error handling patterns. Save the file. The next Claude Code session picks up the changes automatically.

---

## Reference: All Commands Used in This Tutorial

```bash
# Clone and install
git clone https://github.com/jamesdsizemore/SkillMall && cd SkillMall && npm install && cd cli && npm install && cd ..

# Configure provider (Claude Code, no API key)
npx skill-mall configure --provider claude-code

# Initialize the database
npm run db:migrate

# Start the catalog UI
npm run dev

# Deploy the code-review skill
npx skill-mall deploy code-review

# List all available skills
npx skill-mall list

# Deploy to all detected agents
npx skill-mall deploy code-review --all-agents
```

---

## Summary

In the last 10 minutes, you:

1. Cloned the SkillMall repository and installed dependencies for both the web app and the CLI
2. Configured an LLM provider so the skill-generation pipeline has a model to call
3. Ran the database migration to set up the local SQLite store
4. Started the Next.js development server and explored the catalog at `http://localhost:3000`
5. Deployed the `code-review` skill to `~/.claude/skills/` with a single command
6. Learned how to invoke the skill explicitly (`/code-review`) and by natural language description in Claude Code

The skill is now part of every Claude Code session you start. It is not a plugin, not an extension, not a configuration flag — it is a text file that lives in your home directory. You can read it, edit it, copy it to colleagues, or delete it. That simplicity is by design.

The catalog has 26 more skills to explore. The `_starters/` directory has 20 partially filled templates waiting to be customized for your team. And the `create` command can generate a new skill from any process you can describe in a sentence.

**Related guides:**

- [Introduction to SkillMall](./introduction.md) — the full conceptual overview
- [Wizard Tutorial](./tutorials/wizard-tutorial.md) — create a skill in the browser
- [CLI Tutorial](./tutorials/cli-tutorial.md) — create and publish a skill from the command line
