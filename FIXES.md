# FIXES.md — Phase 3 Code Review

Generated from critical-code-reviewer session, 2026-05-18.
Work these in severity order. Blocking items first.

---

## BLOCKING

### FIX-01 — Gemini API key in URL query string
**File:** `lib/rag/embeddings.ts:83`  
**Risk:** API key appears in server logs, nginx access logs, load balancer logs.

**Current:**
```ts
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] } }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }
)
```

**Fix:** Move key to header, remove from URL.
```ts
const res = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({ content: { parts: [{ text }] } }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }
)
```

---

### FIX-02 — Chain edge configuration is silently discarded
**File:** `components/skill-mall/chains/ChainCanvas.tsx:84-89`  
**Risk:** Users configure per-edge `passesAs`, `usesOutput`, and `namedVariable` via the ChainEdgeConfig panel. `buildChain` reads `nodes` only — never `edges`. All edge configuration is dropped. Steps are also ordered by `position.x` (visual layout) instead of edge topology.

**Current:**
```ts
const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x)
const steps: ChainStep[] = sorted.map((n, i) => ({
  order: i + 1,
  skillSlug: `${n.data.skill.category}/${n.data.skill.slug}`,
  passesAs: "context_append" as const,
}))
```

**Fix:** Build steps by walking the edge graph in topological order, applying per-edge config.
```ts
// Build adjacency: source nodeId -> edge data
const edgeMap = new Map<string, { target: string; data: Edge['data'] }>()
for (const e of edges) {
  if (e.source && e.target) edgeMap.set(e.source, { target: e.target, data: e.data })
}

// Find start node: node with no incoming edge
const targetIds = new Set(edges.map(e => e.target))
const startNode = nodes.find(n => !targetIds.has(n.id))
if (!startNode) {
  setStatus('Error: cycle detected or disconnected graph')
  return
}

// Walk the chain
const ordered: Node<SkillNodeData>[] = []
let current: Node<SkillNodeData> | undefined = startNode
while (current) {
  ordered.push(current)
  const next = edgeMap.get(current.id)
  current = next ? nodes.find(n => n.id === next.target) : undefined
}

if (ordered.length !== nodes.length) {
  setStatus('Error: not all skills are connected')
  return
}

const steps: ChainStep[] = ordered.map((n, i) => {
  const outEdge = edgeMap.get(n.id)
  const cfg = outEdge?.data ?? { passesAs: 'context_append' }
  return {
    order: i + 1,
    skillSlug: `${n.data.skill.category}/${n.data.skill.slug}`,
    passesAs: cfg.passesAs ?? 'context_append',
    ...(cfg.usesOutput ? { usesOutput: cfg.usesOutput } : {}),
    ...(cfg.namedVariable ? { namedVariable: cfg.namedVariable } : {}),
    ...(cfg.instructions ? { instructions: cfg.instructions } : {}),
  }
})
```

Also remove the dead `const sorted = ...` line.

---

### FIX-03 — Race condition: suggestion SELECT after INSERT uses wrong row
**File:** `lib/self-improvement/analyzer.ts:47-54`  
**Risk:** Under concurrent requests, the `ORDER BY id DESC LIMIT 1` SELECT can return a row inserted by a different concurrent request for the same skill, returning the wrong suggestion to the caller.

**Current:**
```ts
db.prepare(
  `INSERT INTO improvement_suggestions (skill_slug, suggestion_body, generated_from_feedback_count)
   VALUES (?, ?, ?)`
).run(skillSlug, suggestionBody.trim(), count)

return db
  .prepare('SELECT * FROM improvement_suggestions WHERE skill_slug = ? ORDER BY id DESC LIMIT 1')
  .get(skillSlug) as ImprovementSuggestion
```

**Fix:** Use `lastInsertRowid` from the run result.
```ts
const result = db.prepare(
  `INSERT INTO improvement_suggestions (skill_slug, suggestion_body, generated_from_feedback_count)
   VALUES (?, ?, ?)`
).run(skillSlug, suggestionBody.trim(), count)

return db
  .prepare('SELECT * FROM improvement_suggestions WHERE id = ?')
  .get(result.lastInsertRowid) as ImprovementSuggestion
```

---

## REQUIRED

