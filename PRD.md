# SkillMall — Product Requirements Document

**Status:** Living reference document  
**Last updated:** 2026-05-17  
**Owner:** James Sizemore (@jamesdsizemore)

---

## 1. Executive Summary

SkillMall is a public, open-source catalog for Claude Code skills. A Claude Code skill is a structured Markdown file — `SKILL.md` — with YAML frontmatter that Claude Code loads when invoked. Skills direct Claude's behavior for a specific workflow: a TDD enforcer that mandates tests before implementation, a PRD writer that structures product requirements into a standard format, an infrastructure auditor that flags security gaps. The mechanism is simple; the problem is distribution.

Skills today are created ad-hoc, stored in private dotfiles, shared by copy-paste in Slack threads, and never indexed. A developer who wants a skill for systematic debugging has no way to find one that already exists, no canonical format to follow, and no path to contribute theirs back to the community. Every team invents the same skills from scratch.

SkillMall solves the discovery and distribution problem. It is a Next.js 15 web application backed by a Git repository. Skills live in the `skills/` directory, organized by category. The website parses every `SKILL.md` at build time and renders a searchable, filterable catalog. A developer who wants a skill copies one command. A developer who builds a skill opens a pull request. An automated hook keeps the machine-readable index current on every commit.

---

## 2. Problem Statement

### What breaks without SkillMall

**Skills are invisible.** There is no place to look for Claude Code skills that already exist. Each developer either builds from scratch or searches private repositories and chat history. Useful skills never spread beyond the team that created them.

**Skills are inconsistent.** Without a standard format, skill quality varies wildly. Some include no instructions at all. Some include instructions but no context-gathering step. Some reference templates that don't exist in the repository. Skills that are structurally incomplete fail silently — Claude ignores the gaps or guesses.

**Skills are not deployable from discovery.** Even when someone finds a skill, the path from "found it" to "using it" requires manual work: clone a repo, find the file, copy it to the right directory. There is no one-step deploy path.

**Skills are not maintainable.** Without versioning, authorship, or linked-skills metadata, there is no way to update a skill you depend on, no way to know which skills compose well together, and no accountability for quality.

**The Claude Code agent index is manually maintained or absent.** `AGENTS.md` — the file Claude reads to understand what skills are available — either doesn't exist or drifts out of sync as skills are added and removed. Skills that aren't listed in `AGENTS.md` are effectively invisible to Claude itself.

---

## 3. Goals and Non-Goals

### Goals

- Provide a canonical, public repository where any developer can find and deploy Claude Code skills.
- Enforce a consistent skill format that produces skills Claude can actually execute.
- Make deployment a single copy-paste command.
- Make contribution a single `git commit` with automated index regeneration.
- Serve as both a human-browsable web catalog and a machine-readable agent index.
- Lower the bar for contributors: one script scaffolds a complete, valid skill structure.

### Non-Goals

- SkillMall is not a package manager. There is no install daemon, no version resolution, no update mechanism. Skills are files. You deploy them by copying them.
- SkillMall is not a skill marketplace with monetization, ratings, or user accounts.
- SkillMall is not a runtime. It does not execute skills. It catalogs and distributes them.
- SkillMall is not a skill editor. You write skills in your own editor.
- SkillMall does not validate whether a skill's instructions are effective. It enforces structural completeness, not quality of reasoning.

---

## 4. User Personas

### Curator (James Sizemore)

The Curator creates skills, maintains catalog quality, and owns the direction of the project. He reviews pull requests, enforces the quality bar, and decides which categories and metadata fields exist. He is the primary author of skills in v0.1 and v1.0 and the final approver on all contributions.

**Primary needs:** Efficient skill creation workflow, automated index sync, quality enforcement tooling, a catalog that reflects exactly what is in the repository at all times.

### Contributor

A developer who has built a useful skill and wants to share it. They may be familiar with Claude Code but unfamiliar with the SkillMall repository structure. They arrive at the Contributing page, run one command to scaffold the skill, fill in the content, and open a PR.

**Primary needs:** A clear scaffold command, explicit frontmatter schema, quality bar they can check themselves before submitting, and a fast feedback loop from reviewers.

### Consumer

A developer browsing SkillMall to find a skill that solves a problem they have today. They may know what they want by name ("debugging"), by category ("development"), or by vague concept ("help me write tests"). They want to find it quickly, understand what it does at a glance, and deploy it with one command.

