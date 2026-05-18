# CLI Tutorial: Create an OKR Framework Skill from the Command Line

This tutorial walks you through the full research-pipeline workflow using the SkillMall CLI — from a raw topic string to a deployed, working skill. The skill you will build teaches your AI agent the OKR (Objectives and Key Results) goal-setting framework, so it can run structured OKR sessions, score key results, and facilitate quarterly reviews.

**Target reader:** a developer comfortable in a terminal who wants to create skills without opening a browser.

**What you will have when you finish:** a fully generated `okr-framework` skill in `skills/productivity/okr-framework/`, validated, and deployed to Claude Code.

**Time required:** about 15 minutes, plus model inference time.

---

## Why Use the CLI Instead of the Browser Wizard?

Both the CLI and the browser wizard run the exact same pipeline. The generated `SKILL.md`, templates, and prompts are identical no matter which path you choose. The difference is where the confirmation gate lives.

The browser wizard shows you extracted tools in a visual step-by-step interface. You expand each tool card, read the description, and click a "Confirm Research" button to proceed. It is designed for first-time users or for cases where you want to see everything rendered before committing.

The CLI writes the extracted research to a JSON file and stops. You review the file directly, edit it if needed, then run a second command to proceed. This gives you three things the wizard does not:

**You can inspect the raw data before the build stage.** The `research-result.json` file exposes every field the pipeline extracted — including `artifactStructure` values that become the blank templates embedded in your prompts. If the model extracted an OKR scoring grid with the wrong columns, you fix it in the JSON before the Skill Builder runs. No regenerating the whole skill.

**You can script the workflow.** Because each stage is a separate command with predictable exit codes, you can chain stages in a Makefile, a CI script, or a shell loop. Generate research for ten skills overnight, review all ten JSON files in the morning, confirm the ones that look good.

**You can version-control the research artifact.** The `skill-builder-output/` directory is gitignored by default, but you can commit `research-result.json` to track what the research engine produced for a given topic and URL set. This is useful when you want to re-run the build stage with an updated model without re-fetching URLs.

If you need to iterate quickly on a single skill and do not want to manage JSON files, use the wizard. If you are building multiple skills, automating generation, or want full visibility into what the model extracted, use the CLI.

---

## Prerequisites

Before running any pipeline commands, you need two things in place: installed dependencies and a configured LLM provider.

### Install dependencies

The CLI lives in the `cli/` subdirectory of the SkillMall repository and has its own `package.json`. If you have not run `npm install` in both the root and the CLI directory, do that now:

```bash
cd /path/to/SkillMall
npm install
cd cli && npm install && cd ..
```

You only need to do this once. After the initial install, both `npm run dev` (web app) and `npx skill-mall` (CLI) are available.

### Configure a provider

The pipeline calls an LLM for research extraction, sample generation, framework selection, and prompt writing. SkillMall supports OpenAI, Claude Code CLI, Google Gemini, Groq, and Ollama. You configure the active provider once with `npx skill-mall configure`, and it persists across all future runs.

If you have Claude Code installed and authenticated, the simplest setup requires no API key:

```bash
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6
```

Expected output:

```
  Configured: claude-code / claude-sonnet-4-6
```

For OpenAI:

```bash
npx skill-mall configure --provider openai --key sk-your-key-here --model gpt-4o
```

For Groq (fast inference, low cost, good for iteration):

```bash
npx skill-mall configure --provider groq --key gsk_your-key-here --model llama-3.3-70b-versatile
```

Your configuration is saved to `~/.skill-mall/config.json`. To verify it is set, run any pipeline command — it will print the active provider and model in the first few lines of output.

---

## Step 1 — Run the Research Engine

The `create` command takes a topic string, fetches any URLs you provide, and asks the LLM to extract the framework's tools, principles, category, and tags. It writes the result to `skill-builder-output/<slug>/research-result.json` and stops.

Run:

```bash
npx skill-mall create "OKR framework" \
  --urls https://www.whatmatters.com/faqs/okr-meaning-definition-example \
  --category productivity
```

The `--urls` flag tells the Research Engine to fetch the page before calling the LLM. Fetched content is authoritative — the model extracts from real text, not training memory. The `--category` flag sets the target catalog category for the generated skill. If you omit it, the model will suggest a category based on the topic.

