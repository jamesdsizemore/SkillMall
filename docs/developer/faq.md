# Developer FAQ

Frequently asked questions about SkillMall's architecture, implementation decisions, and extension patterns. Questions are organized into three sections: architecture decisions, operational questions, and implementation patterns.

---

## Architecture Decisions

### 1. Why 60+ LLM calls for a 20-tool domain?

The number is not arbitrary — it scales deterministically with tool count. For a domain with 20 extracted tools, the pipeline breaks down as follows:

- **Research Engine:** 1 call (extraction, with up to 1 retry on validation failure)
- **Skill Builder samples:** 20 calls, one per tool (run in parallel via `Promise.all`)
- **Prompt Engine, framework selection:** 20 calls, one per tool (also parallel)
- **Prompt Engine, prompt body:** 20 calls, one per tool (also parallel)
- **Prompt Engine, category prompts:** one call per unique tool category (commonly 4–8)
- **Prompt Engine, meta prompts:** 5 standard meta prompts, plus 1 cross-category synthesis if three or more distinct categories are present

For a 20-tool domain with 5 distinct categories, that math yields: 1 + 20 + 20 + 20 + 5 + 5 + 1 = 72 calls. The pipeline test suite documents this structure explicitly in the response sequence comments in `lib/__tests__/pipeline.test.ts`.

The design rationale: each artifact type is genuinely different. A Strategy Canvas sample needs domain-appropriate matrix data. An ERRC Grid sample needs illustrative eliminate/reduce/raise/create entries. A single combined "generate everything" prompt reliably produces generic filler. Separate, focused calls per artifact produce significantly higher-quality output at the cost of call count. All sample and prompt generation calls run in parallel, so wall-clock time is bounded by the slowest single call, not by the total count.

If you need to reduce call volume, the UI wizard allows users to deselect tools before the pipeline continues (the `selectedToolNames` filter in `lib/pipeline.ts`). You can also reduce meta prompt count by passing `selectedMetaTypes` to filter to only the meta types actually needed.

---

### 2. Why SQLite not Postgres/Supabase?

SkillMall's server-side persistence needs are minimal: sessions, usage analytics, and optional publish records. These are low-write, low-concurrency workloads that run on a single Next.js server process. SQLite in WAL mode handles this well without any external infrastructure.

The practical benefits of the SQLite choice:

- **Zero ops:** no database server to provision, no connection strings to manage in production, no cold-start connection pools to size
- **Zero cost:** no managed database bill; the file lives at `data/skillmall.db` on the same host
- **Portability:** the entire database is a single file that can be copied, backed up, or reset with standard filesystem operations
- **Synchronous API:** `better-sqlite3` is synchronous, which eliminates async boilerplate in route handlers and makes the code easier to follow

The database connection is initialized in `lib/db/client.ts` with WAL journal mode (`PRAGMA journal_mode = WAL`) and foreign key enforcement. WAL mode allows concurrent readers alongside a single writer, which is sufficient for a Next.js API route environment.

If you need multi-replica deployments or high-write analytics pipelines, migrating to Postgres is straightforward — the database layer is isolated behind `lib/db/client.ts` and `lib/db/types.ts`, so you can swap the driver without touching route handlers.

---

### 3. Why better-sqlite3 not node-sqlite3?

`better-sqlite3` has a synchronous API. `node-sqlite3` is callback-based and requires wrapper libraries (like `sqlite`) to promisify it. In a Next.js route handler context, the synchronous API produces cleaner code:

```ts
// better-sqlite3 — synchronous, no await, no .then()
const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(token);
```

versus the async equivalent, which adds ceremony for a workload that has no concurrency benefit from async I/O — SQLite serializes writes regardless.

`better-sqlite3` is also consistently faster for read-heavy workloads because it avoids the async overhead. The project's session lookup and analytics writes are simple, small queries where that matters. The library is actively maintained, has full TypeScript types via `@types/better-sqlite3`, and is the recommended choice for synchronous SQLite access in the Node.js ecosystem.

