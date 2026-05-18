# Phase 3 Plan — Advanced Capabilities (v2)

**STOP. Read this entire document before touching a single file.**

This document replaces the original PHASE-3-PLAN.md. The original covered 9 tasks and missed 21. This version covers all 30 tasks on the Phase 3 board. Every implementation decision is made here. Every architectural choice, TypeScript type, SQL schema, algorithm, and file conflict ordering is embedded directly. Workers do not make architectural decisions — they follow this document.

---

## What This Phase Builds

Two categories of work in sequence:

**Category 1 — Missed Phase 1/2 Features (T251–T275 + T257):** Features that were in the original spec with Phase 1 or Phase 2 assignments but were omitted from those plans. T280 (Judge audit) gates all Category 2 work — nothing in Category 2 starts until T280 passes.

**Category 2 — Phase 3 Features (T201–T209):** Skill Chain Builder, RAG-Enhanced Skills, Self-Improvement Loop, Marketplace. These only activate after T280.

---

## Architectural Decisions (pre-made — do not relitigate)

These decisions were made after the original plan was reviewed and found to contain architectural problems. All decisions below override the original plan.

**Budget Analyzer:** Implement as user-configurable `--chars-available N` — NOT per-agent hardcoded values. Agent-specific budget numbers are undocumented and will be hallucinated. The feature value is in showing what the agent reads at N characters, not in guessing what N is per agent.

**Skill Dependency Graph:** Use `reactflow` (already installed for T202). Do NOT implement a custom force-directed physics simulation. Custom physics produces unstable results that look plausible but don't work well.

**regen-prompt (Framework Override):** To regenerate a prompt with a different framework, the original `ResearchTool` data is needed (`artifactType`, `artifactStructure`, `inputs`, `outputs`, `howUsed`). This data is NOT stored after the pipeline runs. **The pipeline must be updated to write `resources/build-metadata.json` to every generated skill.** regen-prompt reads from this file. The format is specified in "All Shared TypeScript Types" below.

**npm Package Publisher:** Default behavior is `--dry-run`. Actual publish only happens with explicit `--publish` flag. No code path publishes to npm without this flag.

**MCP `deploy_skill` tool:** Must check filesystem writability before attempting. Returns a clear error (not 500) when filesystem is read-only (e.g., Vercel).

**CI trigger evaluator:** The eval-triggers CI step is OPTIONAL. When `SKILL_MALL_PROVIDER` and `SKILL_MALL_API_KEY` secrets are not present, the step skips with a warning. It never fails the build when secrets are absent.

**skills.sh badge:** Static only — link to `https://skills.sh/skills/<id>`. Do NOT fetch live install counts. The skills.sh API is not publicly documented.

**`npx skill-mall mcp-server`:** Must be implemented as a pure Node.js HTTP server with a standalone catalog reader. It must NOT import from Next.js modules (`next/font`, `next/headers`, etc.) which will crash outside the Next.js runtime.

**T261 + T263 are one task:** Both add a PROMPTS tab to SkillTabs. They have been merged. T263 is the base implementation; T261 adds the framework override badge/dropdown to prompt cards within the same PROMPTS tab.

---

## File Conflict Ordering (strictly enforced)

These files are modified by multiple tasks. They MUST be modified sequentially in this exact order. Two tasks that touch the same file CANNOT run in parallel.

| File | Tasks (in order) |
|---|---|
| `cli/src/index.ts` | T262 → T261 → T264 → T273 → T267 → T265 → T268 |
| `components/skill-mall/skill-detail/SkillTabs.tsx` | T252 (Budget tab) → T256 (locale) → T261 (Prompts + framework override) |
| `app/skills/[category]/[slug]/page.tsx` | T261 → T266 → T271 → T256 |
| `lib/analytics.ts` | T265 → T266 → T274 |
| `.github/workflows/validate-skills.yml` | T255 → T268 |
| `cli/src/commands/publish.ts` | T264 (npm registry) extends existing skills.sh publish — same file |

---

## Development Workflow

Every Worker task follows this 16-step loop. No exceptions.

1. Read the task's Implementation section in this document completely
2. Map dependencies — identify parallel vs serial work
3. Establish TypeScript contracts before implementation
4. Dispatch parallel subagents only when write scopes are provably disjoint
5. Write Vitest tests before or alongside implementation
6. `npx tsc --noEmit` — must exit 0 before proceeding
7. `npm run lint` — must exit 0 before proceeding
8. `npm run build` — must succeed before proceeding
9. First code review
10. Fix all issues from review
11. Second code review
12. Smoke test at `localhost:3000`
13. Security check — mandatory for every Phase 3 task
14. Update documentation for changed interfaces
15. Final review against task acceptance criteria
16. `git commit && git push`

---

## All Shared TypeScript Types

### Build Metadata (`lib/build-metadata.ts`)

This type must be stored as `resources/build-metadata.json` in every pipeline-generated skill. Required for `regen-prompt` (T261).

```typescript
export interface BuildMetadata {
  topic: string
  sources: string[]
  researchUnverified?: boolean
  tools: Array<{
    name: string
    slug: string                  // toSlug(name)
    category: string
    description: string
    artifactType: 'matrix' | 'canvas' | 'grid' | 'list' | 'flowchart' | 'analysis'
    artifactStructure: string     // the blank template — needed for prompt regeneration
    inputs: string[]
    outputs: string[]
    howUsed: string
    selectedFrameworks: string[]  // what the Prompt Engine chose
  }>
  generatedAt: string             // ISO 8601
  pipelineVersion: string         // "1.0.0"
}
```

**Where it's written:** Add to `lib/pipeline.ts` `atomicWrite` call — write `resources/build-metadata.json` alongside the skill files. Add to `InMemorySkillDirectory` files array.

### Skill Tester Types (`lib/skill-tester.ts`)

```typescript
export interface TestCase {
  id: string
  description: string
  input: string                   // the user message sent to the skill
  required: string[]              // natural language assertions that must pass
  forbidden: string[]             // assertions that must NOT be present in output
}

export interface TestResult {
  id: string
  description: string
  passed: boolean
  requiredResults: Array<{ assertion: string; passed: boolean }>
  forbiddenResults: Array<{ assertion: string; triggered: boolean }>
}

export interface TestSuiteResult {
  skillSlug: string
  testCount: number
  passCount: number
  failCount: number
  passRate: number
  results: TestResult[]
}
```

### Graph Types (`lib/graph.ts`)

```typescript
export interface GraphNode {
  id: string                      // skill slug
  label: string                   // skill name
  category: string
  connectionCount: number
  isHub: boolean                  // > 3 connections
  isOrphan: boolean               // 0 connections
}

export interface GraphEdge {
  id: string
  source: string                  // skill slug
  target: string                  // linked skill slug
}

export interface SkillGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function computeGraph(skills: Skill[]): SkillGraph
```

### Fork Events (added to `lib/db/types.ts`)

```typescript
export interface ForkEvent {
  id: number
  source_slug: string
  fork_slug: string
  forked_at: string
}
```

### Budget Analyzer Types (`lib/budget-analyzer.ts`)

```typescript
export interface BudgetCheckResult {
  slug: string
  charsAvailable: number          // user-specified N
  descriptionLength: number
  visible: boolean                // description fits in N chars
  triggerPhrase: string | null    // first meaningful phrase in description
  triggerPreserved: boolean       // trigger phrase visible within N chars
  visibleText: string             // what the agent reads (first N chars)
  truncatedText: string           // what gets cut off
  rewriteSuggestions: string[]    // suggestions to improve fit
}
```

---

## All SQL Schemas (new migrations)

### `db/migrations/003_fork_events.sql`

```sql
CREATE TABLE IF NOT EXISTS fork_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_slug TEXT NOT NULL,
  fork_slug TEXT NOT NULL,
  forked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fork_events_source ON fork_events(source_slug);
```

---

## Category 1 Task Cards — Missed Phase 1/2 Features

---

### T251 — Domain Starter Templates

**Type:** Worker | **Depends on:** nothing

**Objective:** Create 20 Domain Starter Templates in `skills/_starters/<domain>/` and implement `npx skill-mall new --from-template <slug> <new-name>` CLI.

**Content requirement:** Every starter SKILL.md must have real, production-calibrated content derived from the named domain. Each starter README.md must cite the authoritative reference. Generic or placeholder content fails the stop_if check. The 20 domains:

| Slug | Domain | Cite |
|---|---|---|
| `code-review` | Code review for PRs | github.com/google/eng-practices |
| `pr-writer` | PR description writer | conventionalcommits.org |
| `commit-writer` | Conventional commit messages | conventionalcommits.org |
| `technical-documentation` | Technical documentation | docs.divio.com (Divio system) |
| `debugging-session` | Structured debugging | kentcdodds.com/blog/fix-bugs |
| `okr-framework` | OKR planning | whatmatters.com/faqs |
| `blue-ocean-strategy` | Blue Ocean Strategy toolkit | blueoceanstrategy.com |
| `design-thinking` | Design Thinking 5-stage | dschool.stanford.edu |
| `user-story-mapping` | User Story Mapping | jpattonassociates.com |
| `incident-postmortem` | Incident postmortem | sre.google/workbook/postmortem |
| `api-documentation` | API documentation | docs.microsoft.com/api-guidelines |
| `decision-records` | Architecture Decision Records | adr.github.io |
| `test-writer` | Test case writing | martinfowler.com/testing |
| `sprint-planning` | Agile sprint planning | scrum.org/resources |
| `stakeholder-communication` | Stakeholder updates | pmbok.org |
| `competitive-analysis` | Competitive analysis | harvard.edu/porter-five-forces |
| `product-requirements` | PRD writing | svpg.com/assets |
| `onboarding-guide` | Team onboarding guides | basecamp.com/books |
| `data-analysis` | Data analysis workflow | tidy-data paper (Wickham 2014) |
| `content-strategy` | Content strategy | contentmarketinginstitute.com |

