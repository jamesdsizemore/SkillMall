# Tutorial: Build a Jobs-to-Be-Done Skill with the Web Wizard

This tutorial walks through every step of creating a skill using the SkillMall browser wizard. You will build a complete, deployable skill for the Jobs-to-Be-Done (JTBD) framework — a product management methodology for understanding why customers make the decisions they do.

By the end you will have:

- A `SKILL.md` file with a correct frontmatter, a research-grounded description, and structured instructions
- A `README.md` explaining the skill to human readers
- Template files for each JTBD tool the research pipeline extracted
- Sample outputs showing what finished JTBD artifacts look like
- Prompt files for five prompt engineering modes (comprehensive analysis, quick assessment, stakeholder presentation, first principles exploration, competitive response)

This tutorial assumes you have never used SkillMall before. Every screen is described in full. Nothing is assumed.

---

## Prerequisites

Before starting, confirm the following:

1. SkillMall is running locally. Open a terminal, navigate to the skill-mall directory, and run `npm run dev`. Visit `http://localhost:3000` in your browser and confirm you see the SkillMall catalog homepage.
2. You have configured an LLM provider. Navigate to `http://localhost:3000/settings/providers`. If the page shows "No provider configured," follow the [Configuring Providers](../../user/configuring-providers.md) guide before continuing. The wizard makes LLM API calls and cannot function without a configured provider.

If both conditions are met, you are ready to begin.

---

## What You Will Build

### The Skill: jobs-to-be-done

The Jobs-to-Be-Done framework — developed primarily by Clayton Christensen and later elaborated by practitioners including Alan Klement — is a theory of customer motivation. The central claim is that customers do not buy products; they hire products to do a job. A job is a specific progress a person is trying to make in a specific situation. Understanding the job a customer is trying to get done — better than the customer themselves can articulate it — is the foundation of product strategy that creates genuine, durable demand.

This framework is used in:

- **Product discovery** — deciding which problems are worth solving before writing any code
- **Positioning and messaging** — describing a product in terms of the customer's desired outcome, not the product's features
- **Competitive analysis** — identifying what customers were "firing" (replacing) when they adopted your product, and what job that previous solution was doing for them
- **Innovation strategy** — finding the functional, social, and emotional dimensions of a job that existing solutions leave unaddressed

When you install this skill in Claude Code, you can type "help me understand why users are churning" and Claude will immediately engage the JTBD lens: it will ask about the job the user was trying to do, which forces were pushing them toward switching, which were pulling them toward staying, and what competing solutions they considered. Without the skill, Claude gives generic churn analysis advice. With the skill, it follows a structured investigative process with named outputs.

That is the difference a well-made skill makes.

---

## Starting the Wizard

Open your browser and navigate to:

```
http://localhost:3000/skills/create
```

You will land on the first screen of the six-step wizard.

### What the Page Looks Like

Before you type anything, take a moment to orient yourself to the page layout.

Across the very top of the page, just below the browser's address bar, runs a narrow navigation strip. This strip belongs to the wizard itself and contains the step indicator: a horizontal sequence of six labels rendered in small-caps monospace type. Each label is prefixed with a two-digit number and separated from the next by a dash character. Right now the labels read: `01 TOPIC — 02 RESEARCH — 03 METADATA — 04 PREVIEW — 05 PROMPTS — 06 CONFIRM`. The `01 TOPIC` label is enclosed in a thin rectangular border and rendered in a brighter color than the rest — this is the active step indicator. Steps two through six appear dimmed, indicating they are not yet reachable. As you complete each step, its number will be replaced with a checkmark and its label will shift to a medium blue color, creating a visual trail of completed steps.

Below the navigation strip, the page background is the site's dark surface color — near-black but not fully black, with a slightly warm undertone. The content area is centered in the viewport and constrained to a comfortable reading width (roughly 768px on a desktop screen). There is generous vertical padding above and below the form area, so the inputs sit in the visual middle of the screen without feeling crowded.

The first thing you see in the content area is a label in very small, widely-spaced monospace capitals: `[ SKILL TOPIC ]`. This label style — brackets around uppercase text, rendered in a light secondary color — is used consistently throughout the wizard to label every field and action. Below the label is an underline — a single horizontal rule rather than a bordered input box. The cursor is already focused inside this field. A placeholder text in a very dim color reads `e.g. Blue Ocean Strategy`.

Below the topic field, after some vertical spacing, is a second label: `[ SOURCE URLS — OPTIONAL ]`. Beneath it is another underline input with a placeholder that reads `https://...`. To the right of this input is nothing — no button yet, because no URL has been entered. Below the URL input is a small link-styled button reading `[ + ADD SOURCE URL ]`, and beneath that a short help paragraph in small muted text: "Providing authoritative URLs produces more accurate results. Without URLs the research uses training knowledge only."