---

### 4. How do I add a new skill category?

Three files need to change. All three must be updated together or the category will be inconsistent across the catalog, the MCP server, and the quality score validator.

**Step 1 — `lib/categories.ts`:** Add a new entry to the `CATEGORIES` array with `slug`, `label`, `description`, `color` (a Tailwind class string), and `icon` (a Lucide icon name as a string). The slug must be lowercase, no spaces.

**Step 2 — `lib/validators.ts`:** Add the slug to the `suggestedCategory` enum in `ResearchResultSchema`, and to the `VALID_CATEGORIES` constant in `lib/quality-score.ts`. Both places gate validation — if either is missing, skills in the new category will fail research extraction validation or receive a frontmatter health deduction.

**Step 3 — `skills/`:** Create the directory `skills/<your-slug>/`. The catalog parser in `lib/skills.ts` discovers categories by scanning `skills/` for subdirectories, so the directory must exist before any skills in the category can be served.

After these changes, run `bash scripts/validate-skill.sh` to confirm no existing skills have been broken, and `npm run build` to confirm the Next.js app compiles with the updated enum.

---

### 5. Why does Claude Code use subprocess not the Anthropic SDK?

`lib/providers/claude-code.ts` uses Node's `execFile` (from `child_process`) to invoke the `claude` CLI rather than importing `@anthropic-ai/sdk`. The reason is authentication scope and feature access.

When users install Claude Code and authenticate once, the `claude` CLI inherits their full account capabilities: extended thinking, Projects context, Max plan token limits, and any organization-level permissions. Calling the `claude` binary preserves all of that. Using the Anthropic SDK via API key bypasses Projects entirely, requires the user to manage a separate API key, and bills against their API account rather than their Claude subscription.

The implementation calls `claude --print --model <model> <prompt>`, captures stdout, and returns it as a string. The `--print` flag makes Claude Code output non-interactively without streaming. The `maxBuffer` is set to 10MB and the timeout defaults to 120 seconds, both configurable via `CompletionOptions.timeoutMs`.

The tradeoff: this only works if the `claude` binary is installed and on `PATH`. For API key-based access (CI environments, Docker containers without a Claude Code install), use one of the SDK-backed providers — `openai`, `gemini`, `groq`, or `ollama`.

---

### 6. Why Tailwind v4 + CSS custom properties?

Tailwind v4 replaces the JavaScript config file with a pure CSS `@theme` block. All design tokens are declared as CSS custom properties, which means they are accessible at runtime from JavaScript and in DevTools without any build step. The SkillMall design system uses a "Nothing Design Language" aesthetic (monospace fonts, harsh borders, no border-radius) and needs to support light/dark mode switching via a `data-theme` attribute rather than Tailwind's `dark:` class mechanism.

Custom properties make this straightforward:

```css
@theme {
  --color-sm-bg: var(--bg);
  --color-sm-display: var(--text-display);
}
```

The `--bg` and `--text-display` tokens are defined in `:root` (light) and `[data-theme="dark"]` selectors. Tailwind's generated utility classes pick up whatever value the custom property resolves to at the current theme, with no extra configuration.

Tailwind v4 also compiles faster (Rust-based Oxide engine) and no longer requires `@apply` for complex utilities — the `@theme` block handles everything previously done in `tailwind.config.js`. If you add design tokens, add them to the `@theme` block in `app/globals.css` as `--color-sm-*` aliases pointing to the Nothing design tokens defined in `:root`.

---

### 7. How do I test without making real LLM API calls?

Use `MockLLMClient` from `lib/__tests__/mocks/mock-llm-client.ts`. It implements the `LLMClient` interface and returns pre-programmed responses without making any network calls.

Two usage patterns:

**Map-based responses** — when prompt content is predictable and you want to match by substring:

```ts
const client = new MockLLMClient({
  "Blue Ocean": JSON.stringify(blueOceanFixture),
});
```