**Each starter directory structure:**
```
skills/_starters/<slug>/
├── SKILL.md          # 80% complete with [FILL-IN: description] markers
├── README.md         # Explains what [fill-in] markers expect; cites source
├── resources/
│   └── templates/   # At least 2 blank artifact templates per starter
└── starter-config.json
```

**`starter-config.json` format:**
```json
{
  "domain": "Code Review for Pull Requests",
  "category": "development",
  "targetAgents": ["claude-code", "cursor"],
  "fillInFields": [
    { "marker": "[FILL-IN: team-specific criteria]", "description": "Your team's specific review criteria (e.g., 'no magic numbers', 'all functions < 20 lines')" }
  ],
  "sourceReference": "https://google.github.io/eng-practices/review/"
}
```

**CLI implementation:** `npx skill-mall new --from-template code-review my-code-review`:
1. Read `skills/_starters/code-review/starter-config.json` to get category
2. Copy entire directory to `skills/<category>/my-code-review/`
3. Update SKILL.md `name:` field to `my-code-review`
4. Print: each [fill-in] marker and its description so user knows what to complete

**Allowed files:**
```
skills/_starters/
cli/src/commands/new.ts
cli/src/index.ts
```

**Verify:**
- All 20 starter directories exist with SKILL.md, README.md, resources/templates/, starter-config.json
- `bash scripts/validate-skill.sh skills/_starters/code-review` exits 0
- `npx skill-mall new --from-template code-review my-cr` creates `skills/development/my-cr/` with SKILL.md name updated
- Each README.md contains a URL to the authoritative source

**Stop if:**
- Any SKILL.md description is a placeholder or starts with "This skill helps" — real, imperative opening required
- Any README.md lacks a citation URL — every starter must cite its source
- Need files outside allowed_files

---

### T252 — Agent Budget Analyzer

**Type:** Worker | **Depends on:** nothing

**Objective:** Implement Agent Budget Analyzer as a user-configurable simulation — NOT per-agent hardcoded values.

**Implementation:** `lib/budget-analyzer.ts`

```typescript
export function analyzeDescription(
  description: string,
  charsAvailable: number,
  triggerPhrase?: string
): BudgetCheckResult {
  const visible = description.length <= charsAvailable
  const visibleText = description.slice(0, charsAvailable)
  const truncatedText = description.slice(charsAvailable)
  const trigger = triggerPhrase ?? extractTriggerPhrase(description)
  const triggerPreserved = trigger ? visibleText.toLowerCase().includes(trigger.toLowerCase()) : true

  const suggestions: string[] = []
  if (!visible) {
    suggestions.push(`Shorten by ${description.length - charsAvailable} characters`)
    if (!triggerPreserved && trigger) {
      suggestions.push(`Move "${trigger}" to the first ${Math.floor(charsAvailable * 0.3)} characters`)
    }
  }

  return {
    slug: '',
    charsAvailable,
    descriptionLength: description.length,
    visible,
    triggerPhrase: trigger,
    triggerPreserved,
    visibleText,
    truncatedText,
    rewriteSuggestions: suggestions,
  }
}

function extractTriggerPhrase(description: string): string | null {
  const match = description.match(/^[A-Z][a-z]+ [\w\s-]{2,30}/)
  return match ? match[0].trim() : null
}
```

**CLI:** `npx skill-mall budget-check <category/slug> --chars-available 200`

```bash
# Show at standard load levels
npx skill-mall budget-check ai/skill-creator --chars-available 200

# Output:
# Budget analysis: skill-creator / 200 chars available
#
# Description (43 chars): FULLY VISIBLE
# Trigger phrase: "Create new AI agent skills"
# Trigger preserved: YES
#
# No rewrite needed.
```

The `--agent <agent>` flag is ACCEPTED (for CLI compatibility with the spec) but only used for display — it does NOT change the simulation. Print: `Note: budget is simulated at --chars-available. Set this to match your agent's actual budget.`

**UI:** "Budget Analysis" tab on skill detail page. Input: chars-available slider (50–500, default 200). Output: BudgetCheckResult rendered inline.

**Allowed files:**
```
lib/budget-analyzer.ts
lib/__tests__/budget-analyzer.test.ts
components/skill-mall/skill-detail/SkillTabs.tsx
app/api/budget-check/route.ts
cli/src/commands/budget-check.ts
cli/src/index.ts
```

**Verify:**
- `analyzeDescription("Apply Blue Ocean Strategy to identify...", 50)` returns `visible: false` (test)
- Trigger phrase "Apply Blue Ocean" preserved when description fits, not preserved when truncated (test)
- CLI prints budget analysis without making up per-agent numbers
- `--agent claude-code` accepted but prints note about simulation

**Stop if:**
- Per-agent hardcoded budget values added without documented real-world source — implement as user-configurable only
- Need files outside allowed_files

---

### T253 — Codebase-to-Skill Extractor

**Type:** Worker | **Depends on:** nothing

**Objective:** `npx skill-mall extract <dir> --output <slug> [--category cat] [--focus "pattern1,pattern2"]`

**Implementation:** `lib/codebase-extractor.ts`

