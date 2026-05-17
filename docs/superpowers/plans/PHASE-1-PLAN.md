# Phase 1 Plan — Core System

**STOP. Read this entire document before touching a single file.**

This document is self-contained. Every implementation decision is made here. Every TypeScript type, Zod schema, LLM prompt template, algorithm, and file structure is embedded directly. You do not need to read any other document to execute this plan. If something seems underspecified, re-read this document before looking elsewhere. If it is genuinely missing, stop and surface the gap — do not invent.

---

## Goal

Build the complete SkillMall core system: a Next.js web application with a multi-provider LLM pipeline that generates production-quality AI agent skills from URLs or plain-language descriptions, plus a CLI that uses the same pipeline, quality tooling, and full documentation.

## Outcome

A user can:
1. Configure their LLM provider (OpenAI, Claude Code CLI, Gemini, Groq, or Ollama) via UI settings or CLI
2. Create a skill via the 6-step browser wizard: input topic + URLs → review extracted tools → set metadata → preview SKILL.md → choose prompt types → confirm and write
3. Create a skill via CLI: `npx skill-mall create "topic" --urls https://... --category business` → review `research-result.json` → `npx skill-mall confirm-research <slug>` → skill written to `skills/`
4. Browse the skill catalog at `localhost:3000` with quality scores on every card
5. Optimize any prompt at `/optimize`
6. Browse the prompt engineering framework library at `/prompt-library`

## Completion Proof

Every item below must be true before Phase 1 is marked complete:

- `npm run build` exits 0 with zero errors or warnings
- `npm test` exits 0 (all Vitest tests pass)
- `npx tsc --noEmit` exits 0 (zero TypeScript errors)
- App runs at `localhost:3000`: homepage renders with Doto counter animations, wizard completes all 6 steps, skill detail page renders with quality score
- One skill created end-to-end via browser wizard (including LLM research call)
- One skill created end-to-end via CLI (`create` + `confirm-research`)
- James explicitly approves the UI at T006 (UI approval gate)
- All Phase 1 documentation files listed in T017 exist and contain production-quality content (not stubs)
- `bash scripts/validate-skill.sh --strict skills/ai/skill-creator` exits 0

## Likely Misfire

- Building the pipeline before James approves the UI. If the UI is rejected, pipeline work built on a rejected UI is wasted.
- Treating the spec description as implementation guidance. The spec says what to build. This plan says how. Build from this plan.
- Making implementation decisions not specified here. Every decision is already made. Make no new ones.
- Implementing Phase 2 features (ratings, collections, multi-agent deploy, MCP server, skills.sh publishing).

## Non-Goals

Phase 1 ships none of the following. If any of these appear in Phase 1 code, remove them:
- Supabase backend or any database
- Ratings, reviews, trending, analytics
- Multi-agent deploy (single-agent only in UI)
- skills.sh publishing
- MCP server
- Codebase-to-Skill Extractor
- Skill testing framework
- Skill chains, RAG, marketplace

---

## Development Workflow

**Every Worker task follows this 16-step loop. No exceptions. No skipped steps.**

**Step 1 — Read**
Read the task's Implementation section in this document completely before writing any code. If anything is unclear, re-read it. Do not begin until you fully understand what the implementation must do and what the interfaces look like.

**Step 2 — Map dependencies**
Identify which parts of the task are parallel (disjoint write scopes) and which are serial. Dispatch subagents only for work with provably disjoint allowed_files.

**Step 3 — Establish contracts**
If this task defines TypeScript types or Zod schemas that other tasks depend on, write and export those first. Run `npx tsc --noEmit` on just the types file before writing any implementation.

**Step 4 — Dispatch parallel subagents**
For each parallel unit of work: give the subagent the Implementation section for their scope, the allowed_files, the interface contracts, and the acceptance criteria. Nothing else.

**Step 5 — Write tests first**
Write Vitest tests before or alongside implementation. Tests must cover: happy path, all failure cases for external calls, boundary conditions. A test that only covers the happy path is not complete.

**Step 6 — TypeScript check (NEVER SKIP)**
`npx tsc --noEmit` — must exit 0 before proceeding.

**Step 7 — Lint (NEVER SKIP)**
`npm run lint` — must exit 0 before proceeding.

**Step 8 — Build (NEVER SKIP)**
`npm run build` — must succeed before proceeding.

**Step 9 — First code review (NEVER SKIP)**
Use the code-reviewer subagent. Review: correctness, error handling, security, type safety, project pattern adherence. Record all issues.

**Step 10 — Fix all issues**
Fix every issue from Step 9 without rationalization. Every finding gets fixed.

**Step 11 — Second code review (NEVER SKIP)**
Confirm all Step 9 issues resolved. If new issues found, fix and review again.

**Step 12 — Smoke test**
`npm run dev`, open `localhost:3000`, verify the feature works end-to-end in the browser. CLI tasks: run the command, verify output. Tests passing does not replace this step.

**Step 13 — Security check (mandatory for these task types)**
Required for: any task touching file I/O, LLM calls, user-supplied input, API keys, or external services. Check: path traversal, command injection, API key exposure in logs, prompt injection via user input, unsafe deserialization.

**Step 14 — Update docs**
Update JSDoc on any changed public function. If an API route changed, the API reference in T017 must be updated before this task's receipt is written.

**Step 15 — Final review**
Check this task's Verify conditions one by one. Every condition must pass.

**Step 16 — Commit and push**
```bash
git add <specific files by name, never -A>
git commit -m "$(cat <<'EOF'
feat: <what changed and why in one line>
EOF
)"
git push
```

---

## Stack and Architecture

**Framework:** Next.js 15 with App Router  
**Language:** TypeScript, strict mode (`"strict": true` in tsconfig.json)  
**Styling:** Tailwind CSS v3 + CSS custom properties for Nothing design tokens  
**LLM:** Multi-provider abstraction — user supplies their own key  
**HTML parsing:** cheerio  
**Validation:** zod v3  
**Testing:** Vitest + React Testing Library  
**CLI:** commander.js (existing)

**Directory structure (Phase 1 additions — do not create directories not listed here):**
```
lib/
  providers/
    types.ts
    defaults.ts
    openai.ts
    claude-code.ts
    gemini.ts
    groq.ts
    ollama.ts
    index.ts
    __tests__/
  research-engine.ts
  skill-builder.ts
  prompt-engine.ts
  pe-frameworks.ts
  prompt-optimizer.ts
  pipeline.ts
  quality-score.ts
  validators.ts
  design-tokens.ts
  __tests__/
    research-engine.test.ts
    skill-builder.test.ts
    prompt-engine.test.ts
    prompt-optimizer.test.ts
    pipeline.test.ts
    quality-score.test.ts
    mocks/
      mock-llm-client.ts
      mock-fetch.ts
    fixtures/
      research-result-blue-ocean.json
      research-result-no-urls.json
      framework-selection-response.json
      prompt-audit-response.json
      skill-directory-blue-ocean.json

app/
  api/
    providers/
      route.ts
      configure/
        route.ts
    research/
      route.ts
    confirm-research/
      route.ts
    create-skill/
      route.ts
    optimize-prompt/
      route.ts
  skills/
    create/
      page.tsx
  settings/
    providers/
      page.tsx
  optimize/
    page.tsx
  prompt-library/
    page.tsx

components/
  skill-mall/
    wizard/
      WizardContext.tsx
      useWizard.ts
      Step1Topic.tsx
      Step2Research.tsx
      Step3Metadata.tsx
      Step4Preview.tsx
      Step5PromptOptions.tsx
      Step6Confirm.tsx
      __tests__/
        wizard-state.test.ts
    optimizer/
      PromptInput.tsx
      AuditResults.tsx
      WordDiff.tsx
    quality-badge.tsx
    fork-button.tsx
    version-history/

cli/
  src/
    commands/
      create.ts
      configure.ts
      confirm-research.ts
      validate.ts (update)
      new.ts (update)
    utils.ts (update)

docs/
  user/
    configuring-providers.md
    using-the-wizard.md
    using-the-cli.md
  reference/
    pipeline-architecture.md
    provider-catalog.md
    research-result-schema.md
    prompt-file-format.md
    quality-score-rubric.md
    api-routes.md
```

**UI and CLI both import from `lib/` directly.** API routes call lib/ functions. The CLI calls lib/ functions directly (no HTTP). This is how the same pipeline serves both interfaces.

---

## All Shared TypeScript Types

Every type used across modules is defined here. Workers must use these exact definitions — do not add, remove, or rename fields without updating every downstream module.

### Provider Types (`lib/providers/types.ts`)

```typescript
export type ProviderID = 'openai' | 'claude-code' | 'gemini' | 'groq' | 'ollama'

export interface ProviderConfig {
  provider: ProviderID
  apiKey?: string        // undefined for claude-code and ollama
  model: string
  baseURL?: string       // for groq and ollama overrides
}

export interface CompletionOptions {
  maxTokens?: number
  temperature?: number
  responseFormat?: 'text' | 'json_object'
  systemPrompt?: string
  timeoutMs?: number
}

export interface LLMClient {
  complete(prompt: string, options?: CompletionOptions): Promise<string>
  readonly provider: ProviderID
}
```

### Research Types (`lib/validators.ts` — exported from here)

```typescript
export interface ResearchTool {
  name: string
  category: string
  description: string
  artifactType: 'matrix' | 'canvas' | 'grid' | 'list' | 'flowchart' | 'analysis'
  artifactStructure: string
  inputs: string[]
  outputs: string[]
  howUsed: string
}

export interface ResearchResult {
  topic: string
  sources: string[]
  summary: string
  tools: ResearchTool[]
  principles: string[]
  suggestedCategory: 'development' | 'design' | 'writing' | 'research' | 'productivity' | 'infrastructure' | 'ai' | 'business'
  suggestedTags: string[]
  researchUnverified?: boolean
  partialSources?: boolean
}
```

### Skill Builder Types (`lib/skill-builder.ts`)

```typescript
export interface InMemoryFile {
  path: string      // relative to skill root, e.g. "resources/templates/strategy-canvas.md"
  content: string
}

export interface InMemorySkillDirectory {
  slug: string
  category: string
  files: InMemoryFile[]
}

export interface SkillMetadata {
  slug: string
  title?: string
  author?: string
  category: string
  tags: string[]
  targetAgents: string[]
}
```

### Prompt Types (`lib/prompt-engine.ts`)

```typescript
export type ArtifactType = 'matrix' | 'canvas' | 'grid' | 'list' | 'flowchart' | 'analysis'

export interface GeneratedPrompt extends InMemoryFile {
  framework: string[]
  complexity: 'quick' | 'thorough' | 'exhaustive'
  promptType: 'tool-specific' | 'category' | 'meta'
}
```

### Optimizer Types (`lib/prompt-optimizer.ts`)

```typescript
export interface PromptAudit {
  tokenCountBefore: number
  tokenCountAfter: number
  tokenReductionPercent: number
  tokenEfficiencyScore: number        // 0-100
  intentDimensionsPresent: string[]
  intentDimensionsMissing: string[]
  intentSuggestions: Record<string, string>
  intentCompletenessScore: number     // 0-100
  outputClarityScore: number          // 0-100
  outputClarityIssues: string[]
  outputClarityPasses: boolean
  triggerSharpnessScore: number       // 0-100
  triggerSharpnessPasses: boolean
  triggerSuggestion: string | null
  optimizedPrompt: string
  optimizationFailed?: boolean        // true when LLM call failed; unoptimized prompt used
}
```

### Pipeline Types (`lib/pipeline.ts`)

```typescript
export interface PipelineInput {
  topic: string
  sourceUrls: string[]
  metadata: SkillMetadata
  selectedToolNames?: string[]
  selectedMetaTypes?: string[]
  writeToDisk?: boolean
  outputBasePath?: string
}

export interface ValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string; value?: string }>
  warnings: Array<{ field: string; message: string }>
}

export interface WriteResult {
  success: boolean
  path: string
  fileCount: number
}

export type PipelineStage =
  | { stage: 'awaiting-confirmation'; researchResult: ResearchResult }
  | { stage: 'complete'; result: CompletePipelineResult }

export interface CompletePipelineResult {
  researchResult: ResearchResult
  skillDirectory: InMemorySkillDirectory
  validation: ValidationResult
  writeResult?: WriteResult
}
```

### Wizard State Types (`components/skill-mall/wizard/WizardContext.tsx`)