Expected terminal output (timing varies by provider and network):

```
  skill-mall create (research pipeline)

  Topic:       OKR framework
  Provider:    claude-code / claude-sonnet-4-6
  Source URLs: https://www.whatmatters.com/faqs/okr-meaning-definition-example

/ Running Research Engine...
Research complete. 7 tools extracted.

  Review: skill-builder-output/okr-framework/research-result.json

  When ready: npx skill-mall confirm-research okr-framework
```

The spinner runs while the Research Engine fetches the URL and calls the LLM. When it stops, you have a file on disk with seven extracted tools and you are ready to review it.

If the URL cannot be fetched (network issue, bot block, SSL error), the CLI prints a warning and falls back to training knowledge for that URL. If all URLs fail, the command exits with code 2 and prints an error — it will not silently fall back to training knowledge when you explicitly provided URLs.

If you omit `--urls` entirely, the pipeline uses training knowledge and marks the result as `researchUnverified: true`. The generated `SKILL.md` will include a warning banner. Provide URLs when you want authoritative extraction.

---

## Step 2 — Review the Research JSON

Before the pipeline builds anything, you review what the model extracted. Open the file:

```bash
cat skill-builder-output/okr-framework/research-result.json
```

### The research-result.json structure

The file follows the `ResearchResult` TypeScript type exactly:

```typescript
interface ResearchResult {
  topic: string
  sources: string[]
  summary: string
  tools: ResearchTool[]
  principles: string[]
  suggestedCategory: 'development' | 'design' | 'writing' | 'research' |
                     'productivity' | 'infrastructure' | 'ai' | 'business'
  suggestedTags: string[]
  researchUnverified?: boolean
  partialSources?: boolean
}
```

**`topic`** — the string you passed to `create`. Used as the skill's canonical name in logging and the SKILL.md header.

**`sources`** — URLs that were successfully fetched. If you passed `--urls` and the URL was reached, it appears here. This array is empty when `researchUnverified` is true.

**`summary`** — a 2–3 sentence description of the methodology. The Skill Builder uses the first sentence verbatim as the `description` field in `SKILL.md`. If the first sentence is longer than 150 characters or does not start with an imperative verb, the Skill Builder trims and rewrites it to meet the frontmatter spec. Review this field — if it is generic or inaccurate, edit it before running `confirm-research`.

**`tools`** — the extracted tools array. This is the most important field to review.

**`principles`** — core tenets of the methodology. These become a bulleted section in the generated `SKILL.md` body that orients your agent to the theory behind the tools.

**`suggestedCategory`** — the model's recommendation for which catalog category the skill belongs in. Override if needed.

**`suggestedTags`** — 3–6 lowercase-hyphenated tags for catalog discoverability. Add, remove, or replace as appropriate.

**`researchUnverified`** — present and `true` when no URLs were fetched. The generated skill will include a warning banner until you re-run with URLs.

**`partialSources`** — present and `true` when some (but not all) URLs failed. The skill generates normally, but the extraction is based on fewer sources than you intended.

### The tools array in detail

Each element of `tools` is a `ResearchTool` object. This is where the bulk of the pipeline's work is — every tool becomes a template file, a sample file, a prompt file, and a section in `SKILL.md`.

```typescript
interface ResearchTool {
  name: string
  category: string
  description: string
  artifactType: 'matrix' | 'canvas' | 'grid' | 'list' | 'flowchart' | 'analysis'
  artifactStructure: string
  inputs: string[]
  outputs: string[]
  howUsed: string
}
```

**`name`** — the canonical name of the tool. Used as the template filename (`resources/templates/okr-template.md`), the sample filename, the prompt filename, and the heading in `SKILL.md`.

**`category`** — a logical grouping within the domain. Tools that share a category are grouped in the SKILL.md body and in the Prompt Engine's category prompt generation. In an OKR skill, you might see categories like "Goal Setting," "Progress Tracking," and "Review Cadences."

**`description`** — one to two sentences describing what the tool does and when to use it. This becomes the tool's entry in `SKILL.md`. Precision matters here — vague descriptions produce vague agent behavior.