**Sequence-based responses** — when a test drives a multi-stage pipeline and each call needs a different response in order:

```ts
const client = new MockLLMClient({});
client.withSequence([
  JSON.stringify(blueOceanFixture),  // research call
  sampleResponse,                     // sample for tool 1
  selectionResponse,                  // framework selection for tool 1
  bodyResponse,                       // prompt body for tool 1
  // ... and so on
]);
```

The `withSequence` method returns `this` for chaining. If the sequence is exhausted, it returns the last response. If no response matches in map mode, `MockLLMClient.complete()` throws with a diagnostic message showing the prompt prefix and registered keys, which makes test failures easy to diagnose.

Real pipeline tests use `vi.stubGlobal("fetch", ...)` to mock URL fetching and `MockLLMClient` for LLM calls, so the full pipeline can run in a Vitest environment with zero network access.

---

### 8. Why atomicWrite instead of direct file writes?

Direct file writes leave the destination in a partially-written state if the process crashes or the filesystem runs out of space mid-write. For a skill directory with many files (SKILL.md, README.md, templates, samples, prompt files, scripts), a partial write could create an invalid skill that passes visual inspection but fails validation.

`atomicWrite` in `lib/pipeline.ts` uses a write-then-rename pattern:

1. Creates a temp directory at `<destination>.tmp-<timestamp>-<random>`
2. Writes all files into the temp directory
3. Removes the destination if it already exists
4. Renames the temp directory to the destination (an atomic operation on POSIX filesystems)
5. If any step fails, removes the temp directory and re-throws the error

The rename operation is atomic at the OS level — no reader can ever observe a partial state. Either the old skill directory is present or the new one is; there is no in-between. The temp directory naming includes a timestamp and random suffix to prevent collisions if two pipeline runs target the same output path simultaneously.

---

### 9. How does the CLI share code with Next.js?

Both the CLI (`cli/`) and the Next.js app (`app/`) share the library code in `lib/` via a TypeScript path alias. The CLI's `tsconfig.json` maps `@/*` to `../*`, which resolves to the repository root. The Next.js `tsconfig.json` maps `@/*` to `./*`, also the repository root.

```json
// cli/tsconfig.json
{
  "compilerOptions": {
    "paths": { "@/*": ["../*"] }
  },
  "include": ["src/**/*", "../lib/**/*"]
}
```

This means `import { runResearchEngine } from "@/lib/research-engine.js"` in a CLI command resolves to the same source file that Next.js API routes import. There is no duplication, no separate package, no symlinks.

The CLI is published as a separate npm package (`skill-mall` in `cli/package.json`) that gets built with `tsup` into `cli/dist/`. The `lib/` source is compiled into the bundle at build time. The Next.js app uses `lib/` source directly via the Next.js compiler.

One constraint: `lib/` code that calls `better-sqlite3` cannot run in Next.js Edge Runtime (which has no Node.js filesystem APIs). Database-using routes declare `export const runtime = "nodejs"` to opt out of Edge. The MCP route at `app/api/mcp/route.ts` does this.

---

### 10. Why sessionStorage for wizard state?

The skill creation wizard is a six-step flow that drives one or more long-running LLM pipeline calls. If a user accidentally navigates away mid-wizard — closing a tab, hitting back, or a browser refresh — their research result and tool selections should survive. Without persistence, they would lose that work and have to run the expensive research call again.

`sessionStorage` is the right scope: it persists for the lifetime of the browser tab but is discarded when the tab closes. This matches the expected wizard lifecycle. `localStorage` would be too persistent — wizard state from a previous session could confuse a new skill creation flow. A server-side session would require round-trips on every wizard state change, adding latency to each step.

The `WizardContext.tsx` implementation uses a `useEffect` on the wizard state to sync to `sessionStorage` on every change. On initial load, `loadFromStorage` reads from `sessionStorage` and validates that the `step` field is a valid number in range (1–6); if not, it falls back to `INITIAL_WIZARD_STATE`. The try/catch around both reads and writes handles environments where `sessionStorage` is unavailable (private browsing restrictions, certain embedded contexts).