```typescript
import { runResearchEngineFromText } from './research-engine'
import type { LLMClient } from './providers'

export async function extractFromCodebase(
  targetDir: string,
  topic: string,
  focus: string[],
  client: LLMClient
): Promise<ResearchResult> {
  // Security: validate targetDir is within process.cwd()
  const resolved = path.resolve(targetDir)
  if (!resolved.startsWith(process.cwd())) {
    throw new Error('Target directory must be within the project directory')
  }

  // Collect files
  const files = collectFiles(resolved, ['.md', '.ts', '.js', '.py', '.txt'])
  const content = files
    .map(f => `// File: ${path.relative(resolved, f)}\n${fs.readFileSync(f, 'utf-8')}`)
    .join('\n\n---\n\n')
    .slice(0, 20_000)   // same combined cap as URL fetcher

  // Focus filter in prompt
  const focusClause = focus.length > 0
    ? `Focus specifically on: ${focus.join(', ')}.`
    : 'Extract all identifiable patterns.'

  return runResearchEngineFromText(topic, content, client, focusClause)
}
```

**Add to `lib/research-engine.ts`** (add `research-engine.ts` to allowed_files):

```typescript
export async function runResearchEngineFromText(
  topic: string,
  text: string,
  client: LLMClient,
  additionalInstruction = ''
): Promise<ResearchResult> {
  // Same extraction prompt as URL-based, but with inline text instead of fetched content
  // Sets researchUnverified: true (no authoritative URL provided)
  const prompt = buildExtractionPromptWithContent(topic, text, [])
    + (additionalInstruction ? `\n\n${additionalInstruction}` : '')
  const result = await extractWithRetry(prompt, client)
  return { ...result, researchUnverified: true }
}
```

**Allowed files:**
```
cli/src/commands/extract.ts
cli/src/index.ts
lib/codebase-extractor.ts
lib/__tests__/codebase-extractor.test.ts
lib/research-engine.ts
```

**Verify:**
- `npx skill-mall extract ./lib --output our-lib-conventions` writes `skill-builder-output/our-lib-conventions/research-result.json`
- Extracted ResearchResult has `researchUnverified: true`
- Files outside `targetDir` are never read (path traversal test)
- `--focus "error handling"` limits extraction scope

**Stop if:**
- Files outside specified directory are read — validate all paths
- Extraction logic duplicated instead of calling `runResearchEngineFromText` — reuse the function
- Need files outside allowed_files

---

### T254 — Skill Dependency Graph

**Type:** Worker | **Depends on:** nothing

**Objective:** Force-directed graph at `/graph` using `reactflow`.

**Implementation:** `lib/graph.ts`

```typescript
export function computeGraph(skills: Skill[]): SkillGraph {
  const slugSet = new Set(skills.map(s => s.slug))
  const connectionCounts = new Map<string, number>()

  const edges: GraphEdge[] = []
  for (const skill of skills) {
    for (const linked of skill.linked_skills) {
      if (slugSet.has(linked)) {
        edges.push({ id: `${skill.slug}-${linked}`, source: skill.slug, target: linked })
        connectionCounts.set(skill.slug, (connectionCounts.get(skill.slug) ?? 0) + 1)
        connectionCounts.set(linked, (connectionCounts.get(linked) ?? 0) + 1)
      }
    }
  }

  const nodes: GraphNode[] = skills.map(s => {
    const count = connectionCounts.get(s.slug) ?? 0
    return {
      id: s.slug,
      label: s.name,
      category: s.category,
      connectionCount: count,
      isHub: count > 3,
      isOrphan: count === 0,
    }
  })

  return { nodes, edges }
}
```

**React Flow canvas:** The page at `app/graph/page.tsx` uses React Flow with `dagre` layout (install `@dagrejs/dagre` as a dependency — this is acceptable). Node colors map to category using the existing `tokens.light` from `lib/design-tokens.ts`. Hub nodes get a thicker border. Orphan nodes get a dashed border. Click navigates to `/skills/<category>/<slug>`.

**Allowed files:**
```
app/graph/page.tsx
components/skill-mall/graph/DependencyGraph.tsx
lib/graph.ts
lib/__tests__/graph.test.ts
```

**Verify:**
- `computeGraph` with 3 skills where A links to B returns 1 edge, A has count 1, B has count 1 (test)
- Skill with 4+ connections flagged as hub (test)
- Skill with 0 connections flagged as orphan (test)
- `/graph` renders without SSR error (smoke test — must be `'use client'` with dynamic import)

**Stop if:**
- Custom physics simulation implemented from scratch instead of using reactflow — use the installed library
- Need files outside allowed_files

---

### T255 — Skill Testing Framework

**Type:** Worker | **Depends on:** T201 is NOT required — T255 uses only the existing SQLite tables

**Objective:** Test case runner for skill prompts.

**Implementation:** `lib/skill-tester.ts`

```typescript
export async function runTestSuite(
  skillSlug: string,
  client: LLMClient
): Promise<TestSuiteResult> {
  const testDir = path.join(process.cwd(), 'tests', skillSlug)
  if (!fs.existsSync(testDir)) {
    return { skillSlug, testCount: 0, passCount: 0, failCount: 0, passRate: 0, results: [] }
  }

  const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.json'))
  const results: TestResult[] = []

  for (const file of testFiles) {
    const testCase: TestCase = JSON.parse(
      fs.readFileSync(path.join(testDir, file), 'utf-8')
    )

    // Sanitize input to prevent prompt injection
    const sanitizedInput = testCase.input
      .replace(/```/g, "'''")
      .replace(/\[INST\]/g, '')
      .slice(0, 2000)

    // Run the skill's comprehensive-analysis meta prompt with the test input
    const evaluatorPrompt = `
Given this user request: "${sanitizedInput}"

Evaluate the following assertions about an ideal response:

REQUIRED (must all be true):
${testCase.required.map((r, i) => `${i + 1}. ${r}`).join('\n')}

FORBIDDEN (must all be false):
${testCase.forbidden.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Return JSON:
{
  "required": [{"assertion": "...", "passed": true/false}],
  "forbidden": [{"assertion": "...", "triggered": true/false}]
}`

    const raw = await client.complete(evaluatorPrompt, {
      responseFormat: 'json_object',
      temperature: 0.1,
      maxTokens: 1000,
      systemPrompt: 'You evaluate whether skill output assertions are satisfied. Return only valid JSON.',
    })

    const evalResult = JSON.parse(raw)
    const passed = evalResult.required.every((r: { passed: boolean }) => r.passed) &&
                   evalResult.forbidden.every((f: { triggered: boolean }) => !f.triggered)

    results.push({
      id: testCase.id,
      description: testCase.description,
      passed,
      requiredResults: evalResult.required,
      forbiddenResults: evalResult.forbidden,
    })
  }

  const passCount = results.filter(r => r.passed).length
  return {
    skillSlug,
    testCount: results.length,
    passCount,
    failCount: results.length - passCount,
    passRate: results.length > 0 ? Math.round((passCount / results.length) * 100) : 0,
    results,
  }
}
```

**This task scope:** Build the framework + write `tests/skill-creator/` with 3 test cases. Do NOT write 50 test suites — that is T257.

**Allowed files:**
```
lib/skill-tester.ts
lib/__tests__/skill-tester.test.ts
cli/src/commands/test-skill.ts
cli/src/index.ts
.github/workflows/validate-skills.yml
tests/skill-creator/
```

**Verify:**
- `runTestSuite` with mocked LLM returns correct pass/fail counts (test)
- Sanitization removes ``` and [INST] from test input before LLM call (test)
- `npx skill-mall test skill-creator` runs 3 test cases and reports results
- CI workflow includes optional test step that skips gracefully when no tests exist

**Stop if:**
- Test input is passed directly to LLM without sanitization
- Need files outside allowed_files

---

### T257 — Write Test Suites for All Starters

**Type:** Worker | **Depends on:** T251 (starters must exist), T255 (framework must exist)

**Objective:** Write test suite JSON files for all 20 Domain Starters + 4 existing catalog skills. At least 3 test cases per skill. Format: `tests/<slug>/*.json`.

**Each test case must be domain-specific.** Generic test cases ("contains text", "has a header") do not count. Examples of good test cases:

```json
{
  "id": "errc-grid-quadrants",
  "description": "ERRC Grid must have all four quadrants populated",
  "input": "Create an ERRC Grid for a mid-market B2B SaaS company",
  "required": [
    "contains ELIMINATE quadrant with at least 1 item",
    "contains REDUCE quadrant with at least 1 item",
    "contains RAISE quadrant with at least 1 item",
    "contains CREATE quadrant with at least 1 item"
  ],
  "forbidden": [
    "produces identical output regardless of company type"
  ]
}
```

**Allowed files:**
```
tests/
```

**Verify:**
- `find tests/ -name '*.json' | wc -l` shows >= 72 (24 skills × 3 tests)
- Each test JSON is valid JSON with all required fields
- Test cases are domain-specific, not generic

**Stop if:**
- Test cases are generic ("output contains text", "response is not empty") — must be domain-specific
- Need files outside allowed_files

---

### T256 — Multilingual Skill Support

**Type:** Worker | **Depends on:** nothing

**Objective:** `SKILL.<locale>.md` convention, `--lang` deploy flag, CI validation, locale display on detail page.

**File convention:**
```
skills/business/blue-ocean-strategy/
├── SKILL.md                    # canonical, always English
└── resources/
    └── i18n/
        ├── SKILL.es.md
        └── SKILL.fr.md
```

**`lib/i18n.ts`:**

```typescript
export const SUPPORTED_LOCALES = ['es', 'fr', 'de', 'pt-BR'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]

export function getLocalizedSkillPath(skillDir: string, lang: Locale): string {
  return path.join(skillDir, 'resources', 'i18n', `SKILL.${lang}.md`)
}

export function getAvailableLocales(skillDir: string): Locale[] {
  const i18nDir = path.join(skillDir, 'resources', 'i18n')
  if (!fs.existsSync(i18nDir)) return []

  return fs.readdirSync(i18nDir)
    .filter(f => f.match(/^SKILL\.(es|fr|de|pt-BR)\.md$/))
    .map(f => f.replace('SKILL.', '').replace('.md', '') as Locale)
}

export function validateTranslationStructure(
  canonicalContent: string,
  translatedContent: string
): string[] {
  const canonicalSections = canonicalContent.match(/^##\s+.+$/gm) ?? []
  const translatedSections = translatedContent.match(/^##\s+.+$/gm) ?? []
  const errors: string[] = []
  if (canonicalSections.length !== translatedSections.length) {
    errors.push(`Section count mismatch: canonical ${canonicalSections.length}, translation ${translatedSections.length}`)
  }
  return errors
}
```

**Allowed files:**
```
lib/i18n.ts
lib/__tests__/i18n.test.ts
cli/src/commands/deploy.ts
scripts/validate-skill.sh
components/skill-mall/skill-detail/SkillTabs.tsx
app/skills/[category]/[slug]/page.tsx
```

**Verify:**
- `getAvailableLocales` returns correct locale list when i18n files exist (test)
- `validateTranslationStructure` detects missing sections (test)
- `npx skill-mall deploy ai/skill-creator --lang es` copies `resources/i18n/SKILL.es.md` to the target agent directory AS `SKILL.md` (overriding the English version) — if no locale file exists, falls back to canonical SKILL.md
- Detail page shows `[ ES ] [ FR ]` locale badges when translations exist

**Stop if:**
- Need files outside allowed_files

---

### T261 — User Framework Override + Prompts Tab (merged)

**Type:** Worker | **Depends on:** T251 (needs a skill with prompts for testing), build-metadata.json must be in pipeline (add to allowed_files)

**Objective:** Add PROMPTS tab to skill detail page. Each prompt card shows: complexity dot, when_to_use text, framework badge (clickable → dropdown → regenerate). Framework regeneration reads from `resources/build-metadata.json`.

**Pipeline update needed first** — add to `lib/pipeline.ts`:

```typescript
// In the atomicWrite call, add build-metadata.json to the files:
const buildMeta: BuildMetadata = {
  topic: researchResult.topic,
  sources: researchResult.sources,
  researchUnverified: researchResult.researchUnverified,
  tools: researchResult.tools.map(t => ({
    name: t.name,
    slug: toSlug(t.name),
    category: t.category,
    description: t.description,
    artifactType: t.artifactType,
    artifactStructure: t.artifactStructure,
    inputs: t.inputs,
    outputs: t.outputs,
    howUsed: t.howUsed,
    selectedFrameworks: [],  // populated after generatePrompts() runs — see note below
  })),
  generatedAt: new Date().toISOString(),
  pipelineVersion: '1.0.0',
}
// After generatePrompts() returns promptFiles, update selectedFrameworks:
// for each tool in buildMeta.tools, find the matching prompt file (resources/prompts/tool-<slug>.md)
// parse its frontmatter to get the framework: field
// set buildMeta.tools[i].selectedFrameworks = framework.split(',').map(f => f.trim())
// This requires passing promptFiles to the build-metadata writer.
completeDirectory.files.push({
  path: 'resources/build-metadata.json',
  content: JSON.stringify(buildMeta, null, 2),
})
```

**Prompt reading in page:** Read prompt files from `skills/<category>/<slug>/resources/prompts/` at page render time. Parse frontmatter to get `framework`, `original_framework`, `type`, `complexity`, `when_to_use`.

**`POST /api/regen-prompt`:**
1. Read `skills/<category>/<slug>/resources/build-metadata.json`
2. Find the ResearchTool matching the prompt's `tool` slug
3. Call `generatePromptBody(tool, topic, [newFramework], client)`
4. Write updated prompt file with new `framework:` in frontmatter (preserve `original_framework:`)
5. Return updated file content

**Allowed files:**
```
app/api/regen-prompt/route.ts
components/skill-mall/skill-detail/SkillTabs.tsx
components/skill-mall/skill-detail/PromptCard.tsx
components/skill-mall/skill-detail/FrameworkPicker.tsx
app/skills/[category]/[slug]/page.tsx
cli/src/commands/regen-prompt.ts
cli/src/index.ts
lib/pipeline.ts
lib/build-metadata.ts
```

**Verify:**
- PROMPTS tab renders on `skills/business/wrong-slug` detail page (the only skill with prompts) — smoke test
- Framework badge clickable, dropdown shows framework options
- `POST /api/regen-prompt` returns updated prompt with changed `framework:` field, unchanged `original_framework:` field (test)
- `npx skill-mall regen-prompt business/wrong-slug resources/prompts/tool-strategy-canvas.md --framework 'Chain of Thought'` updates the file

**Stop if:**
- `regen-prompt` works without `build-metadata.json` existing — stop and require the pipeline update first
- `original_framework:` field is overwritten — this must never happen
- Need files outside allowed_files

---

### T262 — optimize-prompt CLI

**Type:** Worker | **Depends on:** nothing (lib/prompt-optimizer.ts already exists)

**Objective:** `npx skill-mall optimize-prompt <file>` or `... --stdin`.

**Implementation:**

```typescript
// cli/src/commands/optimize-prompt.ts
import { resolveProviderConfig, createLLMClient } from '@/lib/providers/index.js'
import { optimizePrompt } from '@/lib/prompt-optimizer.js'
import fs from 'node:fs'
import path from 'node:path'
import * as p from '@clack/prompts'
import { pc } from '../utils.js'

export async function optimizePromptCommand(args: string[]): Promise<void> {
  const useStdin = args.includes('--stdin')
  const filePath = args.find(a => !a.startsWith('--'))

  if (!useStdin && !filePath) {
    process.stderr.write(pc.red('Usage: skill-mall optimize-prompt <file> | --stdin\n'))
    process.exit(1)
  }

  const promptText = useStdin
    ? fs.readFileSync('/dev/stdin', 'utf-8').trim()
    : fs.readFileSync(path.resolve(filePath!), 'utf-8').trim()

  let config
  try { config = resolveProviderConfig() }
  catch { process.stderr.write(pc.red('No provider configured. Run: npx skill-mall configure\n')); process.exit(1) }

  const client = createLLMClient(config)
  const s = p.spinner()
  s.start('Auditing prompt...')
  const audit = await optimizePrompt(promptText, client)
  s.stop('Done.')

  console.log(`\nToken efficiency: ${audit.tokenCountBefore} → ${audit.tokenCountAfter} tokens (${audit.tokenReductionPercent > 0 ? '-' : ''}${Math.abs(audit.tokenReductionPercent)}%)`)
  console.log(`Intent completeness: ${audit.intentDimensionsPresent.length}/9`)
  if (audit.intentDimensionsMissing.length > 0) {
    console.log(`  Missing: ${audit.intentDimensionsMissing.join(', ')}`)
  }
  console.log(`Output clarity: ${audit.outputClarityPasses ? 'PASS' : 'FAIL'}`)
  console.log(`Trigger sharpness: ${audit.triggerSharpnessPasses ? 'PASS' : 'FAIL'}`)

  if (!useStdin && filePath) {
    const outPath = filePath.replace(/\.md$/, '-optimized.md')
    fs.writeFileSync(outPath, audit.optimizedPrompt, 'utf-8')
    console.log(`\nOptimized: ${outPath}`)
  } else {
    console.log(`\n--- Optimized ---\n${audit.optimizedPrompt}`)
  }
}
```

**Allowed files:**
```
cli/src/commands/optimize-prompt.ts
cli/src/index.ts
```

**Verify:**
- `cd cli && npm run build` exits 0
- `echo 'This prompt helps you...' | npx skill-mall optimize-prompt --stdin` prints audit

**Stop if:** Need files outside allowed_files

---

### T263 — (Merged into T261)

T263 is merged into T261. The Prompts tab and the Framework Override are one feature — implement them together.

---

### T264 — npm Package Publisher

**Type:** Worker | **Depends on:** nothing

**Objective:** `npx skill-mall publish <category/slug> --registry npm [--publish]`

**Default is `--dry-run`. Actual publish ONLY with explicit `--publish` flag.**

```typescript
// lib/publish/npm.ts
export function generateNpmPackageJson(skill: Skill): object {
  return {
    name: `@skill-mall/${skill.slug}`,
    version: skill.version || '1.0.0',
    description: skill.description,
    keywords: ['skill', ...skill.tags],
    author: skill.author || 'skill-mall',
    license: skill.license || 'MIT',
    files: ['SKILL.md', 'README.md', 'resources/', 'scripts/'],
  }
}
```

**Pre-publish checks (same as skills.sh T107):** quality score >= 70, description <= 1024, name matches dir, license present.

**Publish flow:**
1. Run pre-publish checks
2. Write `package.json` to a temp directory copy of the skill
3. If `--publish` flag: run `npm publish --access public` in the temp dir
4. If dry-run: print the generated package.json and exit
5. Post-publish: write `metadata.npm_package: "@skill-mall/<slug>"` to SKILL.md

**Allowed files:**
```
cli/src/commands/publish.ts
lib/publish/npm.ts
```

**Verify:**
- `npx skill-mall publish ai/skill-creator --registry npm` (no --publish) prints package.json and exits 0
- `--publish` flag is required for actual publish — test that without it, nothing is published
- Version mismatch with existing npm package → exits 1

**Stop if:**
- `npm publish` runs without explicit `--publish` flag in any code path
- Need files outside allowed_files

---

### T265 — MCP Missing Tools + Search Tracking

**Type:** Worker | **Depends on:** nothing

**Objective:** Add `get_prompts` and `deploy_skill` to `/api/mcp`. Add search click-through tracking.

**`get_prompts` implementation:**
```typescript
if (name === 'get_prompts') {
  const skillDir = path.join(process.cwd(), 'skills', String(params.category), String(params.slug), 'resources', 'prompts')
  if (!fs.existsSync(skillDir)) return { prompts: [] }
  return {
    prompts: fs.readdirSync(skillDir)
      .filter(f => f.endsWith('.md'))
      .map(f => ({ filename: f, path: path.join('resources/prompts', f) }))
  }
}
```

**`deploy_skill` implementation:**
```typescript
if (name === 'deploy_skill') {
  // Check filesystem writability first
  try { fs.accessSync(os.homedir(), fs.constants.W_OK) }
  catch {
    return { error: 'Filesystem is read-only. Use the CLI to deploy: npx skill-mall deploy <slug>' }
  }

  const skillPath = path.join(process.cwd(), 'skills', String(params.category), String(params.slug))
  if (!fs.existsSync(skillPath)) return { error: `Skill not found: ${params.slug}` }

  const { deployToAgents } = await import('@/lib/agents/detector.js')
  const results = deployToAgents(skillPath, params.agent ? [String(params.agent)] : undefined)
  return { results: results.map(r => ({ agent: r.agent.id, success: r.success })) }
}
```

**Search click-through tracking** in `components/skill-mall/skill-card.tsx`: add `onClick` that calls `POST /api/analytics/search-click` with the skill slug before navigation (fire-and-forget, don't await).

**`lib/analytics.ts` additions:**
```typescript
export function logSearchClickEvent(skillSlug: string): void {
  try {
    const db = getDb()
    db.prepare('INSERT INTO search_clicks (skill_slug) VALUES (?)').run(skillSlug)
  } catch { /* non-fatal */ }
}

export function getSearchClickCount(skillSlug: string): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM search_clicks WHERE skill_slug = ?').get(skillSlug) as { count: number }
  return row.count
}
```

Note: `search_clicks` table must be added to `db/migrations/001_initial.sql` — add a new migration `db/migrations/004_search_clicks.sql`.

**Allowed files:**
```
app/api/mcp/route.ts
lib/analytics.ts
components/skill-mall/skill-card.tsx
app/page.tsx
db/migrations/004_search_clicks.sql
scripts/migrate.js
```

**Verify:**
- GET /api/mcp shows 5 tools (search_skills, get_skill, list_categories, get_prompts, deploy_skill)
- deploy_skill returns helpful error when filesystem is read-only (mocked test)
- search click fires on skill card click (smoke test)

**Stop if:**
- deploy_skill crashes with fs error instead of returning friendly message
- Need files outside allowed_files

---

### T266 — Trending Missing Views + Fork Tracking

**Type:** Worker | **Depends on:** nothing

**Objective:** Community Favorites, High Quality views on /trending. Fork count tracking. Fork count on detail page.

**Migration `db/migrations/003_fork_events.sql`:** (schema in "All SQL Schemas" above)

**Add to `lib/forking.ts`:**
```typescript
// After successful forkSkill(), log the event:
import { getDb } from './db/client'
// Inside forkSkill() after fs.rename:
try {
  const db = getDb()
  db.prepare('INSERT INTO fork_events (source_slug, fork_slug) VALUES (?, ?)').run(sourceSlug, newSlug)
} catch { /* non-fatal */ }
```

**Add to `lib/analytics.ts`:**
```typescript
export function getForkCount(skillSlug: string): number {
  try {
    const db = getDb()
    const row = db.prepare('SELECT COUNT(*) as count FROM fork_events WHERE source_slug = ?').get(skillSlug) as { count: number }
    return row.count
  } catch { return 0 }
}

export function getCommunityFavorites(limit = 10): Array<{ skill_slug: string; fork_count: number }> {
  try {
    const db = getDb()
    return db.prepare('SELECT source_slug as skill_slug, COUNT(*) as fork_count FROM fork_events GROUP BY source_slug ORDER BY fork_count DESC LIMIT ?').all(limit) as Array<{ skill_slug: string; fork_count: number }>
  } catch { return [] }
}
```

**High Quality view** requires both quality score AND effectiveness score > threshold. Compute at render time:
```typescript
const highQuality = allSkills.filter(s => {
  const score = computeQualityScore(s, allSlugs).total
  const effectiveness = getEffectivenessScore(s.slug)
  return score >= 90 && effectiveness !== null && effectiveness >= 4.5
})
```

**Allowed files:**
```
lib/analytics.ts
lib/forking.ts
app/trending/page.tsx
app/skills/[category]/[slug]/page.tsx
db/migrations/003_fork_events.sql
scripts/migrate.js
```

**Verify:**
- `npm run db:migrate` with 003 migration exits 0
- Community Favorites section renders (may be empty on fresh install)
- High Quality section renders (may be empty — requires quality > 90 AND review > 4.5)
- Forking a skill increments fork count in fork_events (test)
- Detail page shows `[ 0 FORKS ]` badge using fork_events count

**Stop if:** Need files outside allowed_files

---

### T267 — `--scope project` Deploy Flag

**Type:** Worker | **Depends on:** nothing

**Objective:** `--scope project` deploys to `./<agent-dir>/skills/` in the current working directory.

**Project-scoped paths for each supported agent:**
```typescript
export const PROJECT_SKILLS_DIRS: Record<string, string> = {
  'claude-code': '.claude/skills',
  'cursor':      '.cursor/skills',
  'codex':       '.codex/skills',
  'gemini-cli':  '.gemini/skills',
  'copilot':     '.github/copilot-instructions',  // different convention
  'continue':    '.continue/config/skills',
  'agents':      '.agents/skills',
}
```

Note: `copilot` uses a different path convention — deploy to `.github/copilot-instructions/<skill-name>.md` (single file, not directory). Document this in the deploy output.

**Allowed files:**
```
cli/src/commands/deploy.ts
cli/src/commands/deploy-pack.ts
lib/agents/detector.ts
components/skill-mall/deploy-button.tsx
```

**Verify:**
- `npx skill-mall deploy ai/skill-creator --scope project` creates `.claude/skills/skill-creator/` in cwd
- `npx skill-mall deploy ai/skill-creator --agents claude-code --scope project` same behavior
- Copilot scope shows a note about different file convention

**Stop if:**
- Project-scoped paths for any agent are different from the table above — document and use the table
- Need files outside allowed_files

---

### T268 — CI Trigger Evaluator + Budget Integration

**Type:** Worker | **Depends on:** nothing

**Objective:** Wire trigger evaluator and budget check as OPTIONAL CI steps that skip when secrets are absent.

**In `.github/workflows/validate-skills.yml`:** Add two optional steps after the existing validation step:

```yaml
- name: Trigger accuracy check (optional)
  if: env.SKILL_MALL_PROVIDER != '' && env.SKILL_MALL_API_KEY != ''
  continue-on-error: true
  env:
    SKILL_MALL_PROVIDER: ${{ secrets.SKILL_MALL_PROVIDER }}
    SKILL_MALL_API_KEY: ${{ secrets.SKILL_MALL_API_KEY }}
  run: |
    for dir in $CHANGED_DIRS; do
      slug=$(basename "$dir")
      node cli/dist/index.js eval-triggers "$slug" \
        --threshold ${{ inputs.trigger_accuracy_threshold || 80 }} \
        --warn-only || true
    done

- name: Budget check (optional)
  if: always()
  continue-on-error: true
  run: |
    for dir in $CHANGED_DIRS; do
      slug=$(basename "$dir")
      node cli/dist/index.js budget-check "$slug" \
        --chars-available ${{ inputs.budget_warn_at_installed || 200 }} || true
    done
```

**In `action.yml`:** Add inputs `trigger_accuracy_threshold` (default: 80), `budget_warn_at_installed` (default: 200).

**Allowed files:**
```
.github/workflows/validate-skills.yml
.github/actions/skill-mall-validate/action.yml
```

**Verify:**
- YAML is valid: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/validate-skills.yml'))"`
- Both steps have `continue-on-error: true` — they never block the build
- Trigger step is skipped when SKILL_MALL_PROVIDER is not set

**Stop if:**
- Either step can fail the build when LLM secrets are absent — must skip gracefully
- Need files outside allowed_files

---

### T271 — skills.sh Static Badge

**Type:** Worker | **Depends on:** nothing

**Objective:** Show `[ PUBLISHED ON SKILLS.SH ]` badge on detail page when `metadata.skills_sh_id` is set. Static link only — no live API calls.

**In `lib/skills.ts`:** Add `skills_sh_id?: string` to the `Skill` type and parse from frontmatter.

**Badge component:** A simple link `https://skills.sh/skills/<id>` rendered as a bracket-notation badge in the sidebar. No data fetching.

**Allowed files:**
```
lib/skills.ts
app/skills/[category]/[slug]/page.tsx
components/skill-mall/skill-detail/SkillsShBadge.tsx
```

**Verify:**
- Skill with `metadata.skills_sh_id: "abc123"` in frontmatter shows badge linking to skills.sh
- Skill without `skills_sh_id` shows no badge

**Stop if:**
- Any HTTP fetch to skills.sh API — static badge only
- Need files outside allowed_files

---

### T272 — CI README Status Badge

**Type:** Worker | **Depends on:** nothing

**Objective:** Add GitHub Actions status badge to README.md.

The badge URL format for a workflow file is:
```
https://github.com/jamesdsizemore/SkillMall/actions/workflows/validate-skills.yml/badge.svg
```

Add this to the README.md header section:
```markdown
[![Skill Validation](https://github.com/jamesdsizemore/SkillMall/actions/workflows/validate-skills.yml/badge.svg)](https://github.com/jamesdsizemore/SkillMall/actions/workflows/validate-skills.yml)
```

**Allowed files:**
```
.github/workflows/validate-skills.yml
README.md
```

**Verify:** README.md contains the badge markdown link

**Stop if:** Need files outside allowed_files

---

### T273 — `npx skill-mall mcp-server` CLI

**Type:** Worker | **Depends on:** nothing

**Objective:** Standalone HTTP server on port 3001 for local MCP development.

**Must NOT import Next.js modules.** Implement a standalone catalog reader:

```typescript
// cli/src/commands/mcp-server.ts
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

// Standalone skill reader — no Next.js imports
function readSkillsFromDir(skillsDir: string) {
  const skills = []
  if (!fs.existsSync(skillsDir)) return skills

  for (const cat of fs.readdirSync(skillsDir)) {
    const catDir = path.join(skillsDir, cat)
    if (!fs.statSync(catDir).isDirectory() || cat === '_template' || cat === '_starters') continue

    for (const slug of fs.readdirSync(catDir)) {
      const skillMd = path.join(catDir, slug, 'SKILL.md')
      if (!fs.existsSync(skillMd)) continue

      const { data, content } = matter(fs.readFileSync(skillMd, 'utf-8'))
      skills.push({ slug, category: cat, name: data.name || slug, description: data.description || '', tags: data.metadata?.tags?.split(',').map((t: string) => t.trim()) || [], content })
    }
  }
  return skills
}
```

The HTTP server handles POST JSON-RPC 2.0 requests, same protocol as `/api/mcp`. It reads `process.cwd()/skills` for the catalog. Print the MCP config JSON when starting:

```
SkillMall MCP server running at http://localhost:3001

Add to your MCP config:
{
  "mcpServers": {
    "skillmall": { "url": "http://localhost:3001" }
  }
}
```

**Allowed files:**
```
cli/src/commands/mcp-server.ts
cli/src/index.ts
```

**Verify:**
- `cd cli && npm run build` exits 0
- Server starts and responds to GET with tool list (manual smoke test)
- No Next.js module imports anywhere in mcp-server.ts

**Stop if:**
- Imports from `next/*`, `@next/*`, or any module that depends on Next.js runtime
- Need files outside allowed_files

---

### T274 — Review Score Trend in Contributor Dashboard

**Type:** Worker | **Depends on:** nothing

**Objective:** Add `getEffectivenessTrend(skillSlug)` returning 30-day daily average. Render as mini segmented bar on dashboard.

**SQLite date series for 30 days:**

```typescript
export function getEffectivenessTrend(skillSlug: string): Array<{ date: string; avg: number | null }> {
  const db = getDb()
  const results = db.prepare(`
    WITH RECURSIVE dates(d) AS (
      SELECT date('now', '-29 days')
      UNION ALL
      SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
    )
    SELECT
      dates.d as date,
      AVG(
        CASE WHEN r.skill_slug = ? AND date(r.created_at) = dates.d
          THEN r.rating * CASE WHEN r.is_generic = 0 THEN 2.0 ELSE 1.0 END / 
               NULLIF(CASE WHEN r.is_generic = 0 THEN 2.0 ELSE 1.0 END, 0)
        END
      ) as avg
    FROM dates
    LEFT JOIN reviews r ON date(r.created_at) = dates.d AND r.skill_slug = ?
    GROUP BY dates.d
    ORDER BY dates.d
  `).all(skillSlug, skillSlug) as Array<{ date: string; avg: number | null }>

  return results
}
```

Note: This SQL uses a recursive CTE (SQLite 3.8.3+) for date series generation. Test that SQLite version supports it: `sqlite3 --version`.

**Allowed files:**
```
lib/analytics.ts
lib/__tests__/analytics.test.ts
app/dashboard/page.tsx
```

**Verify:**
- `getEffectivenessTrend` returns exactly 30 entries (test — mock getDb)
- Days with no reviews return `avg: null`
- Dashboard renders trend mini-chart for authenticated author

**Stop if:**
- SQLite recursive CTE not available in the installed version — fall back to a simpler query that returns only days with data
- Need files outside allowed_files

---

### T275 — Prompt Library Copy + Skills Using Framework

**Type:** Worker | **Depends on:** nothing

**Objective:** One-click copy button on each framework card. Count of skills using each framework.

**Skill-framework index:** Compute at page render time by reading all prompt frontmatter across all skills. This is a static page — the cost is paid at build time:

```typescript
// In app/prompt-library/page.tsx
function buildFrameworkSkillIndex(allSkills: Skill[]): Map<string, number> {
  const index = new Map<string, number>()
  for (const skill of allSkills) {
    const skillDir = path.dirname(skill.path).replace(/^skills\//, '')
    const promptDir = path.join(process.cwd(), 'skills', skillDir, 'resources', 'prompts')
    if (!fs.existsSync(promptDir)) continue

    for (const file of fs.readdirSync(promptDir).filter(f => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(promptDir, file), 'utf-8')
      const match = content.match(/^framework:\s*(.+)$/m)
      if (match) {
        for (const fw of match[1].split(',').map(f => f.trim())) {
          index.set(fw, (index.get(fw) ?? 0) + 1)
        }
      }
    }
  }
  return index
}
```

**Copy button:** Client component using `navigator.clipboard.writeText(FRAMEWORK_DESCRIPTIONS[name])`.

**Allowed files:**
```
app/prompt-library/page.tsx
lib/skills.ts
```

**Verify:**
- Copy button renders on framework cards (smoke test)
- `[ X SKILLS USE THIS ]` count appears (may be 0 for all current skills — that's OK)
- Page still builds statically (`npm run build` shows `/prompt-library` as static)

**Stop if:** Need files outside allowed_files

---

### T280 — Missed Features Completion Audit (Judge)

**Type:** Judge | **Depends on:** T251–T275, T257 all done

**Objective:** Audit all missed Phase 1/2 features. Every feature from the spec assigned to Phase 1 or Phase 2 must be present and working. Do not approve based on receipts alone — verify in the running application.

**Verification checklist:**
- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run db:migrate` exits 0 (applies 001, 003, 004 migrations)
- [ ] `/skills/business/wrong-slug` shows PROMPTS tab with 3 prompt cards
- [ ] Framework badge on a prompt card is clickable and shows dropdown
- [ ] `/graph` renders dependency network
- [ ] `/trending` shows Community Favorites and High Quality sections (may be empty)
- [ ] `/prompt-library` shows copy buttons and skill-usage counts
- [ ] `npx skill-mall budget-check ai/skill-creator --chars-available 100` prints analysis with NO invented per-agent numbers
- [ ] `npx skill-mall optimize-prompt --help` prints usage
- [ ] `npx skill-mall extract --help` prints usage
- [ ] `npx skill-mall mcp-server --help` prints usage
- [ ] `npx skill-mall deploy ai/skill-creator --scope project` creates local .claude/skills/ entry
- [ ] `npx skill-mall publish --help` prints usage; default behavior is --dry-run
- [ ] `tests/` directory has >= 72 test case JSON files
- [ ] Budget Analyzer uses `--chars-available` not per-agent hardcoded values
- [ ] `resources/build-metadata.json` is written by the pipeline when a skill is created
- [ ] Run `feature-inventory-check` skill one final time — compare every Phase 1/2 spec feature against codebase

**Do not approve if:**
- Any T251–T275 or T257 task is queued or active
- Budget Analyzer uses hardcoded per-agent values
- `regen-prompt` works without `build-metadata.json`
- Any Phase 1/2 spec feature is missing or non-functional — the spec is the source of truth

---

## Category 2 Task Cards — Phase 3 Features

These tasks activate only after T280 passes.

---

### T201 — SQLite Phase 3 Migration

**Type:** Worker | **Depends on:** T280

**Objective:** Install reactflow, stripe. Write `db/migrations/002_phase3.sql`. Apply migration.

**Note:** Migrations 001, 003, 004 already exist from Category 1 tasks. This adds 002 which covers Phase 3 tables. SQLite applies migrations alphabetically — 002 will be applied between 001 and 003, which is correct.

**`db/migrations/002_phase3.sql`** (full schema in PHASE-3-PLAN original Section "SQLite Schema Additions for Phase 3"):
```sql
CREATE TABLE IF NOT EXISTS skill_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  reviewer_github_id TEXT NOT NULL,
  satisfaction INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  body TEXT CHECK (length(body) <= 200),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS improvement_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  dimension TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  pattern TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  skill_slug TEXT NOT NULL UNIQUE,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  chunk_size INTEGER NOT NULL DEFAULT 512,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  source_file TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  skill_slug TEXT NOT NULL,
  buyer_github_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT NOT NULL,
  purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_tiers (
  skill_slug TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'sponsored', 'premium')),
  price_cents INTEGER,
  sponsor_name TEXT,
  creator_github_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Allowed files:**
```
db/migrations/002_phase3.sql
package.json
.env.local
lib/db/types.ts
lib/marketplace/gate.ts
```

**Verify:**
- `npm install reactflow stripe @stripe/stripe-js` exits 0
- `npm run db:migrate` exits 0 (all 4 migrations applied)
- All 6 Phase 3 tables exist in database
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0

**Stop if:**
- sqlite-vss `loadExtension()` throws — report Node.js version and error; RAG (T203) will be blocked but all other tasks proceed
- Need files outside allowed_files

---

### T202 — Skill Chain Builder

**Type:** Worker | **Depends on:** T201

**Objective:** Visual canvas at `/skills/chains/new`. `buildChainDirectory` generates chain SKILL.md. POST `/api/create-chain`.

**ChainCanvas must be dynamically imported with `ssr: false`** to avoid SSR errors.

**`lib/chains.ts` — `buildChainDirectory`:**
```typescript
export function buildChainDirectory(chain: Chain, meta: SkillMetadata): InMemoryFile[] {
  const stepDescriptions = chain.steps
    .sort((a, b) => a.order - b.order)
    .map((s, i) => `${i + 1}. ${s.skillSlug}${s.usesOutput ? ` (uses: ${s.usesOutput})` : ''}`)
    .join('\n')

  const frontmatter = `---
name: ${chain.slug}
description: "Run a coordinated ${chain.name} analysis using ${chain.steps.length} skills in sequence."
license: MIT
metadata:
  version: "1.0.0"
  chain: true
  chain_steps:
${chain.steps.sort((a, b) => a.order - b.order).map(s => `    - skill: ${s.skillSlug}
      passes_as: ${s.passesAs}
${s.usesOutput ? `      uses_output: ${s.usesOutput}\n` : ''}${s.instructions ? `      instructions: "${s.instructions}"\n` : ''}`).join('')}
---`

  return [
    { path: 'SKILL.md', content: `${frontmatter}\n\n# ${chain.name}\n\n${stepDescriptions}` },
    { path: 'chain.json', content: JSON.stringify(chain, null, 2) },
    { path: 'README.md', content: `# ${chain.name} Chain\n\n## Steps\n\n${stepDescriptions}` },
  ]
}
```

**`components/skill-mall/chains/ChainCanvas.tsx`** (key implementation):
```typescript
'use client'
import ReactFlow, { Node, Edge, Connection, addEdge, Background, Controls,
  useNodesState, useEdgesState, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'
import { useState, useCallback } from 'react'
import type { Skill } from '@/lib/skills'

interface SkillNodeData { skill: Skill }

function SkillNode({ data }: { data: SkillNodeData }) {
  return (
    <div className="border border-sm-border bg-sm-surface px-4 py-3 min-w-[200px]">
      <Handle type="target" position={Position.Left} />
      <p className="text-[9px] tracking-widest text-sm-secondary" style={{fontFamily:'var(--font-space-mono)'}}>
        [ {data.skill.category.toUpperCase()} ]
      </p>
      <p className="text-sm font-semibold text-sm-display">{data.skill.name}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { skillNode: SkillNode }

export function ChainCanvas({ availableSkills, onChainReady }: {
  availableSkills: Skill[]
  onChainReady: (slug: string, steps: ChainStep[]) => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<SkillNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [chainName, setChainName] = useState('')
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)

  const onConnect = useCallback((c: Connection) =>
    setEdges(eds => addEdge({ ...c, data: { passesAs: 'context_append' } }, eds)), [setEdges])

  const addSkill = (skill: Skill) => {
    const id = `skill-${skill.slug}-${Date.now()}`
    setNodes(nds => [...nds, { id, type: 'skillNode', position: { x: nds.length * 280, y: 100 }, data: { skill } }])
  }

  const buildChain = () => {
    if (!chainName.trim() || nodes.length < 2) return
    const slug = chainName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x)
    const steps = sorted.map((n, i) => ({
      order: i + 1, skillSlug: `${n.data.skill.category}/${n.data.skill.slug}`, passesAs: 'context_append' as const,
    }))
    onChainReady(slug, steps)
  }

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Sidebar */}
      <div className="w-64 border-r border-sm-border bg-sm-surface overflow-y-auto p-3">
        {availableSkills.map(s => (
          <button key={s.slug} onClick={() => addSkill(s)}
            className="w-full text-left border border-sm-border p-2 mb-1 hover:border-sm-display text-sm">
            {s.name}
          </button>
        ))}
      </div>
      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onEdgeClick={(_, e) => setSelectedEdge(e)} fitView className="bg-sm-bg">
          <Background gap={16} size={1} />
          <Controls />
        </ReactFlow>
        <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-sm-surface border border-sm-border p-3">
          <input value={chainName} onChange={e => setChainName(e.target.value)}
            placeholder="chain name" className="bg-transparent text-sm text-sm-primary outline-none border-b border-sm-border py-1" />
          <button onClick={buildChain} disabled={!chainName.trim() || nodes.length < 2}
            className="bg-sm-display px-4 py-2 text-[10px] tracking-widest text-sm-bg disabled:opacity-30"
            style={{fontFamily:'var(--font-space-mono)'}}>
            [ BUILD CHAIN ]
          </button>
        </div>
      </div>
      {selectedEdge && <ChainEdgeConfig edge={selectedEdge}
        onUpdate={cfg => { setEdges(eds => eds.map(e => e.id === selectedEdge.id ? {...e, data: cfg} : e)); setSelectedEdge(null) }}
        onClose={() => setSelectedEdge(null)} />}
    </div>
  )
}
```

**`ChainEdgeConfig`** panel (right sidebar when edge selected): shows `passesAs` selector (context_append / context_replace / named_variable), optional `namedVariable` input, optional `instructions` textarea. Calls `onUpdate(config)` on save, `onClose()` on cancel. Style with Nothing design — bracket-notation buttons, underline inputs.

**`POST /api/create-chain`** body: `{ chain: Chain; metadata: SkillMetadata }`. Calls `buildChainDirectory`, merges into `InMemorySkillDirectory`, runs `validateSkillDirectory`, then `atomicWrite` to `skills/chains/<slug>/`.

```typescript
// app/skills/chains/new/page.tsx
import dynamic from 'next/dynamic'
const ChainCanvas = dynamic(
  () => import('@/components/skill-mall/chains/ChainCanvas').then(m => m.ChainCanvas),
  { ssr: false }
)
```

**Allowed files:**
```
app/skills/chains/new/page.tsx
components/skill-mall/chains/ChainCanvas.tsx
components/skill-mall/chains/ChainEdgeConfig.tsx
lib/chains.ts
lib/__tests__/chains.test.ts
app/api/chains/route.ts
app/api/chains/[slug]/route.ts
app/api/create-chain/route.ts
```

**Verify:**
- `buildChainDirectory` with 2 steps produces SKILL.md with `chain: true` in frontmatter (test)
- `/skills/chains/new` renders without SSR error (`npm run build` with no SSR warnings)
- Chain SKILL.md validates against AgentSkills spec (test)

**Stop if:**
- React Flow causes SSR error — add `dynamic` import with `ssr: false` immediately
- Need files outside allowed_files

---

### T203 — RAG Knowledge Attachment

**Type:** Worker | **Depends on:** T201

**Claude Code CLI does not support embeddings.** For claude-code provider, throw: `"Provider 'claude-code' does not support embeddings. Set SKILL_MALL_EMBEDDING_PROVIDER=openai or ollama."` Use `SKILL_MALL_EMBEDDING_PROVIDER` env var for a separate embedding provider.

**`lib/rag/chunker.ts`:**
```typescript
export function chunkText(text: string, targetTokens = 512): string[] {
  const words = text.split(/\s+/)
  const wordsPerChunk = Math.floor(targetTokens / 1.35)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ')
    if (chunk.trim().length > 20) chunks.push(chunk)
  }
  return chunks
}
```

**`lib/rag/embeddings.ts`:** Implements `generateEmbedding(text, provider, apiKey)`. For openai: use `openai.embeddings.create({ model: 'text-embedding-3-small', input: text })`. For ollama: POST to `http://localhost:11434/api/embeddings` with `{ model: 'nomic-embed-text', prompt: text }`. For gemini: use `genAI.getGenerativeModel({ model: 'text-embedding-004' }).embedContent(text)`. Returns `{ vector: number[]; tokenCount: number }`.