At the bottom of the screen is the primary call-to-action button: a solid filled rectangle with white text reading `[ RESEARCH TOPIC → ]`. The button is slightly transparent right now, because the topic field is empty and the wizard requires a non-empty topic before it allows the research call to fire.

---

## Step 1: Topic Entry

### Entering the Topic

Click inside the topic input — or simply start typing, since the field is auto-focused when the page loads.

Type:

```
Jobs-to-Be-Done framework for product management
```

As you type, the `[ RESEARCH TOPIC → ]` button becomes fully opaque, indicating that the minimum requirement (a non-empty topic) has been satisfied. The topic input renders your text at 22px in a semibold weight, larger than normal body text, because it is the primary input on this screen — the thing that drives everything that follows.

There is no character counter visible for the topic field. The topic is a free-text description of what you want the skill to cover; the research engine interprets it, so exact phrasing matters less than being specific. "Jobs-to-Be-Done" is specific and unambiguous. "Product management stuff" is too vague and would produce a broad, unfocused result.

### Adding Source URLs

You will now add two source URLs. These are the authoritative references the research engine fetches and reads. Providing real URLs anchors the skill's content to what the methodology actually says, rather than relying on the model's training knowledge alone.

Click inside the `https://...` URL input and type or paste:

```
https://www.christenseninstitute.org/jobs-to-be-done/
```

Press the Enter key, or click the `[ + ADD SOURCE URL ]` button below the input. The URL you entered disappears from the input box and reappears above it as a row in the URL list. Each URL in the list is displayed as its full text on the left side of a horizontal row, with a `[ REMOVE ]` action in small monospace text on the right. The `[ REMOVE ]` link lets you delete the URL if you added it by mistake.

The URL input field is now empty again and ready for a second entry. Click inside it and type or paste:

```
https://jtbd.info/2-what-is-jobs-to-be-done-jtbd-796b82081cca
```

Press Enter or click `[ + ADD SOURCE URL ]` again. This second URL appears as a second row in the URL list, directly below the first. You now have two URL rows visible, and the URL input is again empty.

Your screen now shows:

- Topic field: `Jobs-to-Be-Done framework for product management`
- Two URL rows beneath the `[ SOURCE URLS — OPTIONAL ]` label
- The URL input field, empty and ready for a third URL if needed
- The `[ RESEARCH TOPIC → ]` button, fully opaque and clickable

You do not need to add more URLs. Two authoritative sources give the research engine sufficient material to produce a grounded result.

### What Happens When You Click "Research Topic"

Click `[ RESEARCH TOPIC → ]`.

The moment you click, three things happen simultaneously in the browser:

1. The button text changes from `[ RESEARCH TOPIC → ]` to `[ RESEARCHING... ]`, and the button becomes non-interactive.
2. The topic input and URL inputs become read-only — you cannot change them while the request is in flight.
3. In the background, the browser fires a `POST` request to `/api/research`.

The request body is a JSON object:

```json
{
  "topic": "Jobs-to-Be-Done framework for product management",
  "sourceUrls": [
    "https://www.christenseninstitute.org/jobs-to-be-done/",
    "https://jtbd.info/2-what-is-jobs-to-be-done-jtbd-796b82081cca"
  ]
}
```

The `/api/research` route hands this payload to the Research Engine — a multi-stage pipeline that fetches each URL, extracts its text content, and then sends a structured LLM prompt asking the model to identify all named tools, canvases, matrices, frameworks, and analyses used by the Jobs-to-Be-Done methodology. The LLM responds with a structured `ResearchResult` object. The Research Engine validates this response against a strict schema (using Zod) before returning it.

This call typically takes 15–45 seconds, depending on how long the source pages take to fetch and how quickly the LLM responds. Keep the browser tab open and do not navigate away.

---

## Step 2: Research Results

### The Loading State

While the `/api/research` call is in flight, the page does not navigate away. The wizard remains on Step 1 visually, with the button showing `[ RESEARCHING... ]`. There is no spinning wheel or progress bar in Step 1's content area — the loading feedback comes entirely from the button text. This is by design: the research engine's network activity happens server-side, and there is no streaming or partial result to display before it completes.

When the API call resolves successfully, the wizard automatically advances to Step 2. The step indicator at the top of the page updates: `01 TOPIC` gains a checkmark and shifts to blue, and `02 RESEARCH` becomes the active step (bright, enclosed in its border).

### The Step 2 Screen

Step 2 is the research confirmation screen. Its purpose is to show you what the research engine extracted from your URLs and give you an opportunity to review — and optionally remove — extracted tools before the skill is built.

