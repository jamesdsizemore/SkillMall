# ResearchResult Schema

The `ResearchResult` is the output of the Research Engine (Stage 2). It is the shared input to both the Skill Builder (Stage 3) and Prompt Engine (Stage 4).

## TypeScript Types

```typescript
interface ResearchResult {
  topic: string
  sources: string[]           // URLs that were successfully fetched
  summary: string             // 2-3 sentences; first sentence used verbatim in SKILL.md description
  tools: ResearchTool[]
  principles: string[]        // Core tenets of the methodology
  suggestedCategory: 'development' | 'design' | 'writing' | 'research' | 'productivity' | 'infrastructure' | 'ai' | 'business'
  suggestedTags: string[]     // 3-6 tags, lowercase-hyphenated
  researchUnverified?: boolean  // true when no source URLs were provided
  partialSources?: boolean      // true when some URLs failed to fetch
}

interface ResearchTool {
  name: string                // canonical name of the tool
  category: string            // logical group within this domain (e.g. "Strategy", "Leadership")
  description: string         // 1-2 sentences, precise
  artifactType: 'matrix' | 'canvas' | 'grid' | 'list' | 'flowchart' | 'analysis'
  artifactStructure: string   // blank template as markdown; embedded inline in prompts
  inputs: string[]            // data or context the tool requires
  outputs: string[]           // named deliverables the tool produces
  howUsed: string             // 2-5 step procedure
}
```

## Zod Schema

The Research Engine validates all LLM output against `ResearchResultSchema` from `lib/validators.ts`:

```typescript
ResearchResultSchema = z.object({
  topic: z.string().min(1),
  sources: z.array(z.string()),
  summary: z.string().min(50).max(1024),
  tools: z.array(ResearchToolSchema).min(1),
  principles: z.array(z.string()),
  suggestedCategory: z.enum([...]),
  suggestedTags: z.array(z.string()).min(1).max(8),
  researchUnverified: z.boolean().optional(),
  partialSources: z.boolean().optional(),
})

ResearchToolSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  artifactType: z.enum(['matrix', 'canvas', 'grid', 'list', 'flowchart', 'analysis']),
  artifactStructure: z.string().min(20).max(3000),
  inputs: z.array(z.string().min(1)).min(1).max(10),
  outputs: z.array(z.string().min(1)).min(1).max(10),
  howUsed: z.string().min(20).max(1000),
})
```

## Example

Blue Ocean Strategy with 3 tools, 2 categories, 4 principles:

```json
{
  "topic": "Blue Ocean Strategy",
  "sources": ["https://blueoceanstrategy.com/tools/"],
  "summary": "Apply Blue Ocean Strategy to identify and create uncontested market spaces. Use analytical tools to shift focus from competing in existing markets to creating new demand.",
  "tools": [
    {
      "name": "Strategy Canvas",
      "category": "Strategy",
      "description": "Visualizes the competitive landscape by charting how companies invest in competing factors.",
      "artifactType": "canvas",
      "artifactStructure": "| Competing Factor | Company A | Company B | Our Proposal |\n|---|---|---|---|",
      "inputs": ["competing factors", "company performance scores"],
      "outputs": ["current-state canvas", "proposed strategic position"],
      "howUsed": "1. List key competing factors. 2. Score each company 1-5. 3. Plot the curves. 4. Design a divergent proposed curve."
    }
  ],
  "principles": [
    "Value innovation — simultaneously pursue differentiation and low cost",
    "Reach beyond existing demand"
  ],
  "suggestedCategory": "business",
  "suggestedTags": ["strategy", "blue-ocean", "business", "competitive-analysis"]
}
```

## artifactType Values

| Value | When to use |
|---|---|
| `matrix` | 2D comparison grids with rows and columns |
| `canvas` | Strategic canvases with scored factors |
| `grid` | Four-quadrant or multi-cell grids (e.g., ERRC, Eisenhower) |
| `list` | Structured lists with required items or formats |
| `flowchart` | Sequential processes or decision trees |
| `analysis` | Free-form analytical outputs with defined sections |

## researchUnverified Flag

When `researchUnverified: true`:
- The Research Engine used training knowledge (no URLs provided)
- The flag propagates to `SKILL.md` frontmatter and body as a warning banner
- Provide source URLs to remove the flag: re-run with `--urls`

## CLI Usage

The `research-result.json` written by `npx skill-mall create` follows this schema exactly and can be reviewed or edited before running `confirm-research`.