**Primary needs:** Fast search, good category organization, clear skill descriptions, and a deploy command that requires no additional research.

---

## 5. Feature Specifications

### 5.1 Catalog Homepage

The homepage is the primary browsing surface. It renders all skills in a responsive grid with search, category filtering, and stats.

**Acceptance criteria:**

- Displays a hero section with the catalog title and a one-line description.
- `StatsBanner` shows total skill count, category count, and contributor count, derived live from the parsed catalog.
- `SearchBar` filters the grid by skill name, description, and tags. Search is case-insensitive substring match. Query is persisted in the `?q=` URL parameter.
- `CategoryNav` renders a button for each of the 8 categories plus "All Skills". Each button shows the category name, icon, and skill count. Active state is reflected in the URL via `?cat=`. Search and category filters compose: `?q=debug&cat=development` shows development skills matching "debug".
- The skill grid is responsive: 1 column on mobile, 2 on sm, 3 on lg, 4 on xl.
- When the catalog is empty (no skills), `EmptyState` renders with the scaffold command displayed in a code block.
- When a search or category filter returns zero results, `NoResults` renders with the query and category in plain English.
- The result count is displayed above the grid: "12 skills in development".

### 5.2 Skill Card

Each card in the grid is a link to the skill detail page.

**Acceptance criteria:**

- Displays: category badge, version, skill name (monospace), description (2-line clamp), tags (first 3, with overflow count badge), and resource indicators (scripts, templates, linked count).
- Category badge uses the category color defined in `categories.ts`.
- Card has a hover state: lighter border, slightly brighter background.
- The entire card is a clickable link — no nested interactive elements.

### 5.3 Skill Detail Page

The detail page is the full view of a single skill, reachable at `/skills/[category]/[slug]`.

**Acceptance criteria:**

- Header shows: category badge, version, author, skill name (monospace, large), description, and full tag list.
- "Deploy to Claude Code" section shows the copy command: `cp -r skills/<path> ~/.claude/skills/`. The `DeployButton` copies the command to clipboard on click and shows a "Copied" state for 2 seconds.
- Two-tab interface: "Overview" and "SKILL.md".
- Overview tab contains:
  - Details panel: category, slug, version, author.
  - Includes panel: which of scripts, templates, samples are present (or "SKILL.md only").
  - Linked Skills section (only rendered if `linked_skills` is non-empty): displays each linked skill name as a monospace badge.
  - README section (only rendered if `README.md` exists): displays the raw README content.
- SKILL.md tab shows the raw SKILL.md body content (the frontmatter is stripped; only the content below the closing `---` is shown) in a monospace code block with a file path label.
- `generateStaticParams` pre-generates a route for every skill at build time.
- Returns 404 via `notFound()` for unknown category/slug combinations.

### 5.4 Contributing Page

Reachable at `/contributing`. Walks a contributor through the four steps to add a skill.

**Acceptance criteria:**

- Step 1: scaffold command with example.
- Step 2: file structure table with required/optional labels and descriptions for SKILL.md, README.md, scripts/, resources/templates/, resources/samples/.
- Step 3: complete frontmatter schema with inline comments.
- Step 4: commit and PR workflow showing that AGENTS.md auto-updates.
- Quality bar checklist at the bottom, matching the review criteria in section 10.

### 5.5 Deploy Button

**Acceptance criteria:**

- Renders a code block with the copy command.
- One button triggers clipboard copy. Uses `navigator.clipboard.writeText`.
- On success, button switches to "Copied" state with a green checkmark for 2000ms, then resets.
- Command format: `cp -r skills/<category>/<slug> ~/.claude/skills/`

### 5.6 Empty and Error States

**Acceptance criteria:**

- **Empty catalog:** Full-page empty state with "SM" monogram, "No skills yet" heading, instructions referencing the scaffold command.
- **No results:** Inline message identifying the query and/or category that returned no results.
- **404:** Next.js `notFound()` renders the default 404 page for missing skill routes.

---

## 6. Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui (Badge, Button, Card, Input, Separator, Tabs) |
| Font | Geist Sans + Geist Mono (Google Fonts) |
| Skill parsing | gray-matter |
| Icons | lucide-react |
| Automation | Bash (sync-agents.sh, new-skill.sh), Husky pre-commit hook |
| Language | TypeScript |

### Data Flow

