# Prompt Optimization

SkillMall ships three tools for working with prompts: a browsable library of 46 prompt engineering frameworks at `/prompt-library`, a CLI optimizer that audits any prompt across four quality dimensions, and a framework override system embedded in every skill detail page. This guide covers all three.

---

## The Prompt Library at /prompt-library

Navigate to `/prompt-library` in the SkillMall web UI (or `http://localhost:3000/prompt-library` in local development). The page opens with a header showing the count of available frameworks — currently 46 — and a one-line description: "Framework patterns for writing effective AI prompts. Reference when creating or overriding skill prompts."

The frameworks are organized into five groups. Each group has a bracketed label in monospace type showing the category name and the count of frameworks in it:

**[ REASONING ]** — 12 frameworks. The core reasoning patterns: Chain of Thought, Tree of Thoughts, Self-Consistency, and others that structure how a model works through a problem step by step.

**[ CONTEXT ]** — 8 frameworks. Patterns for providing context to the model: Few-Shot, Zero-Shot, Role / Expert Persona, Generated Knowledge, and related techniques.

**[ STRUCTURE ]** — 8 frameworks. Patterns that shape the output format: Structured Output, Task Decomposition, Prompt Chaining, Constrained Generation, and others.

**[ OUTPUT ]** — 6 frameworks. Patterns focused on the artifact being produced: Artifact Production, Expert Prompting, Batch Prompting, and related patterns.

**[ META & OPTIMIZATION ]** — 5 frameworks. Patterns for improving prompts themselves: Self-Critique, Token Efficiency Audit, 9-Dimension Intent Extraction, and Auto-CoT.

Each framework appears as a card in a dense grid. The card shows:

- The framework name in bold
- A one-line description from the `FRAMEWORK_DESCRIPTIONS` map
- A count of how many skills in the current catalog use this framework (e.g., "14 skills →"), linked to a filtered catalog view
- A `[ COPY ]` button in the top-right corner

The copy button copies the framework name to your clipboard with a single click. When the copy succeeds, the button text changes to `[ COPIED ]` for 1.5 seconds, then returns to `[ COPY ]`. This is useful when you want to paste a framework name into a `regen-prompt` CLI call or reference it in a prompt file frontmatter.

There is no text search on this page — the grid is compact enough to scan visually, and the five category groups provide enough structure to navigate without a search box.

---

## The 8 Most Useful Frameworks

### Chain of Thought

Chain of Thought instructs the model to write out its reasoning step by step before producing the final answer. Each intermediate step is explicit in the output, making the reasoning traceable and correctable.

Use Chain of Thought when the task requires sequential logical steps that build on each other. It is well-suited for analysis tasks, diagnostic procedures, and any tool where the path to the conclusion matters as much as the conclusion itself.

**Example — skill prompt using Chain of Thought:**

A "Root Cause Analysis" tool in a debugging skill might use Chain of Thought like this:

```
Analyze the reported bug by working through each layer of the system in sequence.

Step 1 — Reproduce: describe the exact conditions that trigger the failure.
Step 2 — Isolate: identify which component or function is the immediate source of the error.
Step 3 — Trace backward: for each identified component, ask what it depends on and whether that dependency could explain the failure.
Step 4 — Identify root cause: state the earliest point in the chain where the behavior diverged from expected.
Step 5 — Propose fix: describe the change that addresses the root cause, not just the symptom.

Write each step explicitly. Do not skip to a conclusion.
```

The explicit step labels are what makes this Chain of Thought rather than unstructured reasoning. The model writes out each step because the prompt requires it, and each step is visible in the output.

---

### Tree of Thoughts

Tree of Thoughts asks the model to generate multiple distinct approaches to a problem, evaluate each one, and select the strongest before producing a final answer. Where Chain of Thought is a single path, Tree of Thoughts is a branching exploration that prunes weak options.

Use Tree of Thoughts for high-stakes decisions with genuine trade-offs: selecting a technical architecture, choosing a market positioning strategy, evaluating competing hypotheses. It is slower than Chain of Thought because it generates more output, but it surfaces options you might not reach with a linear reasoning approach.