The screen opens with a two-panel block at the top. The left panel is dark (it uses the site's `sm-display` background color, which is near-white on a dark theme, creating a high-contrast dark panel). Inside the left panel, in very small uppercase monospace text, is the label `[ TOOLS FOUND ]`. Below it, in an extremely large font (roughly 72px, in the `Doto` display typeface which renders like a digital clock), is a two-digit number: the count of tools the research engine extracted. For a JTBD topic with two good source URLs, you will typically see `07` or `08` here. Below the count, in small secondary text: `~NN PROMPTS WILL BE GENERATED`, where `NN` is a computed estimate (number of tools, plus category count, plus 5 for meta prompts).

The right panel, which occupies two-thirds of the block's width, shows the research summary. Above it: `[ RESEARCH SUMMARY ]` in the standard label style. The summary itself is a paragraph of normal-weight, small-to-medium text describing what the research engine learned. For a JTBD research run, the summary will read something like: "Apply the Jobs-to-Be-Done framework to understand customer motivations and make better product decisions. JTBD provides analytical tools for mapping customer progress, identifying switching forces, conducting structured interviews, and visualizing the competitive landscape through jobs and outcomes."

Below the two-panel block is a single instruction line in uppercase monospace: `[ REVIEW EXTRACTED TOOLS — EXPAND DETAILS TO ENABLE CONTINUE ]`. This is both a label and a constraint notice — the Continue button does not activate until you expand at least one tool's detail panel.

### The Tool List

Below the instruction line is the list of extracted tools, each rendered as a card.

Each card is a thin-bordered rectangle sitting on the page's surface color. The card's collapsed state shows a single horizontal row with two regions: on the left, the tool's name in semibold text followed by two bracket-enclosed tags in small uppercase monospace (the tool's category and its artifact type); on the right, a `[ DETAILS ]` action link.

For a JTBD research run with two good sources, you will see cards like these:

**JTBD Interview Script** — `[ INTERVIEW ] [ LIST ]`
A structured question sequence for conducting customer interviews focused on timeline, context, and switching moments.

**Jobs Map** — `[ MAPPING ] [ CANVAS ]`
A visual canvas that organizes functional, social, and emotional dimensions of a customer job across eight universal job steps.

**Four Forces Diagram** — `[ SWITCHING ANALYSIS ] [ ANALYSIS ]`
An analytical framework that maps the four forces influencing whether a customer switches from an existing solution: push forces (dissatisfaction), pull forces (attraction to new solution), anxiety forces (fear of switching), and habit forces (inertia).

**Outcome Statement Template** — `[ OUTCOME ] [ LIST ]`
A structured format for writing outcome statements that follow the form: verb + object of control + contextual clarifier + unit of measure.

**Demand-Side Sales Canvas** — `[ SALES ] [ CANVAS ]`
A canvas adapted from the demand-side sales methodology, mapping the timeline from first thought through successful outcome delivery.

**Customer Journey Map (JTBD lens)** — `[ JOURNEY ] [ FLOWCHART ]`
A timeline of customer progress from struggling moment through solution adoption, annotated with jobs, forces, and emotional states at each stage.

**Competing Solutions Matrix** — `[ COMPETITION ] [ MATRIX ]`
A comparison matrix that evaluates existing and potential solutions against the dimensions of a job-to-be-done.

This list represents the tools most likely extracted from the two URLs you provided. The exact tools depend on which sections the research engine was able to read from each page. The list may include additional tools or slightly different names — that is normal.

### Expanding a Tool's Details

Click `[ DETAILS ]` on the JTBD Interview Script card. The card expands downward, revealing an inner section separated from the header by a thin horizontal border. This expanded section has three parts:

**Description paragraph** — one or two sentences describing the tool precisely, in small secondary-colored text.

**Inputs column** — labeled `[ INPUTS ]` in tiny uppercase monospace. Below it, a list of items prefixed with an em-dash. For the JTBD Interview Script, inputs include: customer name, product being researched, date of purchase or adoption decision, and relevant context about the situation.

**Outputs column** — labeled `[ OUTPUTS ]`. For the JTBD Interview Script, outputs include: first-thought moment narrative, timeline of events, identified push and pull forces, and switching moment quotation.

After expanding at least one tool's details, the `[ CONFIRM RESEARCH → ]` button at the bottom of the screen becomes fully opaque and interactive. The message `[ EXPAND AT LEAST ONE TOOL TO CONTINUE ]` that was displayed next to the button disappears once this condition is satisfied.

You should expand several more tool cards at this point. Read the inputs and outputs for each one. This is the only moment in the wizard where you see exactly what the research engine found. If any extracted tool looks wrong — for example, if it extracted something generic that does not belong to the JTBD methodology — you do not need to remove it at this step; there is no per-tool deselection in Step 2. All extracted tools are included by default. You can refine the tool list in a subsequent session by editing the generated files directly.

### Clicking "Confirm Research"

When you have reviewed the tools, click `[ CONFIRM RESEARCH → ]`.

