# Customizing Skills: Fork the Development Workflow for Your Team

This tutorial walks you through forking the `development-workflow` skill and adding your team's rules to it. By the end, you will have a personalized skill that your agent uses automatically — one that knows your team's standards, not just the generic defaults.

**What you will have when you finish:** A working skill called `my-dev-workflow` (or whatever name you choose) that you can deploy to your agent and share with your team via version control.

**Time required:** About 20 minutes.

**What you need:** Node.js installed, the `npx` command available in your terminal, and an AI agent that supports the AgentSkills format (Claude Code, Cursor, Codex, or Gemini CLI).

---

## Why Fork Instead of Edit the Original?

Before we start, it is worth understanding what "forking" means and why it matters.

When you find a skill in the SkillMall catalog that does most of what you want, you have two choices: edit the original, or fork it. Editing the original means modifying the shared community copy. Forking means creating your own independent copy that you fully control.

**You should almost always fork.**

Here is why. The SkillMall catalog is a shared, community-maintained resource. The `development-workflow` skill you are about to customize was written to work for the broadest possible audience. The community may update it — improving the generic instructions, fixing bugs, adding steps that work for most teams. If you edit the original directly and then pull the latest changes from SkillMall, your edits will be overwritten or cause merge conflicts.

When you fork:

- **You own the copy.** Your fork lives in its own directory with its own name. The original skill and your fork coexist without conflict.
- **Your changes never propagate back to the community copy.** Nobody else is affected by your team-specific rules. You are not accidentally imposing your "all functions must be under 30 lines" requirement on someone who runs a data science team with very different conventions.
- **The original can be updated independently.** Community improvements to the base skill go to the original. Your fork stays exactly as you configured it, unchanged, until you decide to pull in those improvements manually.
- **You can contribute your fork back separately.** If you build something general enough that other teams would benefit, you can open a pull request to add your fork to the catalog as a standalone skill. The lineage tracking built into SkillMall's frontmatter makes this attribution automatic.

Think of it like a git branch, but for skills. The community maintains `main`. You maintain your own branch. They can evolve independently.

---

## Step 1: Fork the Skill

Open your terminal and run:

```bash
npx skill-mall fork development/development-workflow my-dev-workflow
```

You will see output similar to this:

```
Forking development/development-workflow -> development/my-dev-workflow

  Copying skill files...
  Created skills/development/my-dev-workflow/SKILL.md
  Created skills/development/my-dev-workflow/README.md

  Fork metadata added to frontmatter:
    forked_from: development/development-workflow
    fork_chain: development/development-workflow

  Skill my-dev-workflow is ready.
  Edit it at: skills/development/my-dev-workflow/SKILL.md

Done. Run this when you're ready to use it:
  npx skill-mall deploy development/my-dev-workflow
```

The command created a new directory at `skills/development/my-dev-workflow/` and copied all the files from the original skill into it. The name you provide (`my-dev-workflow`) becomes the directory name and the value of the `name` field in the frontmatter. It must be lowercase letters, numbers, and hyphens only.

### What are forked_from and fork_chain?

Open the new `SKILL.md` and look at the frontmatter block at the top. You will notice two new fields that were not in the original:

```yaml
forked_from: development/development-workflow
fork_chain: development/development-workflow
```

**`forked_from`** records the direct parent of this fork — the skill you copied from. This is a permanent attribution. If you later contribute your fork back to the community catalog, SkillMall uses this field to show visitors where the skill originated and to credit the original authors.

**`fork_chain`** records the full lineage. If someone later forks your fork (for example, your colleague takes your `my-dev-workflow` and creates a further customized `frontend-dev-workflow`), their `fork_chain` will read `development/development-workflow > development/my-dev-workflow`. The chain grows as forks are built on forks, making it possible to trace any skill back to its origin.

Both fields are catalog metadata. Your AI agent ignores them completely. They exist purely for human benefit — attribution, discoverability, and community transparency.

---

## Step 2: Open the Forked Skill in a Text Editor

Navigate to the newly created skill directory:

```bash
# On macOS or Linux
open skills/development/my-dev-workflow/
```

Or open the `SKILL.md` file directly in your preferred editor:

```bash
# VS Code
code skills/development/my-dev-workflow/SKILL.md

# Cursor
cursor skills/development/my-dev-workflow/SKILL.md

# Any editor
nano skills/development/my-dev-workflow/SKILL.md
```

