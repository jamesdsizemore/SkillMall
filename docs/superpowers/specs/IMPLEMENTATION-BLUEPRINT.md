# SkillMall Implementation Blueprint

**Status:** Authoritative  
**Supersedes:** 2026-05-17-skillmall-feature-expansion-design.md (where they conflict, this document governs)  
**Date:** 2026-05-17

The feature spec describes WHAT to build. This document specifies HOW to build it. Every implementation decision that was left open in the feature spec is resolved here. Workers build from this document, not from the feature spec.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Provider Abstraction Layer](#2-provider-abstraction-layer)
3. [Research Engine](#3-research-engine)
4. [Skill Builder](#4-skill-builder)
5. [Prompt Engine](#5-prompt-engine)
6. [Prompt Optimizer](#6-prompt-optimizer)
7. [Pipeline Orchestration](#7-pipeline-orchestration)
8. [API Routes](#8-api-routes)
9. [Wizard State Management](#9-wizard-state-management)
10. [CLI Architecture](#10-cli-architecture)
11. [Error Handling Strategy](#11-error-handling-strategy)
12. [Testing Strategy](#12-testing-strategy)
13. [Configuration Management](#13-configuration-management)
14. [Documentation Deliverables by Phase](#14-documentation-deliverables-by-phase)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                             │
│  Next.js Wizard (browser)          CLI (npx skill-mall)             │
└──────────────────────┬──────────────────────────┬───────────────────┘
                       │                          │
              API Routes (/api/*)           lib/ modules (direct)
                       │                          │
┌──────────────────────▼──────────────────────────▼───────────────────┐
│                     SHARED lib/ PIPELINE                            │
│                                                                     │
│  lib/providers/          — LLM client abstraction (multi-provider)  │
│  lib/research-engine.ts  — Stage 2: URL fetch + LLM extraction     │
│  lib/skill-builder.ts    — Stage 3: template/file generation        │
│  lib/prompt-engine.ts    — Stage 4: framework selection + prompt gen│
│  lib/prompt-optimizer.ts — Stage 4b: 4-dimension audit              │
│  lib/pipeline.ts         — Orchestration: Stages 1–5               │
│  lib/quality-score.ts    — Post-write: automated rubric             │
│  lib/validators.ts       — Zod schemas for all LLM outputs          │
└─────────────────────────────────────────────────────────────────────┘
                       │
              skills/<category>/<slug>/   (local filesystem write)
```

### Technology Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Existing |
| Language | TypeScript strict mode | Existing |
| Styling | Tailwind CSS + CSS custom properties | Nothing design tokens |
| LLM | Multi-provider (user-supplied) | See Section 2 |
| HTML parsing | cheerio | Lightweight, battle-tested |
| Output validation | zod | Strict LLM output parsing |
| State (wizard) | React Context + useReducer | No external store needed |
| Testing | Vitest + React Testing Library | Faster than Jest for Next.js 15 |
| CLI | commander.js | Existing |
| Atomic writes | tmp dir + fs.rename | POSIX atomic on same filesystem |

---

## 2. Provider Abstraction Layer

### 2.1 Provider Catalog

Users supply their own keys. SkillMall never stores keys server-side in production.

| Provider ID | Name | Auth required | Notes |
|---|---|---|---|
| `openai` | OpenAI | API key | JSON mode supported. gpt-4o recommended. |
| `claude-code` | Claude Code CLI | CLI auth (no API key) | Subprocess invocation via `claude --print`. No Anthropic SDK. No API calls. |
| `gemini` | Google Gemini | API key | gemini-2.0-flash-exp recommended. |
| `groq` | Groq | API key | llama-3.3-70b-versatile. Fast, cheap. |
| `ollama` | Ollama (local) | None | No key. Requires `ollama serve` running. |

Default models per provider:

```typescript
// lib/providers/defaults.ts
export const DEFAULT_MODELS: Record<ProviderID, string> = {
  'openai': 'gpt-4o',
  'claude-code': 'claude-sonnet-4-6',
  'gemini': 'gemini-2.0-flash-exp',
  'groq': 'llama-3.3-70b-versatile',
  'ollama': 'llama3.1',
}
```

### 2.2 Configuration Resolution

Config is resolved in this order (first match wins):

1. CLI flags: `--provider openai --key sk-... --model gpt-4o`
2. Environment variables: `SKILL_MALL_PROVIDER`, `SKILL_MALL_API_KEY`, `SKILL_MALL_MODEL`
3. Project `.env.local` (web UI / Next.js only)
4. Config file: `~/.skill-mall/config.json`

`.env.local` format:
```
SKILL_MALL_PROVIDER=openai
SKILL_MALL_API_KEY=sk-...
SKILL_MALL_MODEL=gpt-4o
```

Config file format (`~/.skill-mall/config.json`):
```json
{
  "provider": "claude-code",
  "model": "claude-sonnet-4-6",
  "providers": {
    "openai": { "apiKey": "sk-...", "model": "gpt-4o" },
    "claude-code": { "model": "claude-sonnet-4-6" },
    "groq": { "apiKey": "gsk_...", "model": "llama-3.3-70b-versatile" }
  }
}
```

### 2.3 TypeScript Interfaces

File: `lib/providers/types.ts`

```typescript
export type ProviderID = 'openai' | 'claude-code' | 'gemini' | 'groq' | 'ollama'

export interface ProviderConfig {
  provider: ProviderID
  apiKey?: string
  model: string
  baseURL?: string
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

### 2.4 Provider Implementations

#### OpenAI (`lib/providers/openai.ts`)
```typescript
import OpenAI from 'openai'

export class OpenAIClient implements LLMClient {
  readonly provider = 'openai' as const
  private client: OpenAI
  private model: string

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        ...(options?.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.2,
      response_format: options?.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
    })
    return response.choices[0].message.content ?? ''
  }
}
```

#### Claude Code CLI (`lib/providers/claude-code.ts`)

This provider invokes the `claude` CLI binary as a child process. No Anthropic SDK. No HTTP calls to api.anthropic.com. Uses the user's existing Claude Code authentication.

```typescript
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export class ClaudeCodeClient implements LLMClient {
  readonly provider = 'claude-code' as const
  private model: string

  constructor(config: ProviderConfig) {
    this.model = config.model
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt

    const args = ['--print', '--model', this.model, fullPrompt]

    const { stdout } = await execFileAsync('claude', args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: options?.timeoutMs ?? 120_000,
    })

    return stdout.trim()
  }
}
```

**Stop condition for Worker:** if `--print` is not a valid `claude` flag in the installed version, check `claude --help` and use the correct non-interactive flag. The Worker must verify this before assuming the implementation is correct.

#### Groq (`lib/providers/groq.ts`)
Uses OpenAI-compatible SDK with Groq's base URL:
```typescript
import OpenAI from 'openai'
// baseURL: 'https://api.groq.com/openai/v1'
```

#### Gemini (`lib/providers/gemini.ts`)
Uses `@google/generative-ai` SDK or OpenAI-compatible endpoint.

#### Ollama (`lib/providers/ollama.ts`)
Uses OpenAI-compatible SDK with `baseURL: 'http://localhost:11434/v1'`, no API key.

### 2.5 Factory and Resolution

File: `lib/providers/index.ts`

```typescript
export function createLLMClient(config: ProviderConfig): LLMClient {
  switch (config.provider) {
    case 'openai': return new OpenAIClient(config)
    case 'claude-code': return new ClaudeCodeClient(config)
    case 'gemini': return new GeminiClient(config)
    case 'groq': return new GroqClient(config)
    case 'ollama': return new OllamaClient(config)
    default: throw new Error(`Unknown provider: ${(config as ProviderConfig).provider}`)
  }
}

export function resolveProviderConfig(): ProviderConfig {
  const provider = process.env.SKILL_MALL_PROVIDER as ProviderID | undefined
  const apiKey = process.env.SKILL_MALL_API_KEY
  const model = process.env.SKILL_MALL_MODEL

  if (provider) {
    return { provider, apiKey, model: model ?? DEFAULT_MODELS[provider] }
  }

  const configPath = path.join(os.homedir(), '.skill-mall', 'config.json')
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const providerConfig = config.providers?.[config.provider] ?? {}
    return {
      provider: config.provider,
      apiKey: config.apiKey ?? providerConfig.apiKey,
      model: config.model ?? providerConfig.model ?? DEFAULT_MODELS[config.provider],
    }
  }

  throw new ConfigError('No LLM provider configured. Run: npx skill-mall configure')
}
```

---

## 3. Research Engine

File: `lib/research-engine.ts`

### 3.1 URL Fetching and Text Extraction

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

  // Remove navigation, ads, scripts, and other noise
  $('script, style, nav, footer, header, aside, [role="banner"], [role="navigation"], .cookie-banner, .advertisement').remove()

  // Prefer semantic main content regions
  const main = $('main, article, [role="main"], .content, #content, .post-content').first()
  const rawText = (main.length ? main : $('body')).text()

  // Normalize whitespace and cap to fit LLM context budget
  return rawText.replace(/\s+/g, ' ').trim().slice(0, 12_000)
}
```

Multiple URLs are fetched in parallel (Promise.allSettled). Failed URLs are logged with their error. If all URLs fail, the engine throws. If some fail, it proceeds with partial sources and sets `partialSources: true` on the result.

Per-URL character cap: 8,000 chars. Total combined cap: 20,000 chars (truncated proportionally).

### 3.2 Extraction Prompt

System prompt:
```
You are a structured knowledge extraction engine. You extract named tools, frameworks, methodologies, matrices, and principles from domain content. You return only valid JSON. You never invent tools that are not explicitly present in the provided content.
```

User prompt template (with URLs provided):
```
Extract every named tool, framework, matrix, canvas, methodology, and principle from the following content about "${topic}".

Source URL(s): ${urls.join(', ')}

<content>
${combinedText}
</content>

Return a JSON object with this exact structure. No markdown fences, no explanation — raw JSON only:
{
  "topic": string,
  "sources": string[],
  "summary": string,
  "tools": ResearchTool[],
  "principles": string[],
  "suggestedCategory": string,
  "suggestedTags": string[]
}

Where each ResearchTool is:
{
  "name": string,
  "category": string,
  "description": string,
  "artifactType": "matrix" | "canvas" | "grid" | "list" | "flowchart" | "analysis",
  "artifactStructure": string,
  "inputs": string[],
  "outputs": string[],
  "howUsed": string
}

Rules for each field:
- summary: 2-3 sentences. First sentence MUST be imperative ("Apply...", "Run...", "Analyze..."). Max 150 chars for the first sentence.
- artifactStructure: the blank template for this artifact as markdown (table, grid, list, or formatted structure). Labeled columns/rows but no filled-in values.
- howUsed: 2-5 step procedure. Numbered list format.
- suggestedCategory: one of: development | design | writing | research | productivity | infrastructure | ai | business
- suggestedTags: 3-6 tags, lowercase-hyphenated
- Only extract tools explicitly named in the content. Do not infer or invent.
```

No-URL variant (training knowledge fallback): omit `<content>` block, add `researchUnverified: true` to the JSON schema, instruct model to use training knowledge, add warning note to summary.

### 3.3 Zod Validation Schema

File: `lib/validators.ts`

```typescript
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
  suggestedCategory: z.enum(['development','design','writing','research','productivity','infrastructure','ai','business']),
  suggestedTags: z.array(z.string()).min(1).max(8),
  researchUnverified: z.boolean().optional(),
  partialSources: z.boolean().optional(),
})
```

### 3.4 Retry Logic

LLM calls that produce invalid JSON or fail Zod validation are retried once. On retry, the validation error is appended to the prompt:

```
The previous response failed validation with these errors:
${zodError.errors.map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n')}

Correct these issues and return valid JSON.
```

After two failures, throw `ExtractionError` with the last validation error.

### 3.5 Public API

```typescript
export async function runResearchEngine(
  topic: string,
  sourceUrls: string[],
  client: LLMClient
): Promise<ResearchResult>
```

---

## 4. Skill Builder

File: `lib/skill-builder.ts`

The Skill Builder is deterministic for all files except sample outputs. It makes exactly one LLM call per tool (to generate the filled-in sample). Everything else is template-string generation — no LLM involvement.

### 4.1 In-Memory Directory Representation

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
```

### 4.2 File Generation — What Gets Built

For a ResearchResult with N tools:

| File | Count | LLM call? |
|---|---|---|
| `SKILL.md` | 1 | No |
| `README.md` | 1 | No |
| `resources/templates/<tool-slug>.md` | N | No |
| `resources/samples/<tool-slug>-sample.md` | N | Yes (1 per tool) |
| `resources/prompts/` | Provided by Prompt Engine | No |
| `scripts/run-full-analysis.sh` | 1 | No |
| `scripts/generate-<tool-slug>.sh` | N (major tools only, max 5) | No |

### 4.3 SKILL.md Generation (deterministic)

```typescript
function generateSkillMd(result: ResearchResult, meta: SkillMetadata): string {
  const toolIndex = result.tools
    .map(t => `- **${t.name}** (\`${t.artifactType}\`) — ${t.description}`)
    .join('\n')

  const unverifiedBanner = result.researchUnverified
    ? '> **Research unverified** — generated from training knowledge. Provide source URLs for authoritative results.\n\n'
    : ''

  return `---
name: ${meta.slug}
description: "${result.summary.slice(0, 150).replace(/"/g, '\\"')}"
license: MIT
metadata:
  version: "1.0.0"
  author: ${meta.author ?? 'skill-mall'}
  category: ${result.suggestedCategory}
  tags: "${result.suggestedTags.slice(0, 6).join(', ')}"
---

${unverifiedBanner}# ${meta.title ?? result.topic}

${result.summary}

## Tools (${result.tools.length})

${toolIndex}

## Principles

${result.principles.map(p => `- ${p}`).join('\n')}

## Usage

Describe the ${result.topic} task you need to complete. The skill applies the appropriate tool from the toolkit above based on your goal.
`
}
```

### 4.4 Template File Generation (deterministic)

```typescript
function generateTemplate(tool: ResearchTool): string {
  return `# ${tool.name} — Template

**Artifact type:** \`${tool.artifactType}\`

## How to use this template

${tool.howUsed}

## Inputs required

${tool.inputs.map(i => `- ${i}`).join('\n')}

## Template

${tool.artifactStructure}

## Expected outputs

${tool.outputs.map(o => `- ${o}`).join('\n')}
`
}
```

### 4.5 Sample File Generation (LLM call)

One LLM call per tool. The prompt uses the tool's blank template and instructs the model to fill it with illustrative domain examples — not invented fictional data unless the domain canonically uses illustrative examples.

```typescript
async function generateSample(
  tool: ResearchTool,
  topic: string,
  client: LLMClient
): Promise<string> {
  const prompt = `Fill in this blank ${tool.name} template with illustrative examples for the ${topic} domain.

Use domain-appropriate examples. If the domain has canonical examples (e.g., Blue Ocean Strategy uses Cirque du Soleil), use them. Otherwise use generic-but-realistic placeholder values that demonstrate the structure.

Return the completed artifact as markdown. Start directly with the content — no preamble, no explanation.

Template to fill:
${tool.artifactStructure}`

  const filled = await client.complete(prompt, {
    temperature: 0.3,
    maxTokens: 1500,
    systemPrompt: 'You are a domain expert filling in a structured analysis template with illustrative examples. Return only the completed template as markdown.',
  })

  return `# ${tool.name} — Sample Output\n\n*This sample demonstrates a completed ${tool.artifactType} for the ${topic} domain.*\n\n${filled}`
}
```

### 4.6 README.md Generation (deterministic)

Generates a tool index table listing every tool with its artifact type, template filename, sample filename, and the prompt filename that produces it.

### 4.7 Script Generation (deterministic)

`scripts/run-full-analysis.sh` — prints usage instructions and the meta-comprehensive-analysis prompt path.

`scripts/generate-<tool-slug>.sh` — for the first 5 tools only (by order of appearance in ResearchResult). Prints the tool's prompt path with usage instruction.

### 4.8 Public API

```typescript
export async function buildSkillDirectory(
  result: ResearchResult,
  meta: SkillMetadata,
  client: LLMClient
): Promise<InMemorySkillDirectory>
```

---

## 5. Prompt Engine

File: `lib/prompt-engine.ts`

### 5.1 Framework Pre-Filter

Before making any LLM call, a deterministic function narrows the 40+ framework library to 5–8 candidates based on the tool's artifact type and domain characteristics.

```typescript
const BASE_CANDIDATES: Record<ArtifactType, string[]> = {
  matrix: [
    'Structured Output', 'Artifact Production', 'Constrained Generation',
    'Task Decomposition', 'Few-Shot',
  ],
  canvas: [
    'Structured Output', 'Artifact Production', 'Few-Shot',
    'Role / Expert Persona', 'Constrained Generation',
  ],
  grid: [
    'Structured Output', 'Artifact Production', 'Constrained Generation',
    'Batch Prompting',
  ],
  list: [
    'Constrained Generation', 'Task Decomposition', 'Batch Prompting',
    'Structured Output', 'Negative Prompting',
  ],
  flowchart: [
    'Least-to-Most', 'Chain of Thought', 'Task Decomposition',
    'Structured Output',
  ],
  analysis: [
    'Chain of Thought', 'Step-Back Prompting', 'Role / Expert Persona',
    'Tree of Thoughts', 'Self-Critique',
  ],
}

function getFrameworkCandidates(tool: ResearchTool, topic: string): string[] {
  const candidates = [...BASE_CANDIDATES[tool.artifactType]]

  // Complexity modifier: many inputs/outputs → add multi-stage frameworks
  if (tool.inputs.length >= 3 && tool.outputs.length >= 3) {
    candidates.push('Prompt Chaining', 'Skeleton-of-Thought')
  }

  // Domain modifiers (inferred from topic keyword matching)
  const topicLower = topic.toLowerCase()
  if (/strateg|competi|market|business/.test(topicLower)) {
    candidates.push('Step-Back Prompting', 'Metacognitive Prompting')
  }
  if (/process|workflow|operation|pipeline/.test(topicLower)) {
    candidates.push('Least-to-Most', 'PAL (Program-Aided Language Models)')
  }
  if (/customer|interview|user|stakeholder/.test(topicLower)) {
    candidates.push('Role / Expert Persona', 'Emotional Prompting')
  }

  // Deduplicate, cap at 8
  return [...new Set(candidates)].slice(0, 8)
}
```

### 5.2 LLM Framework Selection

From the 5–8 candidates, the LLM selects the optimal framework or combination (max 3).

```typescript
async function selectFramework(
  tool: ResearchTool,
  topic: string,
  candidates: string[],
  client: LLMClient
): Promise<{ selected: string[]; rationale: string }> {
  const candidateDescriptions = candidates
    .map(f => `- **${f}**: ${FRAMEWORK_DESCRIPTIONS[f]}`)
    .join('\n')

  const prompt = `Select the optimal prompt engineering framework(s) for this artifact generation task.

Tool: ${tool.name}
Artifact type: ${tool.artifactType}
Domain: ${topic}
Description: ${tool.description}
Inputs: ${tool.inputs.join(', ')}
Outputs: ${tool.outputs.join(', ')}
How used: ${tool.howUsed}

Candidate frameworks (select from ONLY these):
${candidateDescriptions}

Select 1–3 frameworks that will produce the highest-quality, most complete ${tool.artifactType} output for this specific tool. You may combine frameworks when the combination outperforms any single framework.

Return JSON: { "selected": string[], "rationale": string }
No markdown fences. Raw JSON only.`

  const raw = await client.complete(prompt, {
    responseFormat: 'json_object',
    temperature: 0.1,
    maxTokens: 300,
    systemPrompt: 'You are a prompt engineering expert. Return only valid JSON.',
  })

  const parsed = z.object({
    selected: z.array(z.string()).min(1).max(3),
    rationale: z.string(),
  }).parse(JSON.parse(raw))

  // Validate selected frameworks are from candidates list
  const valid = parsed.selected.filter(f => candidates.includes(f))
  if (valid.length === 0) throw new Error('LLM selected no valid frameworks from candidates')

  return { selected: valid, rationale: parsed.rationale }
}
```

### 5.3 Prompt Body Generation

After framework selection, a second LLM call generates the full, self-contained prompt body.

```typescript
async function generatePromptBody(
  tool: ResearchTool,
  topic: string,
  selectedFrameworks: string[],
  client: LLMClient
): Promise<string> {
  const frameworkGuides = selectedFrameworks
    .map(f => `${f}: ${FRAMEWORK_DESCRIPTIONS[f]}`)
    .join('; ')

  const prompt = `Write a self-contained prompt that an AI agent will use to produce a ${tool.name} artifact for the ${topic} domain.

Selected framework(s) to apply structurally: ${selectedFrameworks.join(', ')}
How to apply them: ${frameworkGuides}

Tool description: ${tool.description}
Artifact type: ${tool.artifactType}
Inputs required: ${tool.inputs.join(', ')}
Expected outputs: ${tool.outputs.join(', ')}
Procedure: ${tool.howUsed}

Artifact structure to embed INLINE (do not reference it — include the actual structure in the prompt body):
${tool.artifactStructure}

Requirements for the prompt you write:
1. First sentence is imperative and unambiguous: "Produce...", "Analyze...", "Generate..." — not "This prompt helps..."
2. The artifact structure above is embedded inline as markdown — user never needs to look at another file
3. Every validation rule the agent must check before delivering is listed explicitly
4. The selected framework(s) are structurally evident — not just mentioned
5. A completion checklist at the end specifies exactly what a valid, complete output contains

Write the prompt body only. No frontmatter, no explanation.`

  return client.complete(prompt, {
    temperature: 0.2,
    maxTokens: 2000,
    systemPrompt: 'You are a prompt engineer writing self-contained artifact generation prompts. Write only the prompt body as instructed.',
  })
}
```

### 5.4 Full Prompt File Assembly

```typescript
function assemblePromptFile(
  tool: ResearchTool,
  skillSlug: string,
  selected: string[],
  body: string,
  promptType: 'tool-specific' | 'category' | 'meta',
  complexity: 'quick' | 'thorough' | 'exhaustive'
): InMemoryFile {
  const frontmatter = `---
framework: ${selected.join(', ')}
original_framework: ${selected.join(', ')}
skill: ${skillSlug}
tool: ${toSlug(tool.name)}
type: ${promptType}
produces: [${tool.outputs.map(o => `"${toSlug(o)}.md"`).join(', ')}]
when_to_use: "Use when you need to produce a ${tool.name} artifact for ${tool.category} analysis"
complexity: ${complexity}
generated_by: prompt-engine
---`

  return {
    path: `resources/prompts/tool-${toSlug(tool.name)}.md`,
    content: `${frontmatter}\n\n${body}`,
  }
}
```

### 5.5 Category and Meta Prompt Generation

Category prompts: one LLM call per logical tool group. Instructs the agent to run all tools in the category in coordinated sequence. Uses `Prompt Chaining` + `Role / Expert Persona` frameworks by default.

Meta prompts: five standard types always generated. A sixth (cross-category synthesis) generated when ResearchResult has 3+ distinct categories. Generation uses `Role / Expert Persona` + `Chain of Thought` + `Prompt Chaining` frameworks.

Meta prompt types and their complexity ratings:

| Type | Slug | Complexity |
|---|---|---|
| Comprehensive analysis | `meta-comprehensive-analysis` | exhaustive |
| Quick assessment | `meta-quick-assessment` | quick |
| Stakeholder presentation | `meta-stakeholder-presentation` | thorough |
| First-principles exploration | `meta-first-principles-exploration` | thorough |
| Competitive response | `meta-competitive-response` | thorough |
| Cross-category synthesis | `meta-cross-category-synthesis` | exhaustive |

### 5.6 Public API

```typescript
export async function generatePrompts(
  result: ResearchResult,
  meta: SkillMetadata,
  client: LLMClient
): Promise<InMemoryFile[]>
```

---

## 6. Prompt Optimizer

File: `lib/prompt-optimizer.ts`

### 6.1 Audit Schema

```typescript
export interface PromptAudit {
  tokenCountBefore: number
  tokenCountAfter: number
  tokenReduction: number          // percentage
  intentDimensionsPresent: string[]
  intentDimensionsMissing: string[]
  intentSuggestions: Record<string, string>
  outputClarityScore: number      // 0-100
  outputClarityIssues: string[]
  triggerSharpnessScore: number   // 0-100
  triggerSharpnessPasses: boolean
  triggerSuggestion: string | null
  tokenEfficiencyScore: number    // 0-100
  optimizedPrompt: string
}
```

### 6.2 Audit LLM Call

Single LLM call with `responseFormat: 'json_object'`.

System prompt:
```
You are a prompt quality auditor. You analyze prompts for efficiency, completeness, output clarity, and trigger sharpness. Return only valid JSON.
```

Audit prompt:
```
Audit the following prompt across 4 quality dimensions.

<prompt>
${promptText}
</prompt>

Return this JSON structure (no fences, raw JSON):
{
  "token_efficiency": {
    "score": 0-100,
    "unnecessary_phrases": string[],
    "optimized_text": string
  },
  "intent_completeness": {
    "score": 0-100,
    "present": string[],
    "missing": string[],
    "suggestions": { "<dimension>": "<how to add it without inflating the prompt>" }
  },
  "output_clarity": {
    "score": 0-100,
    "issues": string[],
    "passes": boolean
  },
  "trigger_sharpness": {
    "score": 0-100,
    "first_sentence": string,
    "passes": boolean,
    "suggestion": string | null
  },
  "optimized_prompt": string,
  "estimated_tokens_before": number,
  "estimated_tokens_after": number
}

The nine intent dimensions: task, input, output, constraints, context, audience, memory, success-criteria, examples.

Token efficiency score: 100 = no unnecessary words. 0 = more than 30% of words could be removed.
Output clarity passes when: output deliverable is explicitly named, structure/format is specified, ordering constraints are stated.
Trigger sharpness passes when: first sentence unambiguously defines the task in imperative form ("Produce...", "Analyze...", "Generate...").
```

### 6.3 Token Count Estimation

For pipeline use (no external dependency): `Math.ceil(text.split(/\s+/).length * 1.35)`.

For UI display: use `js-tiktoken` (client-side only, lazy loaded).

### 6.4 Pipeline Integration

The Prompt Optimizer is called once per generated prompt file, after the prompt body is generated and before the file is added to the InMemorySkillDirectory. If optimization fails (LLM error), the unoptimized prompt is used with a warning flag.

### 6.5 Public API

```typescript
export async function optimizePrompt(
  promptText: string,
  client: LLMClient
): Promise<PromptAudit>
```

---

## 7. Pipeline Orchestration

File: `lib/pipeline.ts`

### 7.1 Input and Result Types

```typescript
export interface PipelineInput {
  topic: string
  sourceUrls: string[]
  metadata: SkillMetadata
  selectedToolNames?: string[]        // undefined = use all extracted tools
  selectedMetaTypes?: string[]        // undefined = use all 5 standard types
  writeToDisk?: boolean               // default: false for preview, true for create
  outputBasePath?: string             // default: skills/
}

export interface SkillMetadata {
  slug: string
  title?: string
  author?: string
  category: string
  tags: string[]
  targetAgents: string[]
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

### 7.2 Orchestration Flow

```typescript
export async function runPipeline(
  input: PipelineInput,
  client: LLMClient,
  options: { requireConfirmation: boolean } = { requireConfirmation: true }
): Promise<PipelineStage> {

  // Stage 1: validate input
  PipelineInputSchema.parse(input)

  // Stage 2: Research Engine
  const researchResult = await runResearchEngine(input.topic, input.sourceUrls, client)

  // Stage 2b: Confirmation gate
  // UI path returns here, frontend shows ResearchResult, user confirms
  // CLI path writes research-result.json, exits
  if (options.requireConfirmation) {
    return { stage: 'awaiting-confirmation', researchResult }
  }

  // Apply tool filter (user removed some tools in UI Step 2)
  const filteredResult = input.selectedToolNames
    ? { ...researchResult, tools: researchResult.tools.filter(t => input.selectedToolNames!.includes(t.name)) }
    : researchResult

  // Stages 3 + 4 run in parallel — both receive ResearchResult
  const [skillDirectory, promptFiles] = await Promise.all([
    buildSkillDirectory(filteredResult, input.metadata, client),
    generatePrompts(filteredResult, input.metadata, client),
  ])

  // Merge prompt files into skill directory
  const completeDirectory: InMemorySkillDirectory = {
    ...skillDirectory,
    files: [...skillDirectory.files, ...promptFiles],
  }

  // Stage 5: Validate against AgentSkills spec
  const validation = validateSkillDirectory(completeDirectory)
  if (!validation.valid) {
    return {
      stage: 'complete',
      result: { researchResult, skillDirectory: completeDirectory, validation },
    }
  }

  // Stage 5b: Write to disk (atomic)
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

### 7.3 Atomic Write

```typescript
async function atomicWrite(
  directory: InMemorySkillDirectory,
  outputPath: string
): Promise<WriteResult> {
  const absOutput = path.resolve(outputPath)
  const tempPath = `${absOutput}.tmp-${Date.now()}`

  try {
    await fs.mkdir(tempPath, { recursive: true })

    for (const file of directory.files) {
      const filePath = path.join(tempPath, file.path)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, file.content, 'utf-8')
    }

    // Atomic rename — if outputPath already exists, it is replaced
    if (await fs.exists(absOutput)) {
      await fs.rm(absOutput, { recursive: true })
    }
    await fs.rename(tempPath, absOutput)

    return { success: true, path: absOutput, fileCount: directory.files.length }
  } catch (error) {
    await fs.rm(tempPath, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}
```

### 7.4 AgentSkills Spec Validation

File: `lib/validators.ts`

Validates the complete InMemorySkillDirectory before write:
- `SKILL.md` present
- `name` field: max 64 chars, kebab-case, matches slug
- `description` field: present, max 1024 chars, warn above 150
- `metadata.category` present and valid
- `README.md` present
- No file paths with spaces or special characters

---

## 8. API Routes

All routes:
- Validate request body with Zod, return 400 on invalid input
- Return 503 when provider is not configured
- Return 422 when LLM pipeline fails after retry
- No authentication in Phase 1 (local development only)
- Response `Content-Type: application/json`

### 8.1 GET /api/providers

Returns the current provider configuration state and the full provider catalog.

Response:
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
    setupInstructions: string
  }>
}
```

### 8.2 POST /api/providers/configure

Body: `{ provider: ProviderID; apiKey?: string; model?: string }`

Writes to `.env.local` in development. In production returns 400 with instruction to set Vercel environment variables.

### 8.3 POST /api/research

Body: `{ topic: string; sourceUrls: string[] }`

Response: `ResearchResult` (full schema from Section 3.3)

Error responses:
- `400`: invalid body
- `422`: extraction failed — returns `{ error: string; details: string }`
- `503`: provider not configured — returns `{ error: 'provider_not_configured'; setupUrl: '/settings/providers' }`

### 8.4 POST /api/confirm-research

Body: `{ researchResult: ResearchResult; metadata: SkillMetadata; selectedMetaTypes: string[] }`

Runs Stages 3–5 without writing to disk. Returns the preview.

Response:
```typescript
{
  skillDirectory: InMemorySkillDirectory
  promptCount: number
  fileCount: number
  validation: ValidationResult
}
```

### 8.5 POST /api/create-skill

Body: `{ researchResult: ResearchResult; metadata: SkillMetadata; selectedToolNames?: string[]; selectedMetaTypes?: string[] }`

Runs Stages 3–5 and writes to disk.

Response:
```typescript
{
  slug: string
  path: string
  fileCount: number
  promptCount: number
}
```

### 8.6 POST /api/optimize-prompt

Body: `{ prompt: string }`

Response: `PromptAudit` (full schema from Section 6.1)

---

## 9. Wizard State Management

### 9.1 State Shape

File: `components/skill-mall/wizard/WizardContext.tsx`

```typescript
export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6
  // Step 1
  topic: string
  sourceUrls: string[]             // starts empty, user adds one at a time
  // Step 2
  researchResult: ResearchResult | null
  selectedToolNames: string[]      // starts as all tools, user can add from expanded set
  // Step 3
  category: string
  tags: string[]
  targetAgents: string[]
  // Step 4
  skillMdPreview: string | null    // live preview content
  // Step 5
  selectedMetaTypes: string[]      // defaults to all 5 standard types
  // Step 6
  previewDirectory: InMemorySkillDirectory | null
  // UI state
  isLoading: boolean
  error: string | null
}
```

### 9.2 Step Transition API Calls

| Transition | API call | On success | On failure |
|---|---|---|---|
| Step 1 → 2 | POST /api/research | SET_RESEARCH_RESULT, NEXT_STEP | SET_ERROR |
| Step 5 → 6 | POST /api/confirm-research | SET_PREVIEW_DIRECTORY, NEXT_STEP | SET_ERROR |
| Step 6 confirm | POST /api/create-skill | navigate to /skills/:category/:slug | SET_ERROR, stay on Step 6 |

### 9.3 Session Persistence

State serialized to `sessionStorage` (key: `skill-mall-wizard`) on every dispatch. Hydrated from `sessionStorage` on mount via `useEffect`. Handles browser refresh without losing step progress.

`researchResult` and `previewDirectory` are included in serialization. On hydration, parse and validate the stored JSON — if validation fails, reset to initial state.

### 9.4 URL Input Behavior

Step 1 starts with zero URL inputs. A `[ + ADD SOURCE URL ]` button appends one empty input. URL inputs are never pre-populated via HTML `value` attributes inside animated containers — initialize via React state after mount.

### 9.5 Step 2 Add Model (not remove model)

Step 2 displays the first 5 extracted tools by default. A collapsed `[ + ADD MORE TOOLS ]` section shows the remaining tools. Users click to add tools to the selected set. No remove button — only add.

---

## 10. CLI Architecture

### 10.1 Configuration Command

```bash
npx skill-mall configure
```

Interactive (if no flags): prompts for provider selection, API key (if required), model. Writes to `~/.skill-mall/config.json`.

```bash
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6
```

Non-interactive for Claude Code — no API key required.

```bash
npx skill-mall configure --provider openai --key sk-... --model gpt-4o
```

Validates the key by making a minimal test call before saving.

### 10.2 Create Command

```bash
npx skill-mall create "blue ocean strategy" --urls https://blueoceanstrategy.com/tools/ --category business
```

Execution:
1. Resolve provider config (throw with help text if not configured)
2. Run Research Engine → display tool count and topic summary
3. Write `research-result.json` to `./skill-builder-output/<slug>/`
4. Print:
   ```
   Research complete: 21 tools extracted from 1 source.
   
   Review: ./skill-builder-output/blue-ocean-strategy/research-result.json
   
   When ready: npx skill-mall confirm-research blue-ocean-strategy
   ```
5. Exit 0

```bash
npx skill-mall create "okr framework"   # no --urls flag
```

Produces `research-unverified: true` result. Prints additional warning before writing.

### 10.3 Confirm Research Command

```bash
npx skill-mall confirm-research blue-ocean-strategy
```

Execution:
1. Read `./skill-builder-output/blue-ocean-strategy/research-result.json`
2. Validate with ResearchResultSchema
3. Run Skill Builder + Prompt Engine (parallel)
4. Run Prompt Optimizer on all generated prompts
5. Validate complete directory
6. Atomic write to `skills/<category>/blue-ocean-strategy/`
7. Print success summary: file count, prompt count, quality score

### 10.4 Config Resolution for CLI

The CLI uses `resolveProviderConfig()` from `lib/providers/index.ts`. API routes use the same function reading from `process.env`. The only difference: CLI can additionally read from `~/.skill-mall/config.json`.

---

## 11. Error Handling Strategy

### 11.1 LLM Call Failures

| Failure | Behavior |
|---|---|
| HTTP 429 (rate limit) | Wait 2s, retry once |
| HTTP 500/503 | Retry once immediately |
| Timeout | Surface provider-specific message; no retry |
| JSON parse error | Append parse error to prompt, retry once |
| Zod validation failure | Append validation errors to prompt, retry once |
| Two consecutive failures | Throw `LLMError` with last error details |

### 11.2 URL Fetch Failures

| Failure | Behavior |
|---|---|
| Timeout (>15s) | Mark URL failed, continue with remaining URLs |
| Non-200 HTTP | Mark URL failed, continue |
| SSL error | Mark URL failed with specific error, continue |
| All URLs fail | Throw `FetchError` — do not silently fall back to training knowledge |
| Some URLs fail | Proceed with successful URLs, set `partialSources: true` on result |

### 11.3 Validation Failures

AgentSkills spec validation failure before disk write: surface all errors to user. Do not write any files. The pipeline returns the full error list with field names and values.

### 11.4 Disk Write Failures

If `atomicWrite` fails mid-write, the temp directory is cleaned up. The output directory is untouched. The error is surfaced to the user with the temp path for manual inspection if needed.

---

## 12. Testing Strategy

### 12.1 Dependency Injection for LLM Calls

All pipeline functions accept an `LLMClient` parameter. Tests inject a mock client that returns deterministic fixture responses.

```typescript
// lib/__tests__/mocks/mock-llm-client.ts
export class MockLLMClient implements LLMClient {
  readonly provider = 'openai' as const
  private responses: Map<string, string>

  constructor(responses: Record<string, string>) {
    this.responses = new Map(Object.entries(responses))
  }

  async complete(prompt: string): Promise<string> {
    // Match on first keyword found in prompt
    for (const [key, response] of this.responses) {
      if (prompt.includes(key)) return response
    }
    throw new Error(`MockLLMClient: no response matched for prompt starting with: ${prompt.slice(0, 100)}`)
  }
}
```

Fixture files:
- `lib/__tests__/fixtures/research-result-blue-ocean.json` — complete ResearchResult
- `lib/__tests__/fixtures/framework-selection-response.json` — framework selection output
- `lib/__tests__/fixtures/prompt-audit-response.json` — optimizer audit output

### 12.2 Coverage Requirements per Module

| Module | Must cover |
|---|---|
| `lib/providers/` | Config resolution (all 4 sources), factory (all providers), ClaudeCodeClient subprocess invocation |
| `lib/research-engine.ts` | URL fetch (mock fetch), extraction + Zod parse, retry on validation failure, all-URLs-failed error, no-URL fallback |
| `lib/skill-builder.ts` | SKILL.md generation (snapshot), template generation (snapshot), README generation, deterministic file list |
| `lib/prompt-engine.ts` | Pre-filter by artifact type, framework selection (mock LLM), prompt assembly, prompt count validation |
| `lib/prompt-optimizer.ts` | Audit call (mock LLM), output parse, fallback on failure |
| `lib/pipeline.ts` | Full pipeline (all mocked), confirmation gate, validation failure halts write, atomic write success |
| `lib/quality-score.ts` | All 5 dimensions, blue-ocean fixture scores >80, _template fixture scores <40 |

### 12.3 API Route Tests

Using Next.js route handler testing utilities. Test: 400 on invalid body, 503 when provider not configured, 200 with valid schema on success.

### 12.4 Snapshot Tests

`generateSkillMd`, `generateTemplate`, and `generateReadme` are pure functions. Their output is snapshot-tested against committed fixtures to catch regressions.

---

## 13. Configuration Management

### 13.1 Files

| File | Location | Committed? | Purpose |
|---|---|---|---|
| `.env.example` | repo root | Yes | Template for web UI config |
| `.env.local` | repo root | No | Active web UI config (gitignored) |
| `~/.skill-mall/config.json` | user home | No | CLI config |

### 13.2 Provider Setup Instructions (in-app)

The `/settings/providers` page (Phase 1) shows setup instructions per provider:

- **OpenAI**: get key from platform.openai.com → set `SKILL_MALL_API_KEY` in `.env.local`
- **Claude Code**: ensure `claude` CLI is installed and authenticated → select provider, no key needed
- **Groq**: get key from console.groq.com → set `SKILL_MALL_API_KEY`
- **Gemini**: get key from aistudio.google.com → set `SKILL_MALL_API_KEY`
- **Ollama**: install Ollama → run `ollama pull llama3.1` → start `ollama serve` → no key needed

---

## 14. Documentation Deliverables by Phase

### Phase 1

| Doc | Path | Type |
|---|---|---|
| Provider setup guide | `docs/user/configuring-providers.md` | User guide |
| Wizard walkthrough | `docs/user/using-the-wizard.md` | User guide |
| CLI reference (updated) | `docs/user/using-the-cli.md` | Reference |
| Pipeline architecture | `docs/reference/pipeline-architecture.md` | Technical reference |
| Provider catalog | `docs/reference/provider-catalog.md` | Technical reference |
| ResearchResult schema | `docs/reference/research-result-schema.md` | API reference |
| Prompt file format | `docs/reference/prompt-file-format.md` | Reference |
| Quality score rubric | `docs/reference/quality-score-rubric.md` | Reference |
| API routes | `docs/reference/api-routes.md` | API reference |
| README.md | repo root | Updated with pipeline overview + provider quick-start |
| CONTRIBUTING.md | repo root | Updated with generated skill guidelines |
| JSDoc | all public `lib/` functions | Inline |

### Phase 2

| Doc | Path |
|---|---|
| Supabase schema reference | `docs/reference/database-schema.md` |
| Collection format spec | `docs/reference/collection-format.md` |
| Publishing guide (skills.sh) | `docs/user/publishing-skills.md` |
| MCP server setup | `docs/user/mcp-server.md` |
| Community guide | `docs/user/community-guide.md` |

### Phase 3

Scoped when Phase 2 is stable. At minimum: skill chain format spec, RAG setup guide, self-improvement loop guide.
