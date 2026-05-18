# Understanding the Quality Score

You deployed a skill. It works. Now you are looking at a number — say, 58 out of 100 — and you want to know what it means and how to move it up.

This guide walks through every part of the quality system: what the score measures, where points come from, and the fastest path to improvement for each dimension. By the end, you will know exactly what to change to cross the 70-point threshold required for a PR to the SkillMall catalog.

---

## What the Score Is (and Is Not)

The quality score is a number between 0 and 100 computed by `lib/quality-score.ts` at build time. It appears on every skill card in the web catalog, and in the `npx skill-mall validate` output.

The score is not a pass/fail gate for the skill itself. An agent can run a skill with a score of 40. The score is a guide — a structured way to surface what a skill is missing so you can prioritize what to fix.

The 70-point threshold applies only to pull requests submitted to the SkillMall catalog. A skill below 70 will get a review comment asking you to address specific dimensions before merge. Skills above 70 are reviewed on their merits. Skills above 90 are considered production-ready.

Here is how the score bands map to state:

| Score | State |
|---|---|
| 90–100 | Production-ready, well-documented |
| 70–89 | Good skill, minor improvements possible |
| 50–69 | Usable but missing documentation or resources |
| Below 50 | Needs significant work before publishing |
| Below 40 | Template or placeholder — do not publish |

A freshly scaffolded skill from `bash scripts/new-skill.sh` scores below 40. That is expected. The template gives you the structure; the score tells you what to fill in.

---

## The Five Dimensions

The 100 points are divided across five dimensions. Each dimension is scored independently, and each has its own set of specific deductions. The deductions appear as feedback messages below the score breakdown in both the CLI and the web catalog.

---

### Dimension 1: Description Quality (25 points max)

This is where most skills lose points first, and it is also the highest-leverage dimension to fix. The description is what every agent reads when deciding whether your skill applies to a user's request. A weak description means agents miss your skill entirely, even when it would be the right one.

The scorer applies four checks, each worth a specific point value.

**Check 1: Imperative first word (7 points)**

The description must start with one of these verbs: Apply, Run, Analyze, Use, Execute, Generate, Create, Build, Perform, Conduct, Evaluate, Assess, Produce, Identify, Extract, Implement, Write, Review, Plan.

The scorer reads the first word of the description, converts it to lowercase, and checks whether it matches the list. If not, 7 points are deducted.

Bad:
```
description: "Helps you with business strategy and competitive analysis"
```
This starts with "Helps" — not on the list. Deduction: -7.

Good:
```
description: "Apply Blue Ocean Strategy: ERRC grid, Strategy Canvas, and non-customer analysis."
```
This starts with "Apply" — full points.

The verbs on the list are all imperative. They instruct the agent what to do, which is what agent skill descriptions are for. Passive or noun-first descriptions ("Business strategy tool for...") or sentences that position the skill as a helper ("Helps you...", "Assists with...") score zero on this check.

**Check 2: Length at or under 150 characters (6 points)**

If the description exceeds 150 characters, 6 points are deducted. This is not an arbitrary limit. When an agent loads many skills into context, skill descriptions are cut to fit the available budget. A description that runs 200 characters may be truncated to 150 by the agent runtime, cutting off your trigger phrase or key methodology names.

Bad (187 chars):
```
description: "Apply Blue Ocean Strategy frameworks to identify uncontested market space, including the ERRC grid, Strategy Canvas, value curve analysis, and non-customer tier analysis."
```
Deduction: -6.

Good (91 chars):
```
description: "Apply Blue Ocean Strategy: ERRC grid, Strategy Canvas, and non-customer analysis."
```
Full points. Everything a user needs to trigger this skill fits in 91 characters.

**Check 3: Trigger phrase in the first 80 characters (7 points)**

The scorer takes the words in the skill's `name` field (split on hyphens, words longer than 3 characters), and checks whether any of them appear in the first 80 characters of the description. If the skill name is `blue-ocean-strategy` and no word from that name ("ocean", "strategy") appears in the first 80 characters, 7 points are deducted.

This check reflects how agents decide which skill to use. The agent typically reads the first portion of a description — not necessarily all of it — when scanning for relevance. The domain name or core concept must be front-loaded.

Bad:
```
description: "Apply the frameworks developed by Kim and Mauborgne to identify Blue Ocean opportunities."
```
The words "ocean" and "strategy" do not appear until character 82 and beyond. Deduction: -7.

Good:
```
description: "Apply Blue Ocean Strategy: ERRC grid, Strategy Canvas, and non-customer analysis."
```
"ocean" and "strategy" appear at characters 7 and 12. Full points.

