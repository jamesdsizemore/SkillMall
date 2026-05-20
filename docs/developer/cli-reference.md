# CLI Reference

Complete reference for all `npx skill-mall` commands. Every command documented with flags, behavior, expected output, and exit codes.

**Prerequisites:** Run `cd cli && npm run build` after cloning to build the CLI from source. Or use `npx skill-mall` directly — it pulls the latest published version.

**Configuration:** Most commands that create skills require an LLM provider. Run `npx skill-mall configure` first.

---

## Table of Contents

- [configure](#configure)
- [providers](#providers)
- [create](#create)
- [confirm-research](#confirm-research)
- [deploy](#deploy)
- [deploy-pack](#deploy-pack)
- [new](#new)
- [fork](#fork)
- [revert](#revert)
- [publish](#publish)
- [validate](#validate)
- [list](#list)
- [find](#find)
- [extract](#extract)
- [test](#test)
- [budget-check](#budget-check)
- [optimize-prompt](#optimize-prompt)
- [regen-prompt](#regen-prompt)
- [eval-triggers](#eval-triggers)
- [mcp-server](#mcp-server)
- [attach-knowledge](#attach-knowledge)

---

## configure

Configure an LLM provider for skill generation.

```
npx skill-mall configure [--provider <p>] [--key-env <env>] [--model <model>]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `--provider <p>` | No | Executable provider ID or Provider Center registry row ID |
| `--provider-registry-id <id>` | No | Provider Center row ID such as `openrouter` or `custom_openai_compatible` |
| `--key-env <env>` | Depends | Environment variable name that holds the API key |
| `--gateway-key-env <env>` | Depends | Environment variable name that holds a local gateway virtual key |
| `--model <model>` | No | Model label |
| `--manual-models <a,b>` | No | Manual model labels for custom/provider metadata rows |
| `--config-mode <mode>` | No | `env_key`, `gateway_virtual_key_ref`, `local_cli_session`, or `none_local` |
| `--gateway-backend <backend>` | No | `direct` or `bifrost_local` |
| `--base-url <url>` | No | Local, gateway, or custom OpenAI-compatible endpoint |
| `--routing-policy <id>` | No | Routing policy identifier |

**Behavior:**

Without flags, runs an interactive wizard to select an executable provider. With flags, configures immediately without prompts.

Writes non-secret configuration to `~/.skill-mall/config.json`. API providers store an env-var reference such as `OPENAI_API_KEY`; raw API keys are not written.
Raw `--key` values are rejected. Use `--key-env` or `--gateway-key-env` secret references instead. Secret-reference names must be environment-variable-style names, not filesystem paths or credential-file references.

The selected auth/config mode must match the selected Provider Center row. For example, `openai` cannot be configured as `local_cli_session`, and `anthropic` cannot be configured with `gateway_virtual_key_ref` unless a later approved phase changes that row's access modes.

Executable Provider Center rows persist through the shared router config store. Registry-only rows such as `openrouter`, cloud/project rows, planned-source-review rows, and `custom_openai_compatible` return metadata/status output without widening executable `ProviderID` support or writing a runnable provider config.

**Examples:**

```bash
# Interactive wizard
npx skill-mall configure

# Claude Code (no API key needed — uses your existing claude authentication)
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6

# OpenAI
npx skill-mall configure --provider openai --key-env OPENAI_API_KEY --model gpt-4o

# Gemini
npx skill-mall configure --provider gemini --key-env GEMINI_API_KEY --model gemini-2.0-flash-exp

# Groq (fast and inexpensive)
npx skill-mall configure --provider groq --key-env GROQ_API_KEY --model llama-3.3-70b-versatile

# Ollama (local, no API key)
ollama pull llama3.1
npx skill-mall configure --provider ollama --model llama3.1

# Local Bifrost gateway virtual-key reference
npx skill-mall configure --provider openai \
  --config-mode gateway_virtual_key_ref \
  --gateway-backend bifrost_local \
  --gateway-key-env BIFROST_VIRTUAL_KEY \
  --base-url http://localhost:8080/v1

# Custom OpenAI-compatible metadata row (does not persist executable ProviderID)
npx skill-mall configure \
  --provider-registry-id custom_openai_compatible \
  --base-url http://localhost:1234/v1 \
  --manual-models local-model-a,local-model-b
```

**Expected output:**

```
✓ Provider configured: openai / gpt-4o
  Config written to ~/.skill-mall/config.json
  API env ref set
```

**Exit codes:** 0 on success, 1 on invalid provider or missing required flags.

---

## providers

Provider Center parity commands for catalog, status, model refresh, and safe readiness checks.

```
npx skill-mall providers <list|status|refresh-models|test> [options]
```

These commands use the shared Provider Center registry. The catalog includes OpenAI, Anthropic, Claude Code, Gemini, Groq, Ollama, OpenRouter, Alibaba/DashScope/Qwen, Hugging Face, Z.AI, MiniMax, Kimi/Moonshot, DeepSeek, Mistral, Cohere, xAI, AWS Bedrock, Azure OpenAI, Google Vertex AI, Together AI, Fireworks, Replicate, NVIDIA NIM, Perplexity, DeepInfra, Cerebras, and custom OpenAI-compatible endpoints. The executable direct/router set remains `openai`, `anthropic`, `claude-code`, `gemini`, `groq`, and `ollama`.

Planned-source-review rows are visible but not live-callable until official evidence and adapter support are added. This currently includes Alibaba/DashScope/Qwen, Z.AI, Perplexity, DeepInfra until primary-source evidence is recorded, and ambiguous managed NVIDIA NIM variants.

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `--provider <id>` | No | Executable provider ID or Provider Center row ID |
| `--provider-registry-id <id>` | No | Provider Center registry row ID |
| `--key-env <env>` | No | Environment variable reference for model refresh auth |
| `--base-url <url>` | No | Endpoint for OpenAI-compatible model refresh |
| `--manual-models <a,b>` | No | Manual model labels for custom rows |
| `--json` | No | Print machine-readable JSON |

`providers list` prints all shared registry rows with Provider Center status, access label, and the active configured row marker.

`providers status` shows the active provider status, or a selected row when `--provider` / `--provider-registry-id` is supplied.

`providers refresh-models` uses the shared model-discovery contract. OpenAI-compatible rows can probe the active configured endpoint or an explicitly supplied `--base-url`; unconfigured registry rows return `endpoint_required` without probing public default endpoints. Provider-specific, cloud/project, local-runtime, static, manual, and planned-source-review rows return the correct status labels without assuming generic `/v1/models` support.

`providers test` performs the same safe status/readiness check as Provider Center. It does not echo prompts, responses, raw secrets, browser tokens, session tokens, or credential files.

**Examples:**

```bash
npx skill-mall providers list
npx skill-mall providers status
npx skill-mall providers status --provider openrouter
npx skill-mall providers refresh-models --provider openai --key-env OPENAI_API_KEY
npx skill-mall providers refresh-models \
  --provider-registry-id custom_openai_compatible \
  --base-url http://localhost:1234/v1 \
  --manual-models local-model-a,local-model-b
npx skill-mall providers test --provider claude-code
```

**Exit codes:** 0 on success, 1 on invalid provider, raw secret flag usage, or failed live model refresh.

---

## create

Research-first skill creation: fetch URLs, extract tools via LLM, write skill files.

```
npx skill-mall create "<topic>" [--urls <url>...] [--category <cat>] [--author <login>]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `<topic>` | Yes | Domain or methodology to research (quote multi-word topics) |
| `--urls <url>...` | No | Space-separated list of source URLs (up to 10) |
| `--category <cat>` | No | Target category (default: auto-detected) |
| `--author <login>` | No | GitHub login to set as author in frontmatter |

**Behavior:**

1. Fetches and parses each source URL with Cheerio
2. Sends extracted text to LLM for tool/framework identification
3. Writes `research-result.json` to `skill-builder-output/<slug>/`
4. Prints a summary of extracted tools
5. Prompts user to confirm before building (interactive) or runs `confirm-research` automatically

Without `--urls`, uses LLM training knowledge and marks result as `researchUnverified: true`.

**Examples:**

```bash
# Full research-first pipeline with source URLs
npx skill-mall create "blue ocean strategy" \
  --urls https://blueoceanstrategy.com/tools/ \
  --category business

# Domain knowledge only (no URLs — uses LLM training data)
npx skill-mall create "OKR framework" --category productivity

# Multiple URLs
npx skill-mall create "incident postmortem" \
  --urls https://sre.google/workbook/postmortem-analysis/ \
         https://www.pagerduty.com/resources/learn/post-mortem/ \
  --category development
```

**Expected output:**

```
  skill-mall create (research pipeline)

  Topic:      blue ocean strategy
  Provider:   openai / gpt-4o
  Source URLs: https://blueoceanstrategy.com/tools/

  Fetching and extracting...
  ✓ Research complete — 3 tools extracted

  Extracted tools:
    1. Strategy Canvas
    2. ERRC Grid
    3. Three Tiers of Noncustomers

  Research written to: skill-builder-output/blue-ocean-strategy/research-result.json
  Run: npx skill-mall confirm-research blue-ocean-strategy
```

**Exit codes:** 0 on success, 1 on fetch failure or LLM error.

---

## confirm-research

Build a complete skill from a saved research result.

```
npx skill-mall confirm-research <slug>
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `<slug>` | Yes | Slug matching `skill-builder-output/<slug>/research-result.json` |

**Behavior:**

1. Reads `skill-builder-output/<slug>/research-result.json`
2. Runs Skill Builder (generates SKILL.md, README, templates, samples)
3. Runs Prompt Engine (selects frameworks, generates prompts, optimizes)
4. Runs validation (`validateSkillDirectory`)
5. Writes all files to `skills/<category>/<slug>/` atomically
6. Prints quality score

**Example:**

```bash
npx skill-mall confirm-research blue-ocean-strategy
```

**Expected output:**

```
  skill-mall confirm-research: blue-ocean-strategy

  Building 3 tools...
  ✓ Strategy Canvas
  ✓ ERRC Grid
  ✓ Three Tiers of Noncustomers

  Written: skills/business/blue-ocean-strategy/
  Files:   14
  Quality: 87/100

  Deploy with: npx skill-mall deploy business/blue-ocean-strategy
```

**Exit codes:** 0 on success, 1 if research-result.json not found or validation fails.

---

## deploy

Copy a skill to an agent's skills directory.

```
npx skill-mall deploy <category/slug> [--scope project|user] [--lang <locale>] [--all-agents] [--agents <id,id>]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `<category/slug>` | Yes | Skill to deploy (e.g., `business/blue-ocean-strategy`) |
| `--scope project` | No | Deploy to `.claude/skills/` in current directory (default: user home) |
| `--scope user` | No | Deploy to `~/.claude/skills/` (default behavior) |
| `--lang <locale>` | No | Deploy locale-specific version (`es`, `fr`, `de`, `pt-BR`) |
| `--all-agents` | No | Deploy to all detected agents simultaneously |
| `--agents <id,id>` | No | Deploy to specific agents by ID |

**Behavior:**

Default (no flags): copies skill directory to `~/.claude/skills/<category>/<slug>/`. Claude Code picks it up automatically on next session.

With `--scope project`: copies to `./<agent-dir>/skills/` in the current working directory. Useful for team projects where skills should be project-local.

With `--lang <locale>`: copies `SKILL.<locale>.md` as `SKILL.md` in the destination. Falls back to canonical `SKILL.md` with a warning if translation doesn't exist.

**Examples:**

```bash
# Standard deploy to Claude Code
npx skill-mall deploy business/blue-ocean-strategy

# Deploy to project-local skills (all agents)
npx skill-mall deploy business/blue-ocean-strategy --scope project

# Deploy Spanish translation
npx skill-mall deploy business/blue-ocean-strategy --lang es

# Deploy to all detected agents
npx skill-mall deploy business/blue-ocean-strategy --all-agents
```

**Expected output:**

```
Deploying blue-ocean-strategy to ~/.claude/skills

  Deployed to: /Users/jamesdsizemore/.claude/skills/business/blue-ocean-strategy/

  Invoke this skill in Claude Code with:
    /blue-ocean-strategy
```

**Exit codes:** 0 on success, 1 if skill not found.

---

## deploy-pack

Deploy a curated collection of skills to an agent.

```
npx skill-mall deploy-pack <collection-slug> [--agent <agent>] [--scope project|user]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `<collection-slug>` | Yes | Collection slug matching `collections/<slug>/collection.json` |
| `--agent <agent>` | No | Target agent ID (default: `claude-code`) |
| `--scope project\|user` | No | Deployment scope (default: `user`) |

**Examples:**

```bash
# Deploy full-stack developer kit to Claude Code
npx skill-mall deploy-pack full-stack-developer-kit

# Deploy to Cursor
npx skill-mall deploy-pack business-strategy-pack --agent cursor

# Project-local deployment
npx skill-mall deploy-pack full-stack-developer-kit --scope project
```

**Exit codes:** 0 on success, 1 if collection not found or any skill fails.

---

## new

Scaffold a new skill from a template or domain starter.

```
npx skill-mall new <category> <name>
npx skill-mall new --from-template <slug> <new-name>
```

**Usage 1 — Blank template:**

```bash
npx skill-mall new development my-code-review
```

Copies `skills/_template/` to `skills/development/my-code-review/` and patches `name:` and `category:` fields.

**Usage 2 — Domain starter:**

```bash
npx skill-mall new --from-template code-review team-code-review
```

Copies `skills/_starters/code-review/` to `skills/development/team-code-review/`, removes `starter-config.json`, prints all `[FILL-IN: ...]` markers with descriptions.

**Available starters:** 20 domain starters including `code-review`, `pr-writer`, `commit-writer`, `debugging-session`, `incident-postmortem`, `decision-records`, `test-writer`, `okr-framework`, `blue-ocean-strategy`, `competitive-analysis`, and more. See `skills/_starters/` for the full list.

**Expected output (--from-template):**

```
Scaffolding development/team-code-review from code-review template...
  Created: skills/development/team-code-review/

  Complete these fill-in markers before publishing:

  [FILL-IN: team-review-criteria]
    Your team's specific review standards (e.g., 'functions must be < 30 lines')

  Source reference:
    https://google.github.io/eng-practices/review/

  Validate when ready:
    npx skill-mall validate skills/development/team-code-review/SKILL.md
```

---

## fork

Create an independent fork of an existing skill.

```
npx skill-mall fork <category/slug> <new-slug> [--category <cat>]
```

**Behavior:** Copies the skill directory, adds `forked_from` and `fork_chain` to frontmatter, logs a fork event. The fork is fully independent — changes to the original skill do not propagate.

**Example:**

```bash
npx skill-mall fork business/blue-ocean-strategy my-strategy-analysis
```

---

## revert

Revert a forked skill to its parent version.

```
npx skill-mall revert <category/slug>
```

Reads `forked_from` from frontmatter, finds the parent skill, replaces the fork's content. Preserves the fork directory but overwrites files.

---

## publish

Publish a skill to a registry.

```
npx skill-mall publish <category/slug> --registry <npm|skills.sh> [--dry-run|--publish]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `<category/slug>` | Yes | Skill to publish |
| `--registry <reg>` | Yes | Target registry: `npm` or `skills.sh` |
| `--dry-run` | No | Print generated package.json without publishing (**default behavior**) |
| `--publish` | No | Actually publish (requires explicit opt-in) |

**Default behavior is always `--dry-run`.** Actual publishing requires `--publish`.

**npm registry:**

```bash
# Preview what would be published
npx skill-mall publish business/blue-ocean-strategy --registry npm --dry-run

# Actually publish (requires OPENAI_API_KEY or similar configured)
npx skill-mall publish business/blue-ocean-strategy --registry npm --publish
```

**Expected output (--dry-run):**

```
┌  skill-mall publish: Blue Ocean Strategy → npm

  Generated package.json:
{
  "name": "@skill-mall/blue-ocean-strategy",
  "version": "1.0.0",
  "description": "Apply Blue Ocean Strategy...",
  ...
}

  DRY RUN — not publishing. Pass --publish to actually publish.
  Would run: npm publish --access public in skills/business/blue-ocean-strategy

◆  Dry run complete. No changes made.
```

**Exit codes:** 0 on success, 1 on version conflict or npm error.

---

## validate

Validate SKILL.md frontmatter against the AgentSkills spec.

```
npx skill-mall validate [path] [--strict]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `[path]` | No | Skill directory or SKILL.md file (default: all skills) |
| `--strict` | No | Treat warnings as errors (used in CI) |

**Validation rules:**

- `name`: required, kebab-case only, ≤ 64 chars
- `description`: required, warns if > 150 chars
- `when_to_use` (if present): ≤ 150 chars
- `metadata.version`: warns if missing
- `metadata.category`: warns if missing
- `metadata.author`: warns if missing
- `README.md`: warns if missing
- With `--strict`: also validates that `SKILL.<locale>.md` translation sections match canonical

**Examples:**

```bash
# Validate all skills
npx skill-mall validate

# Validate one skill
npx skill-mall validate skills/business/blue-ocean-strategy

# CI mode (warnings = errors)
npx skill-mall validate --strict
```

**Expected output:**

```
Validating 26 skill(s)...

WARN  skills/ai/skill-creator/SKILL.md: missing field 'author'
OK    skills/business/blue-ocean-strategy/SKILL.md

Results: 25 valid · 0 error(s) · 1 warning(s)
```

**Exit codes:** 0 if no errors (warnings are non-blocking without `--strict`), 1 if any errors.

---

## list

List all skills in the catalog.

```
npx skill-mall list [--cat <category>]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `--cat <category>` | No | Filter by category |

**Example:**

```bash
npx skill-mall list
npx skill-mall list --cat business
```

**Expected output:**

```
  26 skills in catalog

  CATEGORY / SKILL                  DESCRIPTION
  -----------------------------------------------------------------------

  BUSINESS
    blue-ocean-strategy             Apply Blue Ocean Strategy: ERRC grid...
    wrong-slug                      Apply Blue Ocean Strategy to identify...

  DEVELOPMENT
    development-workflow            Apply the 16-step development loop...
```

**Exit codes:** Always 0.

---

## find

Search skills.sh for related existing skills.

```
npx skill-mall find <query>
```

Queries the skills.sh public registry (not the local catalog) and returns matching skills with install counts.

**Example:**

```bash
npx skill-mall find "code review"
```

**Exit codes:** 0 on success, 1 on network error.

---

## extract

Extract skill patterns from a codebase directory.

```
npx skill-mall extract <dir> --output <slug> [--category <cat>] [--focus "pattern1,pattern2"]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `<dir>` | Yes | Source directory to analyze |
| `--output <slug>` | Yes | Output slug for research-result.json |
| `--category <cat>` | No | Category hint |
| `--focus <list>` | No | Comma-separated focus areas (e.g., "error handling,naming") |

**Behavior:** Reads `.md`, `.ts`, `.js`, `.py`, `.go` files in the directory, passes content to the LLM for pattern extraction (same pipeline as `create` but with codebase content instead of URLs). Writes `skill-builder-output/<slug>/research-result.json`.

Validates that `<dir>` is within `process.cwd()` to prevent path traversal.

**Example:**

```bash
npx skill-mall extract ./lib --output our-lib-conventions --focus "error handling,naming"
```

**Exit codes:** 0 on success, 1 if directory is outside project root or LLM fails.

---

## test

Run a test suite for a skill.

```
npx skill-mall test <category/slug>
```

Loads test cases from `tests/<slug>/*.json`, runs each through the configured LLM with the skill as system prompt, evaluates required/forbidden assertions.

**Example:**

```bash
npx skill-mall test ai/skill-creator
```

**Expected output:**

```
Testing: ai/skill-creator
Provider: openai / gpt-4o
Test cases: 3

  [PASS] Produces a SKILL.md with required frontmatter fields
  [PASS] Warns when description would exceed 150 characters
  [PASS] Assigns an appropriate category from the valid category list

Results: 3/3 passed (100%)
```

**Exit codes:** 0 if all tests pass, 1 if any fail or no test cases found.

---

## budget-check

Simulate description visibility at a character budget.

```
npx skill-mall budget-check <category/slug> [--chars-available <n>] [--agent <agent>]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `<category/slug>` | Yes | Skill to analyze |
| `--chars-available <n>` | No | Character budget to simulate (default: 200) |
| `--agent <agent>` | No | Agent name (display only — does not change simulation) |

**Note:** The `--agent` flag is accepted for compatibility but does not change the simulation. Per-agent budget values are undocumented and would be hallucinated. Set `--chars-available` to match your agent's actual budget.

**Example:**

```bash
npx skill-mall budget-check ai/skill-creator --chars-available 150
```

**Expected output:**

```
Budget analysis: ai/skill-creator / 150 chars available

Description (98 chars): FULLY VISIBLE
Trigger phrase: "Use when asked to create a new ski"
Trigger preserved: YES

No rewrite needed.
```

**Exit codes:** 0 always (informational output).

---

## optimize-prompt

Audit and optimize a prompt file using 4-dimension quality analysis.

```
npx skill-mall optimize-prompt [file] [--stdin]
```

**Modes:**

- **File mode:** `npx skill-mall optimize-prompt path/to/prompt.md` — reads the file, writes `<name>-optimized.md` and `<name>.diff`
- **Stdin mode:** `echo "prompt text" | npx skill-mall optimize-prompt --stdin` — prints optimized prompt to stdout

**Example:**

```bash
# File mode
npx skill-mall optimize-prompt skills/business/blue-ocean-strategy/resources/prompts/tool-strategy-canvas.md

# Stdin mode
echo "This prompt helps you think about competitive strategy..." | npx skill-mall optimize-prompt --stdin
```

**Expected output:**

```
Analyzing prompt quality...

── Token Efficiency ────────────────────────────────
  Score: 78 / 100
  Before: 247 tokens  →  After: 198 tokens  (20% reduction)

── Intent Completeness ─────────────────────────────
  Score: 60 / 100
  Present: role, task, output_format
  Missing: context, constraints
    context: Add the user's current competitive situation as context
    constraints: Specify time constraints for the analysis

── Output Clarity ──────────────────────────────────
  Score: 85 / 100  [PASS]

── Trigger Sharpness ───────────────────────────────
  Score: 72 / 100  [FAIL]
  Suggestion: Start with an imperative verb: "Apply the Strategy Canvas to..."

  Optimized: skills/.../tool-strategy-canvas-optimized.md
  Diff:      skills/.../tool-strategy-canvas.diff
```

**Exit codes:** 0 on success, 1 if LLM fails.

---

## regen-prompt

Regenerate a prompt file with a different reasoning framework.

```
npx skill-mall regen-prompt <category/slug> <prompt-file> --framework "<name>"
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `<category/slug>` | Yes | Skill containing the prompt |
| `<prompt-file>` | Yes | Relative path from skill root (e.g., `resources/prompts/tool-strategy-canvas.md`) |
| `--framework <name>` | Yes | Framework to use (e.g., `"Chain of Thought"`) |

**Behavior:** Reads tool structure from the prompt file's embedded body JSON, calls LLM to regenerate with new framework, updates `framework` in frontmatter, preserves `original_framework`.

**Example:**

```bash
npx skill-mall regen-prompt business/wrong-slug \
  resources/prompts/tool-strategy-canvas.md \
  --framework "Chain of Thought"
```

**Expected output:**

```
Regenerating: tool-strategy-canvas.md
Framework: Structured Output, Artifact Production → Chain of Thought

  Updated: skills/business/wrong-slug/resources/prompts/tool-strategy-canvas.md
  original_framework preserved: Structured Output, Artifact Production
```

**Exit codes:** 0 on success, 1 if LLM fails or tool structure not found.

---

## eval-triggers

Evaluate how reliably a skill's description triggers agents.

```
npx skill-mall eval-triggers <category/slug>
```

Generates 10 positive test queries (should trigger) and 10 negative queries (should not trigger), evaluates each with the LLM.

**Example:**

```bash
npx skill-mall eval-triggers business/blue-ocean-strategy
```

**Expected output:**

```
Evaluating trigger accuracy for business/blue-ocean-strategy...

  True positive rate:  90%
  False positive rate: 10%
  Overall accuracy:    85%

  Failing queries:
  [FALSE NEGATIVE] "help me think about market competition"
    Suggestion: Add 'market competition' or 'competitive landscape' to description
```

**Exit codes:** 0 always (informational).

---

## mcp-server

Start a standalone MCP HTTP server for local development.

```
npx skill-mall mcp-server [--port <n>]
```

**Flags:**

| Flag | Required | Description |
|---|---|---|
| `--port <n>` | No | Port to listen on (default: 3001) |

Starts a pure Node.js HTTP server (no Next.js required) that serves the SkillMall skill catalog as an MCP tool server. Add to your MCP config:

```json
{
  "mcpServers": {
    "skillmall": {
      "url": "http://localhost:3001"
    }
  }
}
```

**Expected output:**

```
  SkillMall MCP Server
  Listening on http://localhost:3001

  Add to your MCP config:
  { "mcpServers": { "skillmall": { "url": "http://localhost:3001" } } }

  26 skills loaded from /Users/.../SkillMall
  Press Ctrl+C to stop.
```

**Exit codes:** Runs until Ctrl+C. Exits 1 on port conflict.

---

## attach-knowledge

Attach a document directory as a RAG knowledge base for a skill.

```
npx skill-mall attach-knowledge <category/slug> <source-dir>
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `<category/slug>` | Yes | Skill to attach knowledge to |
| `<source-dir>` | Yes | Directory containing documents to embed |

**Behavior:**

1. Collects `.md`, `.txt`, `.ts`, `.js`, `.py`, `.go`, `.rb`, `.java` files from `<source-dir>`
2. Chunks each file into ~512-token segments
3. Generates embeddings for all chunks (buffers in memory before DB writes)
4. Writes atomically to `knowledge_bases` and `knowledge_chunks` tables

Requires `SKILL_MALL_EMBEDDING_PROVIDER` set to `openai` or `ollama`. claude-code is not supported for embeddings.

**Example:**

```bash
# Attach docs/ directory to skill-creator skill
npx skill-mall attach-knowledge ai/skill-creator ./docs/
```

**Expected output:**

```
  skill-mall attach-knowledge

  Skill:    skill-creator
  Source:   /path/to/docs/
  Provider: openai / text-embedding-3-small

  Chunking files and generating embeddings...
  Done — 142 chunks embedded

  Knowledge base attached.
  Retrieve chunks via POST /api/retrieve
```

**Exit codes:** 0 on success, 1 on embedding failure or provider not configured.

---

## Quick Reference

| Command | Primary use | Requires LLM? | Requires auth? |
|---|---|---|---|
| `configure` | Set up LLM provider | No | No |
| `create` | Research + generate skill | Yes | No |
| `confirm-research` | Build from saved research | Yes | No |
| `deploy` | Copy skill to agent | No | No |
| `deploy-pack` | Deploy skill collection | No | No |
| `new` | Scaffold blank skill | No | No |
| `fork` | Copy + track parent | No | No |
| `revert` | Reset fork to parent | No | No |
| `publish` | Push to npm/skills.sh | No | npm credentials |
| `validate` | Check SKILL.md spec | No | No |
| `list` | Show catalog | No | No |
| `find` | Search skills.sh | No | No |
| `extract` | Extract patterns from codebase | Yes | No |
| `test` | Run skill test suite | Yes | No |
| `budget-check` | Simulate description truncation | No | No |
| `optimize-prompt` | 4-dimension prompt audit | Yes | No |
| `regen-prompt` | Change framework in prompt | Yes | No |
| `eval-triggers` | Test description trigger accuracy | Yes | No |
| `mcp-server` | Start local MCP server | No | No |
| `attach-knowledge` | Embed documents for RAG | Yes (embeddings) | No |

### Common Workflows

**First skill, fastest path:**

```bash
npx skill-mall configure --provider claude-code
npx skill-mall create "blue ocean strategy" --urls https://blueoceanstrategy.com/tools/
npx skill-mall confirm-research blue-ocean-strategy
npx skill-mall deploy business/blue-ocean-strategy
```

**Customize an existing skill:**

```bash
npx skill-mall new --from-template code-review team-code-review
# Edit SKILL.md, fill in [FILL-IN: ...] markers
npx skill-mall validate skills/development/team-code-review
npx skill-mall deploy development/team-code-review
```

**Audit skill quality:**

```bash
npx skill-mall validate skills/business/blue-ocean-strategy
npx skill-mall budget-check business/blue-ocean-strategy --chars-available 200
npx skill-mall eval-triggers business/blue-ocean-strategy
```

**Attach knowledge for RAG:**

```bash
# Set embedding provider in .env.local:
# SKILL_MALL_EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY=your-openai-api-key
npx skill-mall attach-knowledge ai/skill-creator ./docs/
```