```typescript
export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6
  topic: string
  sourceUrls: string[]
  researchResult: ResearchResult | null
  selectedToolNames: string[]
  category: string
  tags: string[]
  targetAgents: string[]
  selectedMetaTypes: string[]
  skillMdPreview: string | null
  previewDirectory: InMemorySkillDirectory | null
  isLoading: boolean
  error: string | null
}

export type WizardAction =
  | { type: 'SET_TOPIC'; topic: string }
  | { type: 'ADD_URL'; url: string }
  | { type: 'REMOVE_URL'; index: number }
  | { type: 'SET_RESEARCH_RESULT'; result: ResearchResult }
  | { type: 'TOGGLE_TOOL'; toolName: string }
  | { type: 'SET_METADATA'; category: string; tags: string[]; targetAgents: string[] }
  | { type: 'TOGGLE_META_TYPE'; metaType: string }
  | { type: 'SET_PREVIEW'; directory: InMemorySkillDirectory; skillMd: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' }

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  topic: '',
  sourceUrls: [],
  researchResult: null,
  selectedToolNames: [],
  category: 'business',
  tags: [],
  targetAgents: ['claude-code'],
  selectedMetaTypes: [
    'meta-comprehensive-analysis',
    'meta-quick-assessment',
    'meta-stakeholder-presentation',
    'meta-first-principles-exploration',
    'meta-competitive-response',
  ],
  skillMdPreview: null,
  previewDirectory: null,
  isLoading: false,
  error: null,
}
```

### Quality Score Types (`lib/quality-score.ts`)

```typescript
export interface QualityScore {
  total: number                        // 0-100
  dimensions: {
    descriptionQuality: DimensionScore
    completeness: DimensionScore
    frontmatterHealth: DimensionScore
    resourceRichness: DimensionScore
    linkHealth: DimensionScore
  }
  feedback: string[]                   // specific actionable messages for each deduction
}

export interface DimensionScore {
  score: number
  maxScore: number
  deductions: Array<{ points: number; message: string }>
}
```

---

## All Zod Schemas (`lib/validators.ts`)

```typescript
import { z } from 'zod'

export const ResearchToolSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  artifactType: z.enum(['matrix', 'canvas', 'grid', 'list', 'flowchart', 'analysis']),
  artifactStructure: z.string().min(20).max(3000),
  inputs: z.array(z.string().min(1)).min(1).max(10),
  outputs: z.array(z.string().min(1)).min(1).max(10),
  howUsed: z.string().min(20).max(1000),
})

export const ResearchResultSchema = z.object({
  topic: z.string().min(1),
  sources: z.array(z.string()),
  summary: z.string().min(50).max(1024),
  tools: z.array(ResearchToolSchema).min(1),
  principles: z.array(z.string()),
  suggestedCategory: z.enum([
    'development', 'design', 'writing', 'research',
    'productivity', 'infrastructure', 'ai', 'business',
  ]),
  suggestedTags: z.array(z.string()).min(1).max(8),
  researchUnverified: z.boolean().optional(),
  partialSources: z.boolean().optional(),
})

export const FrameworkSelectionSchema = z.object({
  selected: z.array(z.string()).min(1).max(3),
  rationale: z.string().min(10),
})

export const PromptAuditSchema = z.object({
  token_efficiency: z.object({
    score: z.number().min(0).max(100),
    unnecessary_phrases: z.array(z.string()),
    optimized_text: z.string().min(1),
  }),
  intent_completeness: z.object({
    score: z.number().min(0).max(100),
    present: z.array(z.string()),
    missing: z.array(z.string()),
    suggestions: z.record(z.string()),
  }),
  output_clarity: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    passes: z.boolean(),
  }),
  trigger_sharpness: z.object({
    score: z.number().min(0).max(100),
    first_sentence: z.string(),
    passes: z.boolean(),
    suggestion: z.string().nullable(),
  }),
  optimized_prompt: z.string().min(1),
  estimated_tokens_before: z.number().positive(),
  estimated_tokens_after: z.number().positive(),
})

export const PipelineInputSchema = z.object({
  topic: z.string().min(1).max(500),
  sourceUrls: z.array(z.string().url()).max(10),
  metadata: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
    title: z.string().optional(),
    author: z.string().optional(),
    category: z.enum([
      'development', 'design', 'writing', 'research',
      'productivity', 'infrastructure', 'ai', 'business',
    ]),
    tags: z.array(z.string()).max(8),
    targetAgents: z.array(z.string()),
  }),
  selectedToolNames: z.array(z.string()).optional(),
  selectedMetaTypes: z.array(z.string()).optional(),
  writeToDisk: z.boolean().optional(),
  outputBasePath: z.string().optional(),
})

export const ApiResearchBodySchema = z.object({
  topic: z.string().min(1).max(500),
  sourceUrls: z.array(z.string()).max(10),
})

export const ApiCreateSkillBodySchema = z.object({
  researchResult: ResearchResultSchema,
  metadata: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
    title: z.string().optional(),
    author: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()),
    targetAgents: z.array(z.string()),
  }),
  selectedToolNames: z.array(z.string()).optional(),
  selectedMetaTypes: z.array(z.string()).optional(),
})
```

---

## All LLM Prompt Templates

### Research Extraction Prompt

**System prompt (same for all research calls):**
```
You are a structured knowledge extraction engine. You extract named tools, frameworks, methodologies, matrices, and principles from domain content. You return only valid JSON. You never invent tools that are not explicitly present in the provided content. If content is missing or does not describe specific named tools, return the best extraction possible from what is present — never fabricate.
```

**User prompt (with URLs, template variables in {{double braces}}):**
```
Extract every named tool, framework, matrix, canvas, methodology, and principle from the following content about "{{topic}}".

Source URL(s): {{urls_joined_by_comma}}

<content>
{{combined_extracted_text}}
</content>

Return a JSON object with this exact structure. No markdown fences. No explanation. Raw JSON only:

{
  "topic": "{{topic}}",
  "sources": ["{{url1}}", "{{url2}}"],
  "summary": "<2-3 sentences. First sentence MUST start with an imperative verb: Apply, Run, Analyze, Use, Execute, Generate. Max 150 characters for the first sentence.>",
  "tools": [
    {
      "name": "<canonical name of the tool>",
      "category": "<logical group within this domain, e.g. Strategy, Leadership, Shift>",
      "description": "<1-2 sentences, precise, no generic phrases>",
      "artifactType": "<one of: matrix | canvas | grid | list | flowchart | analysis>",
      "artifactStructure": "<the blank template structure as markdown — labeled columns/rows but no values filled in>",
      "inputs": ["<what data or context this tool requires>"],
      "outputs": ["<the named deliverables this tool produces>"],
      "howUsed": "<2-5 numbered steps explaining the procedure>"
    }
  ],
  "principles": ["<core tenets of the methodology>"],
  "suggestedCategory": "<one of: development | design | writing | research | productivity | infrastructure | ai | business>",
  "suggestedTags": ["<3-6 tags, lowercase-hyphenated>"]
}

Rules:
- Only extract tools explicitly named in the content. Do not infer or invent.
- artifactStructure must be usable as a blank template — include the table headers, grid labels, or list structure but leave values empty or with placeholders like [Factor Name].
- summary first sentence must be imperative. "Apply Blue Ocean Strategy to..." not "This skill helps with..."
- If the content does not explicitly name 5+ distinct tools, return what is there — do not pad.
```

**User prompt (no URLs — training knowledge fallback):**
```
Extract every named tool, framework, matrix, canvas, methodology, and principle for the domain "{{topic}}" using your training knowledge.

Return a JSON object with this exact structure. No markdown fences. No explanation. Raw JSON only:

{
  "topic": "{{topic}}",
  "sources": [],
  "summary": "<2-3 sentences. First sentence MUST start with an imperative verb. Max 150 characters for the first sentence.>",
  "researchUnverified": true,
  "tools": [<same structure as above>],
  "principles": ["<core tenets>"],
  "suggestedCategory": "<one of: development | design | writing | research | productivity | infrastructure | ai | business>",
  "suggestedTags": ["<3-6 tags>"]
}

Note: Because no source URLs were provided, this research uses training knowledge only. The summary must include a note: "Provide source URLs for authoritative, verified results."
```

**Retry prompt (appended after Zod validation failure):**
```
The previous response failed validation with these errors:
{{zod_errors_as_bullet_list}}

Return corrected JSON. Same structure as before. No markdown fences. Fix only the fields with errors.
```

---

### Framework Selection Prompt

**System prompt:**
```
You are a prompt engineering expert selecting the optimal framework(s) for an artifact generation task. Return only valid JSON. Select only from the provided candidates list — never add frameworks not in the list.
```

**User prompt:**
```
Select the optimal prompt engineering framework(s) for this artifact generation task.

Tool name: {{tool_name}}
Artifact type: {{artifact_type}}
Domain: {{topic}}
Tool description: {{tool_description}}
Inputs required: {{inputs_joined}}
Outputs produced: {{outputs_joined}}
How it is used: {{how_used}}

Candidate frameworks (select ONLY from this list — do not select frameworks not listed here):
{{candidate_list_with_descriptions}}

Select 1-3 frameworks that will produce the highest-quality, most complete {{artifact_type}} output for this specific tool. Combine frameworks only when the combination is demonstrably better than any single framework.

Return JSON only. No markdown fences:
{"selected": ["Framework Name 1", "Framework Name 2"], "rationale": "<why these frameworks for this specific tool>"}
```

---

### Prompt Body Generation Prompt

**System prompt:**
```
You are an expert prompt engineer writing a self-contained artifact generation prompt. The prompt you write will be pasted by a user into any AI tool. It must contain everything needed to produce the artifact — zero references to external files, templates, or systems.
```

**User prompt:**
```
Write a self-contained prompt that generates a {{tool_name}} artifact for the {{topic}} domain.

Framework(s) to apply structurally: {{selected_frameworks_joined}}
Framework application guidance: {{framework_descriptions_for_selected}}

Tool description: {{tool_description}}
Artifact type: {{artifact_type}}
Inputs required: {{inputs_joined}}
Expected outputs: {{outputs_joined}}
Procedure: {{how_used}}

Artifact structure to embed INLINE in the prompt body — include this exact structure, do not reference it:
{{artifact_structure}}

Requirements for the prompt you write:
1. First sentence is imperative: "Produce...", "Analyze...", "Generate...", "Complete..." — never "This prompt helps..."
2. The artifact structure above is embedded inline as markdown. The user never sees another file.
3. All validation rules the agent must check before delivering are listed explicitly.
4. The selected framework(s) are structurally evident in the prompt design — they shape the structure, not just appear as a mention.
5. A completion checklist at the end specifies exactly what a valid, complete output contains.
6. The prompt is fully self-contained — no phrases like "using the template from resources/" or "refer to the artifact structure."

Write the prompt body only. No frontmatter. No preamble. No explanation.
```

---

### Sample Generation Prompt

**System prompt:**
```
You are a domain expert filling in a structured analysis template with illustrative examples. Return only the completed template as markdown. No preamble, no explanation.
```

**User prompt:**
```
Fill in this blank {{tool_name}} template with illustrative examples for the {{topic}} domain.

Use domain-appropriate examples. If the domain has canonical examples that are commonly used in educational contexts (e.g., Blue Ocean Strategy uses Cirque du Soleil), use them. Otherwise use generic but realistic placeholder values that demonstrate the structure without inventing specific companies or data.

Template to fill in:
{{artifact_structure}}

Return the completed template as markdown. Start directly with the content.
```

---

### Prompt Optimizer Audit Prompt

**System prompt:**
```
You are a prompt quality auditor. Analyze prompts for efficiency, intent completeness, output clarity, and trigger sharpness. Return only valid JSON. No markdown fences.
```

