# API Reference

Complete reference for all 29 SkillMall API routes. Every route documented with method, authentication requirements, request schema, response schema, error codes, and a working curl example.

**Base URL:** `http://localhost:3000` (development)

**Authentication:** Routes that require authentication expect the `sm_session` cookie set by `GET /api/auth/callback/github`. Pass it to curl with `-b "sm_session=<token>"`.

**Error format:** All errors return JSON `{ "error": "<code>", "details": <optional> }`.

---

## Table of Contents

- [Authentication Routes](#authentication-routes)
- [Provider Routes](#provider-routes)
- [Pipeline Routes](#pipeline-routes)
- [Tool Routes](#tool-routes)
- [Community Routes](#community-routes)
- [Chain Routes](#chain-routes)
- [MCP Route](#mcp-route)
- [Improvement Routes](#improvement-routes)
- [Marketplace Routes](#marketplace-routes)
- [Webhook Routes](#webhook-routes)
- [Analytics Routes](#analytics-routes)

---

## Authentication Routes

### GET /api/auth/login

Initiates GitHub OAuth. Redirects the browser to GitHub's authorization page.

**Authentication:** None required

**Behavior:**
1. Generates a random CSRF state token
2. Sets `sm_oauth_state` httpOnly cookie with the state token (5-minute TTL)
3. Redirects to `https://github.com/login/oauth/authorize` with `client_id`, `redirect_uri`, `state`, and `scope=read:user`

**Response:** 302 redirect (no JSON body)

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 500 | configuration_error | `GITHUB_CLIENT_ID` or `NEXT_PUBLIC_APP_URL` not set |

**curl example:**

```bash
curl -v http://localhost:3000/api/auth/login
# Expect: 302 Location: https://github.com/login/oauth/authorize?...
```

---

### GET /api/auth/callback/github

Completes GitHub OAuth. Called by GitHub after the user authorizes the app.

**Authentication:** None required (validates CSRF state internally)

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `code` | string | Authorization code from GitHub |
| `state` | string | CSRF state token (must match cookie) |

**Behavior:**
1. Validates `state` parameter matches `sm_oauth_state` cookie
2. Exchanges `code` for GitHub access token via `POST https://github.com/login/oauth/access_token`
3. Fetches user profile from `GET https://api.github.com/user`
4. Creates or updates session in SQLite (7-day TTL)
5. Sets `sm_session` httpOnly cookie
6. Redirects to homepage

**Response:** 302 redirect to `/`

**Error responses:**

| Status | Behavior |
|---|---|
| 400 | State mismatch — redirects to homepage with no session |
| 500 | GitHub API error — redirects to homepage with no session |

---

### POST /api/auth/logout

Destroys the current session.

**Authentication:** Required (sm_session cookie)

**Request body:** None required

**Response:**

```json
{ "success": true }
```

Clears `sm_session` cookie and deletes the session row from SQLite.

**curl example:**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b "sm_session=<your-token>"
```

---

## Provider Routes

### GET /api/providers

Returns the full catalog of supported LLM providers.

**Authentication:** None required

**Response:**

```json
{
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "requiresApiKey": true,
      "setupUrl": "https://platform.openai.com/api-keys",
      "defaultModel": "gpt-4o",
      "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
    },
    {
      "id": "claude-code",
      "name": "Claude Code CLI",
      "requiresApiKey": false,
      "setupUrl": null,
      "defaultModel": "claude-sonnet-4-6",
      "models": ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5-20251001"]
    }
  ]
}
```

**curl example:**

```bash
curl http://localhost:3000/api/providers
```

---

### POST /api/providers/configure

Writes LLM provider configuration to `.env.local`. Development only — not available in production.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | string | Yes | Provider ID (`openai`, `claude-code`, `gemini`, `groq`, `ollama`) |
| `apiKey` | string | Depends | Required for openai, gemini, groq |
| `model` | string | No | Model name (defaults to provider default) |
| `baseURL` | string | No | Custom base URL (for Ollama or proxies) |

**Response:**

```json
{ "success": true, "provider": "openai", "model": "gpt-4o" }
```

**curl example:**

```bash
curl -X POST http://localhost:3000/api/providers/configure \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "apiKey": "sk-...", "model": "gpt-4o"}'
```

---

## Pipeline Routes

### POST /api/research

Runs the Research Engine: fetches URLs, extracts tools via LLM, returns a `ResearchResult`.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `topic` | string | Yes | Domain or methodology to research |
| `sourceUrls` | string[] | No | Up to 10 authoritative source URLs |

**Response:**

```json
{
  "topic": "Blue Ocean Strategy",
  "sources": ["https://blueoceanstrategy.com/tools/"],
  "summary": "Apply Blue Ocean Strategy to identify and create uncontested market spaces.",
  "tools": [
    {
      "name": "Strategy Canvas",
      "category": "Strategy",
      "description": "Visualizes the competitive landscape by charting competing factors.",
      "artifactType": "canvas",
      "artifactStructure": "| Competing Factor | Company A | Company B | Our Proposal |\n...",
      "inputs": ["competing factors", "company performance scores"],
      "outputs": ["current-state canvas", "proposed strategic position"],
      "howUsed": "1. List key competing factors. 2. Score each company 1-5..."
    }
  ],
  "principles": ["Value innovation — pursue differentiation and low cost simultaneously"],
  "suggestedCategory": "business",
  "suggestedTags": ["strategy", "blue-ocean", "competitive-analysis"],
  "researchUnverified": false
}
```

`researchUnverified: true` when `sourceUrls` is empty (LLM training knowledge only).

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 400 | invalid_input | Request body failed Zod validation |
| 503 | provider_not_configured | No LLM provider set up |
| 500 | internal_error | LLM extraction failed after retry |

**curl example:**

```bash
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "Blue Ocean Strategy", "sourceUrls": ["https://blueoceanstrategy.com/tools/"]}'
```

---

### POST /api/preview-skill

Runs the Skill Builder on a reviewed `ResearchResult` and returns the generated skill directory without prompt files or disk writes. The browser wizard uses this route between metadata selection and the editable `SKILL.md` preview step.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `researchResult` | object | Yes | `ResearchResult` returned from `/api/research` |
| `metadata` | object | Yes | Slug, category, tags, and target agents |
| `selectedToolNames` | string[] | No | Tool names to include (defaults to all) |

**Response:**

```json
{
  "skillDirectory": {
    "slug": "blue-ocean-strategy",
    "category": "business",
    "files": [
      { "path": "SKILL.md", "content": "---\nname: blue-ocean-strategy\n..." },
      { "path": "README.md", "content": "# Blue Ocean Strategy\n..." }
    ]
  },
  "fileCount": 8,
  "validation": { "valid": true, "errors": [], "warnings": [] }
}
```

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 400 | invalid_input | Request body failed schema validation |
| 422 | invalid_skill_preview | Skill Builder did not produce a valid `SKILL.md` |
| 422 | pipeline_failed | Skill Builder failed |
| 503 | provider_not_configured | No LLM provider set up |

---

### POST /api/confirm-research

Runs the Skill Builder and Prompt Engine on a saved `ResearchResult` — produces skill files in memory without writing to disk.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `researchResult` | object | Yes | `ResearchResult` returned from `/api/research` |
| `metadata` | object | Yes | Slug, category, tags, and target agents |
| `selectedToolNames` | string[] | No | Tool names to include (defaults to all) |
| `selectedMetaTypes` | string[] | No | Meta prompt IDs to include (defaults to all standard meta prompts) |
| `skillMdContent` | string | No | Reviewed `SKILL.md` content from `/api/preview-skill`; replaces generated `SKILL.md` before validation |

**Response:**

```json
{
  "skillDirectory": {
    "slug": "blue-ocean-strategy",
    "category": "business",
    "files": [
      { "path": "SKILL.md", "content": "---\nname: blue-ocean-strategy\n..." },
      { "path": "README.md", "content": "# Blue Ocean Strategy\n..." },
      { "path": "resources/templates/strategy-canvas.md", "content": "..." }
    ]
  },
  "promptCount": 8,
  "fileCount": 16,
  "validation": { "valid": true, "errors": [], "warnings": [] }
}
```

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 400 | invalid_input | Request body failed schema validation |
| 422 | pipeline_failed | Skill Builder or Prompt Engine failed |
| 503 | provider_not_configured | No LLM provider set up |

**curl example:**

```bash
curl -X POST http://localhost:3000/api/confirm-research \
  -H "Content-Type: application/json" \
  -d '{"researchResult": {...}, "metadata": {"slug": "blue-ocean-strategy", "category": "business", "tags": ["strategy"], "targetAgents": ["claude-code"]}, "skillMdContent": "---\nname: blue-ocean-strategy\n..."}'
```

---

### POST /api/create-skill

Builds the reviewed skill directory and writes it atomically to `skills/`.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `researchResult` | object | Yes | `ResearchResult` returned from `/api/research` |
| `metadata` | object | Yes | Slug, category, tags, and target agents |
| `selectedToolNames` | string[] | No | Tool names to include (defaults to all) |
| `selectedMetaTypes` | string[] | No | Meta prompt IDs to include |
| `skillMdContent` | string | No | Reviewed `SKILL.md` content; replaces generated `SKILL.md` before validation and disk write |

**Response:**

```json
{
  "slug": "blue-ocean-strategy",
  "path": "/absolute/path/to/skills/business/blue-ocean-strategy",
  "fileCount": 16,
  "promptCount": 8
}
```

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 400 | invalid_input | Validation failed |
| 409 | skill_exists | `skills/<category>/<slug>/` already exists |
| 503 | provider_not_configured | No LLM provider |
| 422 | validation_failed | Generated SKILL.md failed spec validation |

**curl example:**

```bash
curl -X POST http://localhost:3000/api/create-skill \
  -H "Content-Type: application/json" \
  -d '{"researchResult": {...}, "metadata": {"slug": "blue-ocean-strategy", "category": "business", "tags": ["strategy"], "targetAgents": ["claude-code"]}, "skillMdContent": "---\nname: blue-ocean-strategy\n..."}'
```

---

## Tool Routes

### POST /api/optimize-prompt

Runs a 4-dimension quality audit on a prompt and returns an optimized version.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | The prompt text to audit and optimize |

**Response:**

```json
{
  "tokenCountBefore": 247,
  "tokenCountAfter": 198,
  "tokenReductionPercent": 20,
  "tokenEfficiencyScore": 78,
  "intentDimensionsPresent": ["role", "task", "output_format"],
  "intentDimensionsMissing": ["context", "constraints"],
  "intentCompletenessScore": 60,
  "outputClarityScore": 85,
  "outputClarityPasses": true,
  "triggerSharpnessScore": 72,
  "triggerSharpnessPasses": true,
  "triggerSuggestion": "Start with 'Apply' or 'Analyze' to sharpen the trigger phrase",
  "optimizedPrompt": "Apply the Strategy Canvas to..."
}
```

**curl example:**

```bash
curl -X POST http://localhost:3000/api/optimize-prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "This prompt helps you think about competitive strategy using..."}'
```

---

### POST /api/regen-prompt

Regenerates a skill prompt file with a different reasoning framework.

**Authentication:** None required (reads and writes skill files on server)

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | Yes | Skill category |
| `slug` | string | Yes | Skill slug |
| `promptFile` | string | Yes | Filename within `resources/prompts/` |
| `framework` | string | Yes | Reasoning framework name |

**Behavior:** Reads tool structure from the prompt file's embedded body JSON, calls the LLM to regenerate with the new framework, updates `framework` field in frontmatter (preserves `original_framework`), writes to disk.

**Response:**

```json
{
  "framework": "Chain of Thought",
  "originalFramework": "Structured Output, Artifact Production",
  "content": "Apply the Strategy Canvas using Chain of Thought reasoning..."
}
```

**curl example:**

```bash
curl -X POST http://localhost:3000/api/regen-prompt \
  -H "Content-Type: application/json" \
  -d '{"category": "business", "slug": "wrong-slug", "promptFile": "tool-strategy-canvas.md", "framework": "Chain of Thought"}'
```

---

### POST /api/eval-triggers

Evaluates how reliably a skill's description triggers agents by generating positive and negative test queries.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | Yes | Skill category |
| `slug` | string | Yes | Skill slug |

**Response:**

```json
{
  "truePositiveRate": 90,
  "falsePositiveRate": 10,
  "overallAccuracy": 85,
  "failingQueries": [
    {
      "query": "help me think about market competition",
      "type": "fn",
      "suggestion": "Add 'market competition' or 'competitive landscape' to description"
    }
  ]
}
```

**curl example:**

```bash
curl -X POST http://localhost:3000/api/eval-triggers \
  -H "Content-Type: application/json" \
  -d '{"category": "business", "slug": "wrong-slug"}'
```

---

### GET /api/budget-check

Simulates description visibility at a given character budget.

**Authentication:** None required

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `category` | string | Yes | Skill category |
| `slug` | string | Yes | Skill slug |
| `charsAvailable` | number | No | Budget to simulate (default: 200) |

**Response:**

```json
{
  "slug": "business/wrong-slug",
  "charsAvailable": 200,
  "descriptionLength": 98,
  "visible": true,
  "triggerPhrase": "Apply Blue Ocean Strategy",
  "triggerPreserved": true,
  "visibleText": "Apply Blue Ocean Strategy...",
  "truncatedText": "",
  "rewriteSuggestions": []
}
```

**curl example:**

```bash
curl "http://localhost:3000/api/budget-check?category=business&slug=wrong-slug&charsAvailable=150"
```

---

### POST /api/fork-skill

Creates an independent fork of a skill.

**Authentication:** Required (sm_session cookie)

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceCategory` | string | Yes | Source skill category |
| `sourceSlug` | string | Yes | Source skill slug |
| `newSlug` | string | Yes | Name for the forked skill |
| `newCategory` | string | No | Category for fork (defaults to source category) |

**Behavior:** Copies the entire skill directory, adds `forked_from: <source>@<version>` and `fork_chain` to frontmatter, logs a fork event for analytics.

**Response:**

```json
{
  "sourceSlug": "wrong-slug",
  "sourceVersion": "1.0.0",
  "newSlug": "my-strategy-skill",
  "category": "business",
  "path": "skills/business/my-strategy-skill"
}
```

**curl example:**

```bash
curl -X POST http://localhost:3000/api/fork-skill \
  -H "Content-Type: application/json" \
  -b "sm_session=<token>" \
  -d '{"sourceCategory": "business", "sourceSlug": "wrong-slug", "newSlug": "my-strategy-skill"}'
```

---

### GET /api/version-history

Returns git changelog for a skill file.

**Authentication:** None required

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Relative path to the skill's SKILL.md |

**Response:**

```json
{
  "entries": [
    {
      "hash": "abc1234",
      "date": "2026-05-18",
      "author": "jamesdsizemore",
      "message": "feat: add Strategy Canvas sample output",
      "semanticDiff": "Added 1 template, updated description"
    }
  ]
}
```

**curl example:**

```bash
curl "http://localhost:3000/api/version-history?path=skills/business/wrong-slug/SKILL.md"
```

---

## Community Routes

### GET /api/reviews

Returns all reviews for a skill.

**Authentication:** None required

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `slug` | string | Yes | Skill slug |

**Response:**

```json
{
  "reviews": [
    {
      "id": 1,
      "skill_slug": "wrong-slug",
      "reviewer_login": "developer123",
      "rating": 4,
      "body": "Great for competitive analysis sessions.",
      "created_at": "2026-05-18T10:00:00"
    }
  ]
}
```

---

### POST /api/reviews

Submits a review for a skill.

**Authentication:** Required (sm_session cookie)

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `skillSlug` | string | Yes | Skill slug |
| `rating` | number | Yes | 1-5 star rating |
| `body` | string | Yes | Review text (1-150 chars) |

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 401 | unauthorized | Not authenticated |
| 400 | invalid_input | Rating out of range or body too long |
| 409 | already_reviewed | User already reviewed this skill |

**curl example:**

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -b "sm_session=<token>" \
  -d '{"skillSlug": "wrong-slug", "rating": 5, "body": "Excellent framework coverage."}'
```

---

### POST /api/feedback

Submits improvement feedback for the self-improvement loop.

**Authentication:** Required (sm_session cookie)

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `skillSlug` | string | Yes | Skill slug |
| `satisfaction` | number | Yes | 1-5 satisfaction score |
| `body` | string | No | Written feedback (max 200 chars) |

**Response:**

```json
{
  "feedback": { "id": 1, "satisfaction": 4, "body": "Good but trigger is too generic" },
  "analysisTriggered": false
}
```

`analysisTriggered: true` when the submission count reaches 10+, signaling the author can request an improvement suggestion.

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 401 | (empty) | Not authenticated |
| 400 | (message) | Satisfaction out of range or body too long |

---

## Chain Routes

### GET /api/chains

Lists all skill chains.

**Authentication:** None required

**Response:**

```json
[
  { "slug": "strategy-analysis-pipeline", "name": "Strategy Analysis Pipeline", "steps": 3 }
]
```

---

### GET /api/chains/[slug]

Returns the `chain.json` for a specific chain.

**Authentication:** None required

**Response:**

```json
{
  "name": "Strategy Analysis Pipeline",
  "slug": "strategy-analysis-pipeline",
  "steps": [
    { "order": 1, "skillSlug": "business/wrong-slug", "passesAs": "context_append" }
  ]
}
```

**Error:** 404 if chain not found.

---

### POST /api/create-chain

Validates and writes a new skill chain to `skills/chains/`.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `chain` | object | Yes | Chain definition (name, slug, steps[]) |
| `metadata` | object | No | Category, tags, author |

**Response:** 201 on success.

```json
{ "slug": "strategy-pipeline", "path": "skills/chains/strategy-pipeline", "steps": 2 }
```

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 400 | (message) | Missing required chain fields |
| 409 | (message) | Chain slug already exists |
| 422 | (message) | Chain SKILL.md failed validation |

---

## MCP Route

### GET /api/mcp

Returns the MCP server manifest with all available tools.

**Authentication:** None required

**Response:**

```json
{
  "name": "skillmall",
  "version": "1.0.0",
  "description": "SkillMall skill catalog — search, browse, and get skills for AI agents",
  "tools": [
    { "name": "search_skills", "description": "...", "inputSchema": { ... } },
    { "name": "get_skill", "description": "...", "inputSchema": { ... } },
    { "name": "list_categories", "description": "...", "inputSchema": { ... } },
    { "name": "get_prompts", "description": "...", "inputSchema": { ... } },
    { "name": "deploy_skill", "description": "...", "inputSchema": { ... } }
  ]
}
```

Also handles `GET /api/mcp?event=search_click&query=<q>&slug=<s>` as an analytics side-channel (logs search click-through, returns 204).

### POST /api/mcp

Executes MCP JSON-RPC requests.

**Authentication:** None required

**Supported methods:** `tools/list`, `tools/call`

**Available tools:** `search_skills`, `get_skill`, `list_categories`, `get_prompts`, `deploy_skill`

**curl example:**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "search_skills", "arguments": {"query": "code review"}}}'
```

---

## Improvement Routes

### GET /api/improvements/[skillSlug]

Returns all improvement suggestions for a skill.

**Authentication:** None required

**Response:**

```json
{
  "suggestions": [
    {
      "id": 1,
      "skill_slug": "wrong-slug",
      "status": "pending",
      "suggestion_body": "Add a concrete example of the ERRC grid to the description.",
      "generated_from_feedback_count": 12,
      "created_at": "2026-05-18T10:00:00"
    }
  ]
}
```

---

### POST /api/improvements/[skillSlug]

Triggers LLM analysis of feedback to generate an improvement suggestion.

**Authentication:** Required — only the skill author can trigger analysis.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | Yes | Skill category |

**Error:** 403 if the authenticated user is not the skill author.

---

### POST /api/improvements/[id]/approve

Applies an improvement suggestion to the skill file.

**Authentication:** Required — only the skill author can approve.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `skillSlug` | string | Yes | Skill slug |
| `skillCategory` | string | Yes | Skill category |

**Behavior:** Verifies `session.github_login === skill.author` before any LLM call or disk write. Calls LLM to apply suggestion, bumps version, writes SKILL.md.

**Error:** 403 if not the author — no LLM call, no disk write.

---

### POST /api/improvements/[id]/reject

Rejects an improvement suggestion without applying it.

**Authentication:** Required — only the skill author can reject.

**Request body:** Same as approve.

---

## Marketplace Routes

### GET /api/marketplace/status

Returns current marketplace launch condition status.

**Authentication:** None required

**Response:**

```json
{
  "ready": false,
  "conditions": {
    "catalogSize": 26,
    "catalogRequired": 200,
    "communitySize": 0,
    "communityRequired": 500,
    "ratingsMonthsActive": 0,
    "ratingsMonthsRequired": 3,
    "skillsWithTests": 24,
    "skillsWithTestsRequired": 50
  }
}
```

When `ready: false`, the marketplace UI and checkout are not shown anywhere in the application. The gate enforces itself at runtime — there is no override.

**curl example:**

```bash
curl http://localhost:3000/api/marketplace/status
```

---

### GET /api/marketplace/entitlement

Returns whether the current user has access to a premium skill.

**Authentication:** Optional (determines entitlement for authenticated user)

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `skillSlug` | string | Yes | Skill slug |

**Response:**

```json
{ "entitlement": "free", "skillSlug": "wrong-slug" }
```

`entitlement` values: `free` (all users), `purchased` (user has bought it), `none` (premium, not purchased).

---

### POST /api/marketplace/checkout

Creates a Stripe Checkout Session for purchasing a premium skill.

**Authentication:** Required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `skillSlug` | string | Yes | Skill slug |
| `skillCategory` | string | Yes | Skill category |

**Response:**

```json
{ "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_..." }
```

**Error:** 503 if marketplace launch conditions are not met (enforced by `checkMarketplaceReady()`).

---

## Webhook Routes

### POST /api/webhooks/stripe

Receives Stripe payment events. Raw body is required for signature verification.

**Authentication:** Stripe-Signature header (HMAC)

**Critical implementation note:** This route reads the raw body via `req.arrayBuffer()` + `Buffer.from()`. If the body is parsed as JSON before signature verification, Stripe's `constructEvent()` will fail because serialization changes the byte representation.

**Behavior:** Verifies `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`, stores purchase in SQLite (idempotent — duplicate sessions silently ignored).

**Response:** 200 on success, 400 on invalid signature.

**Error:** 400 if `Stripe-Signature` header is missing or invalid — payload is never processed.

---

## Analytics Routes

### POST /api/retrieve

Retrieves relevant knowledge base chunks for a skill using pure-JavaScript cosine similarity over stored embeddings.

**Authentication:** None required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `skillSlug` | string | Yes | Skill slug (without category prefix) |
| `query` | string | Yes | Natural language retrieval query |
| `topK` | number | No | Max results returned (default: 5, max: 20) |

**Response:**

```json
{
  "chunks": [
    {
      "content": "The Strategy Canvas plots competing factors on the X axis and offering level on the Y axis. Each company's 'value curve' represents how they invest across these factors.",
      "sourceFile": "docs/blue-ocean-primer.md",
      "score": 0.94
    },
    {
      "content": "To draw your Strategy Canvas: list key competing factors, score incumbents 1-5, draw their curves, then design a differentiated curve for your offering.",
      "sourceFile": "docs/blue-ocean-primer.md",
      "score": 0.87
    }
  ],
  "skillSlug": "wrong-slug",
  "query": "how does the strategy canvas work"
}
```

**Notes:**
- Returns `chunks: []` if no knowledge base is attached to the skill
- Chunks are sorted by cosine similarity score (highest first)
- Error details are logged server-side only — client receives generic `{ "error": "Retrieval failed" }`
- Requires `SKILL_MALL_EMBEDDING_PROVIDER` — fails with 422 if provider is `claude-code`
- Dimension mismatch between query and stored embeddings (different providers) is caught per-chunk and logged, not returned to the caller

**Error responses:**

| Status | error | Meaning |
|---|---|---|
| 400 | (message) | Missing skillSlug or query |
| 422 | (message) | claude-code does not support embeddings |
| 503 | (message) | No LLM provider configured |
| 500 | Retrieval failed | Internal error (full details in server logs) |

**curl example:**

```bash
curl -X POST http://localhost:3000/api/retrieve \
  -H "Content-Type: application/json" \
  -d '{"skillSlug": "wrong-slug", "query": "strategy canvas methodology", "topK": 3}'
```

---

## Full Route Index

All 30 routes documented in this reference:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/auth/login | None | Initiate GitHub OAuth |
| GET | /api/auth/callback/github | None (validates CSRF) | Complete OAuth |
| POST | /api/auth/logout | sm_session | Destroy session |
| GET | /api/providers | None | List LLM providers |
| POST | /api/providers/configure | None (dev only) | Write .env.local config |
| POST | /api/research | None | Research Engine extraction |
| POST | /api/preview-skill | None | Build editable `SKILL.md` preview |
| POST | /api/confirm-research | None | Build skill files in memory |
| POST | /api/create-skill | None | Full pipeline + write |
| POST | /api/optimize-prompt | None | 4-dimension prompt audit |
| POST | /api/regen-prompt | None | Framework override regeneration |
| GET | /api/regen-prompt | None | List prompt files for a skill |
| POST | /api/eval-triggers | None | Trigger accuracy evaluation |
| GET | /api/budget-check | None | Description budget simulation |
| POST | /api/fork-skill | sm_session | Fork a skill |
| GET | /api/version-history | None | Git changelog for a skill |
| GET | /api/reviews | None | Get reviews for a skill |
| POST | /api/reviews | sm_session | Submit a review |
| POST | /api/feedback | sm_session | Submit improvement feedback |
| GET | /api/chains | None | List all chains |
| GET | /api/chains/[slug] | None | Get one chain |
| POST | /api/create-chain | None | Create a chain |
| GET/POST | /api/mcp | None | MCP server (list tools / call tool) |
| GET | /api/improvements/[skillSlug] | None | List improvement suggestions |
| POST | /api/improvements/[skillSlug] | sm_session (author only) | Trigger suggestion generation |
| POST | /api/improvements/[id]/approve | sm_session (author only) | Apply suggestion |
| POST | /api/improvements/[id]/reject | sm_session (author only) | Reject suggestion |
| GET | /api/marketplace/status | None | Check launch conditions |
| GET | /api/marketplace/entitlement | Optional | Check user access |
| POST | /api/marketplace/checkout | sm_session | Create Stripe checkout session |
| POST | /api/webhooks/stripe | Stripe-Signature | Receive Stripe events |
| POST | /api/retrieve | None | RAG chunk retrieval |

---

## Common Patterns

### Request Validation

All routes that accept user input validate against Zod schemas before any processing. Validation errors return:

```json
{
  "error": "invalid_input",
  "details": [
    { "path": ["satisfaction"], "message": "Number must be between 1 and 5" }
  ]
}
```

The `details` array contains Zod's issue objects with path and message.

### Authentication Check Pattern

Routes requiring authentication use this pattern:

```typescript
const cookieStore = await cookies()
const token = cookieStore.get('sm_session')?.value
const session = token ? getSession(token) : null
if (!session) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}
```

An expired or invalid session token returns 401 — the client must redirect to `/api/auth/login`.

### Author Authorization Pattern

Routes that modify skill content (improvement approval, suggestion trigger) verify author identity:

```typescript
if (skill.author !== session.github_login) {
  return NextResponse.json({ error: 'Only the skill author can perform this action' }, { status: 403 })
}
```

This check runs before any LLM call or file write. A 403 means zero side effects occurred.

### Error Logging Policy

Routes that call external services (LLM providers, Stripe, GitHub API) log full error details server-side and return generic messages to clients:

```typescript
} catch (err) {
  console.error('[route-name] operation failed:', err)  // full error in server logs
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
}
```

This prevents API keys, billing information, and internal error details from appearing in client-visible responses.

### Marketplace Gate

Routes that require marketplace availability call `checkMarketplaceReady()` before processing:

```typescript
const readiness = checkMarketplaceReady()
if (!readiness.ready) {
  return NextResponse.json({ error: 'Marketplace is not yet available.' }, { status: 503 })
}
```

The four launch conditions (catalog ≥ 200 skills, community ≥ 500 members, ratings active ≥ 3 months, skills with tests ≥ 50) are enforced in code — there is no admin override. Check current status at `GET /api/marketplace/status`.

---

## Development Notes

### Running the Dev Server

All API routes are available at `http://localhost:3000/api/` after running `npm run dev`.

### Testing Routes Without Auth

For routes that require `sm_session`, you can create a test session directly in SQLite:

```sql
-- data/skillmall.db
INSERT INTO sessions (id, github_id, github_login, scopes, expires_at)
VALUES ('test-session-token', '12345', 'your-github-login', 'read:user', datetime('now', '+7 days'));
```

Then pass `-b "sm_session=test-session-token"` to curl commands.

### Adding a New API Route

1. Create `app/api/<name>/route.ts`
2. Export `GET`, `POST`, `PUT`, or `DELETE` async functions
3. Use Zod to validate all inputs: `const result = schema.safeParse(await req.json()); if (!result.success) return NextResponse.json({ error: 'invalid_input', details: result.error.issues }, { status: 400 })`
4. Use parameterized queries for any database access: `db.prepare('SELECT * FROM table WHERE id = ?').get(id)`
5. Return errors with consistent shape: `{ error: '<code>', details?: any }`
6. Document the route in this file

---

## Detailed Schema Reference

### ResearchResult Schema

The `ResearchResult` type returned by `/api/research` and stored in `skill-builder-output/<slug>/research-result.json`:

```typescript
interface ResearchResult {
  topic: string                    // user-provided topic
  sources: string[]                // successfully fetched URLs
  researchUnverified?: boolean     // true when no source URLs provided
  summary: string                  // 2-3 sentence overview, imperative first sentence
  tools: ResearchTool[]            // extracted tools/frameworks
  principles: string[]             // core tenets of the methodology
  suggestedCategory: string        // one of: development|design|writing|research|productivity|infrastructure|ai|business
  suggestedTags: string[]          // 3-6 lowercase-hyphenated tags
  partialSources?: boolean         // true when some URLs failed to fetch
}

interface ResearchTool {
  name: string                     // canonical tool name
  category: string                 // logical group within domain
  description: string              // 1-2 sentence description
  artifactType: 'matrix' | 'canvas' | 'grid' | 'list' | 'flowchart' | 'analysis'
  artifactStructure: string        // blank template as markdown
  inputs: string[]                 // what data/context this tool requires
  outputs: string[]                // named deliverables this tool produces
  howUsed: string                  // 2-5 numbered steps
}
```

### Skill File Structure

The `files` array returned by `/api/confirm-research`:

```typescript
interface InMemoryFile {
  path: string    // relative path within skill directory (e.g., "SKILL.md")
  content: string // full file content
}

// Typical file tree for a 3-tool domain:
// SKILL.md
// README.md
// resources/templates/tool-1-template.md
// resources/templates/tool-2-template.md
// resources/templates/tool-3-template.md
// resources/samples/tool-1-sample.md
// resources/samples/tool-2-sample.md
// resources/samples/tool-3-sample.md
// resources/prompts/tool-tool-1.md
// resources/prompts/tool-tool-2.md
// resources/prompts/tool-tool-3.md
// resources/prompts/meta-comprehensive-analysis.md
// resources/prompts/meta-quick-assessment.md
// resources/scripts/run-full-analysis.sh
```

### Chain Schema

The `chain.json` format written by `/api/create-chain`:

```typescript
interface Chain {
  name: string      // human-readable display name
  slug: string      // kebab-case directory name
  steps: ChainStep[]
}

interface ChainStep {
  order: number                                              // execution order, 1-indexed
  skillSlug: string                                          // category/slug format
  passesAs: 'context_append' | 'context_replace' | 'named_variable'
  namedVariable?: string                                     // required when passesAs = named_variable
  usesOutput?: string                                        // slug of prior step to use as input
  instructions?: string                                      // additional context for this step
}
```

### PromptAudit Schema

The full result from `/api/optimize-prompt`:

```typescript
interface PromptAudit {
  tokenCountBefore: number           // estimated tokens in original prompt
  tokenCountAfter: number            // estimated tokens in optimized version
  tokenReductionPercent: number      // % reduction (0-100)
  tokenEfficiencyScore: number       // 0-100; 100 = no unnecessary words
  intentDimensionsPresent: string[]  // dimensions clearly addressed
  intentDimensionsMissing: string[]  // dimensions absent or ambiguous
  intentSuggestions: Record<string, string>  // dimension → suggestion
  intentCompletenessScore: number    // 0-100; 100 = all 9 dimensions present
  outputClarityScore: number         // 0-100
  outputClarityIssues: string[]      // specific clarity problems found
  outputClarityPasses: boolean       // true if output deliverable named + structured
  triggerSharpnessScore: number      // 0-100
  triggerSharpnessPasses: boolean    // true if first sentence is imperative + unambiguous
  triggerSuggestion: string | null   // improvement suggestion if not passing
  optimizedPrompt: string            // the improved prompt text
  optimizationFailed?: boolean       // true if LLM optimization pass failed
}
```

The 9 intent dimensions evaluated: `role`, `task`, `context`, `constraints`, `output_format`, `output_structure`, `output_ordering`, `tone`, `examples`.

### TriggerEvalResult Schema

The result from `/api/eval-triggers`:

```typescript
interface TriggerEvalResult {
  truePositiveRate: number    // % of positive queries correctly triggered (0-100)
  falsePositiveRate: number   // % of negative queries incorrectly triggered (0-100)
  overallAccuracy: number     // weighted accuracy score (0-100)
  failingQueries: Array<{
    query: string             // the test query that failed
    type: 'fn' | 'fp'        // false negative or false positive
    suggestion: string        // specific improvement suggestion
  }>
}
```

A score above 80% is considered good. Below 60% suggests the description is too vague or too narrow.

### BudgetCheckResult Schema

The result from `GET /api/budget-check`:

```typescript
interface BudgetCheckResult {
  slug: string                  // category/slug
  charsAvailable: number        // simulated budget
  descriptionLength: number     // actual description length
  visible: boolean              // true if description fits within budget
  triggerPhrase: string | null  // extracted trigger phrase (first meaningful phrase)
  triggerPreserved: boolean     // true if trigger phrase visible within budget
  visibleText: string           // what the agent sees (first N chars)
  truncatedText: string         // what gets cut off
  rewriteSuggestions: string[]  // actionable suggestions when not visible
}
```

### MarketplaceReadiness Schema

The result from `GET /api/marketplace/status`:

```typescript
interface MarketplaceReadiness {
  ready: boolean
  conditions: {
    catalogSize: number            // current skill count
    catalogRequired: number        // 200
    communitySize: number          // unique reviewers
    communityRequired: number      // 500
    ratingsMonthsActive: number    // months since first review
    ratingsMonthsRequired: number  // 3
    skillsWithTests: number        // skills with tests/ directory
    skillsWithTestsRequired: number // 50
  }
}
```

All four conditions must be true simultaneously for `ready: true`. The gate is computed fresh on every request — there is no caching and no manual override.

---

## Route Runtime Notes

### Serverless Compatibility

Several routes have filesystem requirements that make them incompatible with Vercel's serverless functions (which have read-only filesystems):

| Route | Serverless compatible? | Reason |
|---|---|---|
| GET /api/providers | Yes | Read-only |
| POST /api/research | Yes | No filesystem writes |
| POST /api/preview-skill | Yes | No filesystem writes |
| POST /api/confirm-research | Yes | No filesystem writes |
| GET /api/mcp (list) | Yes | Read-only |
| POST /api/create-skill | **No** | Writes to `skills/` |
| POST /api/fork-skill | **No** | Writes to `skills/` |
| POST /api/regen-prompt | **No** | Writes to `skills/` |
| POST /api/create-chain | **No** | Writes to `skills/chains/` |
| POST /api/improvements/[id]/approve | **No** | Writes SKILL.md |
| POST /api/providers/configure | **No** | Writes .env.local |
| POST /api/retrieve | **No** | Reads SQLite knowledge_chunks |

For Vercel deployments, the catalog browsing experience works fully. Skill creation, chain building, and improvement suggestions require a deployment with a writable filesystem (Railway, Fly.io, VPS). See [deployment.md](./deployment.md) for platform-specific guidance.

### Rate Limits

There are currently no server-side rate limits in the API. LLM API providers enforce their own rate limits, which will produce 429 errors from the underlying LLM calls that surface as 500 errors from the SkillMall routes. If you need rate limiting, add it at the reverse proxy layer (nginx, Cloudflare) rather than in the application code.