### FIX-04 — Stripe internal error message forwarded to client
**File:** `app/api/marketplace/checkout/route.ts:44-49`  
**Risk:** `createCheckoutSession` throws messages like "Marketplace launch conditions have not been met" or raw Stripe SDK errors that reveal internal state.

**Current:**
```ts
} catch (err) {
  return NextResponse.json(
    { error: err instanceof Error ? err.message : 'Checkout failed' },
    { status: 503 }
  )
}
```

**Fix:**
```ts
} catch (err) {
  console.error('[checkout] createCheckoutSession failed:', err)
  return NextResponse.json({ error: 'Checkout unavailable' }, { status: 503 })
}
```

---

### FIX-05 — Stripe webhook error detection by string matching
**File:** `app/api/webhooks/stripe/route.ts:25-27`  
**Risk:** If Stripe changes their error message wording, valid webhook requests will return 500 instead of 400.

**Current:**
```ts
if (message.includes('signature') || message.includes('secret') || message.includes('No signatures')) {
  return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
}
```

**Fix:** Check error type instead.
```ts
import Stripe from 'stripe'
// ...
} catch (err) {
  if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }
  console.error('[stripe-webhook] unexpected error:', err)
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
}
```

---

### FIX-06 — `shouldTriggerAnalysis` fires forever after threshold
**File:** `lib/self-improvement/feedback.ts:49-51`  
**Risk:** Returns `true` for the rest of the skill's lifetime once 10 entries exist. Any caller that uses this to conditionally run analysis will run it on every subsequent feedback submission, burning LLM tokens.

**Current:**
```ts
export function shouldTriggerAnalysis(skillSlug: string): boolean {
  return getFeedbackCount(skillSlug) >= ANALYSIS_TRIGGER_COUNT
}
```

**Fix:** Fire only at exact multiples of the threshold.
```ts
export function shouldTriggerAnalysis(skillSlug: string): boolean {
  const count = getFeedbackCount(skillSlug)
  return count > 0 && count % ANALYSIS_TRIGGER_COUNT === 0
}
```

---

### FIX-07 — `category` silently defaults to `'ai'`
**File:** `app/api/improvements/[skillSlug]/route.ts:31`  
**Risk:** Callers that omit `category` get a silent lookup in the `ai` category and a confusing "Skill not found: ai/slug" 404 with no indication the category was the problem.

**Current:**
```ts
const category = body.category ?? 'ai'
```

**Fix:**
```ts
const { category } = body as { category?: string }
if (!category) {
  return NextResponse.json({ error: 'category is required' }, { status: 400 })
}
```

---

### FIX-08 — Duplicate purchase query in entitlement module
**File:** `lib/marketplace/entitlement.ts:20-25`  
**Risk:** `hasPurchased` and the purchase check inside `getEntitlement` are identical SQL. They will drift.

**Current:**
```ts
export function hasPurchased(skillSlug: string, githubLogin: string): boolean {
  const db = getDb()
  return !!db
    .prepare('SELECT id FROM purchases WHERE skill_slug = ? AND buyer_github_login = ?')
    .get(skillSlug, githubLogin)
}
```

**Fix:** Delegate to `getEntitlement`.
```ts
export function hasPurchased(skillSlug: string, githubLogin: string): boolean {
  return getEntitlement(skillSlug, githubLogin) === 'purchased'
}
```

---

### FIX-09 — LLM-generated skill content written to disk without validation
**File:** `lib/self-improvement/applier.ts:95`  
**Risk:** LLM may return content without frontmatter delimiters, with required fields stripped, or without the version bump. Original file is overwritten with no backup.

**Current:**
```ts
fs.writeFileSync(skillMdPath, improvedContent, 'utf-8')
```

**Fix:** Validate before writing; back up first.
```ts
import matter from 'gray-matter'

// Validate LLM output
const parsed = matter(improvedContent)
if (!parsed.data.name || !parsed.data.description) {
  return { success: false, newVersion: '', error: 'LLM returned content missing required frontmatter fields' }
}
if (!String(parsed.data.metadata?.version ?? parsed.data.version ?? '').includes(newVersion)) {
  return { success: false, newVersion: '', error: 'LLM did not apply version bump' }
}

// Back up original
const backupPath = skillMdPath + '.bak'
fs.copyFileSync(skillMdPath, backupPath)
try {
  fs.writeFileSync(skillMdPath, improvedContent, 'utf-8')
  fs.unlinkSync(backupPath)
} catch (err) {
  // Restore from backup
  fs.copyFileSync(backupPath, skillMdPath)
  fs.unlinkSync(backupPath)
  throw err
}
```