This click advances the wizard to Step 3. It does not fire an API call — it simply moves the wizard state forward. The research result (the full JSON object returned by `/api/research`) is stored in the wizard's session state (written to `sessionStorage`) and carried forward to all subsequent steps. No LLM call has happened yet for the skill-building phase.

---

## Step 3: Metadata

Step 3 is the shortest step. It allows you to set two catalog properties: the skill's category and its tags.

### The Category Selector

The `[ CATEGORY ]` section shows eight buttons, one for each valid skill category:

`[ DEVELOPMENT ]` `[ DESIGN ]` `[ WRITING ]` `[ RESEARCH ]` `[ PRODUCTIVITY ]` `[ INFRASTRUCTURE ]` `[ AI ]` `[ BUSINESS ]`

Each button has a thin border. The currently active category — which the research engine suggested based on what it found — is shown with a filled white background and dark text. For JTBD, the research engine reliably suggests `business` as the category. The `[ BUSINESS ]` button should already appear selected (filled) when you arrive at this step.

If you wanted to change the category, you would click a different button and the fill would move to your selection. For this tutorial, leave it at `[ BUSINESS ]`.

### The Tags Input

Below the category selector is the `[ TAGS — COMMA SEPARATED ]` field. This is a single text input pre-populated with the tags the research engine suggested. You will see something like:

```
jobs-to-be-done, jtbd, product-management, customer-research, switching-forces
```

These tags power search and filtering in the catalog. They appear on skill cards. You can edit them freely. For this tutorial, the suggested tags are appropriate — leave them as-is.

### Advancing to Step 4

Click `[ PREVIEW SKILL → ]`. This fires a `POST` request to `/api/preview-skill`. The server runs the Skill Builder, creates an in-memory skill directory, validates that it contains `SKILL.md`, and returns the generated files without writing anything to disk.

The button stays disabled while the preview is being generated. If the server cannot create a valid `SKILL.md`, the wizard stays on Step 3 and shows the error instead of advancing to a blank preview.

---

## Step 4: SKILL.md Preview

Step 4 shows you the generated `SKILL.md` file in an editable text area. This is the actual skill instruction file from the in-memory preview directory — the frontmatter and instruction body generated by the Skill Builder. Prompt files are generated later, but the `SKILL.md` content on this screen is real and will be carried forward.

### What the Screen Shows

The label `[ SKILL.MD PREVIEW ]` appears in small uppercase monospace. Below it is a bordered container with a dark surface background. Inside the container, in a fixed-width monospace typeface at a small font size, you see the SKILL.md content formatted as raw text — not rendered as Markdown, but shown as literal characters including the YAML dashes.

The preview will look approximately like this:

```
---
name: jobs-to-be-done-framework-for-product-management
description: "Apply the Jobs-to-Be-Done framework to understand customer
  motivations, map switching forces, and design products around jobs customers
  are trying to get done."
metadata:
  version: "1.0.0"
  category: business
  tags: "jobs-to-be-done, jtbd, product-management, customer-research,
    switching-forces"
---

# Jobs-to-Be-Done Framework for Product Management

Apply this skill when conducting customer discovery, analyzing churn, evaluating
competitive positioning, or designing products around customer progress...
```

The description was synthesized from the research summary. The name was derived from your topic string by lowercasing it and replacing spaces with hyphens. The metadata fields were populated from the category and tags you set in Step 3.

Read the description carefully. If it looks wrong — for example, if it starts with "This skill helps" rather than an imperative verb — edit it directly in the text area. The wizard saves this edited `SKILL.md` in session state, preserves it if you go back and forward, and sends it to the later preview and create requests. The quality score rubric awards 7 points for starting with an imperative verb; the research pipeline attempts to generate compliant descriptions, but occasionally produces a description that starts with a non-imperative phrase.

Click `[ SELECT PROMPTS → ]` to advance to Step 5. No API call fires at this transition.

---

## Step 5: Prompt Options

Step 5 is the prompt engineering selection screen. Here you choose which meta-prompt types to include alongside the tool-specific prompts that the pipeline generates for every extracted tool.

### What Meta Prompts Are

When the wizard builds your skill, it generates two categories of prompt files:

- **Tool prompts** — one prompt file per extracted tool (e.g., a prompt for running the JTBD Interview Script, a prompt for building the Jobs Map). These are always generated; you cannot deselect them here.
- **Meta prompts** — five additional prompt types that apply the entire JTBD methodology at different levels of depth. These are what you configure in Step 5.

### The Selection Interface

The `[ SELECT META PROMPT TYPES ]` section shows five rows, each representing one meta-prompt type. Each row is a selectable button spanning the full content width. By default, all five are selected (indicated by a small filled square on the left side of the row and a bright border around the row). They are:

**Comprehensive Analysis** — marked with a small red or orange dot on the right. The dot color indicates complexity: this prompt type is flagged as `exhaustive`. This is the prompt you use when you want a complete, thorough JTBD analysis of a product decision. It takes the longest to run and produces the most output.