The file you are looking at is a complete copy of the original skill. It looks something like this:

```yaml
---
name: my-dev-workflow
description: "Apply the 16-step development loop to any implementation task. Steps 6, 7, 8, 9, and 11 are never skipped."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: development
  tags: "development, workflow, tdd, code-review"
  linked-skills: "code-review, commit-writer"
  forked_from: development/development-workflow
  fork_chain: development/development-workflow
---

# Development Workflow

Apply this 16-step loop to any implementation task. Steps 6 (tsc), 7 (lint), 8 (build), 9 (first review), and 11 (second review) are never skipped.

## When to use

- Starting implementation on a new feature
- Picking up a task from a plan or spec
- Any coding work that will be committed to a repository

## The 16-Step Loop

**Step 1 — Read the spec or task card.** ...

[... the rest of the skill body ...]

## Code Review Criteria

Review every change before committing. Check:

- Correctness: does the code do what the spec says?
- Tests: is the new behavior covered?
- Design: is this the right abstraction?
- Readability: can someone understand this in 6 months?
```

Everything you see in the body is yours to edit. Nothing you change here will touch the original.

---

## Step 3: Edit the SKILL.md — Where to Add Team-Specific Rules

Skills have two parts: the **frontmatter** (the YAML block between the `---` markers at the top) and the **body** (everything after the closing `---`).

For team-specific rules, you will work in the **body**. Specifically, look for sections with headings like "Code Review Criteria," "Standards," or "Quality Gates" — or add a new section if none exists. The right place is after the generic content that applies to everyone, so the skill's universal instructions stay intact and your additions appear as a clear extension.

A good pattern is to add a section called `## Team Standards` or `## [YourTeam] Requirements` near the end of the body, just before any "Linked Skills" section. This keeps the generic content readable for anyone who looks at the skill and makes your additions easy to find, update, or remove later.

---

## Step 4: Common Customizations with Examples

Here are the most useful things teams add when forking a development workflow skill.

### Adding code review criteria

The generic code review section tells your agent to check for correctness, tests, design, and readability. Your team probably has sharper, more specific rules. Add them explicitly.

Find the "Code Review Criteria" section (or equivalent) in the body and extend it:

```markdown
## Code Review Criteria

Review every change before committing. Check:

- Correctness: does the code do what the spec says?
- Tests: is the new behavior covered?
- Design: is this the right abstraction?
- Readability: can someone understand this in 6 months?

### Acme Engineering Standards

Beyond the universal checks above, flag any of the following as blocking issues:

- Functions longer than 30 lines. Break them up. No exceptions for "it's just a switch statement."
- Magic numbers anywhere outside a constants file. Every unexplained number gets a named constant.
- Nullable return types without explicit null-path handling in the caller.
- Exported functions without JSDoc. Internal functions without comments that explain non-obvious logic.
- Direct DOM manipulation in components — use the design system's utility functions instead.
```

Every rule you add here becomes something your agent will check automatically when it runs a review. The more specific you are, the more useful the feedback will be.

### Adding language and framework-specific rules

If your team works in a specific language or framework, add rules that only make sense in that context. Generic skills cannot include these because they would be noise for teams using different stacks.

```markdown
### TypeScript Requirements

- All exported functions must have explicit return types. No inferred `any`, no inferred `unknown`.
- Prefer `interface` over `type` for object shapes that other modules will implement.
- Never use non-null assertion (`!`) on values that are not guaranteed by construction. Add a runtime check instead.
- Use `z.parse()` at trust boundaries (API inputs, user data, localStorage). Do not pass unvalidated data deeper than the entry point.

### React Requirements

- Components must be pure. No direct mutation of props or external state.
- Effects must have dependency arrays. Empty arrays require a comment explaining why.
- Server Components cannot import Client Component hooks. Check the import tree before adding `'use client'`.
```

### Updating the description to mention your team

The `description` field is what your agent reads when deciding whether to invoke this skill. Update it to include your team's name so the skill's purpose is clear when you browse your installed skills:

```yaml
description: "Apply the Acme Engineering development workflow to any implementation task. 16-step loop with team-specific TypeScript and React standards."
```

Keep it under 150 characters. Put the most distinctive phrase first.