**`artifactType`** — determines which prompt engineering frameworks the Prompt Engine considers for this tool. `grid` and `matrix` get "Structured Output" as a primary candidate. `analysis` gets "Chain of Thought" and "Tree of Thoughts." `flowchart` gets "Least-to-Most." Check this field — if the model classified an OKR scoring grid as `list` instead of `grid`, the prompt framework selection will be suboptimal.

**`artifactStructure`** — a blank template for the artifact this tool produces, written as markdown. This is embedded verbatim inside the generated prompt file. It is also the starting point for the `resources/templates/` file the Skill Builder generates. If the extracted structure has wrong column names, extra rows, or incorrect formatting, fix it here before building the skill. This is the highest-value field to review.

**`inputs`** — the data or context the tool requires. These become the input list in the prompt. For an OKR Template tool, inputs might be `["company mission statement", "annual priorities", "team context"]`.

**`outputs`** — the named deliverables the tool produces. For an OKR Template, outputs might be `["objective statement", "3-5 key results with metrics", "confidence scores"]`. These become the expected output section in the prompt, and the `produces` array in the prompt file frontmatter.

**`howUsed`** — a 2–5 step procedure for applying the tool. This becomes the numbered steps section in the SKILL.md tool description and in the prompt body.

### Realistic example JSON for OKR tools

Here is what three tools from an OKR Framework research result look like:

```json
{
  "topic": "OKR framework",
  "sources": ["https://www.whatmatters.com/faqs/okr-meaning-definition-example"],
  "summary": "Apply the OKR (Objectives and Key Results) framework to set ambitious goals with measurable outcomes. Use structured tools to define objectives, score progress, and run quarterly review cycles that maintain alignment from company strategy to individual contributors.",
  "tools": [
    {
      "name": "OKR Template",
      "category": "Goal Setting",
      "description": "A structured template for writing a single OKR: one aspirational objective paired with 3–5 measurable key results, each with a numerical target and a confidence score.",
      "artifactType": "grid",
      "artifactStructure": "## Objective\n[Write a qualitative, aspirational goal. One sentence. No metrics.]\n\n| Key Result | Metric | Target | Current | Confidence |\n|---|---|---|---|---|\n| KR1 | | | | /10 |\n| KR2 | | | | /10 |\n| KR3 | | | | /10 |",
      "inputs": [
        "company or team mission",
        "current quarter priorities",
        "measurable outcomes available"
      ],
      "outputs": [
        "written objective statement",
        "3-5 key results with numerical targets",
        "confidence scores 0-10 per KR"
      ],
      "howUsed": "1. Write the objective as a qualitative, motivating statement. 2. For each key result, identify a metric that proves the objective was achieved. 3. Set a target value for the end of the quarter. 4. Assign a starting confidence score from 0 to 10. 5. Review and adjust at mid-quarter check-in."
    },
    {
      "name": "OKR Review Cycle",
      "category": "Review Cadences",
      "description": "A structured agenda for the weekly check-in, mid-quarter review, and end-of-quarter retrospective that keeps OKRs alive between planning sessions.",
      "artifactType": "flowchart",
      "artifactStructure": "## Weekly Check-in (15 min)\n1. Update confidence scores for each KR\n2. Flag any KR below 5/10 — identify blocker\n3. Set one action for the week\n\n## Mid-Quarter Review (1 hour)\n1. Score each KR 0.0–1.0 on current progress\n2. Identify at-risk KRs (below 0.4)\n3. Decide: continue, adjust target, or drop KR\n\n## End-of-Quarter Retrospective (2 hours)\n1. Final scoring: 0.0–1.0 per KR\n2. Calculate objective score (average of KR scores)\n3. Document learnings for next quarter planning",
      "inputs": [
        "current OKR set",
        "progress data for each key result",
        "team capacity information"
      ],
      "outputs": [
        "updated confidence scores",
        "blocker list",
        "go/adjust/drop decisions",
        "end-of-quarter scores"
      ],
      "howUsed": "1. Schedule weekly 15-minute check-ins at the start of each week. 2. Use mid-quarter review to assess whether targets are still realistic. 3. At end of quarter, score all KRs 0.0–1.0 and calculate the aggregate objective score. 4. Hold retrospective to capture learnings before the next planning cycle."
    },
    {
      "name": "OKR Scoring Guide",
      "category": "Progress Tracking",
      "description": "A calibration guide for interpreting OKR scores consistently across a team, explaining what 0.3, 0.7, and 1.0 mean and why 0.7 is the target sweet spot.",
      "artifactType": "analysis",
      "artifactStructure": "## OKR Scoring Scale\n\n| Score | Interpretation | What it means |\n|---|---|---|\n| 1.0 | Fully achieved | You hit 100% of the target |\n| 0.7 | Expected outcome | You achieved the ambitious target |\n| 0.5–0.6 | Partial | Progress made but fell short |\n| 0.3–0.4 | Minimal | Some movement, significant miss |\n| 0.0–0.2 | Not started or failed | Little to no progress |\n\n## Calibration Notes\n- 0.7 is success — OKRs are meant to be ambitious\n- Consistently scoring 1.0 means your targets are too easy\n- Consistently scoring below 0.4 means targets are unrealistic",
      "inputs": [
        "end-of-quarter key result actuals",
        "original targets",
        "team scoring norms"
      ],
      "outputs": [
        "score per key result (0.0–1.0)",
        "objective score (average of KR scores)",
        "calibration commentary"
      ],
      "howUsed": "1. At end-of-quarter, gather actual values for each KR metric. 2. Divide actual by target to get the raw ratio, capped at 1.0. 3. Apply judgment — a KR that was made easier mid-quarter should be scored at the original target. 4. Average all KR scores to get the objective score. 5. Share calibration commentary with the team so scoring is consistent across groups."
    }
  ],
  "principles": [
    "Objectives are qualitative and aspirational — key results are quantitative and measurable",
    "A score of 0.7 is success — OKRs are meant to stretch, not guarantee",
    "OKRs cascade from company to team to individual contributor",
    "Transparency: all OKRs are public to the entire organization"
  ],
  "suggestedCategory": "productivity",
  "suggestedTags": ["okr", "goal-setting", "productivity", "planning", "quarterly-review"]
}
```