The catalog is a filesystem-backed static site. There is no database, no API, and no server-side state.

```
skills/
  [category]/
    [slug]/
      SKILL.md          ← gray-matter parses frontmatter + body
      README.md         ← read as raw string, rendered verbatim
      scripts/          ← presence detected, not parsed
      resources/
        templates/      ← presence detected, not parsed
        samples/        ← presence detected, not parsed
```

At build time, `lib/skills.ts` walks the directory tree and calls `parseSkill()` on every `SKILL.md`. The parsed `Skill[]` array is consumed directly by React Server Components. No API routes exist.

At request time on the homepage, `searchParams` (`?q` and `?cat`) filter the pre-loaded `Skill[]` array in the server component. No client-side fetching occurs.

The skill detail page uses `generateStaticParams()` to pre-generate a route for every skill. The `getSkill()` and `getSkillReadme()` functions read from disk at build time.

### Key Types

```typescript
type Skill = {
  slug: string;          // directory name under category/
  category: string;      // parent directory name
  name: string;          // frontmatter: name
  description: string;   // frontmatter: description
  version: string;       // frontmatter: version (semver)
  tags: string[];        // frontmatter: tags[]
  author: string;        // frontmatter: author
  linked_skills: string[]; // frontmatter: linked_skills[]
  content: string;       // SKILL.md body (below closing ---)
  path: string;          // relative path from skills/ root
  hasScripts: boolean;   // scripts/ contains non-.gitkeep files
  hasTemplates: boolean; // resources/templates/ contains non-.gitkeep files
  hasSamples: boolean;   // resources/samples/ contains non-.gitkeep files
};
```

### Static Generation

The site is fully statically generated. `generateStaticParams` in `app/skills/[category]/[slug]/page.tsx` returns all category+slug pairs from `getAllSkills()`. The build produces a static HTML file per skill.

The homepage handles filtering as a server component that reads `searchParams` — this works in Next.js 15's App Router without client-side JavaScript for the initial render. `SearchBar` and `CategoryNav` are client components that update the URL using `<Link>` and `useSearchParams`.

---

## 7. Skill Format Specification

### Frontmatter Schema

Every `SKILL.md` must open with a YAML frontmatter block between `---` delimiters.

```yaml
---
name: skill-name          # Required. kebab-case. Unique across all skills.
description: >            # Required. One-line summary. Shown in catalog cards.
  What this skill does and when Claude should use it.
version: 1.0.0            # Required. Semver. Increment on breaking changes.
category: development     # Required. Must match a valid category slug.
tags:                     # Required. 2–6 lowercase tags.
  - testing
  - workflow
author: github-username   # Required. GitHub handle of the primary author.
linked_skills:            # Optional. Skill names this pairs with.
  - systematic-debugging
---
```

**Field rules:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | yes | kebab-case, unique across catalog |
| `description` | string | yes | single line, under 120 characters |
| `version` | string | yes | semver (`MAJOR.MINOR.PATCH`) |
| `category` | string | yes | must be one of the 8 valid slugs |
| `tags` | string[] | yes | 2–6 items, lowercase, no spaces |
| `author` | string | yes | GitHub username |
| `linked_skills` | string[] | no | must reference real skill names in catalog |

**Valid categories:** `development`, `design`, `writing`, `research`, `productivity`, `infrastructure`, `ai`, `business`

### SKILL.md Body Structure

The body is the content Claude Code receives when the skill is invoked. It must follow this structure:

```markdown
# Skill Name

Brief description. One to three sentences.

## When to Use

- Trigger condition 1
- Trigger condition 2
- Specific user phrases that indicate this skill applies

## What This Produces

- Primary output artifact
- Secondary outputs if any

## Instructions

### Step 1 — Setup
Context-gathering or prerequisite steps.

### Step 2 — Core Work
The main body of directed behavior.

### Step 3 — Verification
How Claude should verify the output before returning to the user.

## Templates
References to resources/templates/ files by name.

## Scripts
References to scripts/ files by name.

## Linked Skills
- `skill-name` — use before/after to extend output
```

Sections `Templates`, `Scripts`, and `Linked Skills` are omitted when the skill has no corresponding resources.

### Folder Layout