---

## Step 5: A Complete Before and After Example

Here is a realistic before-and-after showing what the code review section looks like in the original skill versus a forked version customized for a TypeScript/React team.

### Before (standard development-workflow code review section)

```markdown
## Code Review Criteria

Review every change before committing. Check for:

- **Correctness** — Does the code do what the spec or task card says? Test the edge cases mentally: empty inputs, concurrent access, error paths.
- **Tests** — Is the new behavior covered? Do the tests check behavior, not implementation? Would they catch a regression?
- **Design** — Does this belong here? Could it be simpler? Are abstractions being introduced prematurely?
- **Readability** — Can you understand this code in 6 months without asking the author? Are variable and function names honest?

Write comments at three severity levels:

- `[blocking]` — Must be fixed before merge. Safety, correctness, or security issues.
- `[suggestion]` — Should be addressed, but merge is not blocked.
- `[nit]` — Style or preference. Author can accept or decline.
```

### After (forked and customized for the Acme frontend team)

```markdown
## Code Review Criteria

Review every change before committing. Check for:

- **Correctness** — Does the code do what the spec or task card says? Test the edge cases mentally: empty inputs, concurrent access, error paths.
- **Tests** — Is the new behavior covered? Do the tests check behavior, not implementation? Would they catch a regression?
- **Design** — Does this belong here? Could it be simpler? Are abstractions being introduced prematurely?
- **Readability** — Can you understand this code in 6 months without asking the author? Are variable and function names honest?

Write comments at three severity levels:

- `[blocking]` — Must be fixed before merge. Safety, correctness, or security issues.
- `[suggestion]` — Should be addressed, but merge is not blocked.
- `[nit]` — Style or preference. Author can accept or decline.

### Acme Frontend Standards (apply these in addition to the above)

Flag the following as `[blocking]`:

- Any function exceeding 30 lines. If it's a switch statement, extract each case into a named handler.
- Magic numbers outside `src/constants/`. Every number that isn't 0 or 1 gets a named constant with a comment explaining its origin.
- Exported functions without explicit TypeScript return types. Inferred returns on exported interfaces break consumers when the implementation changes.
- Non-null assertions (`!`) on values not guaranteed by construction. Replace with a runtime guard or restructure so the value cannot be null at that point.
- Direct `fetch()` calls outside `src/api/`. All server communication must go through the API layer for consistent error handling and auth header injection.
- Components importing from other components' internals (e.g., `import { helper } from '../UserCard/utils'`). Only import from index files.

Flag the following as `[suggestion]`:

- React effects without dependency arrays or with empty arrays and no explanatory comment.
- Inline styles when a Tailwind utility class exists for the same property.
- `console.log` statements committed to non-debug code paths.

Our PR template is at `docs/pr-template.md`. Verify the checklist is completed before flagging a PR as ready for review.
```

The "after" version retains everything from the original — it does not throw away the generic guidance. It adds a clearly labeled section that applies exclusively to this team's context. Someone who reads the skill can immediately see what is universal and what is team-specific.

---

## Step 6: Editing a Template in resources/templates/

Some skills include template files in a `resources/templates/` subdirectory. Templates are fill-in-the-blank documents that your agent populates when the skill runs. For example, a development workflow skill might include a PR description template or a code review comment template.

If your forked skill has a `resources/templates/` directory, open it and look at what is there:

```bash
ls skills/development/my-dev-workflow/resources/templates/
```

You might find files like `pr-description.md`, `review-comment.md`, or `task-checklist.md`.

Templates are plain text files with placeholder markers. They look like this:

```markdown
# PR Description

## What this changes

[DESCRIPTION: one to three sentences explaining what the PR does and why]

## How to test

[TEST_STEPS: numbered list of steps a reviewer can follow to verify the change works]

## Checklist

- [ ] Tests added or updated
- [ ] Documentation updated
- [ ] No console.log statements committed
```

To customize a template for your team, open it and add or remove items. For example, you might add your team's standard checklist items:

```markdown
## Checklist

- [ ] Tests added or updated
- [ ] Documentation updated
- [ ] No console.log statements committed
- [ ] PR title follows our convention: `[JIRA-123] Short imperative description`
- [ ] Design review approved (if the change touches any user-visible UI)
- [ ] Feature flag added if this change should not be visible in production yet
```

