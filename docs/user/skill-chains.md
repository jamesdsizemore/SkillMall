# Skill Chains

A **skill chain** is a multi-skill workflow where two or more skills execute in sequence, each passing context to the next. Chains produce a single deployable SKILL.md that agents can invoke like any other skill — but under the hood, the chain orchestrates the member skills step by step.

## When to use chains

Use a chain when:
- A task requires expertise from multiple domains in sequence (e.g., code-review then stakeholder-communication)
- You want to encode a repeatable workflow that always uses the same skill sequence
- You want to share a workflow with your team as a single deployable unit

## Building a chain with the canvas

Navigate to `/skills/chains/new`. The canvas has two areas:

**Skill sidebar (left):** Every skill in the SkillMall catalog appears in the sidebar. Click any skill to add it as a node to the canvas.

**Canvas (right):** Drag nodes to arrange them. The order of execution is determined by left-to-right position on the canvas — the leftmost node runs first.

### Step 1: Add skills

Click the skills you want to chain in order. Each click adds a node to the canvas. Drag nodes to adjust execution order (leftmost = first to run).

### Step 2: Connect skills

Draw edges by dragging from the right handle of one skill node to the left handle of the next. An edge represents the context that flows between the two skills.

### Step 3: Configure edges

Click any edge to open the edge configuration panel. Here you set:

- **Passes as:** How the output from the source skill reaches the next skill.
  - `context_append` — appends output to the next skill's context (default)
  - `context_replace` — replaces context entirely with the source skill's output
  - `named_variable` — stores output in a named variable accessible to later steps
- **Named variable (optional):** When using `named_variable`, provide the variable name (e.g., `analysis_result`)
- **Instructions (optional):** Additional instruction text passed to the next step along with the context

### Step 4: Name and build

Type a chain name in the input field at the bottom of the canvas. The name becomes the chain's slug (kebab-cased). Click **[ BUILD CHAIN ]** to create the chain.

The chain is created at `skills/chains/<slug>/`. You can then deploy it like any other skill:

```bash
npx skill-mall deploy chains/my-chain-name
```

## The chain.json format

Every chain directory includes a `chain.json` file that describes the chain structure:

```json
{
  "name": "Blue Ocean Analysis Pipeline",
  "slug": "blue-ocean-analysis-pipeline",
  "steps": [
    {
      "order": 1,
      "skillSlug": "ai/skill-creator",
      "passesAs": "context_append"
    },
    {
      "order": 2,
      "skillSlug": "business/blue-ocean-strategy",
      "passesAs": "named_variable",
      "namedVariable": "strategy_analysis",
      "instructions": "Focus on the ERRC grid first."
    }
  ]
}
```

## The chain SKILL.md

The generated SKILL.md uses standard AgentSkills frontmatter with additional chain-specific metadata:

```yaml
---
name: blue-ocean-analysis-pipeline
description: "Run a coordinated Blue Ocean Analysis Pipeline analysis using 2 skills in sequence."
license: MIT
metadata:
  version: "1.0.0"
  chain: true
  chain_steps:
    - skill: ai/skill-creator
      passes_as: context_append
    - skill: business/blue-ocean-strategy
      passes_as: named_variable
      named_variable: strategy_analysis
      instructions: "Focus on the ERRC grid first."
---
```

The `chain: true` field marks this as a chain SKILL.md, distinguishing it from regular skills in the catalog. The `chain_steps` block is the machine-readable execution order — agents that support chain execution use this to orchestrate the workflow.

## Chain validation

When you click Build Chain, the canvas validates the chain SKILL.md against the AgentSkills spec before writing to disk. A chain must:
- Have at least 2 steps
- Have a valid slug (kebab-case, ≤ 64 chars)
- Have a description ≤ 150 characters
- Have a valid `chain: true` metadata field

The API returns a 422 error with a specific validation message if any check fails.

## Listing and viewing chains

- `GET /api/chains` — returns all chains in `skills/chains/`
- `GET /api/chains/<slug>` — returns the chain.json for one chain

## Related

- [chain-format reference](../reference/chain-format.md) — full chain.json + chain SKILL.md spec
- [Deploying skills](../user/getting-started.md) — how to deploy chains to agents