```
skills/
  [category]/
    [skill-name]/
      SKILL.md                         # Required. Frontmatter + skill body.
      README.md                        # Required. Human-readable documentation.
      scripts/
        .gitkeep                       # Present in empty scaffold; deleted when scripts are added.
        script-name.sh                 # Optional. Automation scripts.
      resources/
        templates/
          .gitkeep
          template-name.md             # Optional. Output templates.
        samples/
          .gitkeep
          sample-name.md               # Optional. Completed example outputs.
```

`.gitkeep` files hold empty directories in git. The `parseSkill()` function ignores them when determining whether scripts/templates/samples are present.

### README.md Structure

The README is the human-readable companion to SKILL.md. It describes the skill for a developer evaluating whether to deploy it, not for Claude.

```markdown
# Skill Name

> One-line description.

## Overview

2–3 sentences. What it does, what problem it solves, who should use it.

## What It Produces

| Artifact | Description |
|----------|-------------|
| ...      | ...         |

## When to Use This Skill

Use when:
- ...

Do not use when:
- ...

## Linked Skills

| Skill | When to Chain | What It Adds |
|-------|---------------|--------------|

## Scripts

| Script | Purpose |
|--------|---------|

## Resources

| Resource | Type | Purpose |
|----------|------|---------|

## Example Output
```

---

## 8. UI/UX Design Specification

### Visual Language

The site is dark-mode only. Background: `zinc-950`. Surface cards: `zinc-900/50` with `zinc-800` border. Text hierarchy: `zinc-100` (headings), `zinc-400` (body), `zinc-500`–`zinc-600` (metadata/labels). Accent: `zinc-700` borders on interactive elements, category-specific color for badges only.

Typography: Geist Sans for all UI text. Geist Mono for skill names, slugs, code blocks, and the "SM" monogram.

### Global Layout

**Header** (sticky, `z-50`, `zinc-950/90` with backdrop blur):
- Left: SM monogram (white rounded square), "SkillMall" wordmark, "beta" chip.
- Right: "Contribute" text link, GitHub icon + "GitHub" text link.

**Footer:**
- Left: "SkillMall — Open-source Claude Code skill catalog"
- Right: "Contribute" and "GitHub" links.

### Homepage

```
[Hero]
  "Claude Code" badge  "Open Source" badge
  h1: The Claude Code Skill Catalog
  p: 1-line description
  [StatsBanner: N Skills  N Categories  N Contributors]

[Search + Filter]
  [SearchBar: max-w-lg]
  [CategoryNav: All Skills | Development | Design | ...]

[Result count line: "12 skills in development"]
[Grid: 1/2/3/4 columns]
  [SkillCard] [SkillCard] ...

[EmptyState] -- shown when catalog is empty, replaces grid
```

**CategoryNav** pills have an icon (lucide), label, and count. Active pill: `zinc-700` background, `zinc-500` border, `zinc-100` text. Inactive: `zinc-900/50` background, `zinc-800` border, `zinc-400` text.

**SkillCard** anatomy:
- Top: `CategoryBadge` (left) + version string (right, `zinc-600`)
- Middle: skill name (mono, `zinc-100`), description (2-line clamp, `zinc-400`)
- Tags: first 3 tags as outline badges + overflow count
- Footer (separated by `zinc-800` border): resource indicators on the left (scripts, templates, linked count in `zinc-600`), right-arrow icon on the right that translates right on hover

### Skill Detail Page

```
[Back arrow: "Back to [category]"]

[Header]
  [CategoryBadge]  v1.0.0  @author
  h1: skill-name (mono, 2xl–3xl)
  p: description
  [Tag badges]

[Deploy section]
  h2: "DEPLOY TO CLAUDE CODE" (uppercase label)
  [DeployButton: code block + Copy button]

[Separator]

[Tabs: Overview | SKILL.md]
  Overview:
    [Details panel]  [Includes panel]
    [Linked Skills panel -- conditional]
    [README section -- conditional]
  SKILL.md:
    [Code block with file path label]
```

The tab underline uses `zinc-100` for the active tab. Inactive: `zinc-400`. The tab list itself has no background — it floats above a `zinc-800` bottom border.

### Contributing Page

Four numbered steps laid out vertically with a connecting line between step icons. Each step has: a 36px icon container (`zinc-800` border + bg), step number (mono, `zinc-600`), title, description, and a code block or file list.

Quality bar renders as a bordered card (`zinc-900/50`) with a dash-separated checklist in `zinc-400`.

### Empty and No-Results States