**`lib/rag/knowledge-base.ts`:** `createKnowledgeBase(skillSlug)` inserts into `knowledge_bases` table. `attachKnowledge(kbId, sourceDir, client)` buffers ALL embeddings before writing (atomic transaction — partial API failure leaves KB intact). `retrieveChunks(skillSlug, query, client, topK=5)` generates query embedding then runs pure-JS cosine similarity scan over stored BLOB embeddings. Returns top-K chunks sorted by score.

**Vector search approach — pure JavaScript cosine similarity (no native extension):**
sqlite-vss is broken on Node 22 and abandoned. sqlite-vec (its successor) still requires a native extension with Vercel deployment issues. For a skill catalog where knowledge bases contain <5K chunks, a linear JS cosine scan is ~5-15ms — well below the embedding API round-trip (~200-400ms) that dominates latency. This is not a compromise; it is the correct architecture for this corpus size. The 50K-chunk threshold where ANN indexes pay off requires ~19M words per skill — not a realistic scenario.

Embeddings are stored as `Float32Array` bytes (BLOB) in `knowledge_chunks.embedding`. Buffer alignment: always copy via `buf.buffer.slice(...)` before constructing Float32Array — Node.js Buffers use a shared pool and `byteOffset` is not guaranteed 4-byte aligned.