**Check 4: Specificity — no generic verbs alone (5 points)**

If the description is under 50 characters and relies on words like "help", "assist", "provide", "support", "enable", or "allow", 5 points are deducted. Short generic descriptions tell the agent almost nothing about when to use the skill.

Bad:
```
description: "Helps with strategy"
```
19 chars, contains "helps". Deduction: -5.

Good:
```
description: "Apply Blue Ocean Strategy: ERRC grid, Strategy Canvas, and non-customer analysis."
```
Names the specific methodology. Full points.

**Three-step improvement plan for Description Quality**

1. Pick the right verb from the imperative list. Match it to what the skill does: "Apply" for frameworks, "Analyze" for audits, "Generate" for artifacts, "Write" for documents, "Review" for feedback workflows.
2. Name the specific methodology, tool, or output in the first 80 characters. If your skill is about OKRs, "OKR" should appear before character 80.
3. Count the characters. If you are over 150, cut the least essential clause. You almost never need more than 120 characters to describe a skill clearly.

---

### Dimension 2: Content Completeness (25 points max)

The completeness dimension checks whether the skill directory contains the files that make a skill usable. This is not a style check — it is a structural check. Each missing file type has a specific deduction.

**README.md present (5 points)**

Every skill directory must contain a `README.md`. This is separate from `SKILL.md`. The README is for humans browsing the catalog or the repo. It explains what the skill does, when to use it, and what output to expect. If the file is missing, 5 points are deducted.

**At least one file in `resources/templates/` (7 points)**

Templates are the reusable output artifacts the skill produces — a filled ERRC grid template, a Strategy Canvas table, a meeting agenda format. If the directory does not exist or contains no files, 7 points are deducted.

Templates are the most valuable resource a skill can have. They let agents produce consistent, structured output without improvising format from scratch. A skill without any template is making the agent do extra work and producing unpredictable output shapes.

**At least one file in `resources/samples/` (7 points)**

Samples are completed examples — a fully filled ERRC grid for an example company, a complete Strategy Canvas for a hypothetical product, a finished document in the target format. If none exist, 7 points are deducted.

Samples serve two purposes. They show users what good output looks like. They give the agent a concrete reference when generating output for a new input, which improves quality. A skill with a template and a sample is far more reliable than a skill with only instructions.

**At least one file in `resources/prompts/` (6 points)**

Prompt files are pre-written prompt texts the skill uses when calling a language model. If none exist, 6 points are deducted. A skill that has no prompt files is likely generating its own prompt inline in the instructions, which is harder to test, tune, and improve.

**Three-step improvement plan for Content Completeness**

1. Add `README.md` if missing. Two to three paragraphs is enough: what the skill does, when to use it, and what you get out of it.
2. Add a template file. Create `resources/templates/` and put in one `.md` file with the output structure the skill produces. Even a simple table or bulleted outline counts.
3. Add a sample file. Create `resources/samples/` and put in one `.md` file with a fully completed example using fictional or representative data.

---

### Dimension 3: Frontmatter Health (20 points max)

The frontmatter in `SKILL.md` is machine-read by the catalog, the CLI, and the scorer. Invalid or missing frontmatter breaks indexing and search. This dimension checks four things.

**All required fields present (8 points)**

The scorer checks for: `name`, `description`, `metadata.category`, `metadata.tags`, `metadata.version`, and `metadata.author`. If any are missing, 8 points are deducted regardless of how many are missing.

A fully valid frontmatter block looks like this:

```yaml
---
name: blue-ocean-strategy
description: "Apply Blue Ocean Strategy: ERRC grid, Strategy Canvas, and non-customer analysis."
metadata:
  version: "1.0.0"
  author: your-github-username
  category: business
  tags: "strategy, frameworks, competitive-analysis, blue-ocean, market"
---
```

A scaffolded skill from the template will have placeholder values. Replace them before publishing.

**Category value is in the valid taxonomy (4 points)**

The valid categories are: development, design, writing, research, productivity, infrastructure, ai, business. If the `metadata.category` field contains anything else — including reasonable-sounding values like "marketing", "finance", or "data" — 4 points are deducted.

Pick the closest valid category. A financial modeling skill goes in "business". A data pipeline skill goes in "development". A market research skill goes in "research".

**Tag count between 2 and 6 (4 points)**

The `metadata.tags` field must contain between 2 and 6 comma-separated tags. Fewer than 2 means the skill is undersearched. More than 6 dilutes signal. Both extremes lose 4 points.