**Quick Assessment** — marked with a blue dot (complexity: `quick`). A rapid scan through the JTBD lens, appropriate when you need a directional answer in a short conversation. Useful for initial screening during discovery.

**Stakeholder Presentation** — marked with a secondary-color dot (complexity: `thorough`). Structures the JTBD analysis as a deliverable suitable for presenting to product leadership or clients — framed as insight and recommendation rather than raw analysis.

**First Principles** — marked with a secondary-color dot (complexity: `thorough`). Starts from the underlying theoretical foundation of JTBD and works forward, useful when challenging assumptions about what job your product is actually solving.

**Competitive Response** — marked with a secondary-color dot (complexity: `thorough`). Applies the JTBD lens specifically to competitive threats, mapping which jobs a new competitor is solving and whether they overlap with your core jobs.

Below the selection rows is a tally line in small uppercase monospace:

```
[ TOTAL PROMPTS: 14 — 7 TOOL + 2 CATEGORY + 5 META ]
```

The tool count (7) comes from the number of tools extracted in Step 2. The category count (2) represents the number of distinct tool categories found across all extracted tools — the pipeline generates one category-level synthesis prompt per category. The meta count (5) reflects the five meta types you have selected.

If you uncheck one meta type, the total drops to 13. For this tutorial, leave all five selected. They add depth to the skill without significantly increasing build time (the tool prompts, not the meta prompts, are the bulk of the LLM calls).

### What Happens When You Click "Preview Directory"

Click `[ PREVIEW DIRECTORY → ]`.

This click fires a `POST` request to `/api/confirm-research`. Unlike the previous step transitions, this one involves substantial LLM work and takes 2–3 minutes. The button text changes to `[ BUILDING... ]` and becomes non-interactive.

The request body contains:

```json
{
  "researchResult": { /* the full ResearchResult from Step 2 */ },
  "metadata": {
    "slug": "jobs-to-be-done-framework-for-product-management",
    "category": "business",
    "tags": ["jobs-to-be-done", "jtbd", "product-management", "customer-research", "switching-forces"],
    "targetAgents": ["claude-code"]
  },
  "selectedToolNames": ["JTBD Interview Script", "Jobs Map", "Four Forces Diagram", ...],
  "selectedMetaTypes": [
    "meta-comprehensive-analysis",
    "meta-quick-assessment",
    "meta-stakeholder-presentation",
    "meta-first-principles-exploration",
    "meta-competitive-response"
  ],
  "skillMdContent": "---\nname: jobs-to-be-done-framework-for-product-management\n..."
}
```

On the server, `/api/confirm-research` runs the Skill Builder and Prompt Engine in parallel. The Skill Builder generates SKILL.md, README.md, and the resource template and sample files. Before validation, the route replaces the generated `SKILL.md` with the reviewed content from Step 4. The Prompt Engine generates all prompt files — one per tool, one per category group, and one per selected meta type. Each prompt file requires an LLM call with the tool's extracted schema (name, inputs, outputs, artifact structure) embedded in the prompt. With seven tools and five meta types, that is roughly twelve LLM calls running in parallel where the provider's rate limits allow.

This is why the step takes 2–3 minutes. The build is server-side; your browser tab simply shows the `[ BUILDING... ]` state and waits for the response.

Do not close the browser tab or navigate away during this time.

---

## Step 6: Directory Confirmation

When `/api/confirm-research` resolves, the wizard automatically advances to Step 6. The step indicator now shows `01 TOPIC`, `02 RESEARCH`, `03 METADATA`, `04 PREVIEW`, and `05 PROMPTS` all with checkmarks in blue. Step `06 CONFIRM` is the active step.

### What the Screen Shows

The label `[ DIRECTORY PREVIEW — NN FILES ]` appears at the top, where `NN` is the total file count in the in-memory skill directory. For a JTBD skill with seven tools and five meta types, you will see something like `[ DIRECTORY PREVIEW — 19 FILES ]`.

Below the label is a scrollable bordered container listing every file that will be written to disk. Each file is shown as a single row containing its relative path, in small-caps monospace text. The container has a maximum height and becomes scrollable if the file list exceeds it.

A representative file list for this skill looks like:

```
SKILL.md
README.md
resources/templates/jtbd-interview-script.md
resources/templates/jobs-map.md
resources/templates/four-forces-diagram.md
resources/templates/outcome-statement-template.md
resources/templates/demand-side-sales-canvas.md
resources/templates/customer-journey-map.md
resources/templates/competing-solutions-matrix.md
resources/samples/jtbd-interview-script-example.md
resources/samples/jobs-map-example.md
resources/samples/four-forces-diagram-example.md
resources/samples/outcome-statement-example.md
resources/samples/demand-side-sales-canvas-example.md
resources/samples/customer-journey-map-example.md
resources/samples/competing-solutions-matrix-example.md
resources/prompts/meta-comprehensive-analysis.md
resources/prompts/meta-quick-assessment.md
resources/prompts/meta-stakeholder-presentation.md
resources/prompts/meta-first-principles-exploration.md
resources/prompts/meta-competitive-response.md
```