**User prompt:**
```
Audit this prompt across 4 quality dimensions.

<prompt>
{{prompt_text}}
</prompt>

Return this JSON structure exactly. No markdown fences. Raw JSON:

{
  "token_efficiency": {
    "score": <0-100, where 100 = no unnecessary words>,
    "unnecessary_phrases": ["<phrase that could be removed without changing output>"],
    "optimized_text": "<the full prompt with unnecessary phrases removed>"
  },
  "intent_completeness": {
    "score": <0-100, where 100 = all 9 dimensions explicitly addressed>,
    "present": ["<dimension names that are clearly addressed>"],
    "missing": ["<dimension names that are absent or ambiguous>"],
    "suggestions": {
      "<missing_dimension>": "<specific suggestion for how to add it concisely>"
    }
  },
  "output_clarity": {
    "score": <0-100>,
    "issues": ["<specific issue with output specification>"],
    "passes": <true if: output deliverable named, structure specified, ordering stated>
  },
  "trigger_sharpness": {
    "score": <0-100>,
    "first_sentence": "<the actual first sentence of the prompt>",
    "passes": <true if first sentence is imperative and unambiguous>,
    "suggestion": "<rewritten first sentence if it fails, null if it passes>"
  },
  "optimized_prompt": "<the best version of this prompt incorporating all improvements>",
  "estimated_tokens_before": <word_count * 1.35, rounded to integer>,
  "estimated_tokens_after": <word_count_of_optimized * 1.35, rounded to integer>
}

The nine intent dimensions: task, input, output, constraints, context, audience, memory, success-criteria, examples.

Token efficiency scoring: 100 = no unnecessary words. Deduct 10 points per unnecessary phrase found. Phrases that do not change model output are unnecessary.
```

---

## Framework Library (`lib/pe-frameworks.ts`)

### Framework Candidates by Artifact Type

```typescript
export const FRAMEWORK_CANDIDATES: Record<ArtifactType, string[]> = {
  matrix: [
    'Structured Output',
    'Artifact Production',
    'Constrained Generation',
    'Task Decomposition',
    'Few-Shot',
  ],
  canvas: [
    'Structured Output',
    'Artifact Production',
    'Few-Shot',
    'Role / Expert Persona',
    'Constrained Generation',
  ],
  grid: [
    'Structured Output',
    'Artifact Production',
    'Constrained Generation',
    'Batch Prompting',
  ],
  list: [
    'Constrained Generation',
    'Task Decomposition',
    'Batch Prompting',
    'Structured Output',
    'Negative Prompting',
  ],
  flowchart: [
    'Least-to-Most',
    'Chain of Thought',
    'Task Decomposition',
    'Structured Output',
  ],
  analysis: [
    'Chain of Thought',
    'Step-Back Prompting',
    'Role / Expert Persona',
    'Tree of Thoughts',
    'Self-Critique',
  ],
}

// Domain modifiers — appended to candidates based on topic keyword matching
export const DOMAIN_MODIFIER_RULES: Array<{
  pattern: RegExp
  additionalCandidates: string[]
}> = [
  {
    pattern: /strateg|competi|market|business|growth/i,
    additionalCandidates: ['Step-Back Prompting', 'Metacognitive Prompting'],
  },
  {
    pattern: /process|workflow|operation|pipeline|procedure/i,
    additionalCandidates: ['Least-to-Most', 'PAL (Program-Aided Language Models)'],
  },
  {
    pattern: /customer|interview|user|stakeholder|persona/i,
    additionalCandidates: ['Role / Expert Persona', 'Emotional Prompting'],
  },
  {
    pattern: /code|software|engineer|debug|test|review/i,
    additionalCandidates: ['PAL (Program-Aided Language Models)', 'Self-Critique'],
  },
]

// Complexity modifier — appended when tool has many inputs AND outputs
export const COMPLEXITY_CANDIDATES = ['Prompt Chaining', 'Skeleton-of-Thought']
export const COMPLEXITY_THRESHOLD = { inputs: 3, outputs: 3 }
```

### Framework Descriptions (used in selection prompts)

```typescript
export const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  'Chain of Thought': 'Explicit step-by-step reasoning trace before producing the final answer. Use when the artifact requires sequential analytical steps that must be shown.',
  'Zero-Shot CoT': 'Appending "think step by step" to trigger implicit reasoning chains. Lightweight alternative to full CoT when reasoning steps need not be shown.',
  'Tree of Thoughts': 'Explores multiple reasoning paths in parallel before selecting the strongest. Use for high-stakes decisions where exploring alternatives adds value.',
  'Graph of Thoughts': 'Builds a reasoning graph where nodes are thoughts and edges are logical dependencies. Use for complex interdependent analysis.',
  'Self-Consistency': 'Generates multiple independent completions and selects the most consistent. Use when reliability matters more than speed.',
  'Least-to-Most': 'Decomposes the problem into sub-problems from simplest to hardest, solving in order. Use for sequential processes or tiered analysis.',
  'Step-Back Prompting': 'Prompts for higher-level principles before applying them to the specific case. Use for strategic or conceptual analysis that benefits from abstraction first.',
  'Analogical Prompting': 'Generates relevant analogies before reasoning through the problem. Use when domain transfer or creative reframing is valuable.',
  'Skeleton-of-Thought': 'Generates an answer outline first, then fills each section. Use for complex multi-section artifacts.',
  'Metacognitive Prompting': 'Prompts the model to reflect on its reasoning process as it works. Use for analytical tasks where the reasoning quality is as important as the output.',
  'ReAct (Reasoning + Acting)': 'Interleaves reasoning traces with tool calls or evidence retrieval. Use when the prompt involves multi-step lookups.',
  'PAL (Program-Aided Language Models)': 'Generates code or pseudocode as the reasoning intermediate. Use for quantitative analysis, scoring, or structured comparison tasks.',
  'Role / Expert Persona': 'Assigns a specific expert identity that anchors the model\'s knowledge domain. Use when domain expertise framing improves output quality.',
  'Few-Shot': 'Provides 2-5 worked examples before the target task. Use when the output format is complex and an example is clearer than a description.',
  'Zero-Shot': 'No examples; relies entirely on instruction precision. Use when the output format is simple and unambiguous.',
  'One-Shot': 'Exactly one worked example. Use when one example clarifies the format without consuming excessive context.',
  'Many-Shot': 'Ten or more examples. Use for establishing strong behavioral patterns in edge-case-heavy domains.',
  'Generated Knowledge': 'Prompts the model to generate relevant background knowledge before answering. Use when the domain requires priming before the artifact task.',
  'Contrastive CoT': 'Provides correct and incorrect worked examples to sharpen discrimination. Use when common mistakes are predictable and worth calling out.',
  'Active Prompting': 'Identifies the most ambiguous parts of the task and resolves them first. Use when the prompt has multiple interpretations.',
  'Instruction Engineering': 'Precise, unambiguous task decomposition with explicit constraints. Use for any structured artifact where constraint clarity is critical.',
  'Task Decomposition': 'Breaks a complex task into numbered subtasks with explicit output requirements per subtask. Use for multi-stage artifacts.',
  'Structured Output (XML/JSON)': 'Specifies the exact output schema the model must conform to. Use when machine-readable output is needed or the structure is complex.',
  'Prompt Chaining': 'Sequences multiple prompts where each output becomes the next input. Use for multi-stage analysis where stages are dependent.',
  'Constrained Generation': 'Specifies what must and must not be included. Use for artifacts with strict inclusion/exclusion rules.',
  'Negative Prompting': 'Defines what to exclude or avoid. Use to sharpen the output space by explicit elimination.',
  'Directional Stimulus': 'Provides a hint or keyword that steers generation. Use when a nudge is more effective than a constraint.',
  'Template / Variable': 'Uses a fixed template with named variables. Use when the artifact structure is invariant and only the content varies.',
  'Artifact Production': 'Optimized for producing a specific named deliverable. Use as the primary framework for any artifact-generating prompt.',
  'Maieutic Prompting': 'Prompts the model to explain its answer, then uses inconsistencies to refine it. Use for iterative refinement tasks.',
  'Expert Prompting': 'Instructs the model to answer as a named category of expert with explicit rationale. Use when expert framing adds credibility to the output.',
  'Emotional Prompting': 'Incorporates high-stakes framing to activate accuracy-maximizing behavior. Use for critical decisions or high-consequence analyses.',
  'Batch Prompting': 'Processes multiple items in a single call with consistent formatting. Use for grids, tables, and lists with repeated structure per row.',
  'Structured Decomposition': 'Produces a hierarchical output with defined levels and explicit relationships. Use for nested or hierarchical artifacts.',
  'Self-Critique': 'Model generates its answer, critiques it, then revises. Use for high-quality single-pass outputs where iteration is warranted.',
  'Auto-CoT': 'Automatically generates chain-of-thought demonstrations. Use for tasks where examples are expensive to write manually.',
  'Complexity-Based Prompting': 'Routes tasks to longer chains based on measured task complexity. Use for variable-complexity inputs.',
  'Token Efficiency Audit': 'Analyzes the prompt for words that do not affect output. Use as a final pass on any prompt before deployment.',
  '9-Dimension Intent Extraction': 'Extracts and makes explicit: task, input, output, constraints, context, audience, memory, success criteria, examples. Use to ensure comprehensive intent coverage.',
  'Metacognitive Prompting': 'Prompts the model to reflect on its reasoning as it works. Use for analytical tasks where reasoning quality matters.',
}
```

---

## Nothing Design System Specification

All values below are exact. Do not substitute, round, or approximate.

### CSS Custom Properties (`app/globals.css`)

```css
:root {
  --bg: #F5F5F5;
  --surface: #FFFFFF;
  --border-visible: #CCCCCC;
  --border-subtle: #E8E8E8;
  --text-display: #000000;
  --text-primary: #1A1A1A;
  --text-secondary: #666666;
  --text-disabled: #999999;
  --accent: #D71921;
  --blue: #007AFF;
  --dot-grid-bg: rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] {
  --bg: #000000;
  --surface: #111111;
  --border-visible: #333333;
  --border-subtle: #222222;
  --text-display: #FFFFFF;
  --text-primary: #E8E8E8;
  --text-secondary: #999999;
  --text-disabled: #666666;
  --accent: #D71921;
  --blue: #5B9BF6;
  --dot-grid-bg: rgba(255, 255, 255, 0.04);
}
```

### Required Animation Keyframes (`app/globals.css`)

```css
@keyframes scanReveal {
  0%   { clip-path: inset(0 100% 0 0); opacity: 0; }
  10%  { opacity: 1; }
  100% { clip-path: inset(0 0% 0 0); opacity: 1; }
}

@keyframes dotoCount {
  0%   { --doto-count: 0; }
  100% { --doto-count: var(--target-count); }
}

@keyframes segmentFill {
  0%   { width: 0%; }
  100% { width: var(--fill-percent); }
}

@keyframes charReveal {
  0%   { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Dot-grid texture — use on data-heavy sections only, never hero backgrounds */
.dot-grid-texture {
  background-image: radial-gradient(circle, var(--dot-grid-bg) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

### Tailwind Config Extension (`tailwind.config.ts`)

```typescript
// Extend colors section only. Do not override base Tailwind colors.
colors: {
  'sm-bg': 'var(--bg)',
  'sm-surface': 'var(--surface)',
  'sm-border': 'var(--border-visible)',
  'sm-border-subtle': 'var(--border-subtle)',
  'sm-display': 'var(--text-display)',
  'sm-primary': 'var(--text-primary)',
  'sm-secondary': 'var(--text-secondary)',
  'sm-disabled': 'var(--text-disabled)',
  'sm-accent': 'var(--accent)',
  'sm-blue': 'var(--blue)',
},
fontFamily: {
  display: ['Doto', 'monospace'],
  body: ['Space Grotesk', 'sans-serif'],
  mono: ['Space Mono', 'monospace'],
},
```

### Google Fonts Loading (`app/layout.tsx`)

```typescript
import { Space_Grotesk, Space_Mono } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

// Doto is a variable font — load via <link> in <head>, not next/font (variable font support)
// Add to <head>: <link href="https://fonts.googleapis.com/css2?family=Doto:ROND,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
```

### Design Rules (enforced in code review — fail any PR that violates these)

1. No green (`#00...` greens, Tailwind `green-*`). No purple (`#8B5CF6` or any purple). Violating this fails code review.
2. No gradients (`background: linear-gradient`, `bg-gradient-*`). No box shadows (`box-shadow`, `shadow-*` Tailwind classes).
3. No border-radius above `rounded-2xl` (16px) on card components.
4. No toast popups or notification toasts. Use `[STATUS]` inline text in Space Mono.
5. No skeleton loaders. Use `[LOADING...]` text in Space Mono.
6. No zebra-striped tables.
7. Hero background is always `--bg` (light in light mode). Never invert the hero.
8. One topbar only. No secondary navigation bars.
9. One high-contrast element per screen. One. Not two.
10. All status labels use bracket notation in Space Mono: `[ CONFIRMED ]`, `[ 147 SKILLS ]`, `[ ERROR ]`.
11. Form inputs use underline style (bottom border only). No box/border-radius inputs.
12. Bracket notation for labels: `[ SKILL TOPIC ]`, `[ SOURCE URL ]`.
13. Alignment rule: when displaying a list of items with a type label, use CSS grid with a fixed-width first column. Never inline-flex where variable-width labels shift name alignment.