**Example — skill prompt using Tree of Thoughts:**

A "Go-to-Market Strategy" tool in a business strategy skill:

```
Generate three distinct go-to-market approaches for the product described below.

For each approach:
- Name the approach and state its core assumption
- Describe the primary customer segment it targets
- Identify the main risk that could cause it to fail
- Rate feasibility 1–5 given the constraints provided

After generating all three, identify which approach best balances reach and risk given the constraints. Explain why the chosen approach outperforms the alternatives on the specific criteria that matter most for this stage of the business.
```

The "generate three, then evaluate" structure is the defining characteristic. The model cannot skip to the answer — it must explore the option space first.

---

### Structured Output

Structured Output specifies the exact schema the model must conform to. The output format is defined in the prompt itself — a table, a JSON object, a numbered list with specific fields, a markdown template with required headings. The model fills in the structure rather than choosing its own format.

Use Structured Output whenever the tool produces a specific artifact: a strategy canvas, a scoring matrix, an action plan with required columns. It is the right choice for any prompt where the consumer of the output (a person or another system) depends on a consistent format.

**Example — skill prompt using Structured Output:**

A "Competitive Analysis Matrix" tool:

```
Produce a competitive analysis matrix for the company described below.

Output format — use this table exactly:

| Competitor | Market Share | Key Strength | Key Weakness | Threat Level (1–5) |
|---|---|---|---|---|
| [Competitor 1] | | | | |
| [Competitor 2] | | | | |
| [Competitor 3] | | | | |

After the table, write a 2–3 sentence "Strategic Implication" section identifying the highest-priority gap to exploit based on the weaknesses identified.

Do not add columns. Do not add rows beyond the requested competitors. Do not omit the Strategic Implication section.
```

The `Do not add/omit` lines are Constrained Generation layered on top of Structured Output — a common combination for high-precision artifact prompts.

---

### SCAMPER

SCAMPER is a creative problem-solving checklist applied to existing products, processes, or systems. The letters stand for: Substitute, Combine, Adapt, Modify/Magnify, Put to other uses, Eliminate, and Reverse/Rearrange.

Use SCAMPER when you have an existing thing to improve — a product feature, a process, a skill — and need to generate variations you might not reach through direct brainstorming. It is particularly effective in design and product strategy skills where the goal is iteration rather than invention from scratch.

**Example — SCAMPER applied to a product feature:**

If a skill is helping redesign a checkout flow, a SCAMPER prompt would walk through all seven lenses:

- **Substitute:** what component of the checkout could be replaced with something simpler? (Replace the multi-page flow with a single-page form.)
- **Combine:** what two steps could be merged without losing information? (Combine shipping address and billing address into a single form that defaults to matching.)
- **Adapt:** what checkout pattern from a different industry could be adapted here? (Adopt the hotel "confirm before charging" pattern for high-value orders.)
- **Modify:** what could be made larger, smaller, faster, or slower? (Make the security badge larger; reduce the number of form fields.)
- **Put to other uses:** what part of the flow could serve a second purpose? (The order confirmation email doubles as a receipt for expense reporting.)
- **Eliminate:** what could be removed entirely? (Remove the coupon code field from the default view — 80% of users ignore it and it attracts attention to absent discounts.)
- **Reverse:** what would happen if the flow went in the opposite direction? (Show the total cost and delivery date before asking for shipping details.)

---

### Six Thinking Hats

Six Thinking Hats provides a structured perspective-switching protocol. Each "hat" represents a mode of thinking, and the prompt asks the model to wear each hat in sequence before synthesizing a conclusion.

- **White Hat** — facts and data only. What do we know? What information is missing?
- **Red Hat** — emotions and gut reactions. What does this feel like? What is the instinctive response?
- **Black Hat** — caution and critical judgment. What could go wrong? What are the risks and weaknesses?
- **Yellow Hat** — optimism and value. What are the benefits? What is the best-case outcome?
- **Green Hat** — creativity and new ideas. What alternatives exist? What could be done differently?
- **Blue Hat** — process and meta-thinking. What is the goal here? Are we asking the right question?

