# Pipeline Architecture

SkillMall's generation pipeline is a 5-stage system. Every skill produced by the system passes through all five stages sequentially.

```
Input Layer
    │
    ▼
Research Engine (Stage 2)
    │  ResearchResult
    ├──────────────────────────────────┐
    ▼                                  ▼
Skill Builder (Stage 3)        Prompt Engine (Stage 4)
    │  InMemorySkillDirectory          │  InMemoryFile[]
    └──────────────────────────────────┘
                     │ merged
                     ▼
             Validation → Write to Disk (Stage 5)
```

Stages 3 and 4 run in parallel via `Promise.all`. Both receive the same `ResearchResult` as input.

---

## Stage 1: Input Layer

Accepts: topic string, optional source URLs, category, target agents, selected meta prompt types.

Available via:
- Browser wizard (`/skills/create`)
- CLI (`npx skill-mall create`)

The browser wizard has an additional preview checkpoint after metadata selection. It calls `POST /api/preview-skill` to run Stage 3 only, then shows the generated `SKILL.md` in an editable text area before prompt files are generated.

---

## Stage 2: Research Engine (`lib/research-engine.ts`)

**Inputs:** topic, source URLs

**Process:**
1. Fetches each URL in parallel using `fetch` with a 15-second timeout
2. Extracts text content using cheerio (removes navigation, scripts, ads)
3. Caps per-URL text at 8,000 characters, combined at 20,000 characters
4. Calls the configured LLM with the extraction prompt (JSON mode)
5. Validates the response with Zod (`ResearchResultSchema`)
6. Retries once on JSON parse failure or Zod validation failure, appending the error to the re-prompt
7. If no URLs are provided, skips fetch and uses training knowledge (sets `researchUnverified: true`)

**Output:** `ResearchResult` — topic, tools array, principles, suggested category and tags

**Key constraint:** if all URLs fail to fetch, throws `FetchError`. Never silently falls back to training knowledge when URLs were provided.

---

## Stage 3: Skill Builder (`lib/skill-builder.ts`)

**Inputs:** `ResearchResult`, `SkillMetadata`

**Process (deterministic, no LLM except samples):**
- Generates `SKILL.md` from `ResearchResult.summary` (description capped at 150 chars)
- Generates one template file per tool from `tool.artifactStructure`
- Generates `README.md` with tool index table
- Generates `scripts/run-full-analysis.sh` and per-tool scripts (first 5 tools)
- Generates one sample file per tool via LLM call (parallel)

**Output:** `InMemorySkillDirectory` — all files in memory, nothing written to disk

In the browser wizard, Stage 3 can run by itself through `/api/preview-skill` so the user can review and edit the actual `SKILL.md` before selecting prompt options. Later preview and create routes rebuild the directory and replace `SKILL.md` with the reviewed content before validation.

---

## Stage 4: Prompt Engine (`lib/prompt-engine.ts`)

**Inputs:** `ResearchResult`, skill slug

**Process:**
1. For each tool: `getFrameworkCandidates(tool, topic)` narrows 40+ frameworks to 5-8 candidates based on artifact type, domain, and tool complexity
2. LLM selects optimal framework(s) from candidates (JSON mode, max 3 frameworks)
3. LLM generates self-contained prompt body with the selected frameworks applied structurally
4. Generates category prompts (one per unique `tool.category`)
5. Generates 5 standard meta prompts + optional 6th cross-category synthesis (when 3+ categories)

**Output:** `InMemoryFile[]` of prompt files in `resources/prompts/`

**Prompt counts:** N tools + C categories + 5 meta (+ 1 cross-category if 3+ categories)

---

## Stage 5: Validation + Write (`lib/pipeline.ts`)

**Validation (`validateSkillDirectory`):**
- `SKILL.md` present
- `README.md` present
- `name` field: max 64 chars, kebab-case, matches slug
- `description` field: present, max 1024 chars, warning above 150

**Atomic write (`atomicWrite`):**
1. Writes all files to a temp directory (`<output>.tmp-<timestamp>-<random>`)
2. Removes existing output directory if present
3. Renames temp to final path (`fs.rename` — atomic on POSIX)
4. On any failure: cleans up temp directory, output directory untouched

---

## Shared Infrastructure

- **Provider abstraction** (`lib/providers/`): multi-provider LLM client (OpenAI, Claude Code CLI, Gemini, Groq, Ollama)
- **Validators** (`lib/validators.ts`): all Zod schemas for LLM output validation
- **Quality Score** (`lib/quality-score.ts`): 5-dimension 0-100 rubric computed at catalog build time

---

## Confirmation Gate

The pipeline pauses after Stage 2 in all paths. No files are written until the user explicitly confirms the extracted research:

- **Web wizard:** Step 2 requires expanding DETAILS on at least one tool, then clicking Confirm Research. Step 3 generates a `SKILL.md` preview before Step 4. Step 4 edits are carried into prompt preview and final creation.
- **CLI:** writes `research-result.json`, user reviews, runs `confirm-research <slug>`

This gate is non-skippable. The pipeline cannot proceed to Stages 3–5 without user confirmation.