---

## Provider Implementation Details

### Default Models (`lib/providers/defaults.ts`)

```typescript
export const DEFAULT_MODELS: Record<ProviderID, string> = {
  openai: 'gpt-4o',
  'claude-code': 'claude-sonnet-4-6',
  gemini: 'gemini-2.0-flash-exp',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.1',
}
```

### Config Resolution Order (`lib/providers/index.ts`)

Read from the first source that has a `provider` value:
1. `process.env.SKILL_MALL_PROVIDER` + `process.env.SKILL_MALL_API_KEY` + `process.env.SKILL_MALL_MODEL`
2. `~/.skill-mall/config.json` → `{ provider, apiKey, model }` or `{ provider, providers: { [providerID]: { apiKey, model } } }`

If neither source has a provider value, throw `ConfigError('No LLM provider configured. Run: npx skill-mall configure')`.

### OpenAI Implementation (`lib/providers/openai.ts`)

```typescript
import OpenAI from 'openai'
import type { LLMClient, ProviderConfig, CompletionOptions } from './types'

export class OpenAIClient implements LLMClient {
  readonly provider = 'openai' as const
  private client: OpenAI
  private model: string

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.2,
      response_format:
        options?.responseFormat === 'json_object'
          ? { type: 'json_object' as const }
          : undefined,
    })
    return response.choices[0].message.content ?? ''
  }
}
```

### Claude Code CLI Implementation (`lib/providers/claude-code.ts`)

This implementation invokes the `claude` binary as a child process. No Anthropic SDK. No HTTP calls to api.anthropic.com. The user authenticates via `claude auth` or their existing Claude Code setup.

```typescript
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { LLMClient, ProviderConfig, CompletionOptions } from './types'

const execFileAsync = promisify(execFile)

export class ClaudeCodeClient implements LLMClient {
  readonly provider = 'claude-code' as const
  private model: string

  constructor(config: ProviderConfig) {
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    // Prepend system prompt to user prompt (claude CLI has no separate --system flag)
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt

    const { stdout } = await execFileAsync(
      'claude',
      ['--print', '--model', this.model, fullPrompt],
      {
        maxBuffer: 10 * 1024 * 1024,  // 10MB
        timeout: options?.timeoutMs ?? 120_000,
      }
    )

    return stdout.trim()
  }
}
```

**Worker note:** Before writing this implementation, verify `claude --help` to confirm `--print` is a valid flag in the installed version. If the flag name is different, use the correct flag. Stop and report if `claude` is not in PATH.

### Groq Implementation (`lib/providers/groq.ts`)

Uses OpenAI SDK with Groq base URL:
```typescript
import OpenAI from 'openai'
// new OpenAI({ apiKey: config.apiKey, baseURL: 'https://api.groq.com/openai/v1' })
// Otherwise identical to OpenAIClient
```

### Gemini Implementation (`lib/providers/gemini.ts`)

Use `@google/generative-ai` SDK. Model: `gemini-2.0-flash-exp`. Map `CompletionOptions.responseFormat === 'json_object'` to Gemini's `responseMimeType: 'application/json'`.

### Ollama Implementation (`lib/providers/ollama.ts`)

Uses OpenAI SDK with Ollama base URL and no API key:
```typescript
import OpenAI from 'openai'
// new OpenAI({ apiKey: 'ollama', baseURL: config.baseURL ?? 'http://localhost:11434/v1' })
// Otherwise identical to OpenAIClient
```

---

## Research Engine Implementation (`lib/research-engine.ts`)

### URL Fetching

```typescript
import * as cheerio from 'cheerio'

async function fetchAndExtract(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SkillMall-ResearchEngine/1.0' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new FetchError(`HTTP ${response.status} fetching ${url}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  $('script, style, nav, footer, header, aside, [role="banner"], [role="navigation"], .cookie-banner, .advertisement, .sidebar').remove()

  const main = $('main, article, [role="main"], .content, #content, .post-content, .entry-content').first()
  const rawText = (main.length ? main : $('body')).text()

  return rawText.replace(/\s+/g, ' ').trim().slice(0, 8_000)
}
```

### Multi-URL Handling

```typescript
async function fetchAllUrls(urls: string[]): Promise<{ text: string; successUrls: string[]; failedUrls: string[] }> {
  const results = await Promise.allSettled(urls.map(url => fetchAndExtract(url).then(text => ({ url, text }))))

  const successUrls: string[] = []
  const failedUrls: string[] = []
  const texts: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successUrls.push(result.value.url)
      texts.push(result.value.text)
    } else {
      failedUrls.push('unknown')
    }
  }

  if (successUrls.length === 0 && urls.length > 0) {
    throw new FetchError('All URLs failed to fetch. Check URLs and network access.')
  }

  // Total combined text cap: 20,000 chars (proportionally distributed)
  const combined = texts.join('\n\n').slice(0, 20_000)
  return { text: combined, successUrls, failedUrls }
}
```

### Extraction with Retry

```typescript
async function extractWithRetry(
  topic: string,
  content: string | null,
  urls: string[],
  client: LLMClient
): Promise<ResearchResult> {
  const prompt = content
    ? buildExtractionPromptWithContent(topic, content, urls)
    : buildExtractionPromptNoUrls(topic)

  const systemPrompt = 'You are a structured knowledge extraction engine. You extract named tools, frameworks, methodologies, matrices, and principles from domain content. You return only valid JSON. You never invent tools that are not explicitly present in the provided content.'

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await client.complete(
      attempt === 0 ? prompt : `${prompt}\n\nThe previous response failed validation. Return corrected JSON.`,
      { responseFormat: 'json_object', temperature: 0.1, maxTokens: 4096, systemPrompt }
    )

    try {
      const parsed = JSON.parse(raw)
      const validated = ResearchResultSchema.parse(parsed)
      return validated
    } catch (err) {
      if (attempt === 1) {
        throw new ExtractionError(`Extraction failed after 2 attempts: ${err}`)
      }
    }
  }

  throw new ExtractionError('Extraction failed')
}
```

### Public API

```typescript
export async function runResearchEngine(
  topic: string,
  sourceUrls: string[],
  client: LLMClient
): Promise<ResearchResult> {
  if (sourceUrls.length === 0) {
    const result = await extractWithRetry(topic, null, [], client)
    return { ...result, researchUnverified: true }
  }

  const { text, successUrls, failedUrls } = await fetchAllUrls(sourceUrls)
  const result = await extractWithRetry(topic, text, successUrls, client)

  return {
    ...result,
    sources: successUrls,
    partialSources: failedUrls.length > 0,
  }
}
```

### Error Classes

```typescript
export class FetchError extends Error {
  constructor(message: string) { super(message); this.name = 'FetchError' }
}

export class ExtractionError extends Error {
  constructor(message: string) { super(message); this.name = 'ExtractionError' }
}
```

---

## Skill Builder Implementation (`lib/skill-builder.ts`)

### SKILL.md Generator (deterministic — no LLM)

```typescript
function generateSkillMd(result: ResearchResult, meta: SkillMetadata): string {
  const description = result.summary.split('.')[0].trim()
  const truncatedDescription = description.length > 150
    ? description.slice(0, 147) + '...'
    : description

  const toolIndex = result.tools
    .map(t => `- **${t.name}** (\`${t.artifactType}\`) — ${t.description}`)
    .join('\n')

  const unverifiedBanner = result.researchUnverified
    ? '> **Research unverified** — generated from training knowledge. Provide source URLs for authoritative results.\n\n'
    : ''

  return `---
name: ${meta.slug}
description: "${truncatedDescription.replace(/"/g, '\\"')}"
license: MIT
metadata:
  version: "1.0.0"
  author: ${meta.author ?? 'skill-mall'}
  category: ${meta.category}
  tags: "${meta.tags.slice(0, 6).join(', ')}"
---

${unverifiedBanner}# ${meta.title ?? result.topic}

${result.summary}

## Tools (${result.tools.length})

${toolIndex}

## Principles

${result.principles.map(p => `- ${p}`).join('\n')}

## Usage

Describe the ${result.topic} task you need to complete. The skill applies the appropriate tool based on your goal.
`
}
```

### Template Generator (deterministic — no LLM)

```typescript
function generateTemplate(tool: ResearchTool): InMemoryFile {
  const content = `# ${tool.name} — Template

**Artifact type:** \`${tool.artifactType}\`

## How to use

${tool.howUsed}

## Inputs required

${tool.inputs.map(i => `- ${i}`).join('\n')}

## Template

${tool.artifactStructure}

## Expected outputs

${tool.outputs.map(o => `- ${o}`).join('\n')}
`
  return {
    path: `resources/templates/${toSlug(tool.name)}.md`,
    content,
  }
}
```

### Sample Generator (LLM call — one per tool)

```typescript
async function generateSample(
  tool: ResearchTool,
  topic: string,
  client: LLMClient
): Promise<InMemoryFile> {
  const prompt = `Fill in this blank ${tool.name} template with illustrative examples for the ${topic} domain.

Use domain-appropriate examples. If the domain has canonical illustrative examples used in educational contexts, use them. Otherwise use generic but realistic placeholder values.

Template to fill in:
${tool.artifactStructure}

Return the completed template as markdown. Start directly with the content. No preamble.`

  const filled = await client.complete(prompt, {
    temperature: 0.3,
    maxTokens: 1500,
    systemPrompt: 'You are a domain expert filling in a structured analysis template with illustrative examples. Return only the completed template as markdown.',
  })

  return {
    path: `resources/samples/${toSlug(tool.name)}-sample.md`,
    content: `# ${tool.name} — Sample Output\n\n*Sample for the ${topic} domain.*\n\n${filled}`,
  }
}
```

### README Generator (deterministic — no LLM)

Generates a table with columns: Tool | Type | Template | Sample | Prompt. One row per tool.

### Script Generator (deterministic — no LLM)

Generates `scripts/run-full-analysis.sh` (prints the meta-comprehensive-analysis prompt path) and `scripts/generate-<tool-slug>.sh` for the first 5 tools.

### Public API

```typescript
export async function buildSkillDirectory(
  result: ResearchResult,
  meta: SkillMetadata,
  client: LLMClient
): Promise<InMemorySkillDirectory> {
  const files: InMemoryFile[] = []

  // Deterministic files (no LLM calls)
  files.push({ path: 'SKILL.md', content: generateSkillMd(result, meta) })
  files.push({ path: 'README.md', content: generateReadme(result, meta) })

  for (const tool of result.tools) {
    files.push(generateTemplate(tool))
  }

  files.push(...generateScripts(result, meta))

  // LLM calls — samples (one per tool, run in parallel)
  const samples = await Promise.all(
    result.tools.map(tool => generateSample(tool, result.topic, client))
  )
  files.push(...samples)

  return { slug: meta.slug, category: meta.category, files }
}
```

---

## Prompt Engine Implementation (`lib/prompt-engine.ts`)

### Framework Candidate Selection

```typescript
import { FRAMEWORK_CANDIDATES, DOMAIN_MODIFIER_RULES, COMPLEXITY_CANDIDATES, COMPLEXITY_THRESHOLD } from './pe-frameworks'