The file list is read-only in this view. You cannot expand files to preview their contents in Step 6 — this view is purely a manifest confirming which files will be written. If you want to review or edit the SKILL.md content, use the Back button to return to Step 4. Your Step 4 edits remain in wizard state.

### The Confirm Button

At the bottom of the screen are two buttons. On the left: `[ ← BACK ]`, which returns you to Step 5 without discarding any work. On the right: `[ CREATE SKILL ]`, the final action.

When you click `[ CREATE SKILL ]`, the button text changes to `[ CREATING SKILL... ]` and both buttons become non-interactive. The browser fires a `POST` request to `/api/create-skill` with the same reviewed `SKILL.md` content that was sent to `/api/confirm-research`. The difference is what happens on the server: `/api/create-skill` validates the reviewed directory and then writes files to disk using `atomicWrite` — the files are written to a temporary directory first, then moved atomically to `skills/business/jobs-to-be-done-framework-for-product-management/`. If validation or any part of the write fails, no partial files are left behind.

On success, the browser navigates automatically to the skill's detail page: `http://localhost:3000/skills/business/jobs-to-be-done-framework-for-product-management`.

Click `[ CREATE SKILL ]` now.

---

## After Confirming: What Was Written

The skill detail page loads immediately after the redirect. You are now looking at the catalog entry for your newly created skill. But more importantly, on your local filesystem, the wizard has written a complete directory tree.

Open a terminal and list the files:

```bash
ls -R skills/business/jobs-to-be-done-framework-for-product-management/
```

You will see:

```
skills/business/jobs-to-be-done-framework-for-product-management/
├── SKILL.md
├── README.md
└── resources/
    ├── templates/
    │   ├── jtbd-interview-script.md
    │   ├── jobs-map.md
    │   ├── four-forces-diagram.md
    │   ├── outcome-statement-template.md
    │   ├── demand-side-sales-canvas.md
    │   ├── customer-journey-map.md
    │   └── competing-solutions-matrix.md
    ├── samples/
    │   ├── jtbd-interview-script-example.md
    │   ├── jobs-map-example.md
    │   ├── four-forces-diagram-example.md
    │   ├── outcome-statement-example.md
    │   ├── demand-side-sales-canvas-example.md
    │   ├── customer-journey-map-example.md
    │   └── competing-solutions-matrix-example.md
    └── prompts/
        ├── meta-comprehensive-analysis.md
        ├── meta-quick-assessment.md
        ├── meta-stakeholder-presentation.md
        ├── meta-first-principles-exploration.md
        └── meta-competitive-response.md
```

Here is what each file and directory contains:

### SKILL.md

The primary file. This is the only file an AI agent needs to use this skill. It contains YAML frontmatter with the skill's name, description, metadata (version, category, tags), and the instruction body. The body describes when to invoke the skill, which JTBD tools to use for different types of questions, how to sequence the analysis, and what outputs to produce. When you deploy this skill to Claude Code, Claude reads SKILL.md at session start and uses its description to decide when the skill applies.

### README.md

A human-readable overview of the skill. Contains a summary of what the skill does, the list of tools it covers, instructions for deploying it, and notes on when to use it. This file is for you and your teammates — the AI agent never reads it. The quality score rubric awards 5 points for the presence of README.md; a skill without one cannot score above 95.

### resources/templates/

One file per extracted JTBD tool. Each template file is a blank version of the tool's artifact — the markdown table or canvas structure with all column headers and row labels in place but cells empty. When you invoke the skill and Claude runs, for example, the Jobs Map, it fills in a copy of this template. Having pre-structured templates ensures the output is consistently formatted and follows the artifact structure the methodology specifies.

### resources/samples/

One completed example per tool. Each sample shows what a filled-in version of the artifact looks like for a realistic scenario. The research pipeline generates these samples using the tool's schema and a generic example context. Samples serve two purposes: they help you understand what to expect from each tool, and they help the AI understand the expected output format by example. The quality score rubric awards 7 points for having at least one sample; you have seven.

### resources/prompts/

One file per selected meta prompt type. Each prompt file is a standalone instruction set for applying the entire JTBD methodology at a specific level of depth. The `meta-comprehensive-analysis.md` prompt, for example, tells the AI to run every JTBD tool in sequence, synthesize the findings into a jobs hierarchy, and produce a final recommendation with confidence levels. The `meta-quick-assessment.md` prompt tells the AI to identify the single most important job and map the most significant switching forces in under five minutes of work. These prompts are what you use when you want the AI to do a full JTBD engagement rather than just invoking one tool.