Use Six Thinking Hats when you need to evaluate a decision from multiple angles before committing, or when you want to surface objections alongside benefits in a structured way. It works well for stakeholder communication, risk assessment, and any situation where one-sided analysis leads to blind spots.

**Example — Six Thinking Hats on a launch decision:**

```
Evaluate the proposed feature launch using the Six Thinking Hats framework.

White Hat — what data do we have? What data do we not have?
Red Hat — what is the gut reaction from customers who previewed it?
Black Hat — what are the three most likely failure modes?
Yellow Hat — if everything goes well, what does success look like in 90 days?
Green Hat — is there an alternative approach we have not considered?
Blue Hat — given all of the above, what is the right decision-making process here?

After completing all six hats, write a one-paragraph synthesis recommending a course of action and identifying the single most important open question to resolve before proceeding.
```

---

### Socratic Method

The Socratic Method drives exploration through questions rather than assertions. Instead of declaring an answer, the prompt asks the model to identify the right questions to ask about a problem — and then follow the reasoning wherever the questions lead.

Use the Socratic Method for skills that help users think through a problem rather than solve it for them. Goal-setting sessions, product strategy explorations, and decision-making frameworks benefit from a Socratic approach because the process of answering good questions often produces better outcomes than receiving a direct answer.

**Example — Socratic Method for a goal-setting session:**

```
Help the user examine their goal using the Socratic Method.

Begin by asking: what is the actual outcome you want, as opposed to the activity you plan to do?

Based on the answer, ask a follow-up question that probes one of these dimensions:
- Is this goal within your control, or does it depend on others' decisions?
- What would it mean if you achieved this goal? What would change?
- What assumption does this goal rest on? Is that assumption true?

Continue asking one focused question at a time. Do not provide solutions or recommendations. Your job is to ask questions that help the user discover the answer themselves.
```

---

### First Principles

First Principles thinking strips a problem back to its fundamental constraints and builds reasoning from there, bypassing inherited assumptions and convention. The prompt asks the model to identify the irreducible facts of a situation and reason forward from those facts, rather than working by analogy to how similar problems have been solved before.

Use First Principles for innovation, architecture decisions, and any situation where conventional solutions are known to be suboptimal but the field has not produced a better alternative.

**Example — First Principles on a pricing model:**

```
Analyze the pricing model question using First Principles reasoning.

Step 1 — List the fundamental constraints: what must be true for this business to exist? (Costs must be covered. Customers must perceive value greater than the price. Pricing must be administrable.)

Step 2 — Identify what we know from first principles, not from industry convention. (SaaS pricing conventions like per-seat exist because of historical billing infrastructure limitations, not because per-seat is the optimal unit of value.)

Step 3 — Reason forward from the constraints. Given these fundamentals, what pricing structures are logically consistent with the constraints? List them without filtering for familiarity.

Step 4 — Evaluate each structure against the constraints. Which ones hold up? Which require assumptions that may not be true?

Do not use analogies to competitors or industry norms as primary evidence. Use them only to illustrate, never to justify.
```

---

### Devil's Advocate

Devil's Advocate asks the model to argue against a position it might otherwise support — to find the strongest possible case against the current plan, the proposed solution, or the accepted conclusion. The goal is not to reach a different answer but to stress-test the current one.

Use Devil's Advocate before committing to a significant decision, before publishing a plan, or any time you want to surface the strongest objections before they surface themselves in production.

**Example — Devil's Advocate on a technical decision:**

```
Argue against the proposed architecture decision as forcefully as possible.

Your job is to find the strongest objections — not to be balanced, not to acknowledge strengths, not to soften criticism. Find the arguments that, if true, would cause this decision to fail catastrophically.

Focus on:
- What assumption does this architecture rely on that might be wrong?
- What happens when usage patterns differ from the assumptions made in design?
- What maintenance burden does this introduce that the team has not accounted for?
- Has this approach failed in comparable systems? Under what conditions?

After presenting the strongest case against the decision, write one paragraph identifying which objection is most worth addressing before proceeding. Do not retract any of the criticisms in that paragraph — acknowledge the strongest objection and state what evidence would resolve it.
```