---

### 11. Does Docker container support work?

The default `claude-code` provider requires the `claude` binary on `PATH`, which is not available in a standard Docker container. To run SkillMall in a containerized environment, configure an SDK-backed provider instead:

```bash
SKILL_MALL_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
```

Or for Groq (fast, free tier available):

```bash
SKILL_MALL_PROVIDER=groq
GROQ_API_KEY=your-groq-api-key
```

Or for Ollama running as a sidecar container:

```bash
SKILL_MALL_PROVIDER=ollama
SKILL_MALL_MODEL=llama3.2
```

The `resolveProviderConfig()` function in `lib/providers/index.ts` reads `SKILL_MALL_PROVIDER`, `SKILL_MALL_MODEL`, and provider-specific API environment variables such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `GROQ_API_KEY`. Set these in your `docker-compose.yml` or container runtime and all LLM calls will route to the configured provider without any code changes.

The SQLite database at `data/skillmall.db` needs a persistent volume mount if you want sessions and analytics to survive container restarts: `-v ./data:/app/data`.

The MCP deploy tool (`deploy_skill`) also checks filesystem writability before attempting to copy skill files. In a serverless deployment (Vercel), it returns a clear error instructing users to deploy locally via the CLI. This is by design.

---

### 12. Why two LLM calls per tool (framework selection + prompt body)?

Framework selection and prompt body generation are separated because they optimize for different things.

Framework selection (`selectFramework` in `lib/prompt-engine.ts`) asks the LLM a narrow structured question: given this tool's artifact type, domain, inputs, and outputs, which 1–3 prompt engineering frameworks from the candidate list will produce the best output? The response is small JSON with a `selected` array and a `rationale`. Temperature is 0.1 (near-deterministic), max tokens is 300. It benefits from being a focused classification task.

Prompt body generation (`generatePromptBody`) takes the selected frameworks and writes a complete, self-contained prompt that structurally embeds those frameworks. It is a creative writing task that benefits from more tokens (2000) and slightly higher temperature (0.2). Embedding this task in the selection call would force a trade-off: either constrain the body generation to fit in a classification response, or make the selection reasoning unconstrained and risk format drift.

Separating them also makes each step independently testable. `selectFramework` can be tested by verifying the JSON schema of the response. `generatePromptBody` can be tested by verifying the imperative-first-sentence rule and embedded artifact structure. Combined, those properties are harder to assert.

For users who want to reduce call count, the two-call approach is where the most calls could be saved by merging. The cost is reduced prompt quality and more complex validation.

---

### 13. How do I reset the database?

Delete the SQLite file and restart the server. The database is created automatically on first connection if it does not exist.

```bash
rm data/skillmall.db
npm run dev
```

The `getDb()` function in `lib/db/client.ts` calls `fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })` before opening the database, so the `data/` directory is also created automatically if missing.

If you want to reset only sessions (log everyone out without losing analytics):

```bash
sqlite3 data/skillmall.db "DELETE FROM sessions;"
```

In development, resetting the database is the cleanest way to test the first-run experience, GitHub OAuth callback flow, or schema migrations.

---

### 14. What happens if an LLM call fails mid-pipeline?

Failures propagate as thrown exceptions. There is no automatic retry within the pipeline stages themselves, except in the Research Engine, which retries extraction once on JSON validation failure (up to two attempts total, as shown in `extractWithRetry` in `lib/research-engine.ts`).

For a failure in Stage 2 (Research Engine), the API route at `app/api/research/route.ts` catches `FetchError` and `ExtractionError` and returns a `422` with `pipeline_failed` and the error message. The wizard UI surfaces this to the user and lets them correct the inputs or try again.

For failures in Stages 3 and 4 (Skill Builder samples, Prompt Engine), there is no partial recovery. The pipeline throws and the calling API route returns a `500`. This is intentional: a partial skill directory (some samples missing, some prompts missing) is worse than no skill directory, because it would pass disk write but fail quality scoring in ways that are confusing to debug.