**Stop if:** Provider is claude-code (no embeddings API) — return helpful error. Dimension mismatch between query and stored vectors — throw with explanation (was KB built with a different provider?).

**Allowed files:**
```
lib/rag/embeddings.ts
lib/rag/chunker.ts
lib/rag/knowledge-base.ts
lib/__tests__/rag.test.ts
app/api/retrieve/route.ts
cli/src/commands/attach-knowledge.ts
cli/src/index.ts
```

---

### T204 — Self-Improvement Feedback Collection

**Type:** Worker | **Depends on:** T201

Feedback form is opt-in only. Never auto-prompted. Analysis triggered at 10+ submissions.

**`lib/self-improvement/feedback.ts`:**
```typescript
export function createFeedback(params: {
  skillSlug: string; reviewerGithubId: string;
  satisfaction: number; body?: string
}): SkillFeedback {
  const db = getDb()
  db.prepare('INSERT INTO skill_feedback (skill_slug, reviewer_github_id, satisfaction, body) VALUES (?, ?, ?, ?)')
    .run(params.skillSlug, params.reviewerGithubId, params.satisfaction, params.body ?? null)
  return db.prepare('SELECT * FROM skill_feedback WHERE skill_slug = ? AND reviewer_github_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(params.skillSlug, params.reviewerGithubId) as SkillFeedback
}

export function getFeedbackCount(skillSlug: string): number {
  const db = getDb()
  return (db.prepare('SELECT COUNT(*) as count FROM skill_feedback WHERE skill_slug = ?').get(skillSlug) as { count: number }).count
}

export function getRecentFeedback(skillSlug: string, limit = 50): SkillFeedback[] {
  const db = getDb()
  return db.prepare('SELECT * FROM skill_feedback WHERE skill_slug = ? ORDER BY created_at DESC LIMIT ?').all(skillSlug, limit) as SkillFeedback[]
}
```