---

## Reading the Quality Score

On the skill detail page, you will see a quality score displayed prominently — a number between 0 and 100, likely in the range of 82 to 90 for a JTBD skill built with two source URLs and all five meta types selected.

The score is computed across five dimensions. Here is what each dimension means for this specific skill:

### Dimension 1: Description Quality (25 points)

The rubric checks four things about the description field in SKILL.md:

- **Starts with an imperative verb** (7 pts): The pipeline generates descriptions that begin with "Apply" or "Run" or "Analyze." If the generated description starts with "Apply the Jobs-to-Be-Done framework..." you earn all 7 points. If it starts with "This skill helps you..." you lose 7 points. Check your description and rewrite the first word if needed.
- **Under 150 characters** (6 pts): A description over 150 characters is silently truncated by many agents when their skill budget fills. The pipeline targets descriptions under this limit.
- **Trigger phrase in first 80 characters** (7 pts): The skill name words — "jobs," "to," "be," "done" — should appear in the first 80 characters of the description so the agent's skill-matching logic can identify this skill from a partial read.
- **Specific, not generic** (5 pts): "Apply the Jobs-to-Be-Done framework to understand customer motivations and map switching forces" is specific. "Help with product management" is not.

### Dimension 2: Completeness (25 points)

Four criteria, all binary (present or absent):

- **README.md present** (5 pts): You have it.
- **At least one template** (7 pts): You have seven.
- **At least one sample** (7 pts): You have seven.
- **At least one prompt** (6 pts): You have five meta prompts plus the tool prompts.

A skill built through the full wizard pipeline almost always earns all 25 completeness points.

### Dimension 3: Frontmatter Health (20 points)

- **All required fields present** (8 pts): name, description, metadata.category, metadata.tags, metadata.version, metadata.author. The pipeline fills all of these; the author field defaults to the system's configured GitHub username or "anonymous" if not configured.
- **Valid category** (4 pts): `business` is a valid taxonomy value.
- **Tag count between 2 and 6** (4 pts): Five tags is in range.
- **Directory name matches name field** (4 pts): The pipeline derives both from the same slug, so they always match.

### Dimension 4: Resource Richness (20 points)

The rubric counts all files in templates/, samples/, prompts/, and scripts/ combined. For this skill: 7 templates + 7 samples + 5 prompts = 19 resource files. The rubric awards full marks (20 points) for 15 or more files. You exceed that threshold.

### Dimension 5: Link Health (10 points)

If your SKILL.md frontmatter includes a `linked-skills` field pointing to other skills, each link is checked. A missing linked skill causes a proportional deduction. The pipeline does not automatically add linked-skills entries, so unless you added them manually, this field is absent. An absent linked-skills field earns the full 10 points (there are no broken links to penalize).

### Interpreting the Total

A score of 82–90 means the skill is in the "Good skill, minor improvements possible" range. It is usable and deployable immediately. The most common reason a pipeline-generated JTBD skill falls short of 90 is a description that does not start with a strong imperative verb. If your score shows a deduction for description quality, open SKILL.md in a text editor and change the first word of the description to "Apply" — then run `bash scripts/validate-skill.sh skills/business/jobs-to-be-done-framework-for-product-management` to confirm the fix.

---

## Deploying the Skill

The skill exists in the `skills/` directory of the SkillMall repository. To use it in Claude Code, you need to copy it to Claude Code's skills directory.

### Using the CLI

The recommended method is the `npx skill-mall deploy` command:

```bash
npx skill-mall deploy business/jobs-to-be-done-framework-for-product-management
```

This command copies the skill directory to `~/.claude/skills/`. After it completes, you will see a confirmation message:

```
Deployed to Claude Code: ~/.claude/skills/jobs-to-be-done-framework-for-product-management
```

To deploy to all agents installed on your machine at once, add the `--all-agents` flag:

```bash
npx skill-mall deploy business/jobs-to-be-done-framework-for-product-management --all-agents
```

The deploy command detects which agent directories exist on your system and copies to each one.

### Using the Deploy Button in the Web UI

On the skill detail page at `http://localhost:3000/skills/business/jobs-to-be-done-framework-for-product-management`, you will see a `[ DEPLOY ]` button in the skill's action panel (typically in the right sidebar or below the quality score). Clicking it opens a small agent selector that lists detected agents. Check the agents you want to deploy to and click confirm. The web UI calls the same deploy logic as the CLI.

### Verifying the Deployment

After deploying, confirm the files are in place:

```bash
ls ~/.claude/skills/jobs-to-be-done-framework-for-product-management/
```

You should see SKILL.md, README.md, and the resources/ directory.

---

## Invoking the Skill in Claude Code

Start a new Claude Code session. Skills are loaded at session start — an existing session will not pick up a newly deployed skill until you start a fresh one.