### What to check before confirming

Work through the file and ask:

- Is the `summary` first sentence imperative and specific? Edit it if it starts with "This skill" or "A framework for."
- Does each tool's `artifactType` match what the tool actually produces? An OKR scoring table is a `grid`, not an `analysis`.
- Is the `artifactStructure` correct markdown? Open it in a markdown previewer if you are unsure — it will become a template embedded verbatim in prompts.
- Are there tools you do not want? Delete the object from the `tools` array. The pipeline skips deleted tools entirely.
- Are `suggestedTags` accurate? The tags drive catalog discoverability.

After editing, verify the JSON is still valid:

```bash
node -e "JSON.parse(require('fs').readFileSync('skill-builder-output/okr-framework/research-result.json', 'utf-8'))" && echo "Valid JSON"
```

---

## Step 3 — Build the Skill

When the research looks correct, run:

```bash
npx skill-mall confirm-research okr-framework
```

This reads `skill-builder-output/okr-framework/research-result.json`, runs Stages 3 and 4 of the pipeline in parallel, validates the result, and writes everything to `skills/productivity/okr-framework/`. Stage 3 (Skill Builder) and Stage 4 (Prompt Engine) run simultaneously via `Promise.all` — the total wall-clock time is roughly the time for the longer of the two, not the sum.

Expected output:

```
  skill-mall confirm-research: okr-framework

  Provider:    claude-code / claude-sonnet-4-6
  Tools:       7

/ Building skill directory...
Skill directory built.

/ Writing to skills/productivity/okr-framework/...
Written to skills/productivity/okr-framework/

  Skill created successfully.

  Created:        skills/productivity/okr-framework/
  Files written:  58
  Prompts:        19
  Quality score:  82/100
```

The quality score reflects what the pipeline produced automatically. For a skill with seven tools across three categories (Goal Setting, Review Cadences, Progress Tracking) and five meta prompts, the prompt count formula gives 7 + 3 + 5 = 15 prompts plus one cross-category synthesis = 16. The "Prompts: 19" count includes category prompts, meta prompts, and the cross-category synthesis — the exact number varies based on how many distinct categories the model identified.