---

## Complete Prompt Optimizer Session

The `optimize-prompt` command audits any prompt text across four quality dimensions and produces an improved version. You can pass a file or pipe text via stdin.

### The original prompt

A user is building a churn analysis skill. Their current prompt reads:

```
Help me think about why customers might leave our product
```

This is a bad prompt. It is underspecified in every dimension: no task definition, no output format, no context about the product or customer base, no clear deliverable. Let us run it through the optimizer.

### Running the optimizer

```bash
echo "Help me think about why customers might leave our product" | npx skill-mall optimize-prompt --stdin
```

### The audit output

```
Analyzing prompt quality...

── Token Efficiency ────────────────────────────────
  Score: 42 / 100
  Before: 12 tokens  →  After: 47 tokens  (increase)

── Intent Completeness ─────────────────────────────
  Score: 18 / 100
  Present:  task
  Missing:  input, output, constraints, context, audience, memory, success criteria, examples
    input:            Specify what data or product information to analyze
    output:           Define the deliverable — a list? a framework? a scored matrix?
    constraints:      Specify any constraints on scope, time period, or customer segment
    context:          Describe the product, the customer type, and any known data
    audience:         Who will read the output — a PM, an analyst, an exec?
    success criteria: What does a good churn analysis look like for this use case?
    examples:         A completed example would clarify the expected output format

── Output Clarity ──────────────────────────────────
  Score: 15 / 100  [FAIL]
  • No output format specified — the model cannot know whether to produce a list, a table, or prose
  • No deliverable named — "help me think about" does not specify a concrete output
  • No success criteria — the prompt accepts any response as valid

── Trigger Sharpness ───────────────────────────────
  Score: 22 / 100  [FAIL]
  Suggestion: Rewrite the first sentence to start with an imperative verb and name the specific artifact to produce — e.g., "Analyze customer churn risk factors and produce a prioritized list..."

── Optimized Prompt ────────────────────────────────
Analyze the customer churn risk factors for the product described below and produce a prioritized list of the top 5–8 reasons customers are likely to leave, with evidence indicators for each.

Context to provide before running this prompt:
- Product type and primary use case
- Customer segment (SMB, enterprise, consumer)
- Any known churn data or exit survey themes
- Time period to analyze (last quarter, last year)

Output format:

| Rank | Churn Risk Factor | Evidence Indicators | Severity (1–5) |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
...

After the table, write a 2–3 sentence "Most Actionable Finding" identifying the one factor the team has the most control over and describing the intervention most likely to reduce churn related to it.
```

### Reading the four dimensions

**Token Efficiency** measures whether the prompt contains tokens that could be removed without changing the output. A score of 42 indicates significant waste or, in this case, the opposite problem — the prompt is so sparse that the optimizer added tokens to make it usable. The optimizer's job is to reduce unnecessary tokens, but it will always add tokens if the prompt is too vague to produce a useful output. A score below 60 indicates the prompt either has significant redundancy or is too underspecified to evaluate cleanly.

**Intent Completeness** measures how many of the nine intent dimensions are present in the prompt. The nine dimensions are: task, input, output, constraints, context, audience, memory (prior knowledge the model should apply), success criteria, and examples. A score of 18 means only one dimension — task — was present, and even that was vague. The "Missing" list identifies every absent dimension, and the `intentSuggestions` map provides a specific suggestion for each gap.

**Output Clarity** checks whether the prompt names a concrete deliverable, specifies its format, and provides success criteria for evaluating the result. A `[FAIL]` result means the prompt allows any response format, making it impossible to consistently produce the desired artifact.

**Trigger Sharpness** checks whether the first sentence is an imperative instruction that unambiguously describes what the model should do. A `[FAIL]` result means the first sentence is not imperative or is too vague to trigger consistent behavior. The `triggerSuggestion` field provides a specific rewrite suggestion.