**`POST /api/feedback`** body: `{ skillSlug, satisfaction (1-5), body (max 200 chars) }`. Auth required (sm_session cookie). Returns `{ feedback, analysisTriggered: getFeedbackCount(slug) >= 10 }`.

**Feedback form** on skill detail page: opt-in only, satisfaction 1-5 stars + 200-char text area. Shows only if authenticated. Never rendered automatically on page load — user must scroll to "Leave Feedback" section.

**Allowed files:**
```
lib/self-improvement/feedback.ts
lib/__tests__/feedback.test.ts
app/api/feedback/route.ts
app/skills/[category]/[slug]/page.tsx
components/skill-mall/improvements/FeedbackForm.tsx
```

---

### T205 — Self-Improvement Approval and Application

**Type:** Worker | **Depends on:** T204

CRITICAL: `session.github_login === skill.author` check happens BEFORE any file modification. No automatic writes under any circumstances.

**`lib/self-improvement/analyzer.ts`** — LLM call to analyze 10+ feedback items and return `FeedbackPattern[]` with `{ dimension, pattern, suggestion }`. Prompt: given the feedback items, identify patterns affecting >= 30% of responses and return JSON. Each suggestion names the specific dimension (description/instructions/templates/prompts/metadata).

**`lib/self-improvement/applier.ts`** — `applySuggestion(suggestion, client)`:
1. Load `getAllSkills()`, find skill by slug
2. Verify `session.github_login === skill.author` — throw 403 if mismatch
3. Load current file for the dimension (SKILL.md for description/instructions/metadata, first template/prompt file for those dimensions)
4. LLM call: "Given current content and this suggestion, return the updated file content. Return only the raw file content."
5. Atomic write (temp + rename)
6. Bump `metadata.version` in SKILL.md (patch for clarity, minor for instructions)
7. Mark suggestion `status: 'approved'`, set `resolved_at`