If you are building an integration that calls `runPipeline` directly, wrap the call in a try/catch and handle the error at your layer. The `atomicWrite` function guarantees that a failed write leaves no partial state on disk.

---

### 15. Why no rate limiting?

SkillMall does not impose its own rate limiting for two reasons.

First, the LLM providers impose their own limits. OpenAI, Anthropic, Groq, and Google all rate-limit API keys at the provider level. Hitting those limits returns an error that propagates as a `500` from the SkillMall API route, with the provider's error message included. Users see this and can back off.

Second, the primary intended deployment is self-hosted or single-tenant. A team or individual running SkillMall for their own skill creation does not need intra-app rate limiting — they are the only user. Adding rate limiting middleware for this case adds operational overhead without benefit.

If you are deploying SkillMall as a multi-tenant public service, add rate limiting at the infrastructure layer (nginx, Cloudflare, Vercel Edge Middleware) rather than inside the application. That approach is more robust, applies before the Next.js handler runs, and does not require touching application code.

---

### 16. Can I use SkillMall without GitHub OAuth?

Yes. GitHub OAuth is used only for:

- Attributing published skills to a GitHub username in the catalog
- Gating the "Publish to catalog" flow in the UI

The skill creation pipeline (research, generation, download, local deploy) works without any authentication. The MCP server (`/api/mcp`) is unauthenticated. The skill browsing and quality score views are unauthenticated. The CLI does not use GitHub OAuth at all.

If `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are not set, the sign-in flow will fail with a runtime error when `getGitHubAuthUrl()` is called, but that code path is only reached when a user explicitly clicks "Sign in with GitHub." All other routes are unaffected.

For a self-hosted deployment where you do not intend to publish to the shared catalog, you can run without setting any GitHub OAuth environment variables.

---

### 17. How do I add a skill that uses a custom artifact type?

The artifact type enum is defined in `lib/validators.ts`:

```ts
artifactType: z.enum(["matrix", "canvas", "grid", "list", "flowchart", "analysis"]),
```

To add a new type such as `"scorecard"`:

1. Add `"scorecard"` to the `artifactType` enum in `ResearchToolSchema`.
2. Update `lib/pe-frameworks.ts` — the `getFrameworkCandidates` function selects framework candidates based on artifact type. Add a branch for your new type with appropriate framework candidates.
3. Add a sample entry in the extraction prompts in `lib/research-engine.ts` so the Research Engine knows `"scorecard"` is a valid value to extract.

If you are creating a skill manually (without the pipeline), you can use any string in the `artifactType` field of your SKILL.md because the frontmatter parser in `lib/skills.ts` does not enforce the enum — the enum is only enforced on Research Engine output via Zod validation. Manual skills are free-form.

---

### 18. Why does validate-skill.sh report warnings for the _starters directory?

`validate-skill.sh` excludes only `_template` from its scan (via `! -path "*/_template/*"`). The `_starters` directory is not excluded, so its SKILL.md files are included in validation runs.

The `_starters` skills are intentionally incomplete scaffolds with `[FILL-IN: github-username]` and similar placeholder values in their author fields. These will always generate frontmatter warnings because placeholder values are not valid usernames and the author field is checked by the quality scorer.

This is by design: `_starters` are meant to be copied and completed by contributors, not deployed as-is. Running `validate-skill.sh` on them shows exactly what needs to be filled in before the skill is ready. If you want to suppress these warnings in CI, add `! -path "*/_starters/*"` to the `find` command at line 163 of `scripts/validate-skill.sh`.

Do not add `_starters` to the exclusion list unconditionally — the warnings are useful for contributors as a checklist of what still needs to be customized.

---

### 19. How do I debug a skill that's not being triggered correctly?

Use the Trigger Analysis tab on the skill's detail page in the web catalog. Navigate to the skill, open the `[ TRIGGER ANALYSIS ]` tab, and click `[ RUN TRIGGER ANALYSIS ]`. This runs the `TriggerPanel` component which calls `/api/eval-triggers`, passing the skill's category and slug. The response includes:

- **True positive rate:** percentage of test queries that correctly triggered this skill
- **False positive rate:** percentage of unrelated queries that incorrectly triggered it
- **Overall accuracy:** combined score
- **Failing queries:** the specific queries that failed, labeled as false negatives or false positives, with a suggestion for how to fix each

Most trigger failures come from one of three issues: the description does not start with an imperative verb (the agent does not recognize the skill as action-oriented), the domain term does not appear in the first 80 characters (the term is truncated in skill listing context), or the description uses generic phrases that overlap with many other skills.

The Budget Analysis tab is also useful: it simulates how much of the description is visible at different `--chars-available` values. If the trigger phrase falls after the truncation point, the skill will never trigger in agents running low on skill listing budget.

For Claude Code specifically, you can also add `when_to_use` to the SKILL.md frontmatter with additional trigger phrases that supplement the description.

---

### 20. Why is the CLI a separate package from the Next.js app?

The CLI is published to npm as `skill-mall` so users can run `npx skill-mall <command>` without cloning the repository or running a server. The Next.js app is a web catalog that requires a deployment host. They are different distribution mechanisms serving different use cases.

The separation also means the CLI has a minimal dependency footprint. Its `package.json` includes only what the CLI needs: `@clack/prompts` for interactive terminal UI, `cheerio` for HTML extraction, `gray-matter` for SKILL.md parsing, and the provider SDKs. It does not pull in Next.js, React, Tailwind, shadcn/ui, or any of the web app's dependencies.

Despite being separate packages, they share source code via the `@/*` path alias pointing to the repository root's `lib/` directory. The CLI's `tsconfig.json` includes `"../lib/**/*"` so the shared library types are available. At build time (`tsup`), the CLI bundles the `lib/` code it uses into `cli/dist/`, producing a self-contained binary.