### Explicit Invocation

Type the following in the Claude Code chat input:

```
/jobs-to-be-done-framework-for-product-management
```

Claude will immediately engage the skill. It will acknowledge the invocation and ask you to describe the product decision or customer research question you want to analyze through the JTBD lens. From there, it will guide you through the relevant tools — asking what context you have, what forces you are aware of, and producing structured outputs in the format specified by the templates.

### Implicit Invocation

You do not always need to type the skill name explicitly. Claude reads all deployed skills at session start and matches them against your messages. Messages like these will trigger the JTBD skill automatically:

- "Why are our users churning after the first week?"
- "I need to understand what job our product is solving for enterprise customers."
- "Help me design a customer interview for our upcoming discovery sprint."
- "We're losing deals to a new competitor — help me understand what job they're solving that we aren't."

Claude's skill-matching is based on the `description` field of SKILL.md. If your description is well-formed — starts with an imperative verb, names the domain clearly, includes the key trigger phrases in the first 80 characters — the skill will match reliably for JTBD-relevant questions.

### What Claude Does After Invocation

Once the skill is invoked (explicitly or implicitly), Claude uses the SKILL.md instructions to guide its behavior for the remainder of that sub-task. It does not just mention the JTBD framework — it follows the structured procedure defined in the skill body. For a comprehensive analysis, it will:

1. Ask for the product, customer segment, and the situation you are analyzing
2. Walk through the first-thought moment, timeline of events, and switching moment using the JTBD Interview Script template
3. Map the four forces (push, pull, anxiety, habit) using the Four Forces Diagram template
4. Identify the functional, social, and emotional dimensions of the job using the Jobs Map canvas
5. Write formal outcome statements using the Outcome Statement Template format
6. Produce a synthesis: the job statement, the most significant forces, the competing solutions, and a recommendation

Each output is formatted consistently, because the templates define the structure and the samples establish the expected format. The skill does not just describe the JTBD framework — it operationalizes it, step by step, into a guided process that Claude executes on your behalf.

---

## Summary of API Calls

The wizard fires API calls at two points in the six-step sequence. Here is a complete reference:

| Transition | Endpoint | What fires it | What it does |
|---|---|---|---|
| Step 1 → Step 2 | `POST /api/research` | Clicking `[ RESEARCH TOPIC → ]` | Fetches source URLs, extracts tools with LLM, returns ResearchResult JSON |
| Step 5 → Step 6 | `POST /api/confirm-research` | Clicking `[ PREVIEW DIRECTORY → ]` | Runs Skill Builder + Prompt Engine, returns in-memory file tree (no disk write) |
| Step 6 confirm | `POST /api/create-skill` | Clicking `[ CREATE SKILL ]` | Repeats Skill Builder + Prompt Engine, atomically writes all files to disk |

Steps 2 → 3, 3 → 4, and 4 → 5 are purely client-side state transitions — no network calls, no loading states.

The reason `/api/confirm-research` and `/api/create-skill` run the same pipeline twice is integrity: the preview in Step 6 is generated fresh by the same code that writes to disk, ensuring what you saw in the preview is exactly what gets written. The first run produces an in-memory representation for review; the second run produces the on-disk files.

---

## Troubleshooting

**"No LLM provider configured" appears instead of the wizard.**
Navigate to `/settings/providers` and configure a provider. This screen appears before Step 1 if the provider check fails at wizard load time.

**The `[ RESEARCH TOPIC → ]` button stays transparent.**
The button is disabled when the topic field is empty. Click inside the topic input and type your topic. The button activates as soon as any non-whitespace character is present.

**The research call returns an error.**
The error message appears below the topic input in small red uppercase text. Common causes: one or both source URLs returned a 404 or a paywalled response, or the LLM provider rate-limited the request. Try replacing the failing URL with a different authoritative source, or remove the URLs entirely to fall back to training-knowledge-only research (this marks the result as `researchUnverified`).

**The `[ CONFIRM RESEARCH → ]` button stays disabled at Step 2.**
Expand the details of at least one tool card. The button activates after the first expansion. This is a deliberate constraint to ensure you review the extraction before building.

**The skill detail page shows a quality score below 70.**
The most common cause for a pipeline-generated skill is a description deduction. Open SKILL.md and check that the description starts with an imperative verb ("Apply", "Run", "Analyze", "Conduct") and is under 150 characters. Fix the description, then re-run `bash scripts/validate-skill.sh` to see the updated score.

**You refreshed the browser mid-wizard.**
The wizard saves its state to `sessionStorage` on every step transition. If you refresh the page, the wizard reloads from the saved state and returns you to the step you were on. If the saved state is corrupted (e.g., from a browser crash mid-JSON-write), the wizard resets to Step 1. In that case, start over from Step 1 — the research call will run again.