**Key constraint:** `applySuggestion` MUST verify author identity. This is non-negotiable and must be the very first check before any disk operation.

**Allowed files:**
```
lib/self-improvement/analyzer.ts
lib/self-improvement/applier.ts
lib/__tests__/self-improvement.test.ts
app/api/improvements/[skillSlug]/route.ts
app/api/improvements/[id]/approve/route.ts
app/api/improvements/[id]/reject/route.ts
app/skills/[category]/[slug]/improvements/page.tsx
components/skill-mall/improvements/SuggestionCard.tsx
components/skill-mall/improvements/SuggestionList.tsx
```

**Stop if:**
- `applySuggestion` does not verify `session.github_login === skill.author` — fix before proceeding
- Any automatic write happens without author approval

---

### T206 — Marketplace Gate and Tier System

**Type:** Worker | **Depends on:** T201

`checkMarketplaceReady()` uses real data — not hardcoded false. Marketplace UI is hidden (not disabled, not a "coming soon") when `ready: false`.

**`lib/marketplace/gate.ts`:**
```typescript
const CONDITIONS = { minSkillCount: 200, minCommunityMembers: 500, minRatingsMonths: 3, minSkillsWithTests: 50 }

export async function checkMarketplaceReady(db: Database.Database, allSkillsCount: number): Promise<MarketplaceStatus> {
  const communityCount = (db.prepare('SELECT COUNT(DISTINCT github_id) as c FROM sessions WHERE expires_at > datetime("now")').get() as { c: number }).c
  const firstReview = db.prepare('SELECT MIN(created_at) as d FROM reviews').get() as { d: string | null }
  const ratingsMonths = firstReview.d ? Math.floor((Date.now() - new Date(firstReview.d).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0
  const skillsWithTests = // count directories in tests/ folder
    require('fs').existsSync('tests') ? require('fs').readdirSync('tests').filter((d: string) => require('fs').statSync(`tests/${d}`).isDirectory()).length : 0

  const conditions = {
    skillCount: { required: 200, current: allSkillsCount, met: allSkillsCount >= 200 },
    communityMembers: { required: 500, current: communityCount, met: communityCount >= 500 },
    ratingsMonths: { required: 3, current: ratingsMonths, met: ratingsMonths >= 3 },
    skillsWithTests: { required: 50, current: skillsWithTests, met: skillsWithTests >= 50 },
  }
  return { ready: Object.values(conditions).every(c => c.met), conditions }
}
```