export function getFrameworkCandidates(tool: ResearchTool, topic: string): string[] {
  const candidates = new Set(FRAMEWORK_CANDIDATES[tool.artifactType])

  for (const rule of DOMAIN_MODIFIER_RULES) {
    if (rule.pattern.test(topic)) {
      rule.additionalCandidates.forEach(c => candidates.add(c))
    }
  }

  if (tool.inputs.length >= COMPLEXITY_THRESHOLD.inputs && tool.outputs.length >= COMPLEXITY_THRESHOLD.outputs) {
    COMPLEXITY_CANDIDATES.forEach(c => candidates.add(c))
  }

  return [...candidates].slice(0, 8)
}
```

### Framework Selection (LLM call)

Uses the selection prompt from the LLM Prompt Templates section. Returns `{ selected: string[], rationale: string }`.

Post-validation: if any selected framework is not in the candidates list, filter it out. If no valid frameworks remain, use the first two from the candidates list as fallback (do not throw — log warning).

### Prompt Count Rules

| Prompt type | Count formula |
|---|---|
| Tool-specific | 1 per tool in result.tools |
| Category | 1 per unique tool.category value |
| Meta (standard) | Always 5: comprehensive-analysis, quick-assessment, stakeholder-presentation, first-principles-exploration, competitive-response |
| Meta (cross-category synthesis) | +1 if distinct category count ≥ 3 |

Total expected for Blue Ocean Strategy (21 tools, 3 categories): 21 + 3 + 5 = 29.

### Prompt File Frontmatter Template

```typescript
function buildFrontmatter(
  tool: ResearchTool,
  skillSlug: string,
  selectedFrameworks: string[],
  promptType: 'tool-specific' | 'category' | 'meta',
  complexity: 'quick' | 'thorough' | 'exhaustive'
): string {
  return `---
framework: ${selectedFrameworks.join(', ')}
original_framework: ${selectedFrameworks.join(', ')}
skill: ${skillSlug}
tool: ${toSlug(tool.name)}
type: ${promptType}
produces: [${tool.outputs.map(o => `"${toSlug(o)}.md"`).join(', ')}]
when_to_use: "Use when you need to produce a ${tool.name} for ${tool.category} analysis"
complexity: ${complexity}
generated_by: prompt-engine
---`
}
```

Complexity assignment rules:
- Meta comprehensive-analysis: `exhaustive`
- Meta cross-category-synthesis: `exhaustive`
- Category prompts: `thorough`
- Tool-specific prompts with ≥ 3 inputs AND ≥ 3 outputs: `thorough`
- All other tool-specific prompts: `quick`
- Meta quick-assessment: `quick`
- All other meta prompts: `thorough`

### Public API

```typescript
export async function generatePrompts(
  result: ResearchResult,
  meta: SkillMetadata,
  client: LLMClient
): Promise<InMemoryFile[]>
```

---

## Pipeline Orchestration (`lib/pipeline.ts`)

### Atomic Write

```typescript
import fs from 'fs/promises'
import path from 'path'

async function atomicWrite(
  directory: InMemorySkillDirectory,
  outputPath: string
): Promise<WriteResult> {
  const absOutput = path.resolve(outputPath)
  const tempPath = `${absOutput}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`

  try {
    await fs.mkdir(tempPath, { recursive: true })

    for (const file of directory.files) {
      const filePath = path.join(tempPath, file.path)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, file.content, 'utf-8')
    }

    // Remove existing output if present, then rename temp to final
    try { await fs.rm(absOutput, { recursive: true }) } catch {}
    await fs.rename(tempPath, absOutput)

    return { success: true, path: absOutput, fileCount: directory.files.length }
  } catch (error) {
    await fs.rm(tempPath, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}
```

### AgentSkills Spec Validation

```typescript
function validateSkillDirectory(dir: InMemorySkillDirectory): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const warnings: ValidationResult['warnings'] = []

  const skillMd = dir.files.find(f => f.path === 'SKILL.md')
  const readme = dir.files.find(f => f.path === 'README.md')

  if (!skillMd) errors.push({ field: 'SKILL.md', message: 'Required file missing' })
  if (!readme) errors.push({ field: 'README.md', message: 'Required file missing' })

  if (skillMd) {
    // Parse frontmatter
    const nameMatch = skillMd.content.match(/^name:\s*(.+)$/m)
    const descMatch = skillMd.content.match(/^description:\s*"?(.+?)"?$/m)

    if (!nameMatch) {
      errors.push({ field: 'name', message: 'Required frontmatter field missing' })
    } else {
      const name = nameMatch[1].trim()
      if (name.length > 64) errors.push({ field: 'name', message: `Exceeds 64 chars (${name.length})`, value: name })
      if (!/^[a-z0-9-]+$/.test(name)) errors.push({ field: 'name', message: 'Must be kebab-case (lowercase letters, numbers, hyphens)', value: name })
      if (name !== dir.slug) errors.push({ field: 'name', message: `Must match directory slug "${dir.slug}"`, value: name })
    }

    if (!descMatch) {
      errors.push({ field: 'description', message: 'Required frontmatter field missing' })
    } else {
      const desc = descMatch[1].trim()
      if (desc.length > 1024) errors.push({ field: 'description', message: `Exceeds 1024 chars (${desc.length})` })
      if (desc.length > 150) warnings.push({ field: 'description', message: `Exceeds 150 chars (${desc.length}) — will truncate in agent skill listings` })
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
```

### Main Pipeline Function

```typescript
export async function runPipeline(
  input: PipelineInput,
  client: LLMClient,
  options: { requireConfirmation: boolean } = { requireConfirmation: true }
): Promise<PipelineStage> {
  PipelineInputSchema.parse(input)

  // Stage 2: Research
  const researchResult = await runResearchEngine(input.topic, input.sourceUrls, client)

  // Confirmation gate
  if (options.requireConfirmation) {
    return { stage: 'awaiting-confirmation', researchResult }
  }

  // Apply tool filter
  const filteredResult = input.selectedToolNames?.length
    ? { ...researchResult, tools: researchResult.tools.filter(t => input.selectedToolNames!.includes(t.name)) }
    : researchResult

  // Stages 3 + 4 in parallel
  const [skillDirectory, promptFiles] = await Promise.all([
    buildSkillDirectory(filteredResult, input.metadata, client),
    generatePrompts(filteredResult, input.metadata, client),
  ])

  const completeDirectory: InMemorySkillDirectory = {
    ...skillDirectory,
    files: [...skillDirectory.files, ...promptFiles],
  }

  const validation = validateSkillDirectory(completeDirectory)
  if (!validation.valid) {
    return { stage: 'complete', result: { researchResult, skillDirectory: completeDirectory, validation } }
  }

  let writeResult: WriteResult | undefined
  if (input.writeToDisk) {
    const outputPath = path.join(
      input.outputBasePath ?? 'skills',
      input.metadata.category,
      input.metadata.slug
    )
    writeResult = await atomicWrite(completeDirectory, outputPath)
  }

  return {
    stage: 'complete',
    result: { researchResult, skillDirectory: completeDirectory, validation, writeResult },
  }
}
```

---

## API Routes Specification

All routes share these behaviors:
- `Content-Type: application/json` on all responses
- 400 on Zod validation failure with `{ error: 'invalid_input', details: ZodError.errors }`
- 503 when provider not configured with `{ error: 'provider_not_configured', setupUrl: '/settings/providers' }`
- 422 when LLM pipeline fails with `{ error: 'pipeline_failed', message: string }`
- No authentication in Phase 1

### GET /api/providers

Returns the provider catalog and current configuration status.

Response shape:
```typescript
{
  configured: boolean
  activeProvider: ProviderID | null
  activeModel: string | null
  providers: Array<{
    id: ProviderID
    name: string
    requiresApiKey: boolean
    defaultModel: string
    availableModels: string[]
    setupUrl: string        // e.g., "https://platform.openai.com/api-keys"
    setupInstructions: string
  }>
}
```

Provider catalog values:
- `openai`: name "OpenAI", requiresApiKey true, defaultModel "gpt-4o", availableModels ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"], setupUrl "https://platform.openai.com/api-keys"
- `claude-code`: name "Claude Code CLI", requiresApiKey false, defaultModel "claude-sonnet-4-6", availableModels ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5-20251001"], setupUrl "https://claude.ai/code"
- `gemini`: name "Google Gemini", requiresApiKey true, defaultModel "gemini-2.0-flash-exp", availableModels ["gemini-2.0-flash-exp", "gemini-1.5-pro"], setupUrl "https://aistudio.google.com/app/apikey"
- `groq`: name "Groq", requiresApiKey true, defaultModel "llama-3.3-70b-versatile", availableModels ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"], setupUrl "https://console.groq.com/keys"
- `ollama`: name "Ollama (Local)", requiresApiKey false, defaultModel "llama3.1", availableModels ["llama3.1", "mistral", "codellama"], setupUrl "https://ollama.ai"

### POST /api/providers/configure

Body: `{ provider: ProviderID; apiKey?: string; model?: string }`

Behavior:
- Write `SKILL_MALL_PROVIDER`, `SKILL_MALL_API_KEY`, `SKILL_MALL_MODEL` to `.env.local`
- In production (NODE_ENV=production): return 400 with `{ error: 'use_env_vars', message: 'Set SKILL_MALL_* environment variables in your Vercel dashboard' }`
- Response: `{ success: true, provider: ProviderID, model: string }`

### POST /api/research

Body: `{ topic: string; sourceUrls: string[] }` (validated by ApiResearchBodySchema)

Calls `runResearchEngine(topic, sourceUrls, client)`. Returns the ResearchResult directly.

### POST /api/confirm-research

Body: ApiCreateSkillBodySchema (researchResult + metadata + optional selectedToolNames + selectedMetaTypes)

Runs Stages 3–5 without writing to disk (`writeToDisk: false`). Returns:
```typescript
{
  skillDirectory: InMemorySkillDirectory
  promptCount: number
  fileCount: number
  validation: ValidationResult
}
```

### POST /api/create-skill

Same body as confirm-research. Runs pipeline with `writeToDisk: true`. Returns:
```typescript
{
  slug: string
  path: string
  fileCount: number
  promptCount: number
}
```

### POST /api/optimize-prompt

Body: `{ prompt: string }` (prompt max 10,000 chars)

Calls `optimizePrompt(prompt, client)`. Returns `PromptAudit`.

---

## Quality Score Rubric (`lib/quality-score.ts`)

Exact scoring — every point value is specified. Deduct only the listed amount for each criterion.

### Dimension 1: Description Quality (25 points max)

| Criterion | Points |
|---|---|
| First sentence uses imperative phrasing (starts with imperative verb: Apply, Run, Analyze, Use, Execute, Generate, Create, Build, Perform, Conduct, Evaluate, Assess) | 7 |
| Description is 150 characters or fewer | 6 |
| Trigger phrase appears in the first 80 characters (skill name or primary domain term) | 7 |
| Description is specific — names the domain, tool, or workflow; does not use only generic verbs like "help" or "assist" or "provide" | 5 |

### Dimension 2: Completeness (25 points max)

| Criterion | Points |
|---|---|
| README.md present | 5 |
| At least one file in `resources/templates/` | 7 |
| At least one file in `resources/samples/` | 7 |
| At least one file in `resources/prompts/` | 6 |

### Dimension 3: Frontmatter Health (20 points max)

| Criterion | Points |
|---|---|
| All required fields present: name, description, metadata.category, metadata.tags, metadata.version, metadata.author | 8 |
| metadata.category value exists in the valid catalog taxonomy | 4 |
| metadata.tags count is between 2 and 6 | 4 |
| Directory name matches the name field exactly | 4 |

### Dimension 4: Resource Richness (20 points max)

Scored on total count of templates + samples + prompts + scripts:

| Total resource file count | Points |
|---|---|
| 1–3 | 5 |
| 4–7 | 10 |
| 8–14 | 15 |
| 15 or more | 20 |

### Dimension 5: Link Health (10 points max)

- All skills referenced in `metadata.linked-skills` exist in the catalog: 10 points
- Proportional deduction per broken link: `-10 / total_linked_skills` per missing skill, rounded to nearest integer

### Feedback Message Format

Each deduction generates a specific message. Format: `"<specific issue> (-<points>)"`.

Examples:
- `"Description starts with 'This skill helps' — rewrite to start with an imperative verb like 'Apply' or 'Run' (-7)"`
- `"No sample outputs in resources/samples/ — add at least one completed artifact example (-7)"`
- `"Description is 187 characters — exceeds 150-character limit, will truncate in agent skill listings (-6)"`
- `"Linked skill 'okr-framework' not found in catalog — remove the link or install the skill (-5)"`

---

## Mock LLM Client for Tests (`lib/__tests__/mocks/mock-llm-client.ts`)

```typescript
import type { LLMClient, CompletionOptions } from '../../providers/types'

export class MockLLMClient implements LLMClient {
  readonly provider = 'openai' as const
  private responses: Map<string, string>
  public calls: Array<{ prompt: string; options?: CompletionOptions }> = []

  constructor(responses: Record<string, string> = {}) {
    this.responses = new Map(Object.entries(responses))
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    this.calls.push({ prompt, options })

    for (const [key, response] of this.responses) {
      if (prompt.includes(key)) return response
    }

    throw new Error(
      `MockLLMClient: no response matched. Prompt starts with: "${prompt.slice(0, 100)}"\n` +
      `Registered keys: ${[...this.responses.keys()].join(', ')}`
    )
  }
}
```

---

## Required Test Cases

### Research Engine Tests (`lib/__tests__/research-engine.test.ts`)

- **Happy path with URL:** mock fetch returns HTML, mock LLM returns valid ResearchResult JSON → result passes Zod schema, sources array contains the URL
- **Multi-URL:** two URLs, both succeed → text from both combined, both URLs in sources
- **One URL fails:** one fetch throws, one succeeds → result has `partialSources: true`, only successful URL in sources
- **All URLs fail:** both fetches throw → throws `FetchError`
- **No URLs:** skips fetch, LLM called with no-URL prompt → result has `researchUnverified: true`
- **Invalid LLM JSON on attempt 1:** first call returns invalid JSON, second call returns valid JSON → result returned after retry
- **Zod failure on attempt 1:** first call returns JSON missing required field, second call returns complete JSON → result returned after retry
- **Two consecutive failures:** both calls return invalid JSON → throws `ExtractionError`
- **Timeout:** fetch throws AbortError after 15s → treated as failed URL

### Skill Builder Tests (`lib/__tests__/skill-builder.test.ts`)

- **SKILL.md snapshot:** given Blue Ocean Strategy ResearchResult fixture, SKILL.md output matches committed snapshot
- **Template snapshot:** given first tool from Blue Ocean fixture, template file contains `artifactStructure` verbatim
- **File count:** given 21-tool ResearchResult, total file count = 1 SKILL.md + 1 README.md + 21 templates + 21 samples + 29 prompts (provided by Prompt Engine) + scripts = correct total
- **Description truncation:** if summary first sentence > 150 chars, SKILL.md description field is truncated to 150 chars
- **Unverified banner:** if `researchUnverified: true`, SKILL.md contains unverified warning text

### Prompt Engine Tests (`lib/__tests__/prompt-engine.test.ts`)

- **Pre-filter — matrix:** `getFrameworkCandidates({ artifactType: 'matrix' }, 'any topic')` returns array containing 'Structured Output' and 'Artifact Production'
- **Pre-filter — analysis:** returns array containing 'Chain of Thought' and 'Step-Back Prompting'
- **Domain modifier — strategy:** topic containing "strategy" adds 'Step-Back Prompting' and 'Metacognitive Prompting' to candidates
- **Complexity modifier:** tool with 4 inputs and 4 outputs adds 'Prompt Chaining' and 'Skeleton-of-Thought'
- **Framework selection validation:** selected framework not in candidates list → filtered out; if nothing remains, first two candidates used as fallback
- **Prompt count — Blue Ocean:** 21 tools, 3 categories → exactly 29 prompt files generated
- **Prompt count — simple:** 3 tools, 1 category → exactly 8 prompt files generated (3 + 1 + 4 meta)
- **Cross-category synthesis:** 3+ distinct categories → 6th meta prompt file present
- **No external references:** grep all generated prompt file content for `resources/` → zero matches

### Pipeline Tests (`lib/__tests__/pipeline.test.ts`)

- **Confirmation gate:** `requireConfirmation: true` → returns `{ stage: 'awaiting-confirmation', researchResult }` before writing
- **Full pipeline — no write:** `writeToDisk: false` → returns complete result, no files on disk
- **Full pipeline — write:** `writeToDisk: true` → returns complete result, skill directory exists on disk
- **Validation failure halts write:** if validation returns `valid: false` → write not called, `writeResult` undefined in response
- **Atomic write — cleanup on failure:** mock `fs.rename` to throw → temp directory removed, output directory untouched
- **Tool filter:** `selectedToolNames: ['Strategy Canvas']` → only 'Strategy Canvas' tool in skillDirectory

### Quality Score Tests (`lib/__tests__/quality-score.test.ts`)

- **Blue Ocean fixture:** fully populated skill directory → total score > 80
- **Template fixture:** `skills/_template` directory → total score < 40
- **Description quality — all criteria met:** imperative first sentence, ≤150 chars, trigger in first 80 → 25/25
- **Missing description:** no description field → dimension score = 0, feedback message contains "Required frontmatter field"
- **Broken link:** `linked-skills` references non-existent slug → feedback message contains "not found in catalog"

---

## Wizard Implementation Details

### sessionStorage Persistence

On every `dispatch` call, serialize state to `sessionStorage.setItem('skill-mall-wizard', JSON.stringify(state))`.

On mount (`useEffect` with `[]` deps), attempt to read and parse from sessionStorage. If parsing fails or Zod validation of the stored state fails, reset to `INITIAL_WIZARD_STATE`. Do not crash — always fall back to initial state.

### Step 1 → Step 2 Transition

```typescript
async function advanceToStep2(state: WizardState, dispatch: Dispatch<WizardAction>) {
  dispatch({ type: 'SET_LOADING', loading: true })
  dispatch({ type: 'SET_ERROR', error: null })

  try {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: state.topic, sourceUrls: state.sourceUrls }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message ?? 'Research failed')
    }

    const researchResult = await response.json()
    dispatch({ type: 'SET_RESEARCH_RESULT', result: researchResult })
    dispatch({ type: 'NEXT_STEP' })
  } catch (err) {
    dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Research failed' })
  } finally {
    dispatch({ type: 'SET_LOADING', loading: false })
  }
}
```

### Step 5 → Step 6 Transition

Same pattern, calls POST /api/confirm-research with `{ researchResult, metadata: { slug, category, tags, targetAgents }, selectedToolNames, selectedMetaTypes }`.

On success: `dispatch({ type: 'SET_PREVIEW', directory: result.skillDirectory, skillMd: previewText })` then `dispatch({ type: 'NEXT_STEP' })`.

### Step 6 Confirm

Calls POST /api/create-skill. On success: `router.push(`/skills/${meta.category}/${meta.slug}`)`.

### Provider Not Configured Check

On wizard mount, call GET /api/providers. If `configured: false`, show provider setup prompt before rendering Step 1.

---

## CLI Implementation Details

### npx skill-mall configure (non-interactive)

```bash
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6
# Writes ~/.skill-mall/config.json