The quality score is computed by `lib/quality-score.ts` across five dimensions: description quality (25 points), completeness (25 points, covering README, templates, samples, prompts), frontmatter health (20 points), resource richness (20 points), and link health (10 points). A pipeline-generated skill with a source URL typically scores 75–90. The missing points at score 82 are usually in Resource Richness — the automatic pipeline generates one sample per tool, but the rubric rewards 15 or more total resource files for full credit.

---

## Step 4 — Validate

After building, run the validator to confirm the generated files meet the AgentSkills spec:

```bash
bash scripts/validate-skill.sh skills/productivity/okr-framework
```

Expected output:

```
Validating skills/productivity/okr-framework...

  name          okr-framework            OK
  description   148 chars                OK
  README.md     present                  OK
  frontmatter   valid YAML               OK
  metadata      all fields present       OK

Validation passed. Ready to deploy.
```

The validator checks:

- `name` is present, max 64 characters, kebab-case, and matches the directory name exactly
- `description` is present and under 1024 characters (warns if over 150)
- `README.md` exists alongside `SKILL.md`
- YAML frontmatter parses without errors
- All required metadata fields are present

If any check fails, the validator exits non-zero and prints a specific message identifying the field and the problem. Fix the issue in the relevant file and re-run. For pipeline-generated skills, validation failures are rare — the Skill Builder writes frontmatter that passes all checks. You are more likely to see a warning (not an error) about description length if the summary extraction produced a first sentence longer than 150 characters.

You can also validate all skills at once:

```bash
npm run validate
```

This is useful before a commit to catch any file you edited manually.

---

## Step 5 — Deploy

Deploy the skill to Claude Code with:

```bash
npx skill-mall deploy productivity/okr-framework
```

Expected output:

```
Deploying okr-framework to /Users/yourname/.claude/skills

  Deployed to: /Users/yourname/.claude/skills/okr-framework

  Invoke this skill in Claude Code with:
    /okr-framework
```

The deploy command copies the entire `skills/productivity/okr-framework/` directory to `~/.claude/skills/okr-framework/`. Claude Code reads this directory when it starts a new session.

### Deploy options

**Deploy to all detected agents at once:**

```bash
npx skill-mall deploy productivity/okr-framework --all-agents
```

The CLI detects which agents are installed (Claude Code, Cursor, Codex, Gemini CLI, and others) and copies the skill to each agent's skills directory. Agents that are not detected are skipped with a "not detected — skipped" message.

**Deploy as a project skill (available to your team via version control):**

```bash
npx skill-mall deploy productivity/okr-framework --scope project
```

This copies the skill to `.claude/skills/okr-framework/` in your current working directory rather than `~/.claude/skills/`. Commit the `.claude/skills/` directory to your repository and every team member who opens Claude Code in that project will have the skill automatically, with no individual setup required.

**Deploy with a specific locale (if the skill has translated files):**

```bash
npx skill-mall deploy productivity/okr-framework --lang es
```

This copies `SKILL.es.md` as `SKILL.md` in the destination directory, making the agent use the translated version. Falls back to the canonical `SKILL.md` if the locale file is not present.

---

## What the Generated Files Look Like

After running `confirm-research`, the skill directory on disk contains:

```
skills/productivity/okr-framework/
├── SKILL.md
├── README.md
├── scripts/
│   ├── run-full-analysis.sh
│   ├── generate-okr-template.sh
│   ├── generate-okr-review-cycle.sh
│   ├── generate-okr-scoring-guide.sh
│   └── generate-okr-alignment-map.sh
└── resources/
    ├── templates/
    │   ├── okr-template.md
    │   ├── okr-review-cycle.md
    │   ├── okr-scoring-guide.md
    │   └── okr-alignment-map.md
    ├── samples/
    │   ├── okr-template-sample.md
    │   ├── okr-review-cycle-sample.md
    │   ├── okr-scoring-guide-sample.md
    │   └── okr-alignment-map-sample.md
    └── prompts/
        ├── tool-okr-template.md
        ├── tool-okr-review-cycle.md
        ├── tool-okr-scoring-guide.md
        ├── tool-okr-alignment-map.md
        ├── category-goal-setting.md
        ├── category-review-cadences.md
        ├── category-progress-tracking.md
        ├── meta-comprehensive-analysis.md
        ├── meta-quick-assessment.md
        ├── meta-stakeholder-presentation.md
        ├── meta-first-principles-exploration.md
        ├── meta-competitive-response.md
        └── meta-cross-category-synthesis.md
```