### The improved version

The optimized prompt scores approximately 84 across the four dimensions:

- The first sentence is imperative ("Analyze the customer churn risk factors") and names a specific output ("prioritized list of top 5–8 reasons")
- The context section documents what input the model needs before the prompt will produce a useful result
- The output format is specified as a table with named columns
- The "Most Actionable Finding" requirement adds a success criterion — the output must include an actionable recommendation, not just a list

The original was 12 tokens. The optimized version is 120+ tokens. That is not a failure — it is an accurate diagnosis. The original prompt was incomplete, not verbose.

---

## Framework Override: Changing How a Prompt Reasons

Every skill detail page includes a PROMPTS tab. When you click it, the page fetches the list of prompt files from `resources/prompts/` via `GET /api/regen-prompt?category=<cat>&slug=<slug>` and renders them in three groups:

- **[ APPLY A TOOL ]** — tool-specific prompts, one per extracted tool
- **[ SHIFT THE LENS ]** — category prompts, one per tool category
- **[ EXPLORE AN ANGLE ]** — meta prompts (comprehensive analysis, quick assessment, stakeholder presentation, first principles, competitive response, and cross-category synthesis)

Each prompt card shows the tool name, the current framework badge (e.g., `Structured Output`), the complexity level (`quick`, `thorough`, or `exhaustive`), and a "when to use" sentence.

### Using the framework override

The instruction at the top of the PROMPTS tab reads:

> Click a framework badge to regenerate the prompt with a different reasoning approach. Original framework is always preserved.

When you click the framework badge on a prompt card — say, the `Structured Output` badge on the OKR Template prompt — a framework picker opens. The picker shows the same 46 frameworks from the Prompt Library, filtered to those that make sense for this artifact type. For a `grid` artifact, the candidates are: Structured Output, Artifact Production, Constrained Generation, Batch Prompting, and any domain-specific additions the Prompt Engine added based on the topic.

Select a framework — for example, `Chain of Thought` — and click confirm. The UI shows a spinner while the server regenerates the prompt. Under the hood, this sends:

```
POST /api/regen-prompt
{
  "category": "productivity",
  "slug": "okr-framework",
  "promptFile": "tool-okr-template.md",
  "framework": "Chain of Thought"
}
```

The server reads the prompt file, extracts the tool's structure and context, and asks the LLM to rewrite the prompt body using Chain of Thought as the reasoning approach while preserving the artifact format and output requirements. The rewritten prompt is written back to disk, updating the `framework` field in the frontmatter. The `original_framework` field is never overwritten — it always records what the Prompt Engine selected during generation.

After the regeneration, the prompt card updates to show `Chain of Thought` as the current framework. The prompt body in the file now uses explicit step-by-step reasoning to guide the model through producing the OKR Template, rather than the direct schema-conformance approach of Structured Output.

### When to override and when not to

**Override when:** the default framework produces technically correct output but the reasoning is too mechanical. If Structured Output makes your agent fill in an OKR template correctly but without any judgment about what makes a good objective, switching to Chain of Thought adds an explicit reasoning layer where the agent thinks through why each element of the OKR is well-formed before writing it.

**Override when:** you want to compare how different frameworks handle the same tool. Generate the prompt with Tree of Thoughts to see how multi-path exploration changes the agent's approach to writing OKRs compared to the direct Structured Output version.

**Do not override when:** the original framework is already producing high-quality, consistent output. Framework override is a tool for experimentation and improvement, not a required step after generation.

### CLI equivalent

If you prefer working in the terminal, the `regen-prompt` command provides the same capability:

```bash
npx skill-mall regen-prompt okr-framework tool-okr-template.md --framework "Chain of Thought"
```

This reads `skills/productivity/okr-framework/resources/prompts/tool-okr-template.md`, rewrites the body using Chain of Thought, and updates the `framework` field in the frontmatter — identical to what the web UI does via the API route.