npx skill-mall configure --provider openai --key sk-... --model gpt-4o
# Validates key with a minimal test call before writing
```

### npx skill-mall configure (interactive)

Uses `@inquirer/prompts` (or existing CLI prompt library). Flow:
1. Select provider (list: OpenAI, Claude Code CLI, Google Gemini, Groq, Ollama)
2. If requiresApiKey: prompt for API key (hidden input)
3. Select model (default highlighted)
4. Write to `~/.skill-mall/config.json`
5. For claude-code: validate by running `claude --version`. If not found, print setup instructions.

### npx skill-mall create

```
npx skill-mall create "<topic>" [--urls <url1> <url2>] [--category <cat>] [--author <name>]
```

Output directory: `./skill-builder-output/<slug>/`

Exit codes: 0 on success, 1 on provider not configured, 2 on all URLs failed, 3 on extraction failure.

### npx skill-mall confirm-research

```
npx skill-mall confirm-research <slug>
```

Reads `./skill-builder-output/<slug>/research-result.json`. Validates with ResearchResultSchema. Runs Skill Builder + Prompt Engine. Optimizes all prompts. Validates. Atomic write to `skills/<category>/<slug>/`. Prints:
```
Created: skills/business/blue-ocean-strategy/
  Files written: 73
  Prompts: 29
  Quality score: 87/100