Good tag choices are specific domain terms, methodology names, and output types — not generic words like "tool" or "useful".

**Directory name matches the `name` field (4 points)**

The directory name and the `name` field must be identical. If the skill lives at `skills/business/blue-ocean/` but the frontmatter says `name: blue-ocean-strategy`, 4 points are deducted.

This mismatch usually happens when you rename a skill directory after creating it. Fix it by aligning the directory name and the `name` field to the same kebab-case string.

**Three-step improvement plan for Frontmatter Health**

1. Run `npx skill-mall validate` and read every error. The validator lists every missing or invalid field.
2. Fill in all six required fields: name, description, category, tags, version, author.
3. Check that your directory name, your `name` field, and your skill slug are all the same string.

---

### Dimension 4: Resource Richness (20 points max)

Where completeness checks for the presence of each resource type, resource richness checks the total volume of resource files. More files means more reusable artifacts, more tested prompts, more diverse templates.

The scorer counts all files (excluding hidden files starting with `.`) across four directories: `resources/templates/`, `resources/samples/`, `resources/prompts/`, and `scripts/`. The count maps to a score:

| Total files | Points |
|---|---|
| 1–3 | 5 |
| 4–7 | 10 |
| 8–14 | 15 |
| 15 or more | 20 |

A skill with one template, one sample, and one prompt has 3 files and scores 5 points. Adding three more artifacts — a second template variant, a second sample with different inputs, one shell script — pushes it to 6 files and 10 points. Reaching 20 points requires 15 or more files, which is the mark of a fully documented, production-ready skill.

**Three-step improvement plan for Resource Richness**

1. Count your current resource files: `find skills/<category>/<name>/resources skills/<category>/<name>/scripts -type f | wc -l`
2. Add multiple template variants if the skill can produce different output shapes (e.g., a condensed ERRC grid for a slide deck, a detailed one for a workshop).
3. Add at least two sample outputs using different inputs — one simple example and one complex one. Real diversity in samples produces better agent output on novel inputs.

---

### Dimension 5: Link Health (10 points max)

Skills can declare relationships to other skills via the `metadata.linked-skills` field. This creates navigation in the catalog ("Related skills") and helps users discover adjacent tools.

The scorer checks whether every slug listed in `linked-skills` actually exists in the catalog.

- No linked skills declared: full 10 points. You are not penalized for having no links.
- All linked skills exist: full 10 points.
- Broken links: points are deducted proportionally. If you link to two skills and one is broken, you lose half of the 10 points. If all links are broken, you lose all 10 points. The deduction per broken link is `10 / total_linked_skills`, rounded to the nearest integer.

The most common cause of broken links is using an approximate or partial slug. The slug must match the directory name exactly, including category prefix if required by the catalog.

**Three-step improvement plan for Link Health**

1. Run `npx skill-mall list` to see every skill slug exactly as the catalog knows it.
2. Check each slug in your `linked-skills` field against the list output.
3. Remove any links that do not match. If the linked skill does not exist yet, either remove the link or contribute that skill in the same PR.

---

## The Budget Analyzer

The `budget-check` command tells you whether your description will be visible at a given character budget. This is separate from the quality score — it simulates what an agent actually sees when your skill competes with others in a loaded context.

Basic usage:

```
npx skill-mall budget-check ai/skill-creator --chars-available 200
```

The `--chars-available` flag is not a hardcoded agent name. It is the number of characters you think the target agent has available for each skill description in its skill-listing context. Different agents implement different budgets, and those budgets change with model updates. The flag lets you simulate any budget scenario by passing the actual number.

Example output when the description fits:

```
Budget analysis: ai/skill-creator / 200 chars available

Description (91 chars): FULLY VISIBLE
Trigger phrase: "skill-creator"
Trigger preserved: YES

No rewrite needed.
```

Example output when the description is too long:

```
Budget analysis: ai/skill-creator / 200 chars available

Description (218 chars): TRUNCATED (18 chars cut)
Trigger phrase: "skill-creator"
Trigger preserved: YES

Truncated text: "...and can be deployed to any compatible coding agent."

Suggestions:
  - Shorten description to 200 characters or fewer
  - Move the trigger phrase earlier if it appears after the cut point
```

The command also reports whether your trigger phrase is preserved after truncation. Even if the description is cut, you may be fine as long as the trigger phrase survives. The situation to fix urgently is when the trigger phrase itself is in the truncated portion — that means the agent may not match your skill to the right user request.

To check a skill's budget at a conservative target:

```
npx skill-mall budget-check business/blue-ocean-strategy --chars-available 120
```

If the output says TRUNCATED, shorten the description until FULLY VISIBLE appears at your target budget.

---

## Writing Effective Skill Descriptions

The description is the highest-stakes field in the entire skill. Everything else in `SKILL.md` is read after the agent has already decided to use your skill. The description is what triggers that decision.

**The structure that works**

```
<Imperative verb> <specific domain or methodology>: <named outputs or workflow>.
```

Every part of this structure earns you something. The verb passes the first scoring check. The domain or methodology in the first 80 characters passes the trigger phrase check. The named outputs tell the agent and the user exactly what they will get.

**The imperative verb list**

Use one of these as your first word:

Apply, Analyze, Run, Generate, Create, Write, Evaluate, Review, Build, Perform, Conduct, Assess, Produce, Identify, Extract, Implement, Plan, Execute, Use

Match the verb to the artifact type:

| What the skill produces | Preferred verb |
|---|---|
| A filled-out framework | Apply |
| An audit or assessment | Analyze, Evaluate, Assess |
| A written document | Write |
| A generated artifact | Generate, Produce |
| A review or critique | Review |
| A plan or roadmap | Plan, Build |
| Code or infrastructure | Implement, Create, Build |
| A research report | Run, Conduct |

**The 150-character limit and why it matters**

Agent skill lists have a context budget. When a user has many skills deployed, each skill description competes for the same character budget. Agents that implement skill-listing behavior will silently cut descriptions that exceed their internal per-skill limit.

The 150-character limit is set at the point where virtually all agents can show the full description. Under 120 characters is safer still. Under 100 characters means you will be fully visible even in highly constrained contexts.

**The first 80 characters**

The trigger phrase must appear in the first 80 characters. This is not about what looks good to humans — it is about what the agent sees when it makes a routing decision on a partial read of the description.

If your skill is about SWOT analysis, "SWOT" must appear before character 80. If it is about Kubernetes resource management, "Kubernetes" must appear before character 80.

**Before and after: three rewrites**

Original:
```
This skill helps you run competitive analysis using proven business frameworks including Blue Ocean Strategy and Porter's Five Forces for market positioning.
```
Problems: starts with "This" (not an imperative verb, -7), 155 characters (exceeds 150, -6), "strategy" appears at character 100 (after 80-char mark, -7). Total deductions: 20 points.

Rewrite:
```
Apply Blue Ocean Strategy and Porter's Five Forces for competitive market analysis.
```
83 characters, starts with "Apply", "strategy" at character 12. Full 25 points.

---

Original:
```
Helps generate OKR frameworks for quarterly planning cycles with key results and scoring.
```
Problems: starts with "Helps" (-7), "OKR" appears at character 17 (fine), 89 characters (fine). Total deductions: 7 points.

Rewrite:
```
Generate OKRs for quarterly planning: objectives, key results, and scoring cadence.
```
83 characters, starts with "Generate", "OKR" at character 10. Full 25 points.

---

Original:
```
Provides code review for TypeScript files focusing on type safety, error handling, and adherence to project conventions. Checks imports, return types, and async patterns.
```
Problems: starts with "Provides" (-7), 169 characters (exceeds 150, -6). Total deductions: 13 points.

Rewrite:
```
Review TypeScript for type safety, error handling, imports, return types, and async patterns.
```
93 characters, starts with "Review", "TypeScript" at character 8. Full 25 points.

---

## Putting It Together: Your Improvement Checklist

If you want to move a skill from 58 to 75 efficiently, start with the dimensions that have the largest gap and the lowest effort:

1. Description Quality (25 pts): Read the feedback message. It will tell you exactly which check failed and by how many points. Fix the description first — it is one field, one line, and it can move your score by up to 25 points.

2. Frontmatter Health (20 pts): Run `npx skill-mall validate`. Fill in missing fields. Correct the category. Adjust tag count to 2–6.

3. Content Completeness (25 pts): Add a `README.md` if missing. Create `resources/templates/` with one file. Create `resources/samples/` with one file. That alone can recover 19 points.

4. Resource Richness (20 pts): Once templates and samples exist from step 3, add more variants. Getting from 3 files to 8 files moves you from 5 points to 15 points in this dimension.

5. Link Health (10 pts): If you have no linked skills, you already have full 10 points. If you do have links, run `npx skill-mall list` and verify each slug.

The quality score is designed to be specific. Every point you are missing corresponds to a named file, a specific field, or a measurable property of your description. There is no ambiguity in what to fix — only in whether you have done it yet.