This architecture means bug fixes in `lib/pipeline.ts`, `lib/research-engine.ts`, or `lib/providers/` benefit both the web app and the CLI simultaneously, without any manual sync.

---

## Implementation Patterns

### Pattern 1: Adding a library that wraps the LLM client

If you want to add a higher-level abstraction over the LLM client — for example, a caching layer or a rate-limiting wrapper — implement the `LLMClient` interface from `lib/providers/types.ts`:

```ts
import type { LLMClient, CompletionOptions } from "@/lib/providers/types";

export class CachingLLMClient implements LLMClient {
  readonly provider: string;

  constructor(private inner: LLMClient, private cache: Map<string, string>) {
    this.provider = inner.provider;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const key = JSON.stringify({ prompt, options });
    if (this.cache.has(key)) return this.cache.get(key)!;
    const result = await this.inner.complete(prompt, options);
    this.cache.set(key, result);
    return result;
  }
}
```

Pass your wrapper wherever an `LLMClient` is accepted — `runPipeline`, `runResearchEngine`, `buildSkillDirectory`, and `generatePrompts` all accept an `LLMClient` parameter. No changes to the pipeline code are required.

For testing, pass `MockLLMClient` as the inner client to test your wrapper in isolation.

---

### Pattern 2: Adding a new frontmatter field to SKILL.md

Frontmatter fields fall into two categories: AgentSkills spec fields (read by all agents) and SkillMall catalog metadata (read only by the catalog UI).

For a new catalog metadata field, add it under the `metadata:` block in SKILL.md and update the parser in `lib/skills.ts`. The `Skill` interface is defined there — add your new field, read it from the parsed frontmatter with `matter.data.metadata?.yourField`, and it will be available on the `Skill` object passed to all components.

For a new AgentSkills spec field (top-level, not under `metadata:`), also update the quality score's frontmatter health dimension in `lib/quality-score.ts` if you want to require it. The `scoreFrontmatterHealth` function checks for specific field presence and deducts points for missing required fields.