**Empty catalog:**
- 64px monogram box (`zinc-900`, `zinc-800` border, rounded-2xl) with "SM" in `zinc-600`
- "No skills yet" heading (`zinc-300`)
- Instruction paragraph referencing the scaffold command
- Scaffold command in a `pre` code block

**No results:**
- Single centered paragraph in `zinc-500`

---

## 9. Automation Design

### `scripts/sync-agents.sh`

Regenerates `AGENTS.md` by scanning all `SKILL.md` files in `skills/`, excluding `_template/`. For each skill, it reads the `name`, `description`, `version`, and `author` fields from frontmatter using `sed` and `awk`. It groups skills by category and writes:

1. A fixed header with usage instructions and category links.
2. Per-category sections with a table for each skill (version, author, path).
3. A footer with total skill count and generation timestamp.

The script is idempotent. Running it twice on the same repository produces the same output. It is safe to run from any directory — all paths are derived from `$(dirname "$0")`.

**Invocation:** `bash scripts/sync-agents.sh`

### `scripts/new-skill.sh`

Scaffolds a complete skill directory by copying `skills/_template/` to `skills/[category]/[skill-name]/`.

After copying:
1. Removes all `.gitkeep` files (they exist only to hold empty directories in the template; they serve no purpose in a real skill).
2. Patches `SKILL.md`: replaces `skill-name` with the provided name and `category: development` with the specified category.
3. Patches `README.md`: replaces the `# Skill Name` heading.

The script validates the category against the list of 8 valid slugs and exits with an error for unknown categories. It exits if the destination directory already exists.

**Invocation:** `bash scripts/new-skill.sh <category> <skill-name>`

**Output:**
```
Skill scaffolded at: skills/development/tdd-enforcer

Next steps:
  1. Edit skills/development/tdd-enforcer/SKILL.md
  2. Edit skills/development/tdd-enforcer/README.md
  3. Add templates to resources/templates/
  4. Add samples to resources/samples/
  5. Commit — AGENTS.md regenerates automatically
```

### Husky Pre-Commit Hook

Defined at `.husky/pre-commit`. Fires before every git commit.

Logic:
1. Check whether the staged file list contains any path under `skills/` using `git diff --cached --name-only | grep -q "^skills/"`.
2. If yes: run `bash scripts/sync-agents.sh`, then `git add AGENTS.md`.
3. If no: do nothing.

This means `AGENTS.md` is always current at the time of commit without requiring any manual step. Contributors who follow the contribution workflow never need to think about `AGENTS.md`.

---

## 10. Quality Bar

### What Makes a Good Skill

A skill is ready to ship when:

1. **SKILL.md has complete frontmatter.** All required fields are present and valid. The description is specific: "Enforce write-tests-first workflow for features and bugfixes" is good; "Help with testing" is not.

2. **SKILL.md body is actionable.** The Instructions section gives Claude concrete steps, not vague directives. A developer reading the skill should be able to predict what Claude will do.

3. **README.md is present and complete.** It describes what the skill produces, when to use it, and when not to. The "What It Produces" table lists concrete artifacts.

4. **Linked skills exist.** If `linked_skills` references other skills, those skills must exist in the catalog. No dangling references.

5. **Tags are appropriate.** 2–6 lowercase tags. General enough to be discoverable but specific enough to be meaningful. `testing`, `tdd`, `workflow` — not `useful`, `claude`, `my-skill`.

6. **Templates and samples are present when the skill produces structured output.** A skill that instructs Claude to produce a PRD should include a template for the PRD format.

### PR Review Criteria

| Check | Pass condition |
|-------|---------------|
| Frontmatter | All required fields present, valid category, valid semver |
| Description | Under 120 characters, specific, action-oriented |
| Body structure | Has at least When to Use, What This Produces, and Instructions sections |
| README | Present, has Overview and What It Produces sections |
| Linked skills | All referenced skills exist in the catalog |
| Tags | 2–6, lowercase, no spaces |
| Scaffold artifacts | `.gitkeep` files not present |
| AGENTS.md | Updated by pre-commit hook (present in commit) |
| Category | Correct for the skill's domain |

---

## 11. Milestones

### v0.1 — Structure Complete (current)

