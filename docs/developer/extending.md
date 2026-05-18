# Extending SkillMall

How to extend SkillMall without forking: adding LLM providers, CLI commands, API routes, quality score dimensions, and prompt engineering frameworks. Every step shown with actual file paths from the codebase.

## Table of Contents

1. [Adding a New LLM Provider](#adding-a-new-llm-provider)
2. [Adding a New CLI Command](#adding-a-new-cli-command)
3. [Adding a New API Route](#adding-a-new-api-route)
4. [Adding a New Quality Score Dimension](#adding-a-new-quality-score-dimension)
5. [Adding a New PE Framework](#adding-a-new-pe-framework)

---

## Adding a New LLM Provider

The provider system is designed for extension. Adding a new provider takes ~50 lines across 4 files.

### Step 1 — Create the provider implementation

Create `lib/providers/<name>.ts`:

```typescript
import type { LLMClient, ProviderConfig, CompletionOptions } from './types'

export class MyProviderClient implements LLMClient {
  readonly provider = 'my-provider' as const

  constructor(private config: ProviderConfig) {}

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const response = await fetch('https://api.myprovider.com/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        // Handle responseFormat if your provider supports JSON mode:
        ...(options.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
    })

    if (!response.ok) {
      throw new Error(`MyProvider API error: HTTP ${response.status}`)
    }

    const data = await response.json() as { choices: [{ text: string }] }
    return data.choices[0].text.trim()
  }
}
```

**Key requirements:**
- `readonly provider = 'my-provider' as const` must match the ID you'll add to `ProviderID`
- Never forward raw API error bodies — they may contain billing info
- Use `AbortSignal.timeout()` for all fetch calls to avoid hanging requests
- If your provider doesn't support JSON mode, you can omit `responseFormat` handling — the research engine handles JSON parsing with retry

### Step 2 — Add to the ProviderID union

Edit `lib/providers/types.ts`:

```typescript
// Before:
export type ProviderID = 'openai' | 'claude-code' | 'gemini' | 'groq' | 'ollama'

// After:
export type ProviderID = 'openai' | 'claude-code' | 'gemini' | 'groq' | 'ollama' | 'my-provider'
```

### Step 3 — Add default model and catalog entry

Edit `lib/providers/defaults.ts`:

```typescript
// In DEFAULT_MODELS:
export const DEFAULT_MODELS: Record<ProviderID, string> = {
  openai: 'gpt-4o',
  'claude-code': 'claude-sonnet-4-6',
  gemini: 'gemini-2.0-flash-exp',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.1',
  'my-provider': 'my-model-v1',   // ← add this
}

// In PROVIDER_CATALOG (used by GET /api/providers and the configure wizard):
{
  id: 'my-provider',
  name: 'My Provider',
  requiresApiKey: true,
  setupUrl: 'https://myprovider.com/api-keys',
  defaultModel: 'my-model-v1',
  models: ['my-model-v1', 'my-model-v2'],
}
```

### Step 4 — Register in the factory

Edit `lib/providers/index.ts`:

```typescript
import { MyProviderClient } from './my-provider'

export function createLLMClient(config: ProviderConfig): LLMClient {
  switch (config.provider) {
    case 'openai':      return new OpenAIClient(config)
    case 'claude-code': return new ClaudeCodeClient(config)
    case 'gemini':      return new GeminiClient(config)
    case 'groq':        return new GroqClient(config)
    case 'ollama':      return new OllamaClient(config)
    case 'my-provider': return new MyProviderClient(config)  // ← add this
    default: {
      const _exhaustive: never = config.provider
      throw new Error(`Unknown provider: ${_exhaustive}`)
    }
  }
}
```

The `_exhaustive: never` pattern will produce a TypeScript compile error if you add a new `ProviderID` without a corresponding `case`. This is intentional — it prevents silent fallthrough.

### Step 5 — Verify

```bash
npx tsc --noEmit
# Should exit 0 — TypeScript verifies all union cases are handled

npx skill-mall configure --provider my-provider --key test-key --model my-model-v1
# Should succeed without "Unknown provider" error

node -e "
const { createLLMClient } = require('./lib/providers/index.ts')
const client = createLLMClient({ provider: 'my-provider', apiKey: 'test', model: 'my-model-v1' })
console.log(client.provider) // 'my-provider'
"
```

### Embedding support (optional)

If your provider supports embeddings and you want it to work with `npx skill-mall attach-knowledge`, add a case in `lib/rag/embeddings.ts`:

```typescript
export async function generateEmbedding(text: string, client: LLMClient): Promise<EmbeddingResult> {
  if (client.provider === 'my-provider') return generateMyProviderEmbedding(text)
  // ... existing cases
}
```

---

## Adding a New CLI Command

CLI commands are single-responsibility files that export one async function. Adding a command takes ~30 lines and two file edits.

### Step 1 — Create the command file

Create `cli/src/commands/<name>.ts`:

```typescript
import { requireRepoRoot, pc } from '../utils.js'
// Import from lib/ using the @/ alias (resolved to root lib/ by tsconfig)
import { someLibFunction } from '@/lib/some-module.js'

export async function myNewCommand(args: string[]): Promise<void> {
  // Parse flags
  const targetIdx = args.findIndex(a => !a.startsWith('--'))
  const target = args[targetIdx]

  if (!target) {
    process.stderr.write(pc.red('Usage: skill-mall my-command <target>\n'))
    process.exit(1)
  }

  // Parse optional flags
  const verboseIdx = args.indexOf('--verbose')
  const verbose = verboseIdx !== -1

  // Do the work
  console.log()
  console.log(pc.bold(`Processing: ${target}`))

  try {
    const result = await someLibFunction(target)
    console.log(pc.green(`  Done: ${result}`))
    console.log()
  } catch (err) {
    process.stderr.write(pc.red(`Failed: ${err instanceof Error ? err.message : String(err)}\n`))
    process.exit(1)
  }
}
```

**Key patterns:**
- Use `pc.red()`, `pc.green()`, `pc.dim()`, `pc.bold()` for colored output (from `utils.js`)
- Use `process.stderr.write()` for errors, `console.log()` for normal output
- Import lib modules using the `@/` alias — it resolves to the root lib/
- **IMPORTANT**: If your command imports modules that use `better-sqlite3` (database-heavy modules like `lib/rag/`, `lib/self-improvement/`), use dynamic imports to avoid crashing the CLI at startup:

```typescript
// WRONG — static import of DB-heavy module crashes all commands at startup
import { createKnowledgeBase } from '@/lib/rag/knowledge-base.js'

// CORRECT — lazy import, only loads when command actually runs
async function getDbModules() {
  const { createKnowledgeBase } = await import('@/lib/rag/knowledge-base.js')
  return { createKnowledgeBase }
}
```

### Step 2 — Register in the index

Edit `cli/src/index.ts`:

```typescript
// 1. Add import at the top
import { myNewCommand } from "./commands/my-command.js";

// 2. Add to help text in HELP constant
  ${pc.cyan("my-command")} <target>            Brief description of what it does

// 3. Add case in the switch statement
    case "my-command":
      await myNewCommand(rest);
      break;
```

### Step 3 — Build and verify

```bash
cd cli && npm run build && cd ..
node cli/dist/index.js my-command --help
node cli/dist/index.js --help  # verify help text shows new command
```

---

## Adding a New API Route

API routes follow the Next.js App Router convention. Every route that accepts user input validates with Zod.

### Step 1 — Create the route file

Create `app/api/<name>/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
// Import shared lib modules using @/ alias
import { someFunction } from '@/lib/some-module'

// Optional: mark as nodejs runtime if you need filesystem or SQLite access
export const runtime = 'nodejs'

// Define your Zod schema for request validation
const requestSchema = z.object({
  skillSlug: z.string().min(1).max(64),
  value: z.number().int().min(0).max(100),
})

export async function POST(req: NextRequest) {
  // 1. Parse and validate input
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = requestSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: result.error.issues },
      { status: 400 }
    )
  }

  const { skillSlug, value } = result.data

  // 2. Do the work
  try {
    const output = await someFunction(skillSlug, value)
    return NextResponse.json({ result: output })
  } catch (err) {
    // 3. Log full error, return generic message
    console.error('[my-route] operation failed:', err)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
```

### Step 2 — Document the route

Add a section to `docs/developer/api-reference.md` following the format in that file (method, path, auth, request table, response JSON, error table, curl example).

### Step 3 — Verify

```bash
npx tsc --noEmit
npm run build  # route should appear in build output
curl -X POST http://localhost:3000/api/<name> \
  -H "Content-Type: application/json" \
  -d '{"skillSlug": "test", "value": 42}'
```

---

## Adding a New Quality Score Dimension

The quality score is computed in `lib/quality-score.ts` across 5 dimensions. Adding a 6th is straightforward.

### Current structure

```typescript
// lib/quality-score.ts

export interface DimensionScore {
  score: number
  maxScore: number
  deductions: string[]
}

// computeQualityScore returns:
{
  total: number  // sum of all dimension scores
  dimensions: {
    descriptionQuality: DimensionScore  // max 25
    completeness: DimensionScore        // max 25
    frontmatterHealth: DimensionScore   // max 20
    resourceRichness: DimensionScore    // max 20
    linkHealth: DimensionScore          // max 10
  }
}
```

### Adding a new dimension

**Step 1:** Write the scoring function in `lib/quality-score.ts`:

```typescript
function scoreMyNewDimension(skill: Skill): DimensionScore {
  let score = 15  // max points for this dimension
  const deductions: string[] = []

  if (!skill.someProperty) {
    score -= 8
    deductions.push('Missing someProperty: add it to improve discoverability')
  }

  if (someOtherCondition(skill)) {
    score -= 7
    deductions.push('someOtherCondition: consider fixing this because...')
  }

  return { score: Math.max(score, 0), maxScore: 15, deductions }
}
```

**Step 2:** Add to the `computeQualityScore` return value:

```typescript
export function computeQualityScore(skill: Skill, allSkillSlugs: Set<string>) {
  const myNewDimension = scoreMyNewDimension(skill)

  // Update total calculation:
  const total = Math.round(
    descriptionQuality.score +
    completeness.score +
    frontmatterHealth.score +
    resourceRichness.score +
    linkHealth.score +
    myNewDimension.score  // ← add here
  )

  return {
    total,
    dimensions: {
      descriptionQuality,
      completeness,
      frontmatterHealth,
      resourceRichness,
      linkHealth,
      myNewDimension,  // ← add here
    }
  }
}
```

**Step 3:** Update `docs/developer/contributing.md` to document the new dimension with its point values.

**Step 4:** Run `npm test lib/__tests__/quality-score.test.ts` to verify existing tests still pass, then add tests for your new dimension.

---

## Adding a New PE Framework

Prompt engineering frameworks appear in the `/prompt-library` page and are used by the Prompt Engine to generate framework-specific prompts for skill tools.

### The two data structures

**`FRAMEWORK_CANDIDATES`** in `lib/pe-frameworks.ts` — maps artifact types to compatible frameworks:

```typescript
export const FRAMEWORK_CANDIDATES: Record<ArtifactType, string[]> = {
  matrix: [
    'BCG Matrix', 'Ansoff Matrix', 'Priority Matrix',
    // your new framework here if it works well with matrix artifacts
  ],
  canvas: [
    'Blue Ocean ERRC', 'Business Model Canvas', 'SWOT Analysis',
    // your new framework here if it works well with canvas artifacts
  ],
  // ... other artifact types: grid, list, flowchart, analysis
}
```

**`FRAMEWORK_DESCRIPTIONS`** in `lib/pe-frameworks.ts` — human-readable descriptions for the prompt library page:

```typescript
export const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  'Chain of Thought': 'Break complex reasoning into explicit intermediate steps...',
  // Add your framework:
  'My New Framework': 'Description of when to use this framework and what makes it distinctive...',
}
```

### Step 1 — Add the framework

Edit `lib/pe-frameworks.ts`:

```typescript
// Add to FRAMEWORK_DESCRIPTIONS:
'My New Framework': 'A reasoning approach that [what it does] — best for [when to use it].',

// Add to relevant FRAMEWORK_CANDIDATES entries:
export const FRAMEWORK_CANDIDATES: Record<ArtifactType, string[]> = {
  analysis: [
    'Chain of Thought',
    'My New Framework',  // ← add here if it works for analysis artifacts
    // ...
  ],
  // ...
}
```

### Step 2 — Verify

The framework will appear immediately in `/prompt-library` (no build required in dev mode). Check that:

1. It appears under the correct category on the `/prompt-library` page
2. The description is accurate and specific (not generic)
3. The `FRAMEWORK_CANDIDATES` mapping is correct — frameworks in candidates get offered to the Prompt Engine for relevant tool types

```bash
# Check it appears in the prompt library
npm run dev
# Open http://localhost:3000/prompt-library and search for your framework name
```

### Framework description quality bar

Framework descriptions should:
- Explain what makes this framework distinctive (not just what category it's in)
- Mention the specific use case or artifact type it's best for
- Be 1-3 sentences maximum

**Good:** `"Tree of Thoughts: Explores multiple reasoning branches simultaneously before converging on the best answer — effective for problems with non-obvious solutions where backtracking is needed."`

**Bad:** `"A reasoning framework that can be used for various tasks."`

---

## Testing Your Extension

Every extension should have tests. Here are the minimum test expectations for each extension type:

**New LLM provider:**
- Test that `complete()` handles a successful response
- Test that `complete()` throws on HTTP error without exposing the raw error body
- Test that `AbortSignal.timeout()` is set (use `vi.fn()` to mock fetch)
- Test that the provider appears in the factory switch: `createLLMClient({ provider: 'my-provider', ... })`

**New CLI command:**
- Test with valid input (mock the lib functions it calls)
- Test with missing required arguments (expect `process.exit(1)`)
- Build the CLI and verify `node cli/dist/index.js my-command --help` prints usage

**New API route:**
- Test that missing required fields return 400 with `invalid_input` error
- Test that the happy path returns the expected response shape
- Test that internal errors return 500 with a generic message (not the raw error)

**New quality dimension:**
- Test the full range: 0 points (all deductions), max points (no deductions), partial
- Test that `deductions` array contains meaningful messages
- Verify `total` in `computeQualityScore` includes the new dimension

**New PE framework:**
- No automated tests required — verify visually in `/prompt-library`
- Confirm it appears under the correct artifact type categories

Run `npx tsc --noEmit && npm test` before every PR. All 211 existing tests must continue to pass.

## Next Steps

- **[Architecture](./architecture.md)** — system design context before making changes
- **[Contributing Guide](./contributing.md)** — code standards and PR process
- **[API Reference](./api-reference.md)** — all routes documented
