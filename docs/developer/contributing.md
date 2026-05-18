# Contributing Guide

Everything you need to submit a quality contribution to SkillMall — whether you're adding a skill, fixing a bug, improving documentation, or building a feature.

## Table of Contents

1. [Types of Contributions](#types-of-contributions)
2. [Contributing a Skill](#contributing-a-skill)
3. [Quality Bar for Skills](#quality-bar-for-skills)
4. [Contributing Code](#contributing-code)
5. [Code Standards](#code-standards)
6. [Writing Tests](#writing-tests)
7. [Documentation Contributions](#documentation-contributions)

---

## Types of Contributions

**Skills** are the easiest contribution. No TypeScript required. A skill is a structured markdown file — if you can write good instructions for an AI agent, you can contribute a skill. The complete workflow is documented in [Contributing a Skill](#contributing-a-skill) below.

**Bug fixes** are the most welcome code contributions. If you find something broken, check the [issues](https://github.com/jamesdsizemore/SkillMall/issues) first to see if it's already reported. A bug fix should include:
- A test that reproduces the bug
- The fix (minimal — don't refactor while fixing)
- Verification that the test passes

**Documentation** contributions improve the docs in `docs/developer/`, `docs/guide/`, or `docs/marketing/`. Every doc has a word count minimum and an accuracy requirement. See [Documentation Contributions](#documentation-contributions).

**New features** require a design discussion first. Open an issue describing the feature before writing code. Features that conflict with the architecture (adding a Supabase dependency, adding an Anthropic SDK import) will not be merged regardless of implementation quality.

---

## Contributing a Skill

The complete workflow for contributing a skill to the SkillMall catalog.

### Step 1 — Create your skill

**Option A: Research-first pipeline (recommended)**

```bash
npx skill-mall create "topic name" \
  --urls https://authoritative-source.com/methodology \
  --category business
```

Review the extracted tools, then confirm:

```bash
npx skill-mall confirm-research <slug>
```

**Option B: Manual creation from a template**

```bash
npx skill-mall new <category> <skill-name>
# Edit skills/<category>/<skill-name>/SKILL.md
```

**Option C: From a domain starter**

```bash
npx skill-mall new --from-template code-review my-code-review
# Fill in the [FILL-IN: ...] markers
```

### Step 2 — Validate

```bash
bash scripts/validate-skill.sh skills/<category>/<slug>
```

Fix any errors. Warnings are acceptable but reduce the quality score.

For strict validation (treating warnings as errors, as CI does for contributions):

```bash
bash scripts/validate-skill.sh --strict skills/<category>/<slug>
```

### Step 3 — Check quality score

Run the dev server and view the skill detail page:

```bash
npm run dev
# Open http://localhost:3000/skills/<category>/<slug>
```

The quality score appears prominently on the skill detail page. **PRs require a score of 70 or higher to merge.** If your score is below 70, use the quality score breakdown on the page to see which dimensions are losing points.

### Step 4 — Test in a real agent session

Deploy the skill to your agent and actually invoke it:

```bash
npx skill-mall deploy <category>/<slug>
# Open Claude Code (or your agent)
# Invoke the skill with a realistic user request
```

Does the output match what the skill promises? Is the trigger phrase specific enough? This real-world test catches issues that automated validation misses.

### Step 5 — Open a PR

1. Fork the repository
2. Create a branch: `git checkout -b feat/skill-<slug>`
3. Commit: follow the [commit convention](#commit-convention)
4. Push and open a PR against `main`

CI runs automatically:
- `bash scripts/validate-skill.sh --strict` on changed skill directories
- Optional: trigger evaluation if the skill has `trigger_accuracy: true` in frontmatter

The PR will show a validation report as a comment listing pass/fail per skill with specific issues.

---

## Quality Bar for Skills

The quality score is computed across 5 dimensions. Every contributor should understand each dimension before submitting.

### Dimension 1 — Description Quality (25 points)

The description is the most important field. It determines when agents invoke the skill.

**25 points max. Deductions:**
- **-7 points**: Description is less than 50 characters (too vague to be useful)
- **-6 points**: Description exceeds 150 characters (will be silently truncated by agents)
- **-7 points**: Description does not start with an action verb ("Apply", "Analyze", "Run", "Generate", "Create", "Write", "Evaluate", "Review")
- **-5 points**: Description is generic — no named methodology, tool, or output

**What a good description looks like:**
```
# Good (25 points)
"Apply Blue Ocean Strategy: ERRC grid, Strategy Canvas, and non-customer analysis."

# Bad — no action verb (-7 pts)
"Blue Ocean Strategy toolkit for competitive analysis."

# Bad — too long (-6 pts)
"Apply the Blue Ocean Strategy framework developed by W. Chan Kim and Renée Mauborgne to identify and create uncontested market spaces using the Four Actions Framework."
```

### Dimension 2 — Content Completeness (25 points)

Does the skill's body actually explain how to use it?

**25 points max. Deductions:**
- **-5 points**: Body is less than 100 words
- **-7 points**: No structured headings (no `##` sections)
- **-7 points**: Body has no examples, templates, or artifacts
- **-6 points**: The skill claims to produce a specific artifact but doesn't show what it looks like

### Dimension 3 — Frontmatter Health (20 points)

Are all optional fields present and valid?

**20 points max. Deductions for missing fields:**
- Missing `metadata.version`: -4 pts
- Missing `metadata.author`: -4 pts
- Missing `metadata.category`: -4 pts
- Missing `metadata.tags` (or fewer than 3 tags): -4 pts
- Missing `metadata.linked-skills` when similar skills exist: -4 pts

### Dimension 4 — Resource Richness (20 points)

Does the skill include supporting materials?

**20 points max:**
- `resources/templates/` present: +8 pts
- `resources/samples/` present: +7 pts
- `resources/prompts/` present: +5 pts

The research-first pipeline (`npx skill-mall create + confirm-research`) generates all three automatically. Manual skills often miss one or more.

### Dimension 5 — Link Health (10 points)

Are `metadata.linked-skills` references valid?

**10 points max:**
- No `linked-skills`: full 10 points (not penalized for omitting)
- All linked skills exist in catalog: full 10 points
- One broken link: -5 pts
- Two or more broken links: 0 pts

### Minimum Merge Score: 70/100

PRs below 70 will have changes requested. The most common reasons for rejection:
1. Description doesn't start with an action verb (easy fix: rewrite the first word)
2. Body too short (easy fix: add a "How to use" section with numbered steps)
3. Missing `resources/templates/` (easy fix: run the pipeline or add a blank template manually)

---

## Contributing Code

### The 16-Step Development Loop

Every code contribution follows this loop. Steps 6, 7, 8, 9, and 11 are never skipped — even for "trivial" changes.

1. Read the relevant code and understand the current behavior
2. Map dependencies — which modules does this change affect?
3. Establish TypeScript types before writing implementation
4. Plan parallel vs serial work — can any parts be written independently?
5. Write tests before or alongside implementation (see [Writing Tests](#writing-tests))
6. **`npx tsc --noEmit`** — must exit 0 before continuing
7. **`npm run lint`** — must exit 0 before continuing
8. **`npm run build`** — must succeed before continuing
9. **First code review** — read your own diff critically
10. Fix all issues from review
11. **Second code review** — read the diff again after fixes
12. Smoke test on `localhost:3000`
13. Security check — any user input? Any file writes? Any external API calls?
14. Update documentation if the interface changed
15. Final review against the task requirements
16. `git commit` with correct message format

### Commit Convention

```
<type>(<scope>): <description>

[optional body: explains WHY, not WHAT]

[optional footer: Closes #123, BREAKING CHANGE: ...]
```

**Types:**
- `feat`: new capability (bumps minor version)
- `fix`: bug correction (bumps patch version)
- `refactor`: code restructure with no behavior change
- `test`: adding or correcting tests
- `docs`: documentation only
- `chore`: build system, dependencies, CI

**Examples:**

```bash
# Feature
git commit -m "feat(rag): pure-JS cosine similarity replaces sqlite-vss

sqlite-vss broken on Node 22, abandoned upstream. Pure JS linear scan
is 5-15ms for <5K chunks — below the embedding API round-trip."

# Bug fix
git commit -m "fix(cli): lazy-load RAG module to prevent startup crash

Static import of knowledge-base.ts pulled better-sqlite3 (CJS) into
the ESM CLI bundle, crashing all commands at startup."

# Documentation
git commit -m "docs: add API reference with all 29 routes"
```

### PR Template

When you open a PR, GitHub will fill in the template automatically. Required sections:

**What changed:** 1-3 sentences describing the change.

**Why:** The motivation — what problem does this solve? Link the issue if one exists.

**How to test:** Specific steps for the reviewer to verify the change works.

**Breaking changes:** Any changes to public interfaces, CLI flags, API response shapes, or database schema.

### Code Review Process

All PRs require at least one review from a maintainer. Reviews focus on:

1. **Correctness**: Does the code do what it says? Are edge cases handled?
2. **Tests**: Is there a test for the new behavior? Does it actually catch a regression?
3. **TypeScript**: Are types accurate and specific (not `any`)?
4. **Security**: Is user input validated? Are SQL queries parameterized? Are file paths validated?
5. **Performance**: Does this change a hot path? Is SQLite used synchronously where appropriate?

**Responding to review:** Address every comment, even if just to explain why you disagree. Never close a PR as resolved without confirmation from the reviewer.

---

## Code Standards

### TypeScript Strict Mode

All code runs under `"strict": true` in `tsconfig.json`. This means:
- No implicit `any` — every variable must have an explicit or inferrable type
- Strict null checks — `null` and `undefined` are not assignable to other types without explicit handling
- No implicit `this` — `this` must be typed explicitly in class methods

**Common strict mode patterns:**

```typescript
// Good — explicit null handling
const session = token ? getSession(token) : null
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Bad — ignoring possible null
const session = getSession(token) // might return null — strict mode will error
session.github_login              // unsafe access
```

### Zod for External Input Validation

Every API route that accepts user input validates with Zod before any processing:

```typescript
import { z } from 'zod'

const schema = z.object({
  skillSlug: z.string().min(1).max(64),
  satisfaction: z.number().int().min(1).max(5),
  body: z.string().max(200).optional(),
})

const result = schema.safeParse(await req.json())
if (!result.success) {
  return NextResponse.json(
    { error: 'invalid_input', details: result.error.issues },
    { status: 400 }
  )
}
// result.data is now typed and validated
```

Never access `req.json()` data without running it through Zod first.

### Parameterized SQL Queries

All database queries must use parameterized statements. No string interpolation in SQL.

```typescript
// CORRECT
db.prepare('SELECT * FROM reviews WHERE skill_slug = ? AND reviewer_github_id = ?')
  .all(slug, githubId)

// NEVER DO THIS — SQL injection vulnerability
db.exec(`SELECT * FROM reviews WHERE skill_slug = '${slug}'`)
```

### Atomic File Writes

When writing skill files to disk, always use `atomicWrite()` from `lib/pipeline.ts`. This writes to a temp directory first and renames atomically, preventing partial writes if the process is interrupted.

```typescript
// CORRECT — atomic
await atomicWrite(skillDirectory, outputPath)

// WRONG — non-atomic, leaves partial skill directory on failure
fs.mkdirSync(outputPath, { recursive: true })
for (const file of files) {
  fs.writeFileSync(path.join(outputPath, file.path), file.content)
}
```

### Nothing Design Rules

UI code must follow the Nothing design system:

- **Labels use bracket notation**: `[ SKILLS ]`, `[ OVERVIEW ]`, `[ OK ]`
- **Label font**: always `fontFamily: "var(--font-space-mono, monospace)"` with tracking
- **No shadows**: borders only (`border-sm-border`)
- **One accent color**: `text-sm-display` or `bg-sm-display` — never introduce new colors
- **Numbers use Doto font**: `fontFamily: '"Doto", monospace'`
- **Tailwind tokens**: always use `bg-sm-*`, `text-sm-*`, `border-sm-*` classes — never hardcode colors

---

## Writing Tests

### File Location and Naming

All test files live in `lib/__tests__/` named `<module>.test.ts`. One test file per lib module.

```
lib/__tests__/
  budget-analyzer.test.ts    ← tests lib/budget-analyzer.ts
  chains.test.ts             ← tests lib/chains.ts
  feedback.test.ts           ← tests lib/self-improvement/feedback.ts
  rag.test.ts                ← tests lib/rag/*.ts
```

### The MockLLMClient Pattern

Never make real LLM API calls in tests. Use a mock client:

```typescript
import { vi } from 'vitest'
import type { LLMClient } from '../providers'

const mockClient: LLMClient = {
  complete: vi.fn().mockResolvedValue('{"tools": [{"name": "Strategy Canvas", ...}]}'),
  provider: 'openai',
}

// In your test:
const result = await runPipeline({ topic: 'test' }, mockClient)
expect(result.tools).toHaveLength(1)

// Verify the mock was called correctly:
expect(mockClient.complete).toHaveBeenCalledWith(
  expect.stringContaining('Strategy Canvas'),
  expect.any(Object)
)
```

### Database Tests

Tests that exercise database code use the real SQLite database (`data/skillmall.db`). Clean up test data in `beforeEach`:

```typescript
import { getDb } from '../db/client'

describe('createFeedback', () => {
  const TEST_SLUG = 'test-skill-for-feedback'

  beforeEach(() => {
    const db = getDb()
    db.prepare('DELETE FROM skill_feedback WHERE skill_slug = ?').run(TEST_SLUG)
  })

  it('creates feedback with valid inputs', () => {
    // ...
  })
})
```

### What to Test

**Test behavior, not implementation.** A good test breaks when the behavior changes. A bad test breaks when you rename a variable.

```typescript
// GOOD — tests behavior
it('rejects satisfaction scores below 1', () => {
  expect(() => createFeedback({ satisfaction: 0, ... })).toThrow('satisfaction must be between 1 and 5')
})

// BAD — tests implementation
it('calls db.prepare once', () => {
  expect(db.prepare).toHaveBeenCalledOnce() // breaks on any refactor
})
```

### Coverage Expectations

There's no automated coverage enforcement. Aim for:
- Every function that can fail should have at least one test for the failure path
- Every security check (author verification, Zod validation) must have a test
- Every new feature should have at least 3 tests: happy path, edge case, and failure case

---

## Documentation Contributions

Documentation has the same quality bar as code. "It exists" is not enough — it must be accurate, complete, and readable.

### Accuracy Requirements

Every command in a doc must be tested before committing. Every TypeScript type shown must be verified against the actual source. Every SQL query shown must match the actual schema.

```bash
# Check that commands work before including them:
npx skill-mall validate           # does this actually run?
npx skill-mall list --cat business # does --cat work?
```

If a command doesn't work as documented, fix the documentation to match reality — or fix the code. Never document broken behavior as if it works.

### Word Count Minimums

Every doc file has a minimum word count specified in the Phase 4 plan. These are floors, not targets. If the topic needs more, write more. If you're padding to hit a number, the content is wrong.

Check your count:

```bash
wc -w docs/developer/contributing.md
```

### Cross-Links

Every doc should link to related docs using relative paths. All cross-links must resolve:

```markdown
# CORRECT — relative link
See [Architecture](./architecture.md) for system design details.

# WRONG — link to file that doesn't exist yet
See [Phase 3 Features](./phase3.md)  ← doesn't exist
```

Before committing, verify every link target exists.

---

## Reporting Issues

Found a bug? Use the [GitHub issue tracker](https://github.com/jamesdsizemore/SkillMall/issues).

A good bug report includes:
1. **What you did** — exact commands or steps
2. **What you expected** — the documented behavior
3. **What happened** — the actual error message or output
4. **Environment** — Node version, OS, provider configured

For security vulnerabilities, do not open a public issue. Open a [GitHub security advisory](https://github.com/jamesdsizemore/SkillMall/security/advisories/new) instead.

## Next Steps

- **[Extending SkillMall](./extending.md)** — adding providers, commands, routes, quality dimensions
- **[Architecture](./architecture.md)** — system design for context before making changes
- **[API Reference](./api-reference.md)** — full route documentation