**`TierBadge`**, **`PremiumTeaser`** components: see "Marketplace Frontend Components" section in original plan — the full TSX for both is specified there with Nothing design tokens. `TierBadge` shows `[ PREMIUM ]` or `[ SPONSORED ]` in bracket notation. `PremiumTeaser` shows skill name, description, price, purchase button calling `/api/marketplace/checkout`.

**Allowed files:**
```
lib/marketplace/gate.ts
lib/marketplace/entitlement.ts
lib/__tests__/marketplace.test.ts
app/api/marketplace/status/route.ts
app/api/marketplace/entitlement/route.ts
components/skill-mall/marketplace/TierBadge.tsx
components/skill-mall/marketplace/PremiumTeaser.tsx
app/skills/[category]/[slug]/page.tsx
```

---

### T207 — Stripe Payment Integration

**Type:** Worker | **Depends on:** T206

**Environment variables required BEFORE starting:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in `.env.local`.

**`lib/marketplace/payments.ts`:**
```typescript
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-01-27.acacia' })

export async function createCheckoutSession(skillSlug: string, priceCents: number, buyerLogin: string): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price_data: { currency: 'usd', product_data: { name: `SkillMall: ${skillSlug}` }, unit_amount: priceCents }, quantity: 1 }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${skillSlug}?purchased=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${skillSlug}`,
    metadata: { skillSlug, buyerLogin },
  })
  return session.url!
}

export function handleWebhook(payload: Buffer, signature: string): void {
  const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    const db = getDb()
    db.prepare('INSERT OR IGNORE INTO purchases (id, skill_slug, buyer_github_id, amount_cents, stripe_session_id) VALUES (?, ?, ?, ?, ?)')
      .run(s.id, s.metadata!.skillSlug, s.metadata!.buyerLogin, s.amount_total, s.id)
  }
}
```

**`app/api/webhooks/stripe/route.ts`:** MUST have `export const runtime = 'nodejs'` and raw body handling:
```typescript
export const runtime = 'nodejs'
export async function POST(req: NextRequest) {
  const payload = Buffer.from(await req.arrayBuffer())
  const sig = req.headers.get('Stripe-Signature')!
  try {
    handleWebhook(payload, sig)
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }
}
```

**Critical:** The webhook route MUST read raw bytes BEFORE any `req.json()` call. `handleWebhook` calls `stripe.webhooks.constructEvent` which will throw if signature is invalid — the 400 response must be returned without processing the payload.

**Allowed files:**
```
lib/marketplace/payments.ts
app/api/marketplace/checkout/route.ts
app/api/webhooks/stripe/route.ts
app/api/marketplace/entitlement/route.ts
```

**Stop if:**
- `export const config = { api: { bodyParser: false } }` missing from webhook route
- Webhook processes payload without verifying Stripe-Signature header first
- STRIPE_SECRET_KEY not in .env.local

---

### T208 — Phase 3 Documentation

**Type:** Worker | **Depends on:** T202, T203, T204, T205, T206, T207

**Objective:** Write all Phase 3 docs. Each >= 500 words. Include all missed Phase 1/2 features that now exist.

**Files:**
```
docs/user/skill-chains.md
docs/user/rag-enhanced-skills.md
docs/user/self-improvement-loop.md
docs/user/marketplace.md
docs/reference/chain-format.md
docs/user/budget-analyzer.md           (T252 — new)
docs/user/domain-starter-templates.md  (T251 — new)
docs/user/multilingual-support.md      (T256 — new)
docs/reference/build-metadata.md       (T261 — new)
```

**Allowed files:**
```
docs/user/
docs/reference/
```

**Verify:** All 9 files exist, each >= 500 words

---

### T209 — Phase 3 Completion Audit (Judge)

**Type:** Judge | **Depends on:** T201–T208, T280

**Objective:** Final audit. All 30 tasks done. Every spec feature present and working. Run `feature-inventory-check` one final time.

**Do not mark complete if:**
- T280 (missed features audit) did not pass with `approved`
- `npm run build` or `npm test` fails
- Marketplace UI appears when `checkMarketplaceReady()` returns false
- Any Phase 3 or Phase 1/2 spec feature is missing or broken
- `feature-inventory-check` skill run reveals any gap

---

## Completion Proof

- All 30 tasks done with receipts
- `npm run build` clean, `npm test` passing, `npx tsc --noEmit` clean
- T280 Judge receipt shows `approved`
- `/skills/business/wrong-slug` shows PROMPTS tab with framework badges
- Chain created via canvas and deployed successfully
- RAG embeds documents and retrieves relevant chunks
- Self-improvement approval gate prevents any automatic file writes
- Marketplace hidden until `checkMarketplaceReady()` returns true
- All 9 Phase 3 docs >= 500 words
- All 5-9 missed-feature docs >= 500 words
- `feature-inventory-check` skill run against spec shows zero gaps
