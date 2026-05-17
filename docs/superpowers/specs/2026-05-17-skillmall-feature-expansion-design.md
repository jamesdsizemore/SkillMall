# SkillMall Feature Expansion — Design Specification

**Date:** 2026-05-17
**Status:** Approved
**Author:** James Sizemore

---

## Table of Contents

1. [Core Pipeline Architecture](#1-core-pipeline-architecture)
2. [Prompt Engineering System](#2-prompt-engineering-system)
3. [Skill Creation Tools](#3-skill-creation-tools)
4. [Quality and Analytics](#4-quality-and-analytics)
5. [Community and Discovery](#5-community-and-discovery)
6. [Integration and Deployment](#6-integration-and-deployment)
7. [Advanced Capabilities](#7-advanced-capabilities)
8. [Implementation Phases Summary](#8-implementation-phases-summary)
9. [Phasing Decisions](#9-phasing-decisions)

---

## 1. Core Pipeline Architecture

The SkillMall generation pipeline is a 5-stage system. Every skill produced by the system — whether created through the UI Research Wizard, the CLI, or the AI-Assisted Skill Writer — passes through all five stages. The stages are sequential: each stage receives the output of the previous stage and produces a defined artifact that the next stage consumes.

### Stage 1 — Input Layer

The Input Layer accepts the following fields:

- **Topic name** (required) — the domain or methodology to build a skill for
- **Source URLs** (optional, but prioritized when provided) — one or more authoritative URLs the Research Engine fetches before falling back to training knowledge
- **Category selection** — the catalog category the skill belongs to
- **Target agent selection** — the agent or agents the skill is being built for
- **Interface** — the Input Layer is available via the UI Research Wizard and the CLI

When source URLs are provided, the Research Engine uses them as the primary evidence base. When no URLs are provided, the Research Engine falls back to training knowledge and marks the ResearchResult with a flag: `research-unverified — provide source URLs for authoritative results`. This flag propagates through the pipeline and appears in the generated SKILL.md, README, and all prompt frontmatter until the user re-runs the pipeline with authoritative URLs.

### Stage 2 — Research Engine

The Research Engine fetches each provided URL and performs structured extraction. For each source, it identifies every named tool, framework, methodology, and principle in the domain. It does not summarize loosely — it extracts with specificity.

For each extracted tool, the Research Engine classifies:

- **Name** — the canonical name of the tool
- **Category** — the logical group the tool belongs to within the domain (e.g., "Strategy", "Shift", "Leadership" in Blue Ocean Strategy)
- **Description** — a one-to-two sentence precise description
- **Artifact type** — one of: `matrix`, `canvas`, `grid`, `list`, `flowchart`, `analysis`
- **Artifact structure** — the blank template structure for the artifact, suitable for embedding directly in prompts
- **Inputs required** — the data, context, or prior analysis the tool requires to run
- **Outputs produced** — the named deliverables the tool produces
- **How it is used** — the procedural sequence for applying the tool

All extracted data is normalized into a `ResearchResult` object:

```typescript
type ResearchResult = {
  topic: string
  sources: string[]
  summary: string           // 2-3 sentences used verbatim in SKILL.md description
  tools: ResearchTool[]
  principles: string[]      // Core tenets of the methodology
  suggestedCategory: string
  suggestedTags: string[]
}

type ResearchTool = {
  name: string
  category: string          // logical group, e.g. "Strategy", "Leadership"
  description: string
  artifactType: 'matrix' | 'canvas' | 'grid' | 'list' | 'flowchart' | 'analysis'
  artifactStructure: string // blank template structure, embedded inline in prompts
  inputs: string[]
  outputs: string[]
  howUsed: string
}
```

The Research Engine is deterministic given the same inputs. Identical topic + URL combinations produce the same ResearchResult. This makes regeneration predictable and allows diffing between versions.

### Stage 3 — Skill Builder

The Skill Builder receives the `ResearchResult` and generates all skill file artifacts. It does not make decisions about prompts — prompt generation is entirely owned by the Prompt Engine in Stage 4.

The Skill Builder generates:

- **`SKILL.md`** — complete, deployable skill with instructions integrating all extracted tools. The `summary` field from the ResearchResult becomes the skill description verbatim.
- **One template file per extracted tool** — stored in `resources/templates/`. Each template is a blank, annotated version of the tool's artifact structure with instructions for filling it in.
- **One sample output per extracted tool** — stored in `resources/samples/`. Each sample demonstrates a completed artifact using illustrative (not invented) domain examples.
- **Scripts for artifact generation** — stored in `scripts/`. One script per major tool or analysis workflow, named for the tool they drive.
- **`README.md`** — a tool index listing every extracted tool with its artifact type, template filename, sample filename, and the prompt(s) that produce it.

The Skill Builder does not write to disk. It returns a structured in-memory representation of the complete skill directory. Writing to disk is the final step of Stage 5.

### Stage 4 — Prompt Engine

The Prompt Engine receives the `ResearchResult` and generates all prompts. It operates independently of the Skill Builder — both receive the same ResearchResult as input.

The Prompt Engine generates three types of prompts:

1. **Tool-specific prompts** — exactly one per extracted tool. These prompts produce the specific artifact that tool is designed to generate.
2. **Category prompts** — one per logical tool group identified in the ResearchResult. These prompts run all tools in a category in a coordinated sequence.
3. **Meta use-case prompts** — 4 to 6, always generated regardless of domain complexity. The standard set is five: comprehensive analysis, quick assessment, stakeholder presentation, first-principles exploration, and competitive response. A sixth is generated only when the ResearchResult contains more than two distinct tool categories — in those cases, a "cross-category synthesis" prompt is added that instructs the agent to integrate outputs across all categories into a unified deliverable. For domains with two or fewer categories, the standard five are sufficient.

For each prompt, the Prompt Engine:

1. Evaluates all 40+ frameworks in the PE Framework Library against the tool's characteristics
2. Selects the framework or combination that maximizes output quality for that specific tool in that specific domain
3. Generates the full prompt body with all tool structures embedded inline
4. Passes the prompt through the Prompt Optimizer
5. Returns the optimized prompt with frontmatter

The Prompt Engine never writes to disk. All outputs are returned to Stage 5.

**Prompt count is fully dynamic.** The Blue Ocean Strategy domain with 21 tools organized into 3 categories (Strategy, Shift, Leadership) produces 29 prompts: 21 tool-specific + 3 category + 5 meta. A simple domain with 3 tools in 1 category produces 8 prompts: 3 tool-specific + 1 category + 4 meta. There is no minimum and no maximum.

### Stage 5 — Full Skill Directory

Stage 5 receives the combined outputs of the Skill Builder (Stage 3) and the Prompt Engine (Stage 4) and performs the final operations:

1. **Validation** — the complete skill directory is validated against the AgentSkills specification before any file is written
2. **Catalog entry generation** — a catalog entry is generated from the SKILL.md metadata
3. **Write to disk** — all files are written atomically; if any validation error is present, nothing is written and the error is surfaced to the user with the specific field or file that failed

The complete output directory structure for a Blue Ocean Strategy skill (21 tools, 3 categories, 5 meta prompts) is:

```
skills/business/blue-ocean-strategy/
├── SKILL.md
├── README.md
├── resources/
│   ├── templates/
│   │   ├── strategy-canvas.md
│   │   ├── errc-grid.md
│   │   ├── three-tiers-of-noncustomers.md
│   │   ├── buyer-utility-map.md
│   │   ├── six-paths-framework.md
│   │   ├── price-corridor.md
│   │   ├── fair-process.md
│   │   ├── buyer-experience-cycle.md
│   │   ├── strategic-sequence.md
│   │   ├── pioneer-migrator-settler-map.md
│   │   ├── tipping-point-leadership.md
│   │   ├── blue-ocean-idea-index.md
│   │   ├── value-innovation-map.md
│   │   ├── profit-model-canvas.md
│   │   ├── noncustomer-profile.md
│   │   ├── strategic-move-timeline.md
│   │   ├── industry-force-analysis.md
│   │   ├── market-boundary-map.md
│   │   ├── complementary-product-analysis.md
│   │   ├── emotional-functional-shift-matrix.md
│   │   └── fair-process-leadership-checklist.md
│   ├── samples/
│   │   ├── strategy-canvas-sample.md
│   │   ├── errc-grid-sample.md
│   │   ├── three-tiers-of-noncustomers-sample.md
│   │   ├── buyer-utility-map-sample.md
│   │   ├── six-paths-framework-sample.md
│   │   ├── price-corridor-sample.md
│   │   ├── fair-process-sample.md
│   │   ├── buyer-experience-cycle-sample.md
│   │   ├── strategic-sequence-sample.md
│   │   ├── pioneer-migrator-settler-map-sample.md
│   │   ├── tipping-point-leadership-sample.md
│   │   ├── blue-ocean-idea-index-sample.md
│   │   ├── value-innovation-map-sample.md
│   │   ├── profit-model-canvas-sample.md
│   │   ├── noncustomer-profile-sample.md
│   │   ├── strategic-move-timeline-sample.md
│   │   ├── industry-force-analysis-sample.md
│   │   ├── market-boundary-map-sample.md
│   │   ├── complementary-product-analysis-sample.md
│   │   ├── emotional-functional-shift-matrix-sample.md
│   │   └── fair-process-leadership-checklist-sample.md
│   └── prompts/
│       ├── tool-strategy-canvas.md
│       ├── tool-errc-grid.md
│       ├── tool-three-tiers-of-noncustomers.md
│       ├── tool-buyer-utility-map.md
│       ├── tool-six-paths-framework.md
│       ├── tool-price-corridor.md
│       ├── tool-fair-process.md
│       ├── tool-buyer-experience-cycle.md
│       ├── tool-strategic-sequence.md
│       ├── tool-pioneer-migrator-settler-map.md
│       ├── tool-tipping-point-leadership.md
│       ├── tool-blue-ocean-idea-index.md
│       ├── tool-value-innovation-map.md
│       ├── tool-profit-model-canvas.md
│       ├── tool-noncustomer-profile.md
│       ├── tool-strategic-move-timeline.md
│       ├── tool-industry-force-analysis.md
│       ├── tool-market-boundary-map.md
│       ├── tool-complementary-product-analysis.md
│       ├── tool-emotional-functional-shift-matrix.md
│       ├── tool-fair-process-leadership-checklist.md
│       ├── category-strategy.md
│       ├── category-shift.md
│       ├── category-leadership.md
│       ├── meta-comprehensive-analysis.md
│       ├── meta-quick-assessment.md
│       ├── meta-stakeholder-presentation.md
│       ├── meta-first-principles-exploration.md
│       └── meta-competitive-response.md
└── scripts/
    ├── run-full-analysis.sh
    ├── generate-strategy-canvas.sh
    └── generate-errc-grid.sh
```

---

## 2. Prompt Engineering System

### PE Framework Library

The Prompt Engine selects from a library of 40+ frameworks organized into five categories. All frameworks are available for selection for any tool in any domain. No framework is restricted to a specific artifact type or domain.

**Reasoning frameworks:**

- Chain of Thought (CoT) — explicit step-by-step reasoning trace before producing the final answer
- Zero-Shot CoT — appending "think step by step" to trigger implicit reasoning chains without examples
- Tree of Thoughts — explores multiple reasoning paths in parallel before selecting the strongest
- Graph of Thoughts — builds a reasoning graph where nodes are thoughts and edges are logical dependencies
- Self-Consistency — generates multiple independent completions and selects the most consistent answer
- Least-to-Most — decomposes the problem into sub-problems from simplest to hardest, solving in order
- Step-Back Prompting — prompts for higher-level principles before applying them to the specific case
- Analogical Prompting — generates relevant analogies before reasoning through the problem
- Skeleton-of-Thought — generates an answer outline first, then fills each section in parallel
- Metacognitive Prompting — prompts the model to reflect on its reasoning process as it works
- ReAct (Reasoning + Acting) — interleaves reasoning traces with tool calls or evidence retrieval actions
- PAL (Program-Aided Language Models) — generates code or pseudocode as the reasoning intermediate

**Context frameworks:**

- Role / Expert Persona — assigns a specific expert identity that anchors the model's knowledge domain and output register
- Few-Shot — provides two to five worked examples before the target task
- Zero-Shot — no examples; relies entirely on instruction precision
- One-Shot — exactly one worked example before the target task
- Many-Shot — ten or more examples to establish strong behavioral patterns
- Generated Knowledge — prompts the model to generate relevant background knowledge before answering
- Contrastive CoT — provides both correct and incorrect worked examples to sharpen discrimination
- Active Prompting — identifies the most ambiguous or uncertain parts of the task and resolves them first

**Structure frameworks:**

- Instruction Engineering — precise, unambiguous task decomposition with explicit constraints
- Task Decomposition — breaks a complex task into numbered subtasks with explicit output requirements per subtask
- Structured Output (XML/JSON) — specifies the exact output schema the model must conform to
- Prompt Chaining — sequences multiple prompts where each output becomes the next prompt's input
- Constrained Generation — specifies what the model must and must not include or produce
- Negative Prompting — defines what to exclude or avoid, sharpening the output space through elimination
- Directional Stimulus — provides a hint or keyword that steers generation toward the target output region
- Template / Variable — uses a fixed template with named variables the model fills in

**Output frameworks:**

- Artifact Production — optimized for producing a specific named deliverable (matrix, canvas, report, grid)
- Maieutic Prompting — prompts the model to explain its answer, then uses inconsistencies to refine it
- Expert Prompting — instructs the model to answer as a named category of expert would, with explicit rationale
- Emotional Prompting — incorporates high-stakes framing to activate the model's accuracy-maximizing behavior
- Batch Prompting — processes multiple items in a single call with consistent formatting across all items
- Structured Decomposition — produces a hierarchical output with defined levels and explicit relationships between them

**Meta and optimization frameworks:**

- Self-Critique — the model generates its answer, then critiques it, then revises based on the critique
- Auto-CoT — automatically generates chain-of-thought demonstrations from a question cluster
- Complexity-Based Prompting — routes tasks to longer, more detailed chains based on measured task complexity
- Token Efficiency Audit — analyzes the prompt for words that do not affect the output and removes them
- 9-Dimension Intent Extraction — extracts and makes explicit: task, input, output, constraints, context, audience, memory, success criteria, and examples

### Framework Selection Algorithm

The Prompt Engine evaluates all 40+ frameworks against each `ResearchTool` object. The evaluation considers five dimensions:

1. **Artifact type** — what structural format the output must conform to (matrix, canvas, grid, list, flowchart, analysis)
2. **Tool complexity** — how many inputs the tool requires and how many interdependent outputs it produces
3. **Intended use case** — whether the tool is diagnostic, generative, comparative, evaluative, or sequential
4. **Output requirements** — precision requirements, format constraints, validation requirements
5. **Domain context** — whether the domain is strategic, operational, creative, analytical, or interpersonal

There are no pre-defined framework mappings. The algorithm does not assign "matrix tools get Structured Output" or any similar rule. Every framework is scored against every tool fresh. The algorithm selects the framework or combination of frameworks that produces the highest-quality, most complete output for that specific tool in that specific domain context. Multiple frameworks may be combined in a single prompt when the combination outperforms any single framework.

### Prompt File Format

Every generated prompt file uses the following frontmatter:

```yaml
---
framework: [selected framework name or comma-separated combination]
original_framework: [same as framework until user overrides]
skill: [skill slug, e.g. blue-ocean-strategy]
tool: [tool slug, e.g. strategy-canvas, or "meta" for meta prompts]
type: tool-specific | category | meta
produces: [list of artifact filenames this prompt is expected to produce]
when_to_use: [one sentence — when this prompt outperforms the others for this skill]
complexity: quick | thorough | exhaustive
generated_by: prompt-engine
---
```

The prompt body follows the frontmatter with no separator line. The body is fully self-contained: every tool structure (table, matrix, grid, scoring scale, validation checklist) is embedded inline as markdown. Zero references to external template files. When a user pastes any prompt into any AI tool, the prompt contains everything the agent needs to produce the artifact without additional context.

### User Framework Override

A user may override the selected framework for any prompt at any time.

**In the UI:** each prompt card on the skill detail page shows a framework badge. Clicking the badge opens a dropdown. The default view shows frameworks appropriate for that artifact type. An "Advanced" toggle expands the dropdown to the full 40+ library. Selecting a new framework triggers immediate regeneration of the prompt body with the new framework applied. The `original_framework` field in the frontmatter is always preserved and is never overwritten by a user override — it holds the algorithm's original selection for one-click revert.

**Via CLI:**
```bash
npx skill-mall regen-prompt blue-ocean-strategy tool-strategy-canvas.md --framework "Tree of Thoughts"
```

This command regenerates the prompt body using the specified framework, updates the `framework` field in frontmatter, and preserves `original_framework`.

**Via file edit:** editing the `framework` field in any prompt file's frontmatter directly and then running `npx skill-mall regen-prompt <skill> <prompt-file>` regenerates the body using the current frontmatter value.

### Prompt Optimizer

All generated prompts pass through the Prompt Optimizer before being written to disk. The Optimizer is the final stage of the Prompt Engine. It is also available as a standalone tool (see Section 7).

The Optimizer audits four dimensions:

1. **Token efficiency** — identifies words, phrases, and sentences that do not change the model's output and removes them
2. **9-dimension intent completeness** — checks whether all nine dimensions (task, input, output, constraints, context, audience, memory, success criteria, examples) are explicitly addressed; flags any that are missing or ambiguous
3. **Output specification clarity** — verifies that the prompt specifies exactly what the output must contain, in what order, and at what level of detail
4. **Trigger sharpness** — verifies that the opening instruction unambiguously defines the task in the first sentence

The Optimizer returns: the optimized prompt text, a dimension-by-dimension score, a diff showing every word removed or changed, and the token count before and after. For pipeline use, only the optimized prompt is passed forward. The audit data is stored in the prompt file's build metadata for display in the UI.

### Blue Ocean Strategy — Three Prompt Examples

The following examples illustrate the three prompt types as they appear in the generated Blue Ocean Strategy skill. These are representative of the full structure, not abbreviated.

**Tool-specific prompt: Strategy Canvas**

Frontmatter:
```yaml
---
framework: Chain of Thought, Structured Output
original_framework: Chain of Thought, Structured Output
skill: blue-ocean-strategy
tool: strategy-canvas
type: tool-specific
produces: ["strategy-canvas-current.md", "strategy-canvas-proposed.md"]
when_to_use: Use when you need to visualize the current competitive landscape before designing a new strategic position
complexity: thorough
generated_by: prompt-engine
---
```

Body excerpt (fully self-contained):

The prompt opens by establishing expert context and the analytical objective. It then instructs the agent to produce two artifacts in sequence. First, the current-state canvas: a table with columns for each competing factor (price, product range, service quality, logistics speed, sustainability features, customization options, and so on — user fills in their own competing factors) and rows for the focal company and up to five named competitors, scored 1–5 on each factor. The scoring scale is defined inline: 1 = absent or negligible, 2 = below industry norm, 3 = at industry norm, 4 = above industry norm, 5 = best-in-class. The Four Actions Framework is embedded inline as the bridge to the proposed canvas: for each competing factor, the agent applies Eliminate (score drops to 0), Reduce (score drops by at least 1), Raise (score increases by at least 1), or Create (new factor added). The proposed canvas follows the same table format. The prompt ends with a validation checklist: at least one factor eliminated, at least two raised above industry norm, at least one factor created that no competitor currently offers. The agent must resolve any validation failure before delivering the output.

**Tool-specific prompt: ERRC Grid**

Frontmatter:
```yaml
---
framework: Structured Output, Constrained Generation
original_framework: Structured Output, Constrained Generation
skill: blue-ocean-strategy
tool: errc-grid
type: tool-specific
produces: ["errc-grid.md"]
when_to_use: Use when you need to generate the concrete action decisions that define the new strategic position
complexity: thorough
generated_by: prompt-engine
---
```

Body excerpt (fully self-contained):

The prompt embeds the full four-quadrant grid as a markdown table with headers: Quadrant, Factor, Rationale. Quadrants are: ELIMINATE (industry assumptions we should drop entirely), REDUCE (factors we should invest in below industry norm), RAISE (factors we should invest in above industry norm), CREATE (factors that don't currently exist in the industry). Minimum item requirements are specified inline: at least 2 items in ELIMINATE, at least 2 in REDUCE, at least 2 in RAISE, at least 1 in CREATE. Validation checklist embedded in the prompt: no factor appears in more than one quadrant; every rationale explains the customer or cost impact specifically (not generic phrases like "improve customer experience"); the CREATE quadrant introduces at least one factor that unlocks a new demand segment. The agent must not deliver the grid until all validation checks pass.

**Meta prompt: Full Comprehensive Analysis**

Frontmatter:
```yaml
---
framework: Role / Expert Persona, Chain of Thought, Prompt Chaining
original_framework: Role / Expert Persona, Chain of Thought, Prompt Chaining
skill: blue-ocean-strategy
tool: meta
type: meta
produces: ["full-blue-ocean-analysis.md", "executive-summary.md"]
when_to_use: Use when you need a complete, end-to-end Blue Ocean analysis ready to present to senior leadership
complexity: exhaustive
generated_by: prompt-engine
---
```

Body excerpt (fully self-contained):

The prompt assigns the expert persona of a Blue Ocean Strategy consultant with 15 years of experience across manufacturing, services, and technology sectors. It then instructs the agent to run a complete analysis using 7 tools in the following sequence: (1) Strategy Canvas — current state, (2) Three Tiers of Noncustomers — identify the first, second, and third tiers with population estimates and core reasons for non-consumption, (3) Buyer Utility Map — assess all 6 utility levers (productivity, simplicity, convenience, risk, fun/image, environmental friendliness) across all 6 buyer experience cycle stages (purchase, delivery, use, supplements, maintenance, disposal) and mark where the greatest utility blocks exist, (4) Six Paths Framework — explore all six paths (across industries, across strategic groups, across buyer groups, across complementary offerings, across functional/emotional orientation, across time) and identify the two most promising alternative market spaces, (5) ERRC Grid — produce the full grid using insights from the previous four tools, (6) Price Corridor — identify the mass of target noncustomers, map the price corridor of alternatives and substitutes, and set the strategic price with rationale, (7) Fair Process — define the engagement, explanation, and expectation clarity actions required for implementation. All tool structures from the seven tools are embedded inline in the prompt body. The analysis concludes with a structured executive brief: situation (2 sentences), opportunity (3 sentences), proposed strategic move (4–6 bullet points), value innovation summary (one sentence), key risks and mitigations (table), recommended next 90-day actions (numbered list). The agent does not summarize until all seven tool outputs are complete.

---

## 3. Skill Creation Tools

### Skill Creation Wizard (UI, Phase 1)

The Skill Creation Wizard is a 6-step wizard embedded in the catalog UI. It is the primary interface for creating a new skill using the full generation pipeline.

**Step 1: Topic Input**

The user provides a topic name and optionally one or more source URLs. The URL input supports pasting multiple URLs, one per line. A note explains that providing authoritative source URLs produces the most accurate skill. The step also shows the "research-unverified" behavior when no URLs are provided, so the user can decide whether to proceed without sources or supply them first.

**Step 2: Research Confirmation (non-skippable)**

The Research Engine runs and produces a `ResearchResult`. The wizard displays a full confirmation screen showing every extracted tool as a card with: name, category, description, artifact type, and inputs/outputs. The user reviews this screen before any files are written. The user may remove individual tool cards from the result — removed tools are excluded from all subsequent pipeline stages. A counter shows the current tool count and the estimated prompt count that will be generated. The user cannot proceed to Step 3 until they click "Confirm Research." There is no "skip" or "continue without confirming" path. No files are written to disk at any point before the user confirms.

**Step 3: Metadata Selection**

Category selection (dropdown from the catalog's category taxonomy), tag input (free text with suggestions from the catalog's existing tag set), and target agent selection (checkboxes for all detected agents). These fields are pre-populated from the ResearchResult's `suggestedCategory` and `suggestedTags`.

**Step 4: SKILL.md Preview**

A live preview of the generated SKILL.md content. The user may edit any field inline — the preview re-renders in real time. Editing the description field shows the live character count against the 1024-character budget limit.

**Step 5: Prompt Generation Options**

A checklist of the meta prompt types to include. The five standard types are pre-checked. The user may uncheck any meta type they do not need. A preview of the estimated total prompt count updates as the user adjusts selections.

**Step 6: Final Directory Preview**

A file tree view of the complete skill directory that will be written to disk. Every file is listed with its filename. The user may expand any file to preview its content. Clicking "Create Skill" writes all files to disk in a single operation. If validation fails, the wizard returns to the relevant step with the specific validation error highlighted.

### AI-Assisted Skill Writer (UI and CLI, Phase 1)

The AI-Assisted Skill Writer accepts a plain-language description of any domain, methodology, or workflow and generates a complete skill from it. It uses the same 5-stage pipeline as the Skill Creation Wizard — the only difference is how Stage 1 is populated.

In the UI, the user provides: a free-text description ("I want a skill for running Jobs-to-Be-Done customer interviews"), optionally one or more source URLs, and a category. The system treats the description as a research query, identifies the domain, fetches URLs if provided, extracts tools, and proceeds through all pipeline stages. The Research Confirmation screen (Step 2 of the wizard) is mandatory here as well.

CLI usage:
```bash
npx skill-mall create "jobs-to-be-done customer interviews" --urls https://jtbd.info/ --category research
```

```bash
npx skill-mall create "blue ocean strategy" --urls https://www.blueoceanstrategy.com/tools/ --category business
```

When no `--urls` flag is provided:
```bash
npx skill-mall create "okr framework"
```

Output includes the `research-unverified` flag on all generated files and a terminal warning: `Research unverified — provide source URLs with --urls for authoritative results.`

The CLI `create` command does not include an interactive confirmation step — the Research Confirmation step is replaced by writing the ResearchResult to `research-result.json` in the output directory and requiring the user to run `npx skill-mall confirm-research <skill-slug>` before the Skill Builder and Prompt Engine proceed. This preserves the non-skippable confirmation requirement on the CLI path.

### Domain Starter Templates (UI and CLI, Phase 1)

Domain Starter Templates are 20+ hand-curated, production-quality SKILL.md starters for common domains. They are 80% complete — they contain real, production-calibrated instructions, metadata, and tool descriptions — with `[fill-in]` markers only for the domain-specific content that requires customization per user context.

Templates are stored in `skills/_starters/<domain>/`. Each template directory contains:

- `SKILL.md` — the starter
- `README.md` — a guide to what the `[fill-in]` markers expect and how to complete them
- `resources/templates/` — one template file per key tool with `[fill-in]` markers
- A `starter-config.json` that records: domain, category, target agents, and `[fill-in]` field descriptions

The canonical templates are never modified by user actions. Every use of a starter creates a full copy into the user's `skills/<category>/` directory.

Available starters at Phase 1 launch:

| Slug | Domain |
|------|--------|
| `code-review` | Code review for pull requests |
| `pr-writer` | Pull request description writer |
| `commit-writer` | Conventional commit message writer |
| `technical-documentation` | Technical documentation writer |
| `debugging-session` | Structured debugging session facilitator |
| `okr-framework` | OKR planning and tracking |
| `blue-ocean-strategy` | Blue Ocean Strategy full toolkit |
| `design-thinking` | Design Thinking 5-stage process |
| `user-story-mapping` | User Story Mapping facilitation |
| `incident-postmortem` | Incident postmortem facilitator |
| `api-documentation` | API documentation writer |
| `decision-records` | Architecture Decision Record writer |
| `test-writer` | Test case and test suite writer |
| `sprint-planning` | Agile sprint planning facilitator |
| `stakeholder-communication` | Stakeholder update writer |
| `competitive-analysis` | Competitive analysis framework |
| `product-requirements` | Product requirements document writer |
| `onboarding-guide` | Team and system onboarding guide writer |
| `data-analysis` | Data analysis and insight extraction |
| `content-strategy` | Content strategy and editorial planning |

CLI usage:
```bash
npx skill-mall new --from-template code-review my-code-review-skill
```

UI usage: a "Start from Template" button on the skill creation entry point opens a template browser. Selecting a template shows a live preview of the SKILL.md starter, then the Skill Creation Wizard starts at Step 3 (Metadata Selection) with the template pre-loaded.

### Codebase-to-Skill Extractor (CLI, Phase 2)

The Codebase-to-Skill Extractor is a Research Engine variant that operates on local files and directories instead of URLs. It analyzes a codebase or document set to extract reusable patterns, conventions, and domain logic that would otherwise require deep familiarity with the codebase to recall.

The extractor identifies:

- Repeated structural patterns (how the team structures modules, services, API handlers)
- Naming conventions (variable naming, file naming, directory structure conventions)
- Error handling approaches (where and how errors are caught, logged, and surfaced)
- Domain vocabulary (domain-specific terms, entity names, relationship labels)
- Documented decisions (ADRs, comment clusters explaining architectural choices)
- Testing patterns (how tests are organized, what they assert, what fixtures look like)

The extractor produces a `ResearchResult` from this analysis, using the codebase's patterns as the "tools" — each identifiable pattern becomes a `ResearchTool` entry with the pattern as the artifact structure. This `ResearchResult` feeds into the standard Skill Builder and Prompt Engine pipeline. The output is a skill capturing "how we do things here" — a skill that enables any agent to operate consistently within the codebase's established conventions.

CLI usage:
```bash
npx skill-mall extract ./src --output our-api-conventions
```

```bash
npx skill-mall extract ./src --output our-api-conventions --category team-conventions --focus "error handling,naming,module structure"
```

The `--focus` flag narrows extraction to specific pattern types. Without it, the extractor runs full analysis. The Research Confirmation step is required — the extractor writes its `ResearchResult` to `research-result.json` and waits for `npx skill-mall confirm-research <skill-slug>` before proceeding.

---

## 4. Quality and Analytics

### Skill Quality Score (UI, Phase 1)

The Skill Quality Score is an automated rubric computed at catalog build time. Every skill in the catalog receives a score from 0 to 100. The score is displayed on every skill card in the catalog and on the skill detail page. The detail page shows the full per-dimension breakdown with specific, actionable feedback for every deduction.

**Scoring dimensions:**

**Description quality — 25 points maximum**

| Criterion | Points |
|-----------|--------|
| Description uses imperative phrasing in the first sentence | 7 |
| Description is 150 characters or fewer | 6 |
| Trigger phrase appears in the first 80 characters | 7 |
| Description is specific (names the domain, tool, or workflow; does not use generic verbs like "help" or "assist") | 5 |

**Completeness — 25 points maximum**

| Criterion | Points |
|-----------|--------|
| README.md present | 5 |
| At least one template file in `resources/templates/` | 7 |
| At least one sample output in `resources/samples/` | 7 |
| At least one prompt file in `resources/prompts/` | 6 |

**Frontmatter health — 20 points maximum**

| Criterion | Points |
|-----------|--------|
| All required fields present (name, description, category, tags, version, author) | 8 |
| Category value exists in the catalog taxonomy | 4 |
| Tag count between 2 and 6 | 4 |
| Directory name matches the `name` field slug | 4 |

**Resource richness — 20 points maximum**

Scored on a curve based on total count of templates + samples + prompts + scripts:

| Total resource count | Points |
|---------------------|--------|
| 1–3 | 5 |
| 4–7 | 10 |
| 8–14 | 15 |
| 15+ | 20 |

**Link health — 10 points maximum**

| Criterion | Points |
|-----------|--------|
| All skills referenced in `metadata.linked-skills` exist in the catalog | 10 |
| (Proportional deduction per broken link when multiple linked skills exist) | — |

**Feedback format:**

Every deduction generates a specific, actionable message displayed on the detail page. Examples:

- "Description starts with a verb phrase that lacks imperative form: 'This skill helps you...' — rewrite as 'Help with...' or 'Run a structured...' (-7)"
- "No sample outputs found in resources/samples/ — add at least one completed artifact example (-7)"
- "Linked skill 'okr-framework' not found in catalog — remove the link or install the skill (-5)"
- "Description is 187 characters (exceeds 150-character limit) — shorten by removing the second sentence (-6)"

### Agent Budget Analyzer (UI and CLI, Phase 1)

The Agent Budget Analyzer simulates how a skill's description competes for agent skill-listing context budget under real-world installed-skill load. It tells the skill author exactly what the agent reads — and what it does not — when 10, 20, 30, and 50 skills are installed alongside this one.

The analyzer requires: the target agent, the current installed skill count, and the skill to analyze. Budget behavior is agent-specific. Different agents have different context window sizes, different skill listing formats, and different budget allocation formulas. No agent is assumed to behave identically to another.

**Output:**

1. A preview of the skill description as the agent reads it at each load level (10, 20, 30, 50 installed skills), with truncation visually marked
2. A list of keywords that are lost at each threshold — specifically, whether the trigger phrase is preserved
3. Specific rewrite suggestions that preserve the trigger phrase at all four load levels while staying within the 150-character quality score threshold

**UI usage:** available on every skill detail page as "Budget Analysis" tab. User selects target agent from a dropdown and sets installed skill count with a slider.

**CLI usage:**
```bash
npx skill-mall budget-check blue-ocean-strategy --agent claude-code --installed 25
```

Output:
```
Budget analysis: blue-ocean-strategy / claude-code / 25 installed skills

At 25 skills:
  Characters available: 312
  Your description (143 chars): VISIBLE [full]
  Trigger phrase "Blue Ocean" appears at char 0: PRESERVED

At 30 skills:
  Characters available: 261
  Your description (143 chars): VISIBLE [full]
  Trigger phrase "Blue Ocean" appears at char 0: PRESERVED

At 50 skills:
  Characters available: 157
  Your description (143 chars): VISIBLE [full]
  Trigger phrase "Blue Ocean" appears at char 0: PRESERVED

Recommendation: Description passes all load thresholds. No rewrite needed.
```

### Skill Dependency Graph (UI, Phase 2)

The Skill Dependency Graph is a force-directed graph visualization in the catalog. It renders the full dependency network across all installed skills based on the `metadata.linked-skills` field in each SKILL.md.

**Technical implementation:** the graph is built from the catalog data layer at render time. Nodes are skills. Edges are `linked-skills` connections. Node color maps to category. The graph uses a force-directed layout with collision detection to prevent node overlap.

**Interactions:**

- Click a node to navigate to that skill's detail page
- Hover a node to show a tooltip with the skill description
- Filter controls allow isolating nodes by category, reducing visual noise in dense catalogs

**Surfaced insights:**

- **Hub skills** — skills with many incoming or outgoing connections. These are high-value ecosystem skills worth maintaining carefully.
- **Orphan skills** — skills with zero connections. These are highlighted (distinct node border) as candidates for linking to related skills or for evaluation as removal candidates.
- **Clusters** — groups of 5 or more tightly connected skills with few external edges. These are surfaced automatically as candidates for conversion to a Skill Collection (see Section 5).

### Description Trigger Evaluator (UI and CLI, Phase 2)

The Description Trigger Evaluator tests a skill description against 20 evaluation queries to measure how reliably agents invoke the skill when they should and do not invoke it when they should not.

The evaluator generates 20 queries automatically from the skill's domain and description:

- 10 queries that should trigger the skill (positive test cases)
- 10 queries that should not trigger the skill (negative test cases)

For each query, the evaluator simulates agent skill selection behavior and records whether the skill was selected. It reports:

- True positive rate (of the 10 should-trigger queries, what percentage triggered the skill)
- False positive rate (of the 10 should-not-trigger queries, what percentage incorrectly triggered the skill)
- False negative rate (of the 10 should-trigger queries, what percentage failed to trigger)
- Overall accuracy score (weighted combination)
- Specific failing queries with the failure type and a suggested description rewrite that would fix each failure

The methodology is based on the agentskills.io optimizing-descriptions approach.

**UI usage:** available on every skill detail page as "Trigger Analysis" tab.

**CLI usage:**
```bash
npx skill-mall eval-triggers blue-ocean-strategy
```

**CI integration:** optional step in `skill-mall/validate-action@v1`. Configurable accuracy threshold (default 80%). A skill failing below the threshold does not block merge by default — it generates a warning comment on the PR. Set `trigger_accuracy_fail: true` in the action config to make it blocking.

### Skill Version History (UI and CLI, Phase 2)

The Skill Version History reads the git log for the skill's directory and renders a changelog timeline.

**Timeline format:** each entry shows the semver version, commit date, commit author, and a semantic diff — what changed across description, instructions, templates, prompts, and metadata. The semantic diff is not a raw git diff; it identifies the class of change (description edited, new tool added, template replaced, prompt framework changed) and states it in plain language.

**Semver convention enforced by the system:**

| Bump | Meaning |
|------|---------|
| Patch (1.0.0 → 1.0.1) | Typo fix, clarity improvement, no behavioral change |
| Minor (1.0.0 → 1.1.0) | New section, added resource, new tool template or prompt |
| Major (1.0.0 → 2.0.0) | Changed output format, changed tool coverage, breaking change to any artifact structure |

**Revert via CLI:**
```bash
npx skill-mall revert blue-ocean-strategy --version 1.1.0
```

This command checks out the files from the specified version into a new branch named `revert/<skill-slug>-v1.1.0`. The user reviews and merges manually — the command does not commit or merge automatically.

---

## 5. Community and Discovery

### Ratings and Reviews (UI, Phase 2, requires backend)

The ratings system collects two types of signal per skill:

- **Effectiveness score** — a quality-weighted average of star ratings (1–5) from verified users
- **Popularity score** — raw install count

These two signals are kept strictly separate in the UI. A skill with high install count and low effectiveness score is not displayed as "highly rated" — the two dimensions are presented independently on every skill card. A skill can be popular without being effective. A skill can be highly effective without being widely adopted.

**Review requirements:**

- Reviews require a verified install signal (the system checks that the reviewing account has deployed the skill at least once)
- Maximum length: 150 characters
- Reviews must reference a specific use case or outcome to be surfaced in the prominent review feed. Generic reviews ("great skill", "very useful") are accepted but deprioritized in display — they are not deleted
- Moderation is applied to reviews containing only generic phrases: they appear below the fold, never at the top

**Backend:** Supabase for review storage. GitHub OAuth for reviewer identity verification. Install signal verification uses the deployment event log stored in Supabase.

### Skill Collections and Packs (UI and CLI, Phase 2)

Skill Collections are curated bundles of 5 to 15 related skills with a recommended deployment sequence.

**Collection file format:**

Collections are stored as `collections/<pack-name>/collection.json`:

```json
{
  "name": "Full-Stack Developer Kit",
  "slug": "full-stack-developer-kit",
  "description": "Essential skills for full-stack development workflows",
  "author": "skill-mall-core",
  "skills": [
    {
      "slug": "code-review",
      "order": 1,
      "note": "Install first — the other skills reference code-review conventions"
    },
    {
      "slug": "pr-writer",
      "order": 2,
      "note": "Uses code-review output as its context framing"
    },
    {
      "slug": "commit-writer",
      "order": 3,
      "note": null
    },
    {
      "slug": "debugging-session",
      "order": 4,
      "note": null
    },
    {
      "slug": "test-writer",
      "order": 5,
      "note": "Install last — references commit-writer and code-review conventions"
    }
  ]
}
```

**Curated starter collections at Phase 2 launch:**

| Collection | Skills | Deployment note |
|-----------|--------|-----------------|
| Full-Stack Developer Kit | code-review, pr-writer, commit-writer, debugging-session, test-writer | Install in listed order |
| Strategic Business Pack | blue-ocean-strategy, okr-framework, user-story-mapping | Install in any order |
| Documentation Suite | technical-documentation, api-documentation, decision-records, incident-postmortem | Install in any order |

**Community packs:** any contributor may submit a collection by opening a PR adding a `collections/<pack-name>/collection.json`. CI validates that all referenced skill slugs exist in the catalog.

**CLI usage:**
```bash
npx skill-mall deploy-pack strategic-business --agent claude-code
```

```bash
npx skill-mall deploy-pack strategic-business --agent claude-code --scope project
```

Output shows per-skill deployment status in order.

### Skill Forking (UI and CLI, Phase 2)

Forking creates a full, independent copy of any skill into a new directory. The fork is immediately independent — changes to the original never propagate to forks automatically.

**Fork tracking:** the fork's SKILL.md frontmatter receives a new field:

```yaml
metadata:
  forked_from: "blue-ocean-strategy@1.2.0"
```

Multi-level forks track the full lineage chain:

```yaml
metadata:
  forked_from: "my-startup-blue-ocean@1.0.0"
  fork_chain:
    - "blue-ocean-strategy@1.2.0"
    - "my-startup-blue-ocean@1.0.0"
```

**Original skill display:** the original skill's detail page shows a "Forked X times" count and a "Most Forked" indicator when the fork count exceeds a threshold. High fork count signals the original is a high-value base with limitations driving customization — this is surfaced as a signal to the skill author that common customizations may be worth merging upstream.

**CLI usage:**
```bash
npx skill-mall fork blue-ocean-strategy my-startup-blue-ocean
```

**UI usage:** a "Fork" button on every skill detail page. The user provides a new skill name and the fork is created in the appropriate category directory.

### Trending Dashboard (UI, Phase 2, requires backend)

The Trending Dashboard shows aggregate-only analytics. No personal data is collected at any point. All tracking is at the event level (skill installed, skill searched, skill forked) without any personally identifiable user data.

**Tracked signals:**

- Install velocity (7-day rolling and 30-day rolling)
- Search click-through rate (skill appeared in search results and was clicked)
- Fork count
- Review score trend (moving average over 30 days)

**Public views:**

- **Trending** — top 10 by 7-day install velocity
- **Rising** — skills with install velocity accelerating more than 50% in the past 7 days
- **Community Favorites** — top 10% by fork count
- **High Quality** — skills with quality score above 90 and average review above 4.5

**Contributor private view:** each skill contributor sees, for their own skills only: install counts by agent type (aggregate, not per-user), search appearances (how many times the skill appeared in a search result), fork counts, and review score trends. No identifiable user data is ever present in the contributor view.

---

## 6. Integration and Deployment

### Multi-Agent Deploy (UI and CLI, Phase 2)

Multi-Agent Deploy deploys a skill to all detected agents on the machine in a single operation. Agent detection reads the filesystem, checking for the existence of 54 known agent home directories sourced from the vercel-labs/skills `agents.ts` registry.

Detection is conservative: an agent is only reported as detected if its home directory exists and is readable. The deploy operation is only attempted for detected agents.

**CLI usage:**
```bash
npx skill-mall deploy blue-ocean-strategy --all-agents
```

```bash
npx skill-mall deploy blue-ocean-strategy --agents claude-code,cursor,codex
```

```bash
npx skill-mall deploy blue-ocean-strategy --all-agents --scope project
```

Output per-agent:
```
Deploying blue-ocean-strategy...

  Claude Code      detected   deployed  
  Cursor           detected   deployed  
  Gemini CLI       detected   deployed  
  Codex            not detected — skipped
  Continue         not detected — skipped

Deployed to 3 of 5 checked agents.
```

**UI usage:** the skill detail page shows a "Deploy" button. In Phase 1, this deploys to a single user-selected agent. In Phase 2, a "Deploy to All Agents" option appears alongside it. Deployment results show per-agent status inline.

### Publish to skills.sh (CLI, Phase 2)

The skills.sh publisher validates and publishes a SkillMall skill to the public skills.sh registry.

**Pre-publish validation checks (all must pass to proceed):**

1. SkillMall quality score is 70 or higher
2. Description is 1024 characters or fewer
3. Skill name matches directory name exactly
4. `metadata.license` field is present in SKILL.md frontmatter

**Authentication:** skills.sh OAuth. On first publish, the CLI opens the OAuth flow and stores the token locally.

**CLI usage:**
```bash
npx skill-mall publish blue-ocean-strategy --registry skills.sh
```

**Post-publish:** the CLI writes two fields to the SKILL.md frontmatter:

```yaml
metadata:
  skills_sh_id: "abc123"
  skills_sh_url: "https://skills.sh/skills/abc123"
```

The catalog detail page shows a "Published on skills.sh" badge with the live install count sourced from the skills.sh API. Published skills are installable by anyone via:

```bash
npx skills add jamesdsizemore/blue-ocean-strategy
```

### CI/CD Validation Action (UI and CLI, Phase 1)

The `skill-mall/validate-action@v1` GitHub Action runs on any pull request that touches files in the `skills/` directory.

**What it runs:** the existing `validate-skill.sh` script on every skill directory changed in the PR. The Action is a thin wrapper — it discovers changed skill directories, runs the script per skill, collects results, and posts a structured report.

**PR comment format:**
```
## SkillMall Validation Report

| Skill | Status | Issues |
|-------|--------|--------|
| blue-ocean-strategy | PASS | — |
| my-new-skill | FAIL | Description exceeds 1024 chars; missing required field: version |

1 skill passed, 1 skill failed. Merge blocked.
```

**Merge blocking:** any validation error (not warning) blocks merge. Warnings generate comment text but do not block.

**Optional checks (configurable in the action config):**

```yaml
- uses: skill-mall/validate-action@v1
  with:
    trigger_accuracy_threshold: 80      # warn if below; set trigger_accuracy_fail: true to block
    budget_warn_at_installed: 25        # warn if description truncated at this load level
    link_health_fail: true              # fail if linked-skills reference non-existent skills
```

**Status badge:** the Action generates a repository README badge showing the validation status of the most recently merged skill change.

### npm Package Publisher (CLI, Phase 2)

The npm Package Publisher packages a SkillMall skill as an npm module under the `@skill-mall` scope.

The publisher auto-generates a `package.json` from SKILL.md metadata:

```json
{
  "name": "@skill-mall/blue-ocean-strategy",
  "version": "1.2.0",
  "description": "Run Blue Ocean Strategy analysis using 21 tools...",
  "keywords": ["skill", "blue-ocean", "strategy", "business"],
  "author": "jamesdsizemore",
  "license": "MIT",
  "files": ["SKILL.md", "README.md", "resources/", "scripts/"]
}
```

The version in `package.json` is always kept in sync with `metadata.version` in SKILL.md. A mismatch between the two fails the publish.

**CLI usage:**
```bash
npx skill-mall publish blue-ocean-strategy --registry npm
```

Post-publish, the skill is installable via:
```bash
npx skills add @skill-mall/blue-ocean-strategy
```

### SkillMall MCP Server (UI and CLI, Phase 2)

The SkillMall MCP Server exposes the skill catalog as a Model Context Protocol server. Any MCP-compatible agent can discover, browse, read, and deploy skills from within a conversation.

**Exposed tools:**

```typescript
search_skills(query: string, category?: string): SkillSummary[]
get_skill(category: string, slug: string): SkillFull
get_prompts(category: string, slug: string): PromptFile[]
list_categories(): Category[]
deploy_skill(slug: string, agent: string, scope: 'global' | 'project'): DeployResult
```

**Hosting:** the MCP server is hosted as a Vercel serverless function alongside the Next.js catalog application. The catalog's `/api/mcp` route handles all MCP protocol requests. Local development mode: `npx skill-mall mcp-server` starts the server on port 3001.

**MCP config entry:**

```json
{
  "mcpServers": {
    "skill-mall": {
      "url": "https://skill-mall.vercel.app/api/mcp"
    }
  }
}
```

---

## 7. Advanced Capabilities

### Prompt Optimizer (UI and CLI, Phase 1)

The Prompt Optimizer operates on any prompt — not only skill-generated prompts. It is the standalone version of the optimizer that also runs as the final stage of the Prompt Engine pipeline.

**Input:** any prompt text, accepted via file path or piped from stdin.

**Audit dimensions:**

1. **Token efficiency** — every word is evaluated for whether removing it changes the model's output. Words that do not change the output are candidates for removal. The optimizer applies conservative removal: when uncertain whether a word affects output, it keeps it.

2. **9-dimension intent completeness** — the prompt is parsed for explicit treatment of all nine dimensions:
   - Task — what the model is being asked to do
   - Input — what data or context the model is operating on
   - Output — what the deliverable looks like
   - Constraints — what limits apply
   - Context — background the model needs
   - Audience — who the output is for
   - Memory — what prior context to retain or ignore
   - Success criteria — how to judge whether the output is correct
   - Examples — worked examples or counter-examples

   Each missing or ambiguous dimension is flagged with its dimension name and a suggestion for how to add it without inflating the prompt.

3. **Output specification clarity** — the prompt is checked for: explicit naming of the output deliverable, specification of the output's structure or format, and explicit ordering constraints. A prompt that produces a matrix but does not name the matrix, does not specify its column count, and does not specify column headers fails this check.

4. **Trigger sharpness** — the first sentence of the prompt must unambiguously define the task in terms the model can act on immediately. Openings like "This skill helps you..." fail; openings like "Produce a..." or "Analyze the..." pass.

**Output format:**

```
Audit results: my-prompt.md

Token efficiency: 847 → 631 tokens (−25%)
Intent completeness: 7/9 dimensions present
  Missing: success-criteria, examples
Output specification: PASS
Trigger sharpness: PASS

Dimensions to add:
  success-criteria: Add "The output is complete when..." before the closing instruction
  examples: Add one brief worked example of the input→output transformation

Optimized prompt: my-prompt-optimized.md
Diff: my-prompt.diff
```

**CLI usage:**
```bash
npx skill-mall optimize-prompt ./resources/prompts/my-prompt.md
```

```bash
cat my-prompt.md | npx skill-mall optimize-prompt --stdin
```

**UI access:** `/optimize` in the catalog. Accepts pasted prompt text. Shows audit results and the optimized version with a word-level diff rendered inline.

### Prompt Template Library (UI, Phase 1)

The Prompt Template Library is a browsable, searchable library of reusable prompt engineering technique patterns. These are not skill prompts — they are the framework patterns themselves, usable as references when authors manually write or override prompts.

**Content:** seeded from NirDiamant's 22 PE technique notebooks and expanded through community contribution. Each entry is a framework pattern with: a plain-language name, a description of when to use it, a canonical example demonstrating the technique, known failure modes, and notes on combining it with other frameworks.

**Storage:** `lib/prompt-templates/<framework-slug>.md` with frontmatter:

```yaml
---
name: Chain of Thought
category: reasoning
output-types: [analysis, decision, explanation, artifact]
complexity: thorough
domains: [universal]
---
```

**UI organization:** browsable by framework category (reasoning, context, structure, output, meta), output type (analysis, artifact, decision, summary, code, comparison), domain, and complexity. Full-text search across all entries.

**Access:** `/prompt-library` in the catalog. One-click copy of any framework pattern. One-click navigate to any skill that uses this framework in its prompts.

### Skill Testing Framework (UI and CLI, Phase 2)

The Skill Testing Framework allows skill authors to define test cases that verify the skill produces the required outputs.

**Test case format:**

Test cases are stored in `tests/<skill-slug>/` as JSON files. Each file is one test case:

```json
{
  "id": "errc-grid-basic",
  "description": "ERRC Grid for a mid-market SaaS company",
  "input": "Analyze the competitive position of a mid-market B2B project management SaaS with 50,000 paying customers...",
  "required": [
    "contains ERRC grid table",
    "has at least 2 items in ELIMINATE quadrant",
    "has at least 2 items in REDUCE quadrant",
    "has at least 2 items in RAISE quadrant",
    "has at least 1 item in CREATE quadrant",
    "rationale column present for each item"
  ],
  "forbidden": [
    "mentions specific competitor names without citing a source",
    "produces a generic output identical to any other industry's ERRC grid"
  ]
}
```

Required and forbidden items are evaluated as natural language assertions — the test runner sends the skill output to an evaluation model configured to check each assertion and report pass/fail.

**CLI usage:**
```bash
npx skill-mall test blue-ocean-strategy
```

Output:
```
Running 8 test cases for blue-ocean-strategy...

  errc-grid-basic            PASS  (6/6 required, 0 forbidden triggered)
  strategy-canvas-current    PASS  (4/4 required, 0 forbidden triggered)
  three-tiers-noncustomers   FAIL  (2/3 required — missing: "third tier population estimate")
  buyer-utility-map-full     PASS  (5/5 required, 0 forbidden triggered)
  ...

Results: 7/8 passed (87.5%)
```

**CI integration:** the `skill-mall/validate-action@v1` runs the test suite on any PR touching a skill that has tests defined. Skills with tests must maintain a pass rate of 80% or higher to avoid a blocking failure. This threshold is configurable.

### Skill Chain Builder (UI, Phase 3)

The Skill Chain Builder is a visual canvas in the catalog for composing multi-skill workflows.

**Canvas interactions:** drag skills from the catalog sidebar onto the canvas. Draw directed connections between skill nodes. Each connection opens a configuration panel that specifies: what output from skill A feeds skill B, how that output is passed (full output appended to context, summarized to N sentences first, extracted as a specific named section, used as a named template variable).

**Output:** the Skill Chain Builder generates a new skill in `skills/chains/<chain-name>/` that orchestrates the chain. The wrapper skill's SKILL.md contains:

```yaml
metadata:
  chain: true
  chain_steps:
    - skill: blue-ocean-strategy
      uses_output: strategy-canvas-current.md
      passes_as: context_append
    - skill: okr-framework
      receives: strategy-canvas-current.md
      instructions: "Use the current-state Strategy Canvas as the strategic context for OKR setting"
```

The wrapper skill uses the `context: fork` pattern from the AgentSkills spec to orchestrate the chain at execution time.

**Phase 3 dependency:** the Skill Chain Builder depends on the Skill Testing Framework being in place, because chains require test coverage to validate that the handoff between skills produces correct downstream output.

### RAG-Enhanced Skills (UI and CLI, Phase 3, requires backend)

RAG-Enhanced Skills attach a document knowledge base to a skill. When the skill is invoked, a retrieval step fetches the most relevant document chunks from the knowledge base and prepends them to the skill context before the skill instructions run.

This enables proprietary skills with embedded organizational knowledge — industry analysis, internal research, company-specific frameworks, competitive intelligence — that no public skill could replicate.

**Knowledge attachment:**

Documents are stored in `resources/knowledge/`. Supported formats: Markdown, plain text, PDF, HTML.

**CLI usage:**
```bash
npx skill-mall attach-knowledge blue-ocean-strategy ./company-strategy-docs/
```

The CLI embeds all documents, generates vectors using text-embedding-3-small, and stores them in a pgvector table via Supabase. The SKILL.md frontmatter receives:

```yaml
metadata:
  rag_enabled: true
  knowledge_base_id: "kb_abc123"
  embedding_model: "text-embedding-3-small"
```

**Configurable:** embedding model, chunk size, retrieval chunk count. Defaults: text-embedding-3-small, 512 tokens per chunk, top-5 retrieved.

**Backend:** pgvector extension in Supabase. Vectors stored in a `knowledge_chunks` table keyed by knowledge base ID.

### Skill Self-Improvement Loop (UI and CLI, Phase 3, requires backend)

The Skill Self-Improvement Loop enables iterative improvement driven by structured user feedback.

**Feedback collection:** after deploying a skill, users may optionally submit structured feedback via the catalog UI. Feedback format: satisfaction rating (1–5) and a free-text field capped at 200 characters. The field shows a prompt: "What worked and what did not?" Users are not required to submit feedback — it is entirely opt-in.

**Analysis trigger:** at 10 or more feedback instances, the system analyzes the full feedback set and generates specific improvement suggestions. Suggestions are generated per dimension: SKILL.md instructions, description, templates, prompts. Each suggestion includes: the pattern observed in feedback, the specific change recommended, and the section of the skill it applies to.

**Approval gate:** all suggestions are presented to the skill author for review. No automatic writes occur. The author reviews each suggestion, approves or rejects it, and clicks "Apply Approved Changes." Approved changes are applied in batch. The version is bumped according to the semver convention: patch if only clarity changes, minor if instructions added, major if output format changed.

**Intellectual basis:** inspired by GEPA (Guided Evolutionary Prompt Adaptation) and EvoSkill prompt evolution research. The system uses the feedback patterns, not individual feedback items, to generate suggestions.

**Backend:** Supabase for feedback storage. Analysis runs as a Supabase Edge Function triggered when a skill's feedback count crosses the threshold.

### Multilingual Skill Support (UI and CLI, Phase 2)

Multilingual support adds translated SKILL.md files per locale alongside the canonical English file.

**File convention:**

```
skills/business/blue-ocean-strategy/
├── SKILL.md                    # canonical, always English
├── resources/
│   └── i18n/
│       ├── SKILL.es.md         # Spanish
│       ├── SKILL.fr.md         # French
│       ├── SKILL.de.md         # German
│       └── SKILL.pt-BR.md      # Brazilian Portuguese
```

The canonical `SKILL.md` is always English. It is the source of truth. Translations are derived from it and must match its structure — same sections, same field names, translated content only.

**Translation workflow:**

1. The skill author sets `metadata.translation_ready: true` in the canonical SKILL.md, signaling that the English content is stable
2. Community contributors submit translations as PRs adding `SKILL.<locale>.md` files
3. CI checks that the translation's section structure matches the canonical file exactly
4. The catalog shows available locales on the skill detail page
5. Agents that support locale preferences receive the appropriate translation when deploying

**CLI deploy with locale:**
```bash
npx skill-mall deploy blue-ocean-strategy --agent claude-code --lang es
```

**Validation:** the `skill-mall/validate-action@v1` checks that all translation files match the canonical file's required section structure. Missing sections in a translation file fail validation.

### Skill Marketplace (UI, Phase 3, requires backend)

The Skill Marketplace is an optional monetization layer added after the catalog has established critical mass and community trust.

**Three tiers:**

1. **Free** — all current public skills. Free status is permanent and non-negotiable for any skill currently in the catalog. Free skills are never removed or paywalled.

2. **Sponsored** — companies fund the development and maintenance of skills in their domain. The skill remains free to use. The sponsoring company receives an attribution badge on the skill card and detail page. Sponsorship is disclosed clearly and does not influence skill content.

3. **Premium** — individual creators charge for specialized skills. Premium skills are distinguished from free skills by a "Premium" badge. The price is set by the creator.

**Revenue split for Premium skills:**
- 70% to the skill creator
- 20% to SkillMall operations
- 10% to the community fund

**Community fund:** the 10% community fund is used exclusively to fund development bounties for missing skills in underserved domains. Bounties are proposed by the community, voted on, and awarded when a skill meeting the bounty spec is merged and passes quality review.

**Backend:** Stripe for payment processing. GitHub OAuth for creator identity. Supabase for purchase records and entitlement tracking.

**Launch condition:** the Marketplace is not activated until the catalog has at least 200 skills, at least 500 community members, and the Ratings and Reviews system has been operating for at least 3 months with consistent engagement. These conditions ensure community trust is established before introducing commercial dynamics.

---

## 8. Implementation Phases Summary

### Phase 1 — Core System

Phase 1 delivers the complete skill generation pipeline and the quality and tooling layer that makes generated skills production-ready. Every feature in Phase 1 can be built without a backend service — Phase 1 is entirely static and CLI-first.

**Features in Phase 1:**

- Skill Creation Wizard (UI Research Wizard — 6-step wizard with mandatory Research Confirmation)
- AI-Assisted Skill Writer (UI + CLI)
- Domain Starter Templates (20+ templates, `skills/_starters/`)
- Dynamic Prompt Generation (full 5-stage pipeline: Research Engine → Skill Builder → Prompt Engine → Prompt Optimizer → Stage 5)
- Skill Quality Score (automated rubric, 0–100, per-dimension feedback)
- Agent Budget Analyzer (UI + CLI)
- CI/CD Validation Action (`skill-mall/validate-action@v1`)
- Prompt Optimizer (standalone tool at `/optimize` + CLI + pipeline stage)
- Prompt Template Library (`/prompt-library`, seeded from NirDiamant notebooks)

### Phase 2 — Community and Ecosystem

Phase 2 adds the community layer, integrations, and analytics that turn the catalog into an ecosystem. Phase 2 requires a Supabase backend for features marked "requires backend."

**Features in Phase 2:**

- Codebase-to-Skill Extractor (CLI)
- Skill Dependency Graph (UI, no backend required)
- Description Trigger Evaluator (UI + CLI)
- Skill Version History (UI + CLI, reads git log)
- Ratings and Reviews (UI, requires backend)
- Skill Collections and Packs (UI + CLI)
- Skill Forking (UI + CLI)
- Trending Dashboard (UI, requires backend)
- Multi-Agent Deploy (UI + CLI, requires agent detection library)
- Publish to skills.sh (CLI)
- npm Package Publisher (CLI)
- SkillMall MCP Server (Vercel serverless + CLI local mode)
- Skill Testing Framework (UI + CLI)
- Multilingual Skill Support (UI + CLI)

### Phase 3 — Advanced Capabilities

Phase 3 features depend on Phase 2 infrastructure being proven. No Phase 3 feature is scoped, estimated, or planned until Phase 2 is stable and in use.

**Features in Phase 3:**

- Skill Chain Builder (UI; depends on Skill Testing Framework)
- RAG-Enhanced Skills (CLI + backend; depends on pgvector in Supabase)
- Skill Self-Improvement Loop (UI + backend; depends on testing framework + feedback backend)
- Skill Marketplace (UI + backend; launch conditions must be met)

### Future Development (explicitly out of current scope)

**Prompt ELO Tester** — deferred permanently from the current roadmap. This feature pits two prompt variants against each other in automated head-to-head evaluation to determine which produces higher-quality output. It requires a stable Skill Testing Framework with high-coverage test suites before ELO rankings can be meaningful. Full conditions and notes in `FEATURE_ROADMAP.md` under "Future Development."

---

## 9. Phasing Decisions

These decisions were made during design and are tracked here for traceability. All entries are also recorded in `FEATURE_ROADMAP.md`.

**Decision 1: Research Wizard approach selection**

Phase 1 ships the UI Research Wizard (Approach B) — a 6-step guided wizard with mandatory Research Confirmation. Phase 2 adds a Hybrid CLI + UI approach (Approach C) where the CLI and UI share a common `research-engine` library, allowing the CLI to perform the same research pipeline as the wizard and output a `research-result.json` for confirmation before writing files. The shared library is designed in Phase 1 to make Phase 2 extension non-breaking.

**Decision 2: Prompt ELO Tester deferred permanently**

The Prompt ELO Tester was evaluated during design and moved to Future Development. The decision rationale: ELO evaluation requires a stable test suite with meaningful coverage before rankings can be trusted. Phase 1 does not include the Skill Testing Framework; Phase 2 does. Running ELO without the testing framework would generate rankings with no verifiable basis. The feature is not blocked by technical complexity — it is blocked by the absence of prerequisite infrastructure. It is revisited when: the Skill Testing Framework is stable (Phase 2), average test coverage per skill is above 5 test cases, and at least 50 skills have test suites.

**Decision 3: Dynamic prompt generation with no ELO in pipeline**

Phase 1 ships the full dynamic prompt generation pipeline: Research Engine → Skill Builder → Prompt Engine (with framework selection algorithm) → Prompt Optimizer → write to disk. The pipeline does not include automated ELO ranking of generated prompt variants. The Prompt Optimizer is the quality gate instead — it ensures prompts are token-efficient, intent-complete, and output-specified before they ship. The ELO step would run after the optimizer; it is the slot reserved for future integration.

**Decision 4: Agent deployment scope**

Phase 1 deploys to a single user-selected agent. The deploy operation is simple and does not require an agent detection library. Phase 2 adds multi-agent deploy with detection of all 54 agents from the vercel-labs/skills registry. The agent detection library is a Phase 2 dependency — it requires validation against real agent installations across multiple operating systems before it can be shipped with confidence.

**Decision 5: skills.sh integration scope**

Phase 1 includes discovery only — skills in the catalog that are already published on skills.sh show a badge sourced from a manual `metadata.skills_sh_id` field the author adds. Phase 2 ships the full publish workflow with OAuth, pre-publish validation, and automated post-publish frontmatter updates. The Phase 1 scope decision reflects that the publish workflow requires OAuth integration and CLI testing that is not blocking for Phase 1 ship.

---

*End of specification. This document covers all features, all phases, and all design decisions in the approved scope. Any feature not listed here is not in scope for the current roadmap.*