The agent reads these template files when it runs the skill and uses them as scaffolding. Your additions become part of every output the skill produces.

If the skill does not have a `resources/templates/` directory, you can create one. Add any markdown file to it and reference it from the skill body with a line like:

```markdown
## Templates

Use this template for all PR descriptions: [resources/templates/pr-description.md](resources/templates/pr-description.md)
```

---

## Step 7: Update the Description Field in Frontmatter

The `description` field in the frontmatter is the single most important field for a skill. It is what your agent reads when deciding whether to invoke the skill. A weak description means the skill either fires when it should not, or fails to fire when it should.

Rules for a good description:

1. **Start with an action verb.** "Apply," "Use when," "Run," "Generate." Not "This skill" or "A workflow for."
2. **Put the trigger phrase in the first 80 characters.** Agents that truncate long descriptions will still have enough to identify the skill.
3. **Stay under 150 characters total.** Every coding agent implements a context budget for skill listings. Descriptions over 150 characters are silently cut off when the agent is managing many skills simultaneously.
4. **Be specific about your team if relevant.** A description that says "Apply the Acme Engineering development workflow" helps you distinguish your fork from the generic version when you have both installed.

Example progression:

```yaml
# Too vague
description: "Development workflow."

# Better but still generic
description: "Apply the 16-step development loop to implementation tasks."

# Good — mentions team, specific trigger, under 150 chars
description: "Apply the Acme Engineering 16-step development workflow with TypeScript and React standards."
```

That last version is 90 characters — well within budget, team-branded, and specific about what makes it different from the original.

---

## Step 8: Validate the Customized Skill

Before deploying or sharing your fork, run the validator. It catches common mistakes that would cause the skill to be rejected by the catalog or malfunction in your agent.

```bash
bash scripts/validate-skill.sh skills/development/my-dev-workflow
```

The validator checks:

- `name` is present, under 64 characters, and matches the directory name exactly
- `description` is present and under 1024 characters (warns if over 150)
- `README.md` exists alongside `SKILL.md`
- YAML frontmatter parses without errors
- No required fields are missing or empty

A passing run looks like this:

```
Validating skills/development/my-dev-workflow...

  name          my-dev-workflow          OK
  description   90 chars                 OK
  README.md     present                  OK
  frontmatter   valid YAML               OK
  metadata      all fields present       OK

Validation passed. Ready to deploy.
```

If you see warnings, address them before deploying. A warning about description length means the skill will work but may be truncated in agent skill listings — worth fixing. A warning about a missing `README.md` is easy to address: copy the original's README and update the title and description.

You can also run the validator across all skills at once with:

```bash
npm run validate
```

This is useful after editing multiple files to catch any typos you may have introduced.

---

## Step 9: Deploy the Customized Skill

Once validation passes, deploy the skill to your agent:

```bash
npx skill-mall deploy development/my-dev-workflow
```

Without any additional flags, this deploys to the universal path (`~/.agents/skills/`). To deploy to a specific agent:

```bash
# Claude Code (global — available in all your projects)
npx skill-mall deploy development/my-dev-workflow --agent claude-code

# Cursor
npx skill-mall deploy development/my-dev-workflow --agent cursor

# Deploy to all detected agents at once
npx skill-mall deploy development/my-dev-workflow --all-agents
```

To share the skill with your team via version control — so everyone on the team has access without each person deploying manually — deploy as a project skill:

```bash
npx skill-mall deploy development/my-dev-workflow --agent claude-code --scope project
```

The `--scope project` flag copies the skill to `.claude/skills/my-dev-workflow/` in the current working directory (your project root) rather than `~/.claude/skills/`. When you commit this directory to your repository, every team member who clones the repo and opens Claude Code in that directory will have the skill available automatically.

After deploying, verify it is active:

| Agent | How to verify |
|-------|--------------|
| Claude Code | Type `/my-dev-workflow` in a conversation |
| Cursor | Type `/` in agent chat and look for `my-dev-workflow` in the list |
| Codex | Ask "what skills do you have available?" |

---

## Step 10: What "Independent" Means in Practice

When the SkillMall community updates the original `development-workflow` skill — adding a new step, improving the review criteria, fixing a bug in the instructions — your fork is completely unaffected.