---

## Writing Effective Skill Descriptions

The `description` field in `SKILL.md` is the most influential field for controlling when a skill activates. It is what your agent reads when deciding whether to invoke the skill for a given user message. Everything about how you write it is a prompting decision.

### What makes a trigger sharp

The Prompt Optimizer's "Trigger Sharpness" dimension applies directly to skill descriptions. A sharp trigger has four properties:

**It starts with an imperative verb.** Agents scan for action instructions, not noun-first descriptions. "Apply the OKR framework" fires more reliably than "An OKR framework skill" because the imperative verb pattern matches how an agent expects to receive instructions. The quality score rubric awards 7 points for this criterion. Valid imperative verbs include: Apply, Run, Analyze, Use, Execute, Generate, Create, Build, Perform, Conduct, Evaluate, Assess, Produce, Identify, Extract, Implement, Write, Review, Plan.

**The trigger phrase appears in the first 80 characters.** Claude Code and other agents implement context budgets for skill listings. When many skills are installed, descriptions are truncated. If the phrase that distinguishes your skill — "OKR framework," "incident postmortem," "blameless retrospective" — appears after character 80, agents operating under a tight budget may never see it. The quality rubric awards 7 points for this criterion. Put the most distinctive noun phrase in the first 80 characters.

**It names something specific.** "Apply the OKR framework to set quarterly goals and score key results" is more specific than "Help with goal setting." Specificity prevents false positives (the skill activating for unrelated goal-setting requests) and false negatives (the skill not activating when the user is clearly doing OKR work). Generic verbs like "help," "assist," and "provide" indicate a description that needs to be rewritten.

**It stays under 150 characters.** Descriptions over 150 characters are silently truncated in agent skill listings. A description that is cut off mid-sentence can be worse than a shorter description that completes correctly. The full AgentSkills spec allows up to 1024 characters, but 150 is the practical limit for universal compatibility across all agents.

### A concrete progression

Here is the same description at three levels of quality:

**Weak (fails all four criteria):**
```
This skill helps with goal setting and OKR management. Use it when you need assistance setting objectives, tracking key results, running quarterly reviews, or understanding how to score OKRs properly.
```
- Does not start with an imperative verb
- First 80 characters do not contain the trigger phrase "OKR"
- Generic ("helps with," "assists")
- 194 characters, will be truncated

**Better (passes two criteria):**
```
Apply OKR methodology to set quarterly goals and track progress. Helps with objective writing, KR scoring, and quarterly reviews.
```
- Starts with "Apply" (imperative verb — good)
- "OKR" appears at character 7 (trigger phrase in first 80 characters — good)
- Specific enough ("objective writing, KR scoring")
- 129 characters — within budget
- Still uses "Helps with" in the second sentence — passive construction weakens trigger

**Good (passes all four criteria):**
```
Apply the OKR framework to set ambitious objectives, score key results 0.0–1.0, and run quarterly review cycles.
```
- Starts with "Apply" (imperative)
- "OKR framework" appears at character 11 (well within first 80)
- Specific: names the exact operations (score key results 0.0–1.0, quarterly review cycles)
- 113 characters — comfortably within budget

The third version passes all four trigger-sharpness criteria and scores at or near full marks on the Description Quality dimension of the quality rubric.

### Testing your description with the budget analyzer

The skill detail page includes a BUDGET ANALYSIS tab that simulates how much of your description an agent sees at different context budget sizes. Set the slider to the number of characters your agent allocates to skill listings and see exactly where the truncation happens. If your trigger phrase is in the truncated region, rewrite the description to front-load the distinctive term.

The `optimize-prompt --stdin` command can also audit a description draft:

```bash
echo "Apply the OKR framework to set ambitious objectives, score key results 0.0–1.0, and run quarterly review cycles." | npx skill-mall optimize-prompt --stdin
```

A well-written skill description will score above 80 on all four dimensions. If trigger sharpness comes back as `[FAIL]`, the optimizer's `triggerSuggestion` field will tell you exactly what to rewrite.