```

---

## Task Cards

---

### T001 — Provider Abstraction Layer

**Type:** Worker  
**Depends on:** nothing — start immediately

**Objective:** Implement the complete multi-provider LLM abstraction layer. When T001 is complete, any lib/ function can call `createLLMClient(resolveProviderConfig())` and get a working LLMClient regardless of which provider the user configured.

**Implementation:** Follow the TypeScript interfaces, provider implementations, config resolution logic, and default models specified in the sections above: "All Shared TypeScript Types — Provider Types," "Provider Implementation Details," and the ClaudeCodeClient implementation. Every field, method, and behavior is specified. Write it exactly as specified.

**Allowed files:**
```
lib/providers/types.ts
lib/providers/defaults.ts
lib/providers/openai.ts
lib/providers/claude-code.ts
lib/providers/gemini.ts
lib/providers/groq.ts
lib/providers/ollama.ts
lib/providers/index.ts
lib/providers/__tests__/providers.test.ts
lib/providers/__tests__/config-resolution.test.ts
```

**Test cases:**
- `createLLMClient({ provider: 'openai', apiKey: 'test', model: 'gpt-4o' })` → returns instance of OpenAIClient
- `createLLMClient({ provider: 'claude-code', model: 'claude-sonnet-4-6' })` → returns instance of ClaudeCodeClient (no apiKey required)
- `createLLMClient({ provider: 'invalid' as any })` → throws Error containing 'Unknown provider'
- `resolveProviderConfig()` with `SKILL_MALL_PROVIDER=openai`, `SKILL_MALL_API_KEY=sk-test`, `SKILL_MALL_MODEL=gpt-4o-mini` in env → returns `{ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' }`
- `resolveProviderConfig()` with env vars unset but valid `~/.skill-mall/config.json` present → reads from config file
- `resolveProviderConfig()` with neither env vars nor config file → throws ConfigError containing 'No LLM provider configured'
- `resolveProviderConfig()` with env `SKILL_MALL_PROVIDER=openai` but no `SKILL_MALL_MODEL` → uses DEFAULT_MODELS.openai = 'gpt-4o'

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test lib/providers` all pass
- `cat lib/providers/claude-code.ts | grep 'anthropic'` → 0 matches (no Anthropic SDK import)
- `cat lib/providers/claude-code.ts | grep 'api.anthropic.com'` → 0 matches

**Stop if:**
- `claude --print --help` shows `--print` is not a valid flag — check `claude --help`, find the correct non-interactive flag, report the correct flag name before continuing
- `openai` npm package conflicts with existing package.json — report the conflict and version info before resolving
- Need files outside allowed_files

---

### T002 — Nothing Design System Tokens

**Type:** Worker  
**Depends on:** nothing — run in parallel with T001

**Objective:** Establish all Nothing design system foundations: CSS custom properties, Tailwind config extension, Google Fonts loading, dark mode toggle, and all four animation keyframes. When T002 is complete, every UI task can use `var(--bg)`, `font-display`, `sm-accent` Tailwind classes, and the four animation class names without any further setup.

**Implementation:** Follow the CSS custom properties, Tailwind config extension, and Google Fonts loading specifications in the "Nothing Design System Specification" section above. Every value is specified — use it exactly.

**Allowed files:**
```
app/globals.css
tailwind.config.ts
app/layout.tsx
lib/design-tokens.ts
```

`lib/design-tokens.ts` exports the design token values as a TypeScript object for any component that needs them programmatically (e.g., for Chart.js colors).

**Test cases (visual — verified in smoke test, not Vitest):**
- Navigate to `localhost:3000` in light mode: background is `#F5F5F5`, not white, not black
- Toggle dark mode button: `<html data-theme="dark">` appears in DOM, background becomes `#000000`
- Page uses Space Grotesk for body text (visible in browser DevTools Computed Styles)
- No errors in browser console about failed font loads

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `grep -r 'var(--bg)' app/globals.css` → exists
- `grep -r 'scanReveal' app/globals.css` → exists
- `grep -r 'dotoCount' app/globals.css` → exists
- `grep -r 'segmentFill' app/globals.css` → exists
- `grep -r 'charReveal' app/globals.css` → exists
- `grep -r 'Doto' app/layout.tsx` → exists (font loading)
- `grep -r '#00.*green\|green-\|purple-\|#8B5CF6' app/globals.css` → 0 matches

**Stop if:**
- Doto variable font URL returns 404 from Google Fonts — find the correct URL from fonts.google.com and use it
- Tailwind config extension breaks existing shadcn component styles — isolate the conflict and resolve before continuing
- Need files outside allowed_files

---

### T003 — Homepage

**Type:** Worker  
**Depends on:** T002

**Objective:** Build the SkillMall homepage. Light hero with headline and CTAs. Doto stat counter row (dot-matrix animations, three counters: skills, categories, agents). "What is a skill?" three-column explainer. Catalog preview with search bar and skill card grid. All Nothing design rules from the Design Rules section above enforced.

**Implementation:** Reference the UI mockup at `.superpowers/brainstorm/45530-1779038737/content/ui-v4.html` for visual direction. Honor the intent. The homepage hero stays light — `--bg` background with `--text-display` headline. One topbar only. Three Doto counters below the hero (not in the hero) as the instrument-panel moment. Each counter: large Doto number + Space Mono ALL CAPS label + segmented bar beneath. Search bar uses underline style. Skill cards show quality score as a small segmented indicator.

**Allowed files:**
```
app/page.tsx
components/skill-mall/homepage/HeroSection.tsx
components/skill-mall/homepage/StatCounters.tsx
components/skill-mall/homepage/WhatIsASkill.tsx
components/skill-mall/homepage/CatalogPreview.tsx
components/skill-mall/stats-banner.tsx
components/skill-mall/skill-card.tsx
components/skill-mall/category-nav.tsx
components/skill-mall/search-bar.tsx
```

**Test cases (visual — smoke test):**
- Hero background is `#F5F5F5` in light mode, NOT black or dark
- Three Doto counters animate from 0 to their target value on page load
- Dot-matrix scan reveal animation fires on section entry
- Skill cards show staggered segmented bar fill
- Dark mode toggle switches all token values correctly
- No green or purple anywhere on the page

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `grep -rn 'bg-green\|text-green\|bg-purple\|text-purple\|#00.*\|#8B5CF6\|gradient\|shadow-\|box-shadow' components/skill-mall/homepage/` → 0 matches
- `grep -rn 'toast\|Toast\|skeleton\|Skeleton' components/skill-mall/homepage/` → 0 matches
- `grep -rn 'nav.*nav\|NavBar.*TopBar\|secondary.*nav' app/page.tsx` → 0 matches (one topbar only)

**Stop if:**
- Animation causes Cumulative Layout Shift (CLS) detectable in Lighthouse — diagnose root cause before continuing
- Need files outside allowed_files

---

### T004 — Wizard UI Steps 1–2 and Skill Detail Page

**Type:** Worker  
**Depends on:** T002

**Objective:** Build the Skill Creation Wizard UI for Steps 1 and 2 (UI shell only — no API calls wired yet, those happen in T005 and T012). Build the Skill Detail page.

**Step 1 implementation:** Topic input field — underline style, label `[ SKILL TOPIC ]` in Space Mono. Zero URL inputs on load. `[ + ADD SOURCE URL ]` button appends one new URL input. URL inputs are underline style, label `[ SOURCE URL ]`. DO NOT initialize URL inputs via HTML `value` attribute inside animated containers — use React state set in `useEffect` after mount.

**Step 2 implementation:** Left panel = large Doto number (tool count) on dark background with dot-grid texture. Right panel = extracted tool cards on light background. Each card: tool name, category badge, artifact type tag, collapsible DETAILS section showing inputs/outputs/how-used. `[ ADD MORE TOOLS ]` collapsed section for tools beyond the first 5. Continue button (`[ CONTINUE ]`) disabled until at least one tool card has had DETAILS expanded. Counter below tool list: `[ X TOOLS ] / [ ~Y PROMPTS ]`.

**Skill Detail implementation:** Quality score as dark inverted panel — Doto number as hero (this is the one high-contrast element on this page). All other content on light `--surface`. Bracket-notation tab bar: `[ OVERVIEW ]`, `[ PROMPTS ]`, `[ TEMPLATES ]`, `[ DEPLOY ]`. Prompts tab: grouped by plain-English use case, NOT by PE framework name. Framework names accessible in a collapsed DETAILS section per prompt card. Complexity indicated by color-coded dot in a fixed-width column (blue = quick, grey = thorough, red = exhaustive).

**Allowed files:**
```
app/skills/create/page.tsx
app/skills/[category]/[slug]/page.tsx
components/skill-mall/wizard/Step1Topic.tsx
components/skill-mall/wizard/Step2Research.tsx
components/skill-mall/wizard/Step3Metadata.tsx
components/skill-mall/wizard/Step4Preview.tsx
components/skill-mall/wizard/Step5PromptOptions.tsx
components/skill-mall/wizard/Step6Confirm.tsx
components/skill-mall/deploy-button.tsx
components/skill-mall/category-badge.tsx
```

**Test cases (visual — smoke test):**
- Step 1: zero URL inputs visible on load
- Step 1: clicking `[ + ADD SOURCE URL ]` adds exactly one input
- Step 2: Continue button has `disabled` attribute and is visually distinct
- Step 2: expanding DETAILS on one tool card enables the Continue button
- Step 2: research result block has NO dark background (only the tool count panel is dark)
- Skill Detail: quality score panel has dark background, body text achieves ≥ 4.5:1 contrast ratio on that dark background
- Skill Detail: character-by-character reveal animation plays on skill title
- Skill Detail: no toast popups triggered by any user action

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `grep -rn 'value=.*url\|defaultValue=.*url' components/skill-mall/wizard/Step1Topic.tsx` → 0 matches (no pre-populated URL values)

**Stop if:**
- Need files outside allowed_files

---

### T005 — Wizard State Management and Session Persistence

**Type:** Worker  
**Depends on:** T004

**Objective:** Implement the WizardContext (useReducer + React Context), sessionStorage persistence, and step transition logic. Step 1→2 and Step 5→6 transitions call API stubs for now — they are wired to real API routes in T012.

**Implementation:** Follow the WizardState, WizardAction, and INITIAL_WIZARD_STATE types defined in "All Shared TypeScript Types — Wizard State Types" above. Follow the sessionStorage persistence logic and step transition implementations in "Wizard Implementation Details" above. Use these exactly.

**Allowed files:**
```
components/skill-mall/wizard/WizardContext.tsx
components/skill-mall/wizard/useWizard.ts
components/skill-mall/wizard/__tests__/wizard-state.test.ts
app/skills/create/page.tsx
```

**Test cases:**
- Initial state matches `INITIAL_WIZARD_STATE` exactly
- `NEXT_STEP` from step 1 → state.step becomes 2
- `PREV_STEP` from step 3 → state.step becomes 2
- `ADD_URL` with url "https://example.com" → state.sourceUrls contains "https://example.com"
- `SET_RESEARCH_RESULT` with fixture ResearchResult → state.researchResult equals the fixture AND state.selectedToolNames equals all tool names from the fixture
- `SET_LOADING: true` → state.isLoading is true, subsequent `SET_LOADING: false` → state.isLoading is false
- `RESET` → state equals INITIAL_WIZARD_STATE
- State after `SET_RESEARCH_RESULT` is serialized to sessionStorage (check localStorage.getItem mock)
- On mount with valid sessionStorage data → state hydrated from sessionStorage
- On mount with invalid sessionStorage JSON → state reset to INITIAL_WIZARD_STATE, no throw

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test components/skill-mall/wizard` all pass

**Stop if:**
- Need files outside allowed_files

---

### T006 — UI Approval Gate (Judge)

**Type:** Judge  
**Depends on:** T003, T004, T005

**Objective:** Audit the UI against the Nothing design spec, the ui-v4.html mockup, and the design rules in this plan. This gate blocks all pipeline tasks. If the audit fails, report specific file:line issues. If it passes, confirm pipeline tasks may activate.

**Do not approve if any of the following are true:**
- Hero background is dark or inverted (`background: #000` or `background-color: var(--text-display)` in hero component)
- Green or purple appears anywhere (`#00...`, Tailwind `green-*`, `purple-*`, `#8B5CF6`)
- Dot-matrix counter animations missing from homepage
- URL input pre-populated or rendered before mount animation completes
- Continue button not disabled on Step 2 initial render
- Research result display block has a dark background (only the tool-count panel should be dark)
- Quality score panel contrast fails 4.5:1 (check with browser accessibility tools)
- `npm run build` is not passing

**Expected output:**
- `approved | rejected`
- If rejected: specific failing items with file and line number
- If approved: written confirmation that T007 (Research Engine) may activate

---

### T007 — Research Engine

**Type:** Worker  
**Depends on:** T001, T006 approval

**Objective:** Implement the Research Engine: URL fetching, text extraction, LLM extraction call, Zod validation, retry logic, multi-URL parallel handling, no-URL fallback.

**Implementation:** Follow the Research Engine Implementation section in this plan exactly. Every function signature, error class, retry behavior, and edge case is specified there. The LLM prompt templates to use are in the "All LLM Prompt Templates — Research Extraction Prompt" section. The Zod schemas are in "All Zod Schemas." Use them as written.

**Allowed files:**
```
lib/research-engine.ts
lib/validators.ts
lib/__tests__/research-engine.test.ts
lib/__tests__/fixtures/research-result-blue-ocean.json
lib/__tests__/fixtures/research-result-no-urls.json
lib/__tests__/mocks/mock-llm-client.ts
lib/__tests__/mocks/mock-fetch.ts
```

**Test cases:** All 9 test cases listed in "Required Test Cases — Research Engine Tests" above must pass.

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test lib/__tests__/research-engine` all pass
- `grep -n 'import.*anthropic\|require.*anthropic' lib/research-engine.ts` → 0 matches

**Stop if:**
- `cheerio` installation conflicts with existing package.json — report version conflict before resolving
- Need files outside allowed_files

---

### T008 — Skill Builder

**Type:** Worker  
**Depends on:** T007 (ResearchTool types must be committed)

**Objective:** Implement the Skill Builder: SKILL.md generation (deterministic), template generation (deterministic), sample generation (one LLM call per tool, run in parallel), README generation, script generation, InMemorySkillDirectory assembly.

**Implementation:** Follow the Skill Builder Implementation section in this plan exactly. The SKILL.md generator, template generator, sample generator, and public API function are all specified there with implementation code. Use them as written.

**Allowed files:**
```
lib/skill-builder.ts
lib/__tests__/skill-builder.test.ts
lib/__tests__/fixtures/research-result-blue-ocean.json
lib/__tests__/fixtures/skill-directory-blue-ocean.json
```

**Test cases:** All 5 test cases listed in "Required Test Cases — Skill Builder Tests" above must pass.

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test lib/__tests__/skill-builder` all pass
- `grep -n 'import.*research-engine\|from.*research-engine' lib/skill-builder.ts` → 0 matches (Skill Builder does not import Research Engine — it only receives ResearchResult as a parameter)

**Stop if:**
- ResearchTool type from T007 has different fields than `ResearchTool` defined in this plan — resolve the type mismatch with T007 Worker before continuing; do not change the type definition
- Need files outside allowed_files

---

### T009 — Prompt Engine

**Type:** Worker  
**Depends on:** T007 (ResearchResult and ResearchTool types must be committed), T008 can run in parallel

**Objective:** Implement the Prompt Engine: framework pre-filter by artifact type, LLM framework selection from candidates, LLM prompt body generation, category prompt generation, meta prompt generation (5 standard + optional 6th cross-category synthesis), Prompt Optimizer integration.

**Implementation:** Follow the Prompt Engine Implementation section, the Framework Library section (`lib/pe-frameworks.ts`), and the LLM Prompt Templates for framework selection and prompt body generation. All data structures (FRAMEWORK_CANDIDATES, DOMAIN_MODIFIER_RULES, FRAMEWORK_DESCRIPTIONS) are specified in this plan — copy them exactly. The selection prompt and body generation prompt are specified word-for-word in "All LLM Prompt Templates."

**Allowed files:**
```
lib/prompt-engine.ts
lib/pe-frameworks.ts
lib/__tests__/prompt-engine.test.ts
lib/__tests__/fixtures/framework-selection-response.json
lib/__tests__/fixtures/prompt-body-response.txt
```

**Test cases:** All 8 test cases listed in "Required Test Cases — Prompt Engine Tests" above must pass.

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test lib/__tests__/prompt-engine` all pass
- `grep -rn 'resources/' lib/prompt-engine.ts` → 0 matches (prompt bodies never reference resources/ paths)

**Stop if:**
- Framework selection returns the same framework for all 6 artifact types in tests (indicates pre-filter not applied or hardcoded defaults) — diagnose before continuing
- Need files outside allowed_files

---

### T010 — Prompt Optimizer

**Type:** Worker  
**Depends on:** T001 (LLMClient interface), can run in parallel with T008 and T009

**Objective:** Implement the Prompt Optimizer: 4-dimension LLM audit call with structured output, Zod validation of audit response, token count estimation, failure fallback (return unoptimized prompt with `optimizationFailed: true` on LLM error).

**Implementation:** Follow the Optimizer Types (PromptAudit interface) and the "All LLM Prompt Templates — Prompt Optimizer Audit Prompt" section. The audit prompt is specified word-for-word — use it exactly. Token count estimation formula: `Math.ceil(text.split(/\s+/).length * 1.35)`. On LLM call failure, return `{ ...emptyAudit, optimizedPrompt: promptText, optimizationFailed: true }` — do not throw.

**Allowed files:**
```
lib/prompt-optimizer.ts
lib/__tests__/prompt-optimizer.test.ts
lib/__tests__/fixtures/prompt-audit-response.json
```

**Test cases:** All 3 test cases in "Required Test Cases — not explicitly listed but implied" for optimizer:
- Successful audit: mock LLM returns valid audit JSON → PromptAudit object with all fields populated
- Zod validation failure on LLM response → retry once (2 total calls to mock LLM); second call succeeds → result returned
- LLM throws on both calls → returns `{ optimizedPrompt: originalPrompt, optimizationFailed: true }` without throwing

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test lib/__tests__/prompt-optimizer` all pass

**Stop if:**
- Need files outside allowed_files

---

### T011 — Pipeline Orchestration and API Routes

**Type:** Worker  
**Depends on:** T007, T008, T009, T010

**Objective:** Wire the 5-stage pipeline (lib/pipeline.ts). Implement atomic write. Implement AgentSkills spec validation. Build all 6 API routes: GET /api/providers, POST /api/providers/configure, POST /api/research, POST /api/confirm-research, POST /api/create-skill, POST /api/optimize-prompt.

**Implementation:** Follow the Pipeline Orchestration section (runPipeline, atomicWrite, validateSkillDirectory) and the API Routes Specification section. Every function, error condition, and response shape is specified. Use them exactly.

**Allowed files:**
```
lib/pipeline.ts
lib/__tests__/pipeline.test.ts
app/api/providers/route.ts
app/api/providers/configure/route.ts
app/api/research/route.ts
app/api/confirm-research/route.ts
app/api/create-skill/route.ts
app/api/optimize-prompt/route.ts
app/api/__tests__/
```

**Test cases:** All 7 test cases in "Required Test Cases — Pipeline Tests" above must pass. Additionally:
- POST /api/research with `SKILL_MALL_PROVIDER` unset → 503 with `{ error: 'provider_not_configured' }`
- POST /api/research with `{ topic: '' }` → 400 with `{ error: 'invalid_input' }`
- POST /api/create-skill on success → skill directory exists at `skills/<category>/<slug>/`

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test lib/__tests__/pipeline` all pass
- `npm test app/api/__tests__` all pass
- `grep -rn 'circular\|import.*pipeline.*from.*pipeline' lib/pipeline.ts` → 0 matches (no circular imports)

**Stop if:**
- Circular dependency detected between pipeline stages (TypeScript import cycle) — restructure types into a shared types file before continuing
- `fs.rename` does not work atomically across different filesystems in test environment — investigate and document the behavior
- Need files outside allowed_files

---

### T012 — Wire Wizard to Real API Routes

**Type:** Worker  
**Depends on:** T005 (wizard state management), T011 (API routes live)

**Objective:** Replace API stubs in WizardContext with real calls to POST /api/research (Step 1→2) and POST /api/confirm-research (Step 5→6). Wire Step 6 confirm button to POST /api/create-skill. Add provider configuration check on wizard load.

**Implementation:** Follow the step transition implementations in "Wizard Implementation Details" above — `advanceToStep2` and the Step 5→6 and Step 6 confirm implementations are specified there. Add `useEffect` on wizard mount that calls GET /api/providers — if `configured: false`, render a provider setup prompt with a link to `/settings/providers` instead of Step 1.

**Allowed files:**
```
components/skill-mall/wizard/WizardContext.tsx
components/skill-mall/wizard/useWizard.ts
app/skills/create/page.tsx
app/settings/providers/page.tsx
```

**Test cases (smoke test only — no Vitest for network calls):**
- Step 1 → Step 2: with provider configured and valid topic, research call completes, tool cards display
- Step 1 → Step 2: network error → error message displays inline on Step 1, user stays on Step 1
- Provider not configured: wizard mounts, provider check returns `configured: false` → setup prompt shown, not Step 1

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- End-to-end smoke test: complete all 6 wizard steps with a real LLM provider configured, skill written to `skills/` directory

**Stop if:**
- Need files outside allowed_files

---

### T013 — CLI Commands

**Type:** Worker  
**Depends on:** T011

**Objective:** Implement `npx skill-mall configure` (interactive and non-interactive), `npx skill-mall create`, and `npx skill-mall confirm-research`. Update `npx skill-mall validate` with new schema.

**Implementation:** Follow the CLI Implementation Details section above — configure command flow, create command flow with research-result.json write, confirm-research command flow with pipeline run and write. Exit codes are specified (0, 1, 2, 3). Output format for confirm-research is specified.

**Allowed files:**
```
cli/src/commands/create.ts
cli/src/commands/configure.ts
cli/src/commands/confirm-research.ts
cli/src/commands/validate.ts
cli/src/commands/new.ts
cli/src/utils.ts
cli/src/index.ts
```

**Verify:**
- `cd cli && npm run type-check` exits 0
- `cd cli && npm run build` exits 0
- `npx skill-mall configure --provider claude-code --model claude-sonnet-4-6` → `~/.skill-mall/config.json` contains `{ "provider": "claude-code", "model": "claude-sonnet-4-6" }`
- `npx skill-mall validate skills/_template` exits 0 with "0 errors"
- `npx skill-mall create "test topic"` with no provider configured → exits 1 with helpful setup message
- SKILL.md generated by `confirm-research` matches format generated by web wizard (same `generateSkillMd` function called by both paths)

**Stop if:**
- `confirm-research` and the web wizard produce different SKILL.md formats — they must call the same `generateSkillMd` from `lib/skill-builder.ts`, not maintain separate implementations
- Need files outside allowed_files

---

### T014 — Skill Quality Score

**Type:** Worker  
**Depends on:** T011

**Objective:** Implement the automated quality scoring rubric and display it on skill cards and the skill detail page.

**Implementation:** Follow the Quality Score Rubric section in this plan exactly. Every dimension, every criterion, and every point value is specified. The `QualityScore` and `DimensionScore` interfaces are in "All Shared TypeScript Types." The feedback message format is specified ("specific issue (-N)" format). Do not deviate from these values.

**Allowed files:**
```
lib/quality-score.ts
lib/__tests__/quality-score.test.ts
components/skill-mall/quality-badge.tsx
app/skills/[category]/[slug]/page.tsx
```

**Test cases:** All 5 test cases in "Required Test Cases — Quality Score Tests" above must pass.

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `npm test lib/__tests__/quality-score` all pass
- Quality badge renders as Doto number on skill cards
- Skill detail page shows per-dimension breakdown with feedback messages

**Stop if:**
- Need files outside allowed_files

---

### T015 — /optimize and /prompt-library Pages

**Type:** Worker  
**Depends on:** T011

**Objective:** Build the `/optimize` page (accepts prompt text, calls POST /api/optimize-prompt, shows 4-dimension audit and word-level diff of optimized vs original) and the `/prompt-library` page (browsable framework library seeded from the 40+ frameworks in `lib/pe-frameworks.ts`).

**Implementation:** `/optimize` UI: text area for prompt input, submit button `[ OPTIMIZE ]`, results panel showing 4 dimension scores as segmented bars, missing intent dimensions listed, word-level diff rendered with removed words struck through and changed words highlighted (use `--accent` for deletions, `--blue` for changes). `/prompt-library`: one card per framework in `FRAMEWORK_DESCRIPTIONS`. Filterable by category (reasoning, context, structure, output, meta) using bracket-notation filter chips.

**Allowed files:**
```
app/optimize/page.tsx
app/prompt-library/page.tsx
lib/prompt-templates/
components/skill-mall/optimizer/PromptInput.tsx
components/skill-mall/optimizer/AuditResults.tsx
components/skill-mall/optimizer/WordDiff.tsx
```

**Verify:**
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds
- `/optimize` accepts pasted prompt text and shows audit results
- `/prompt-library` shows all 40+ framework entries (count visible in `[ X FRAMEWORKS ]` bracket label)
- `/prompt-library` filter by "reasoning" shows only reasoning-category frameworks

**Stop if:**
- Need files outside allowed_files

---

### T016 — CI/CD Validation Action

**Type:** Worker  
**Depends on:** T013

**Objective:** Implement `skill-mall/validate-action@v1` as a GitHub Action that runs on PRs touching `skills/`. Discovers changed skill directories from PR diff, runs `validate-skill.sh --strict` per skill, posts structured report as PR comment, blocks merge on any error.

**Allowed files:**
```
.github/workflows/validate-skills.yml
.github/actions/skill-mall-validate/action.yml
scripts/validate-skill.sh
package.json
```

**Verify:**
- `yamllint .github/workflows/validate-skills.yml` exits 0 (if yamllint installed; else validate with `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/validate-skills.yml'))"`)
- `bash scripts/validate-skill.sh --strict skills/ai/skill-creator` exits 0
- `package.json` validate script calls `bash scripts/validate-skill.sh`

**Stop if:**
- Need files outside allowed_files

---

### T017 — Phase 1 Documentation

**Type:** Worker  
**Depends on:** T012 (wizard wired), T013 (CLI commands implemented)

**Objective:** Write all Phase 1 documentation deliverables. These are production-quality, not stubs. Minimum 500 words per document. Every code example in the docs must work.

**Allowed files:**
```
docs/user/configuring-providers.md
docs/user/using-the-wizard.md
docs/user/using-the-cli.md
docs/reference/pipeline-architecture.md
docs/reference/provider-catalog.md
docs/reference/research-result-schema.md
docs/reference/prompt-file-format.md
docs/reference/quality-score-rubric.md
docs/reference/api-routes.md
README.md
CONTRIBUTING.md
```

Plus JSDoc on all exported functions in:
```
lib/providers/index.ts
lib/research-engine.ts
lib/skill-builder.ts
lib/prompt-engine.ts
lib/prompt-optimizer.ts
lib/pipeline.ts
lib/quality-score.ts
```

**Content requirements per document:**
- `docs/user/configuring-providers.md`: setup steps for all 5 providers with exact commands and where to get API keys. Claude Code CLI setup must specify `claude auth` step.
- `docs/reference/api-routes.md`: all 6 routes with exact request body schema, response schema, and all error codes. Must match the API Routes Specification section of this plan.
- `docs/reference/research-result-schema.md`: the full ResearchResult and ResearchTool TypeScript interfaces with field descriptions and examples.
- `docs/reference/quality-score-rubric.md`: every dimension, every criterion, every point value, and example feedback messages from the Quality Score Rubric section of this plan.
- `README.md`: updated with pipeline overview diagram (ASCII), quick-start (configure provider → run wizard or CLI), and links to all new docs.

**Verify:**
- All 9 new doc files exist
- `wc -w docs/user/configuring-providers.md` → >= 500 words
- `wc -w docs/reference/api-routes.md` → >= 500 words
- Every code snippet in the docs that invokes `npx skill-mall` uses a command that actually exists in T013
- No doc references a file that doesn't exist in the codebase

**Stop if:**
- A doc describes an interface that does not match the actual implementation — fix the discrepancy (in the code or the doc, whichever is wrong) before marking T017 done

---

### T018 — Phase 1 Completion Audit (Judge)

**Type:** Judge  
**Depends on:** all T001–T017 receipts

**Objective:** Confirm Phase 1 is fully complete. All 17 Worker tasks done, build passing, tests passing, UI approved, documentation complete.

**Do not mark complete if:**
- Any Worker task T001–T017 has status queued or active
- `npm run build` exits nonzero
- `npm test` exits nonzero
- `npx tsc --noEmit` exits nonzero
- T006 receipt does not show `approved`
- Any doc in T017's allowed_files is missing or contains less than 500 words
- Any Phase 2 feature is present in the codebase

**Expected output:**
- `complete | not_complete`
- `full_outcome_complete: true | false`
- If not_complete: exact list of what is missing or failing
- If complete: confirmation that Phase 2 may begin after James approves

---

## Helper Functions

### toSlug (`lib/utils.ts`)

```typescript
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
```

---

## GoalBuddy Board Creation

```bash
# To create a GoalBuddy board from this plan:
# Run: /goal-prep
# When asked for input: reference this file
# Slug: skillmall-phase1
# Input shape: existing_plan
# File: docs/superpowers/plans/PHASE-1-PLAN.md
#
# Task type summary for GoalBuddy:
# T001–T005: Worker (Foundation + UI)
# T006: Judge (UI Approval Gate)
# T007–T017: Worker (Pipeline, CLI, Quality, Docs)
# T018: Judge (Completion Audit)
```