---

### FIX-10 — YAML injection in chain SKILL.md generation
**File:** `lib/chains.ts:35-36`  
**Risk:** A `instructions` value containing a double quote produces malformed YAML. `namedVariable` has no quoting at all.

**Current:**
```ts
if (s.instructions) entry += `      instructions: "${s.instructions}"\n`
if (s.namedVariable) entry += `      named_variable: ${s.namedVariable}\n`
```

**Fix:** Use a YAML scalar escape helper or a serialization library. Minimum: escape backslashes and double quotes, and quote `namedVariable`.
```ts
const escapeYamlStr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
if (s.instructions) entry += `      instructions: "${escapeYamlStr(s.instructions)}"\n`
if (s.namedVariable) entry += `      named_variable: "${escapeYamlStr(s.namedVariable)}"\n`
```

Better long-term: add `js-yaml` as a dependency and serialize the chain_steps block with `yaml.dump`.

---

## SUGGESTIONS

### FIX-11 — Add chunk overlap to RAG chunker
**File:** `lib/rag/chunker.ts`  
**Why:** Zero-overlap chunking loses context at boundaries. Queries spanning two chunks return neither. Standard practice is 10-20% overlap.

```ts
export function chunkText(text: string, targetTokens = 512, overlapFraction = 0.15): string[] {
  const wordsPerChunk = Math.floor(targetTokens / 1.35)
  const overlap = Math.floor(wordsPerChunk * overlapFraction)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ')
    if (chunk.length >= MIN_CHUNK_CHARS) {
      chunks.push(chunk)
    }
  }
  return chunks
}
```

---

### FIX-12 — Rename `tokenCount` to `estimatedTokenCount` for Ollama/Gemini
**File:** `lib/rag/embeddings.ts:6, 73, 97`  
**Why:** Ollama and Gemini return an estimate. The interface implies accuracy. Callers using this for budget/billing tracking will be silently wrong.

Change the interface field name and both call sites that set it from estimates.

---

### FIX-13 — `getSkillTier` default fabricates a different `set_at` each call
**File:** `lib/marketplace/gate.ts:90`

**Current:**
```ts
return row ?? { skill_slug: skillSlug, tier: 'free', price_cents: 0, set_at: new Date().toISOString() }
```

**Fix:**
```ts
return row ?? { skill_slug: skillSlug, tier: 'free', price_cents: 0, set_at: '' }
```

---

### FIX-14 — Cache `checkMarketplaceReady` result
**File:** `lib/marketplace/gate.ts:28`  
**Why:** Called inside `createCheckoutSession` on every payment attempt. Reads all SKILL.md files and scans `tests/` recursively every time.

Add a module-level cache with a 30-second TTL:
```ts
let cachedReadiness: { result: MarketplaceReadiness; expiresAt: number } | null = null

export function checkMarketplaceReady(): MarketplaceReadiness {
  if (cachedReadiness && Date.now() < cachedReadiness.expiresAt) {
    return cachedReadiness.result
  }
  // ... existing logic ...
  cachedReadiness = { result: { ready, conditions }, expiresAt: Date.now() + 30_000 }
  return cachedReadiness.result
}
```

---

### FIX-15 — Validate `session.url` before non-null assertion
**File:** `lib/marketplace/payments.ts:66`

**Current:**
```ts
return { checkoutUrl: session.url!, sessionId: session.id }
```

**Fix:**
```ts
if (!session.url) throw new Error('Stripe checkout session returned no URL')
return { checkoutUrl: session.url, sessionId: session.id }
```

---

### FIX-16 — Add rate limiting to feedback and analysis endpoints
**Files:** `lib/self-improvement/feedback.ts`, `app/api/improvements/[skillSlug]/route.ts`  
**Why:** No per-user rate limits. A malicious authenticated user can spam low ratings to skew averages and trigger repeated LLM analysis calls at no cost to them.

Minimum: track last submission timestamp per user per skill in a `rate_limits` table or in-memory LRU, reject requests within a cooldown window (suggested: 1 feedback per user per skill per hour, 1 analysis trigger per skill per 24 hours).
