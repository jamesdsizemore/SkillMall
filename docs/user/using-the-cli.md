# Using the CLI

The SkillMall CLI provides the same research pipeline as the browser wizard, plus catalog management and deployment commands.

```bash
npx skill-mall <command> [options]
```

---

## Commands

### configure

Set up your LLM provider.

```bash
# Interactive
npx skill-mall configure

# Non-interactive
npx skill-mall configure --provider claude-code --model claude-sonnet-4-6
npx skill-mall configure --provider openai --key sk-... --model gpt-4o
npx skill-mall configure --provider groq --key gsk_... --model llama-3.3-70b-versatile
```

Writes to `~/.skill-mall/config.json`. See [Configuring Providers](configuring-providers.md) for all options.

---

### create

Research a topic and write the extracted tools to `research-result.json` for review.

```bash
npx skill-mall create "blue ocean strategy" \
  --urls https://blueoceanstrategy.com/tools/ \
  --category business

npx skill-mall create "okr framework" \
  --category productivity
# No --urls: uses training knowledge, marks result as research-unverified
```

**Output:** `./skill-builder-output/<slug>/research-result.json`

**Next step:** review the JSON, then run `confirm-research`.

**Exit codes:**
- `0` — success, research-result.json written
- `1` — no provider configured
- `2` — all URLs failed to fetch
- `3` — LLM extraction failed after retry

---

### confirm-research

Read `research-result.json`, run the full pipeline, and write the skill to `skills/`.

```bash
npx skill-mall confirm-research blue-ocean-strategy
```

Runs in parallel: Skill Builder (SKILL.md, templates, samples) + Prompt Engine (framework selection, prompt generation) + Prompt Optimizer. Validates against AgentSkills spec. Writes atomically to `skills/<category>/<slug>/`.

**Output:**
```
Created: skills/business/blue-ocean-strategy/
  Files written: 73
  Prompts: 29
  Quality score: 87/100
```

---

### validate

Check skill frontmatter against character limits and required fields.

```bash
npx skill-mall validate                      # validate all skills
npx skill-mall validate skills/business/my-skill
npx skill-mall validate --strict             # fail on warnings too
```

---

### list

List all skills in the catalog.

```bash
npx skill-mall list
npx skill-mall list --cat business
```

---

### deploy

Copy a skill to an agent's skills directory.

```bash
npx skill-mall deploy business/blue-ocean-strategy          # Claude Code global
npx skill-mall deploy business/blue-ocean-strategy cursor   # Cursor global
```

---

### new

Scaffold a new skill from the template (interactive, no research pipeline).

```bash
npx skill-mall new development my-skill-name
```

---

## Research Pipeline Flow

```
npx skill-mall create "topic" --urls https://...
  → Research Engine fetches URLs, extracts tools
  → Writes skill-builder-output/<slug>/research-result.json
  → Prints: npx skill-mall confirm-research <slug>

Review research-result.json

npx skill-mall confirm-research <slug>
  → Reads research-result.json
  → Skill Builder: generates SKILL.md, templates, samples (parallel)
  → Prompt Engine: selects frameworks, generates prompts (parallel)
  → Prompt Optimizer: audits and optimizes each prompt
  → Validates against AgentSkills spec
  → Atomic write to skills/<category>/<slug>/
```

---

## CLI vs Web Wizard

Both use the same `lib/` pipeline. The key difference is the confirmation step:

- **Web Wizard:** interactive review in the browser (Step 2)
- **CLI:** writes `research-result.json`, user reviews the file, then runs `confirm-research`

The generated `SKILL.md` format is identical between both paths.

---

## Editing research-result.json

The JSON file written by `create` is fully editable before you run `confirm-research`. Common edits:

**Remove a tool:** delete the tool object from the `tools` array. The pipeline skips removed tools entirely.

**Fix an artifactStructure:** the blank template embedded in prompts comes from `tool.artifactStructure`. If the LLM produced an incorrect structure, edit it before confirming.

**Update suggestedCategory:** change `suggestedCategory` to move the skill to a different catalog category.

**Add principles:** extend the `principles` array with additional tenets.

After editing, validate the JSON is still valid:

```bash
node -e "JSON.parse(require('fs').readFileSync('skill-builder-output/<slug>/research-result.json', 'utf-8'))" && echo "Valid JSON"
```

---

## Skill Output Location

`confirm-research` writes to `skills/<category>/<slug>/`. For a business skill named `blue-ocean-strategy`:

```
skills/business/blue-ocean-strategy/
├── SKILL.md
├── README.md
├── scripts/
│   ├── run-full-analysis.sh
│   ├── generate-strategy-canvas.sh
│   └── generate-errc-grid.sh
└── resources/
    ├── templates/
    │   ├── strategy-canvas.md
    │   └── errc-grid.md
    ├── samples/
    │   ├── strategy-canvas-sample.md
    │   └── errc-grid-sample.md
    └── prompts/
        ├── tool-strategy-canvas.md
        ├── tool-errc-grid.md
        ├── category-strategy.md
        ├── meta-comprehensive-analysis.md
        └── meta-quick-assessment.md
```

---

## Unverified Research Warning

When no `--urls` are provided, the CLI prints:

```
Warning: Research unverified — provide source URLs with --urls for authoritative results.
```

The generated SKILL.md also includes a banner:

```
> **Research unverified** — generated from training knowledge.
> Provide source URLs for authoritative results.
```

To remove the warning, re-run with `--urls` pointing to the authoritative source and then run `confirm-research` again.
