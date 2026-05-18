# Goal: Phase 3 Code Fixes

## Charter

**Original request:** Fix all issues in `FIXES.md` produced by a critical code review of Phase 3 code.

**Interpreted outcome:** All 16 issues (3 blocking, 7 required, 6 suggestions) addressed in code, TypeScript compiles clean, tests pass, changes committed.

**Input shape:** `existing_plan` — FIXES.md contains specific file:line references, before/after diffs, and clear rationale for every fix.

**Constraints:**
- Work only the files named in each FIX. Do not refactor adjacent code.
- Preserve all existing tests. Add tests where a fix changes public behavior.
- `tsc --noEmit` and `npm test` must be green after each Worker batch.
- Commit at each verified checkpoint.

**Non-goals:**
- New features beyond what the fixes require.
- Architectural changes beyond what the fixes specify.
- Documentation updates.

**Authority:** `approved` — user explicitly requested all fixes.

**Proof type:** `artifact + test` — TypeScript compiles, test suite passes, `git diff` shows all 16 fixes applied.

**Completion proof:** All 16 FIX items from `FIXES.md` applied; `tsc --noEmit` clean; `npm test` green; changes committed.

**Likely misfire:** Fixing only easy items and claiming done, or silently skipping FIX-02 (complex UI fix) because it requires graph traversal logic.

**Tranche:** Complete all 16 fixes in one goal run, grouped by severity batch.

## Fix Inventory

### Blocking (must go first)
- FIX-01: Gemini API key in URL → `lib/rag/embeddings.ts:83`
- FIX-02: Chain edge config discarded → `ChainCanvas.tsx:84-89`
- FIX-03: Race condition on suggestion INSERT → `lib/self-improvement/analyzer.ts:47-54`

### Required
- FIX-04: Stripe error leaked to client → `app/api/marketplace/checkout/route.ts:44-49`
- FIX-05: Stripe webhook error detection by string → `app/api/webhooks/stripe/route.ts:25-27`
- FIX-06: `shouldTriggerAnalysis` fires forever → `lib/self-improvement/feedback.ts:49-51`
- FIX-07: `category` defaults to `'ai'` → `app/api/improvements/[skillSlug]/route.ts:31`
- FIX-08: Duplicate purchase query → `lib/marketplace/entitlement.ts:20-25`
- FIX-09: LLM output written without validation → `lib/self-improvement/applier.ts:95`
- FIX-10: YAML injection in chain generation → `lib/chains.ts:35-36`

### Suggestions
- FIX-11: Add chunk overlap to RAG chunker → `lib/rag/chunker.ts`
- FIX-12: Rename `tokenCount` → `estimatedTokenCount` for Ollama/Gemini → `lib/rag/embeddings.ts`
- FIX-13: `getSkillTier` default fabricates timestamp → `lib/marketplace/gate.ts:90`
- FIX-14: Cache `checkMarketplaceReady` → `lib/marketplace/gate.ts:28`
- FIX-15: Validate `session.url` before `!` assertion → `lib/marketplace/payments.ts:66`
- FIX-16: Rate limiting on feedback/analysis endpoints (design note only — no rate-limit infra exists yet)
