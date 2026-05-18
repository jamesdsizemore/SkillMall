# Goal: Full Codebase Review Fixes

## Charter

**Original request:** Fix all 16 issues found in the full codebase critical code review.

**Interpreted outcome:** All 16 issues addressed in code, tsc clean, tests pass, changes committed.

**Input shape:** `existing_plan` — review findings are specific with file:line, diagnosis, and fix direction.

**Constraints:**
- Work only files named in each fix. No adjacent refactoring.
- tsc and npm test must be green after each Worker batch.
- Commit at each verified checkpoint.

**Non-goals:** New features, architectural changes beyond what the fixes require.

**Authority:** `approved`

**Proof type:** `artifact + test` — tsc clean, 211+ tests passing, git diff shows all 16 issues addressed.

**Likely misfire:** Fixing only the easy issues and skipping the analytics table corruption (issue 3) because it requires a data decision.

**Tranche:** Complete all 16 in one goal run.

## Fix Inventory

### Blocking
- B1: `app/api/regen-prompt/route.ts` POST — no auth check; unauthenticated LLM + disk writes
- B2: `app/api/fork-skill/route.ts` POST — no auth check; anonymous disk writes
- B3: `lib/analytics.ts:8-12` — logSearchClickEvent uses install_events, corrupts hasInstallSignal + counts
- B4: `lib/publish/npm.ts:62` — versionMismatch: `===` should be `!==`

### Required
- R5: `lib/auth/github.ts:26-37, 50-55` — no AbortSignal.timeout on GitHub API calls
- R6: `app/api/auth/callback/github/route.ts:52-53` — raw GitHub error forwarded to client
- R7: `lib/forking.ts:65` — regex `name:` replacement can corrupt skill body
- R8: `lib/forking.ts:84-87` — `---` in skill body corrupts frontmatter reconstruction
- R9: `lib/analytics.ts:183-211` — getEffectivenessTrend: 30 queries in loop
- R10: `lib/analytics.ts:141-168` — getHighQualitySkills ignores qualityThreshold, hardcodes 95
- R11: `lib/providers/index.ts:17-18, 42-47` — duplicate JSDoc blocks
- R12: `lib/providers/index.ts:62` — JSON.parse on config file without error handling
- R13: `app/api/mcp/route.ts:147` — multi-segment slug silently discards extra components

### Suggestions
- S14: `lib/db/client.ts` — no migration runner at startup (document gap, add TODO)
- S15: `lib/skills.ts:109` — parseSkill swallows errors silently; should log to stderr
- S16: `lib/db/client.ts` — no WAL checkpoint management (add TODO comment)

## Fix Notes

**B3 strategy:** Create a `search_clicks` table via migration and redirect logSearchClickEvent to it. Existing `search-click:*` rows in install_events stay (can't undo), but all future installs and hasInstallSignal queries are now clean. Add `agent_type NOT LIKE 'search-click:%'` filter to install count queries as belt-and-suspenders.

**R7+R8 strategy:** Use gray-matter (already imported) to parse SKILL.md, update the parsed data object, then stringify back. This replaces both fragile regex patterns.

**S14+S16:** No migration runner will be implemented (no infra); deliver as clearly-scoped TODO comments.