Your fork lives at `skills/development/my-dev-workflow/`. The original lives at `skills/development/development-workflow/`. They share no files. They share no state. An update to one never touches the other.

This means two things.

**First, your fork is stable.** You can deploy it, build team processes around it, and trust that it will not change without your approval. The SkillMall community will never silently alter your team's standards. If they improve the base skill and you want those improvements, you choose to incorporate them manually — you read the diff, decide which changes make sense for your team, and merge them yourself.

**Second, you are responsible for keeping your fork current if you want improvements.** If the original skill receives a significant update — say, the 16-step loop gains two new mandatory steps that make a real difference — you will not automatically benefit from that. You need to watch the original, compare the changes, and decide whether to apply them.

The `forked_from` field in your frontmatter makes this practical. At any time you can run:

```bash
npx skill-mall diff development/my-dev-workflow
```

This shows you the differences between your fork and the current version of its origin skill, helping you decide what (if anything) to pull in.

Think of it like maintaining a configuration file. The upstream project ships a new default configuration. You review the new defaults, take what makes sense for your environment, and leave behind what does not. The skill system works the same way — structured independence rather than automatic inheritance.

---

## Step 11: Fork in the Web UI

If you prefer working in a browser, SkillMall's web catalog includes a Fork button on every skill detail page.

To use it:

1. Browse to the SkillMall catalog (`http://localhost:3000` for a local instance, or your team's hosted instance).
2. Navigate to the `development/development-workflow` skill. You can search for it using the search bar on the homepage, or click "Development" in the category navigation to browse all development skills.
3. On the skill detail page, you will see a "Fork" button in the top-right area of the skill card, next to the Install button. The Fork button is visible to authenticated users. If you are not logged in, you will see a "Sign in to Fork" prompt instead.
4. Click "Fork." A dialog opens asking for a name for your fork. Enter `my-dev-workflow` (or your preferred name). The dialog validates the name in real time — it will flag names that are already taken, contain invalid characters, or exceed the length limit.
5. Click "Create Fork." The catalog creates the new skill directory, copies the files, adds the `forked_from` and `fork_chain` fields, and takes you directly to the fork's detail page.
6. From the detail page, click "Edit" to open the skill's `SKILL.md` in the browser-based editor. Make your changes, click "Save," and the file is written to disk.
7. When you are ready to deploy from the catalog UI, click "Deploy" and select your agent and scope (global or project).

The web UI fork flow is equivalent to running `npx skill-mall fork` from the command line. Both produce the same result. The UI is convenient when you are browsing the catalog and spot a skill you want to customize immediately. The CLI is faster if you already know which skill you want and prefer staying in the terminal.

---

## Quick Reference

Here is the complete sequence for forking and customizing a skill:

```bash
# 1. Fork the skill
npx skill-mall fork development/development-workflow my-dev-workflow

# 2. Edit the skill
code skills/development/my-dev-workflow/SKILL.md

# 3. Validate your changes
bash scripts/validate-skill.sh skills/development/my-dev-workflow

# 4. Deploy to your agent
npx skill-mall deploy development/my-dev-workflow --agent claude-code

# 5. (Optional) Share with your team via version control
npx skill-mall deploy development/my-dev-workflow --agent claude-code --scope project
git add .claude/skills/my-dev-workflow
git commit -m "feat: add team development workflow skill"
```

---

## What Next

Now that your fork is deployed, put it to use. Start a new session in your agent, pick up a development task, and watch the skill apply your team's standards automatically.

A few things worth doing after your first session:

- **Refine the rules based on what the agent flags.** If it surfaces issues that are not actually problems on your codebase, the rule is too broad. Tighten it. If it misses things your team consistently catches in manual review, the rule is too vague. Make it more specific.
- **Share the skill directory with your team.** Committing `.claude/skills/my-dev-workflow/` to your repository is the fastest path to team-wide adoption. No individual setup required — check out the repo, open Claude Code, and the skill is there.
- **Consider contributing general improvements back.** If you added rules or template improvements that would benefit teams beyond your own, open a pull request to the SkillMall catalog. Use the `forked_from` lineage your skill already has to credit the original authors, and document what you changed and why in the PR description.

Skills improve through use. The more specific your rules, the more useful your agent's feedback. The more useful the feedback, the less time your team spends in code review explaining the same things repeatedly.