- [x] Repository structure with 8 category directories
- [x] `_template/` scaffold with SKILL.md, README.md, scripts/, resources/
- [x] `scripts/new-skill.sh` — full scaffolding workflow
- [x] `scripts/sync-agents.sh` — full AGENTS.md generation
- [x] Husky pre-commit hook wired to sync-agents.sh
- [x] Next.js 15 app with App Router
- [x] `lib/skills.ts` — gray-matter parser and data layer
- [x] `lib/categories.ts` — 8 categories with colors and icons
- [x] Homepage: hero, search, category nav, skill grid, empty state
- [x] Skill detail page: header, deploy button, overview tab, SKILL.md tab
- [x] Contributing page: 4-step walkthrough, quality bar
- [x] All shadcn/ui components wired: Badge, Button, Card, Input, Separator, Tabs
- [ ] First skill published (catalog is empty)

### v1.0 — First 20 Skills

Target: 20 high-quality skills across at least 5 categories.

Suggested initial skills:

| Category | Skill Name | Description |
|----------|-----------|-------------|
| development | tdd-enforcer | Enforce test-first workflow |
| development | systematic-debugging | Methodical root cause investigation |
| development | code-review | Review changes against a quality bar |
| development | security-review | Audit changes for security issues |
| writing | prd-writer | Structure product requirements into a standard PRD |
| writing | commit-message | Write semantic commit messages from diffs |
| writing | technical-docs | Generate API and module documentation |
| ai | prompt-engineer | Optimize prompts for Claude pipelines |
| ai | skill-author | Write and audit Claude Code skills |
| productivity | daily-brief | Generate a structured daily work plan |
| infrastructure | docker-audit | Review Dockerfiles for best practices |
| research | competitive-analysis | Structure competitive research output |

Additional work for v1.0:
- README content rendered as parsed Markdown (not raw `pre` block)
- GitHub repository URL wired into the header and footer
- `og:image` meta tag generation for each skill
- Deployment to a public URL

### v2.0 — Community Features

- Contributor profile pages: list all skills by a given author
- "Recently added" section on the homepage
- Skill ratings or "used by N people" counter (requires minimal backend or GitHub API)
- RSS feed of new skills
- GitHub Actions workflow that runs `sync-agents.sh` and validates frontmatter on every PR
- CLI tool: `npx skillmall install tdd-enforcer` that copies the skill to `~/.claude/skills/`
- Search index with fuzzy matching (Fuse.js or similar) for larger catalogs

---

## 12. Success Metrics

| Metric | v1.0 target | v2.0 target |
|--------|------------|------------|
| Skills in catalog | 20 | 100 |
| Contributors | 1 (Curator) | 10 |
| Categories with at least 3 skills | 5 of 8 | 8 of 8 |
| Time from "I want a skill" to deployed | < 30 seconds | < 10 seconds |
| Time from "I have a skill" to PR | < 5 minutes | < 3 minutes |
| AGENTS.md accuracy | 100% (automated) | 100% (automated) |
| Broken linked_skills references | 0 (enforced in review) | 0 (enforced by CI) |

---

## 13. Open Questions

1. **README rendering.** The current implementation displays `README.md` as raw text in a `<pre>` block. Should it be rendered as Markdown? This requires adding a Markdown renderer (`react-markdown` or `@tailwindcss/typography` prose). Decision needed before v1.0 launch.

2. **Deploy command scope.** The current deploy command copies only the skill directory (`cp -r skills/<path> ~/.claude/skills/`). Should it also write to the local `AGENTS.md`? Or is that the developer's responsibility? Keeping the command simple reduces confusion but means AGENTS.md sync is a separate step.

3. **Skill validation in CI.** Should a GitHub Actions workflow validate frontmatter on every PR? This would catch broken `linked_skills` references, invalid categories, and missing required fields before they reach `main`. Needed for v2.0, optional for v1.0 given curator-only contributions.

4. **Versioning and updates.** When a skill is updated, what is the update path for users who have already deployed it? There is no package manager. The current answer is "re-run the deploy command." This is acceptable at v1.0 scale but becomes painful at v2.0. A CLI tool (question from v2.0 milestones) would address this.

5. **Category extensibility.** The 8 current categories are hardcoded in `lib/categories.ts` and `scripts/new-skill.sh`. Adding a new category requires changes in three places. Should categories be data-driven from a config file? Not urgent, but worth resolving before contributors start requesting new categories.

6. **Skill naming collisions.** The `name` field is currently not enforced for uniqueness at commit time. Two skills in different categories can share a name. Should uniqueness be enforced by the Husky hook, by CI, or only by code review?