**`SKILL.md`** — the skill definition file your agent reads. Contains the frontmatter (name, description, metadata) and the body (tool descriptions, principles, usage instructions). This is the file that Claude Code sees when it decides whether to invoke the skill.

**`README.md`** — a human-readable overview of the skill for the SkillMall catalog web UI and for contributors who read the repository. Includes a tool index table generated from `ResearchResult.tools`.

**`scripts/`** — shell scripts for running the skill's tools programmatically. `run-full-analysis.sh` runs all tools in sequence. Each per-tool script runs a single tool. Scripts are written for `bash` and use the `claude` CLI binary for execution.

**`resources/templates/`** — blank fill-in-the-blank documents for each tool, generated from `tool.artifactStructure`. Each template is a starting point your agent populates when the skill runs. The `okr-template.md` file contains the grid structure from the research JSON, ready to fill in.

**`resources/samples/`** — completed examples for each tool, generated by the LLM. A sample shows what a fully executed OKR Template looks like for a hypothetical company. Samples serve as few-shot examples embedded in prompts and as references for users who want to see the expected output format.

**`resources/prompts/`** — prompt files for each tool, each category, and five standard meta-prompt types. Each file is a self-contained prompt body plus YAML frontmatter recording which framework was selected and why. The meta-comprehensive-analysis prompt runs all tools in sequence. The meta-quick-assessment runs the most relevant subset. The cross-category synthesis (present when the skill has three or more tool categories) produces a unified view across Goal Setting, Review Cadences, and Progress Tracking.

---

## Using the Skill in Claude Code

After deploying, start a new Claude Code session. Installed skills take effect at session start — existing sessions will not pick up the newly deployed skill until you start fresh.

### Explicit invocation

The most direct way to use the skill is the slash command:

```
/okr-framework
```

Claude Code will respond with a prompt asking what you want to do — set OKRs for a new quarter, run a review cycle, score existing key results, or something else. It applies the skill's framework for whatever you describe.

### Natural language invocation

You do not have to use the slash command. Claude Code reads the `description` field from `SKILL.md` and uses it to decide when to automatically invoke the skill. If your session includes messages like:

- "Help me write OKRs for our engineering team next quarter"
- "Let's do a mid-quarter OKR review — I'll share our current key results"
- "How would you score our Q1 OKRs given these actuals?"

Claude Code will recognize these as OKR-related requests and apply the skill's framework without you explicitly invoking it.

### Using a specific tool

To invoke a specific tool from within the skill, you can reference it by name in your message:

```
Run the OKR Scoring Guide for these key results: [paste your KR actuals here]
```

Claude will apply the OKR Scoring Guide tool specifically — using its `artifactStructure` as the output template, following its `howUsed` procedure, and producing the outputs listed in the research JSON.

### Using a prompt file directly

The prompt files in `resources/prompts/` are self-contained — you can paste any of them directly into Claude or any other AI tool and they will work without the rest of the skill. This is useful for sharing specific tool prompts with colleagues who are not using SkillMall, or for using the OKR Review Cycle prompt in a tool that does not support skills.

---

## Reference: All Commands for This Tutorial

```bash
# Step 1 — Research
npx skill-mall create "OKR framework" \
  --urls https://www.whatmatters.com/faqs/okr-meaning-definition-example \
  --category productivity

# Step 2 — Review research (read and optionally edit)
cat skill-builder-output/okr-framework/research-result.json

# Validate JSON after editing
node -e "JSON.parse(require('fs').readFileSync('skill-builder-output/okr-framework/research-result.json', 'utf-8'))" && echo "Valid JSON"

# Step 3 — Build the skill
npx skill-mall confirm-research okr-framework

# Step 4 — Validate the generated files
bash scripts/validate-skill.sh skills/productivity/okr-framework

# Step 5 — Deploy to Claude Code
npx skill-mall deploy productivity/okr-framework

# Optional: deploy to all detected agents
npx skill-mall deploy productivity/okr-framework --all-agents

# Optional: deploy as project skill (for teams)
npx skill-mall deploy productivity/okr-framework --scope project
```
