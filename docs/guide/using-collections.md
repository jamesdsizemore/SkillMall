# Using Collections

A collection is a curated set of related skills that are meant to be deployed and used together. Unlike a random grab-bag of individually useful skills, a collection has a point of view: it is designed for a specific type of person doing a specific type of work, and the skills in it reinforce one another.

This guide explains what collections are, how to deploy an existing one, how to create your own, and how to submit it to the community catalog.

## Table of Contents

1. [What a collection is — and what it is not](#what-a-collection-is)
2. [The collections in the catalog](#the-collections-in-the-catalog)
3. [Deploying a collection](#deploying-a-collection)
4. [Creating your own collection](#creating-your-own-collection)
5. [Submitting a community collection](#submitting-a-community-collection)
6. [Quality requirements](#quality-requirements)

---

## What a collection is

A collection is a `collection.json` file that names a set of skills, provides a deployment order, and tells the reader who the collection is for.

That last part matters. The defining characteristic of a good collection is not the list of skills — it is the story about the person those skills are designed to help. A collection aimed at full-stack developers working in fast-moving startup environments has different priorities than one aimed at technical writers maintaining reference documentation at an enterprise software company. The skills might overlap. The collection's description, order, and per-skill notes will be different because the intended workflow is different.

**What a collection is not:** a collection is not a dependency system. Installing a collection does not create any link between the skills inside it. Each skill continues to work independently after deployment. The collection simply gives you a way to find, evaluate, and install a coherent set of skills in one step, rather than hunting them down one at a time.

**Who should use collections:** if you are new to SkillMall, start with a collection that matches your role. It will get your agent to a useful state in under five minutes, without requiring you to read dozens of individual skill descriptions. If you are a team lead or developer relations engineer, publishing a collection is the fastest way to standardize your team's agent setup across all members.

---

## The collections in the catalog

SkillMall ships with three core collections. Each one reflects a different primary use case.

### Full-Stack Developer Kit (`full-stack-developer-kit`)

This collection is for engineers who implement features, fix bugs, and ship software daily. It covers the three disciplines that appear in nearly every implementation session: creating new skills for new tools as your stack evolves, enforcing a quality process on every implementation task, and structuring large multi-session projects so they do not drift.

The skills install in a specific order because they build on one another. The skill-creator skill comes first because once your agent can create new skills, you can extend your toolkit without leaving the catalog. The development-workflow skill comes second because it establishes the quality loop that every subsequent implementation task should follow. The phased-implementation-plan skill comes last because it produces plans that assume the development-workflow quality process is already in place.

### Documentation Suite (`documentation-suite`)

This collection is for anyone who writes and maintains technical documentation — not as an afterthought, but as a primary deliverable. It is useful for developer advocates, technical writers, and engineers who own public-facing reference material.

Unlike the Full-Stack Developer Kit, this collection's skills install in any order. The skill-creator skill lets your agent generate methodology-specific documentation skills on demand. The development-workflow skill includes a documentation update step (step 14 of 16) that fires after every implementation task, keeping documentation synchronized with code changes automatically.

### Strategic Business Pack (`strategic-business-pack`)

This collection is for strategists, product managers, and founders who use their agent as a thinking partner on business problems rather than an implementation machine. It covers two capabilities: generating domain-specific analytical skills from authoritative sources, and turning strategy documents into phased execution plans with concrete task cards.

The skills in this collection install in any order.

---

## Deploying a collection

Deploying a collection installs all of its skills into your agent's skill directory in the order specified by the collection's `order` field.

### Deploy to your global agent (default)

```
npx skill-mall deploy-pack full-stack-developer-kit
```

Expected output:

```
Deploying collection: Full-Stack Developer Kit (3 skills)

[1/3] ai/skill-creator
      Install first — creates new skills for the other tools you use
      Deployed to ~/.claude/skills/skill-creator/

[2/3] productivity/development-workflow
      Enforces 16-step quality loop on every implementation task
      Deployed to ~/.claude/skills/development-workflow/

[3/3] productivity/phased-implementation-plan
      Creates comprehensive GoalBuddy-ready phased plans
      Deployed to ~/.claude/skills/phased-implementation-plan/

Done. 3 skills deployed.
Invoke with: /skill-creator, /development-workflow, /phased-implementation-plan
```

### Deploy to a different agent

Use the `--agent` flag to deploy to Cursor, Codex, or any other supported agent:

```
npx skill-mall deploy-pack full-stack-developer-kit --agent cursor
```

The `--agent` flag accepts: `claude-code` (default), `cursor`, `codex`, `copilot`, `gemini`.

### Deploy at project scope

By default, skills deploy to your user-level agent configuration, which makes them available in every project. To deploy to the current project only, use `--scope project`:

```
npx skill-mall deploy-pack full-stack-developer-kit --scope project
```

This writes skills to `.claude/skills/` (or the equivalent directory for your agent) relative to the current working directory. Skills deployed at project scope are only active when your agent runs inside that project. This is useful for team-specific collections that should not pollute a developer's global skill configuration.

Project-scope deployment expected output:

```
Deploying collection: Full-Stack Developer Kit (3 skills) [project scope]

[1/3] ai/skill-creator
      Deployed to .claude/skills/skill-creator/

[2/3] productivity/development-workflow
      Deployed to .claude/skills/development-workflow/

[3/3] productivity/phased-implementation-plan
      Deployed to .claude/skills/phased-implementation-plan/

Done. 3 skills deployed to project scope.
```

### Verify what was deployed

After deployment, list the skills available in your agent to confirm everything landed correctly:

```
npx skill-mall list
```

---

## Creating your own collection

A collection is a single JSON file. You do not need to write any code. You do not need to fork the repository to create a collection for personal or team use — you can create a `collection.json` anywhere on your machine and deploy it directly.

### The collection.json format

```json
{
  "name": "My Team's Toolkit",
  "slug": "my-team-toolkit",
  "description": "Core skills for the Acme platform team. Covers code review, debugging sessions, and phased planning for our quarterly roadmap process.",
  "author": "your-github-username",
  "skills": [
    {
      "slug": "development/code-review",
      "order": 1,
      "note": "Team's code review process — includes our null-handling and line-length rules"
    },
    {
      "slug": "development/debugging-session",
      "order": 2,
      "note": null
    },
    {
      "slug": "productivity/phased-implementation-plan",
      "order": 3,
      "note": "Use for quarterly planning; produces GoalBuddy-ready task cards"
    }
  ]
}
```

### Field reference

**`name`** — The human-readable display name for the collection. This appears in deploy output and in the catalog. Use title case. Keep it under 60 characters so it fits cleanly in terminal output.

**`slug`** — A unique identifier for the collection. Lowercase letters, numbers, and hyphens only. No leading, trailing, or consecutive hyphens. Must match the directory name if you submit to the community catalog. For personal or team collections, any slug you choose is fine as long as it does not collide with an existing catalog collection.

**`description`** — A one-to-three sentence description of who this collection is for and what they accomplish with it. Do not write a list of the skills inside — the `skills` array already communicates that. Write about the person and their workflow. A reader who fits the description should immediately recognize themselves.

**`author`** — Your GitHub username or a team identifier. For team collections, a shared identity like `acme-platform-team` is fine. This field is informational only.

**`skills`** — An array of skill entries. Each entry has three fields:

- **`slug`** — The catalog slug for the skill, in `category/skill-name` format. Run `npx skill-mall list` to see all valid slugs.
- **`order`** — A positive integer. Skills deploy in ascending order. If order does not matter for your collection, you can use sequential integers as placeholders. When order does matter — because one skill creates infrastructure that another depends on — set `order` values that reflect the required sequence and document why in the `note` field.
- **`note`** — A short string (under 120 characters) that appears in deploy output next to the skill name. Use this to explain why this skill is in the collection, how your team has customized their use of it, or what step in your workflow it covers. Set to `null` if you have nothing to add.

### How order affects deployment

The deploy command reads the `order` field and installs skills in ascending numerical order. Skills with lower order values install first. The `note` for each skill appears in the terminal output during that skill's installation step, giving the person deploying the collection context exactly when they need it — at the moment the skill is being installed.

If two skills have the same `order` value, the deploy command installs them in the sequence they appear in the `skills` array. This is fine for collections where order does not matter, but it is not a reliable guarantee for collections where it does. Use distinct order values when sequence is important.

### Deploying a local collection file

You do not need to publish a collection to the catalog to use it. You can point `deploy-pack` at a local file:

```
npx skill-mall deploy-pack ./my-team-toolkit/collection.json
```

This is the recommended approach for team-internal collections that reference skills specific to your organization or skills that have not been submitted to the public catalog.

---

## Submitting a community collection

If your collection would be useful to people outside your team, submit it to the SkillMall catalog. The process is the same as contributing any other file to an open-source repository.

### Step 1: Fork the repository

Fork `skill-mall` on GitHub and clone your fork locally.

### Step 2: Create the collection directory

Collections live in `collections/<slug>/`. Create that directory and place your `collection.json` inside it:

```
collections/
└── my-team-toolkit/
    └── collection.json
```

The directory name must match the `slug` field in `collection.json` exactly.

### Step 3: Verify all referenced skills exist

Before opening a pull request, confirm that every skill slug in your `skills` array is present in the catalog:

```
npx skill-mall list
```

Compare the slugs in your `collection.json` against the list. If a skill slug in your collection does not appear in the catalog output, either the skill does not exist or you have a typo in the slug. The CI check will catch this, but it is faster to find it yourself before pushing.

### Step 4: Open a pull request

Open a PR against the `main` branch of the upstream `skill-mall` repository. Title the PR with the collection name, like:

```
feat: add Full-Stack Developer Kit collection
```

The PR body should briefly explain who the collection is for and why the skills work well together. One paragraph is enough.

### Step 5: CI validation

When you open the PR, CI runs a validation check that:

1. Confirms `collections/<slug>/collection.json` exists.
2. Parses the JSON and checks it against the collection schema.
3. Resolves every `slug` in the `skills` array against the live skill catalog and fails if any slug does not exist.
4. Verifies the directory name matches the `slug` field.

If CI fails, the error output will name the specific validation that failed. Fix it on your branch and push again — CI reruns automatically.

---

## Quality requirements

Community collections go through a lightweight review before merging. The reviewer checks three things:

### 1. All skills exist in the catalog

Every `slug` in the `skills` array must resolve to a skill that is already in the catalog at merge time. You cannot reference a skill that you are planning to add later. If your collection depends on a skill that does not exist yet, submit the skill first and wait for it to merge before submitting the collection.

This requirement exists because a collection that references nonexistent skills will fail during deployment for the person who installs it. A broken collection is worse than no collection.

### 2. Skills must be related

The skills in a community collection must share a coherent purpose. They should serve a recognizable workflow, discipline, or type of project. A collection that contains one skill for code review, one for social media strategy, and one for 3D modeling is not a collection — it is a list. The reviewer will ask you to narrow the focus or split the collection if the skills do not fit together.

Related does not mean identical. Skills that approach the same goal from different angles (planning, then implementing, then reviewing) are related. Skills that cover different stages of a single workflow are related. Skills from three unrelated domains are not.

### 3. The description targets a specific user

The `description` field must name or clearly imply the person this collection is designed for, not just describe what the skills do in the abstract. A reviewer should be able to read the description and immediately picture the intended user — their role, their workflow, the kind of problems they are solving.

Compare:

- Weak: "A set of skills for development and planning tasks."
- Strong: "Core skills for engineers shipping features in a monorepo environment: structured code review, debugging methodology, and phased planning for sprint-level work."

The second version tells a potential user whether this collection is for them. That clarity is what makes a collection useful to a stranger finding it in the catalog.

---

## Next steps

- Browse the catalog: `npx skill-mall list`
- Deploy a collection: `npx skill-mall deploy-pack <slug>`
- Read about individual skill deployment: [Deploying skills](../user/deploying-skills.md)
- Contribute a skill first: [Contributing guide](../../CONTRIBUTING.md)