For Claude Code-specific extensions (like `when_to_use` or `allowed-tools`), add them as top-level frontmatter fields. Other agents ignore unknown fields per the AgentSkills spec, so Claude Code extensions are safe to add without breaking cross-agent compatibility.

After adding a field, run `bash scripts/validate-skill.sh` to confirm existing skills are not unexpectedly penalized.

---

### Pattern 3: Adding a new quality score dimension

The quality score in `lib/quality-score.ts` has five dimensions: `descriptionQuality`, `completeness`, `frontmatterHealth`, `resourceRichness`, and `linkHealth`. The total is 100 points, distributed as 25 + 25 + 20 + 20 + 10.

To add a new dimension:

1. Write a scoring function that returns a `DimensionScore` (with `score`, `maxScore`, and `deductions`). Follow the pattern of the existing functions.
2. Add the new dimension to the `QualityScore.dimensions` interface.
3. Call your function in `computeQualityScore` and add the result to `dimensions`.
4. Add the score to the `total` computation.
5. Reduce the `maxScore` of one or more existing dimensions to keep the total at 100 points (or adjust the total cap if you are intentionally expanding the scale).

The `feedback` array is assembled from `deductions` across all dimensions — your new dimension's deductions will automatically appear in the feedback list without any additional code.

After adding a dimension, update the tests in `lib/__tests__/quality-score.test.ts` to cover the new scoring logic.

---

### Pattern 4: Adding a new MCP tool

MCP tools are registered in `app/api/mcp/route.ts` in the `TOOLS` array and handled in the `handleTool` function.

To add a new tool:

1. Add an entry to `TOOLS` with `name`, `description`, and `inputSchema` following the JSON Schema format used by the existing tools.
2. Add a branch in `handleTool` for the new tool name. Return a plain JavaScript object — the handler serializes it as JSON and wraps it in the MCP `content` envelope automatically.
3. The tool is automatically exposed by the `GET /api/mcp` endpoint (tools list) and callable via `POST /api/mcp` with `method: "tools/call"`.

The MCP server uses JSON-RPC 2.0. Errors should be returned as objects with an `error` key rather than throwing — throwing inside `handleTool` will produce an unstructured 500 response rather than a valid JSON-RPC error object.

If your tool requires filesystem access, confirm the route has `export const runtime = "nodejs"` (it already does). If the tool should only work in local deployments (not serverless), add a filesystem writability check following the pattern in the `deploy_skill` handler.

---

### Pattern 5: Adding a new skill detail page tab

Tabs are defined in `components/skill-mall/skill-detail/SkillTabs.tsx`. The `TABS` constant is a `const` array of string literals:

```ts
const TABS = ["OVERVIEW", "SKILL.MD", "PROMPTS", "HISTORY", "TRIGGER ANALYSIS", "BUDGET ANALYSIS"] as const;
type Tab = typeof TABS[number];
```

To add a new tab:

1. Add your tab label string to the `TABS` array. The label is displayed as `[ YOUR LABEL ]` by the tab bar rendering code.
2. Add a conditional render block in the tab content section:
   ```tsx
   {active === "YOUR LABEL" && (
     <YourTabPanel category={skill.category} slug={skill.slug} />
   )}
   ```
3. Implement `YourTabPanel` as a component in the same file or import it from a separate file. Existing panels like `TriggerPanel` and `BudgetPanel` show the standard pattern: show a loading state, fetch data from an API route via `useEffect` or on user action, and render the results.

If the tab requires a new API route, create it at `app/api/<your-endpoint>/route.ts`. If it shows data that is expensive to compute, make it demand-loaded (fetch on button click like `TriggerPanel`) rather than loading on mount like `PromptsPanel` — this avoids running expensive operations for users who never open the tab.

After adding the tab, verify the TypeScript union type `Tab` narrows correctly by checking that the compiler does not produce errors on the new conditional render.
