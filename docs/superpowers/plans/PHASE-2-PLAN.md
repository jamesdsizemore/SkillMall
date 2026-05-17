# Phase 2 Plan — Community and Ecosystem

**Status:** Ready for GoalBuddy — activates after Phase 1 completion audit passes  
**Master plan:** `docs/superpowers/plans/MASTER-PLAN.md`  
**Blueprint:** `docs/superpowers/specs/IMPLEMENTATION-BLUEPRINT.md`  
**Feature spec:** `docs/superpowers/specs/2026-05-17-skillmall-feature-expansion-design.md` (Sections 4–6, Phase 2 features)

---

## Goal

Transform the SkillMall catalog from a solo tool into a community platform: ratings, collections, forking, publishing, analytics, and multi-agent deploy. Add backend infrastructure (Supabase) and third-party integrations.

## Gate Into Phase 2

**All of the following must be true before any Phase 2 task activates:**

- Phase 1 completion audit (T018) returned `full_outcome_complete: true`
- James confirms Phase 1 is stable in production (no critical bugs open)
- Supabase project provisioned and connection string available
- GitHub OAuth app registered for reviewer identity

## Outcome

A community-enabled SkillMall where:
1. Users can rate and review skills they have deployed
2. Curated skill collections exist and are deployable in one command
3. Any skill can be forked into a user's own directory
4. Skills can be published to skills.sh from the CLI
5. Contributors see their own skill analytics (aggregate only, no PII)
6. Multi-agent deploy works for Mac (Claude Code, Cursor, Codex detection)
7. The MCP server is live at `/api/mcp` and documented
8. Skills can be validated with the Description Trigger Evaluator

## Completion Proof

- `npm run build` passes
- All tests pass
- Supabase schema deployed (all tables created, no migration errors)
- Ratings and reviews: submit a review via UI, verify it appears
- Collections: deploy a collection via `npx skill-mall deploy-pack` successfully
- Forking: fork a skill via UI, verify independent copy created
- skills.sh: `npx skill-mall publish` completes OAuth flow and posts skill
- Multi-agent deploy: `npx skill-mall deploy --all-agents` detects at least 2 agents on dev machine
- MCP server: `/api/mcp` responds to `search_skills` tool call with valid results
- Phase 2 documentation deliverables complete and reviewed

## Likely Misfire

Starting Phase 2 before Phase 1 is stable. Building community features before the backend is provisioned. Building the MCP server before the deploy flow works.

## Non-Goals for Phase 2

- Skill chains (Phase 3)
- RAG-enhanced skills (Phase 3)
- Self-improvement loop (Phase 3)
- Marketplace / monetization (Phase 3)
- Prompt ELO Tester (Future Development — permanently deferred)

---

## Development Workflow

Same 16-step loop as Phase 1. Every Worker task follows it without exception.

1. Read the blueprint section(s) for the task
2. Map dependencies — parallel vs serial
3. Establish TypeScript contracts before implementation
4. Dispatch parallel subagents where write scopes are disjoint
5. Write Vitest tests alongside or before implementation
6. `npx tsc --noEmit`
7. `npm run lint`
8. `npm run build`
9. First code review
10. Fixes from review
11. Second code review
12. Smoke test at `localhost:3000`
13. Security check — mandatory for all Phase 2 tasks (every task touches auth, backend, or user data)
14. Update documentation
15. Final review
16. `git commit && git push`

**Security check is mandatory for every Phase 2 Worker task.** Phase 2 introduces user authentication, database writes, and third-party OAuth flows. Every task must pass security review before its receipt is written.

---

## Backend Setup Tasks (Prerequisite for Community Features)

---

### T101 — Supabase Schema and Migrations

**Type:** Worker  
**Depends on:** Phase 1 completion (T018 passed), Supabase project provisioned

**Objective:** Create and apply all Phase 2 database migrations. Schema covers: reviews table, install_events table, skill_metadata table (for analytics), knowledge_chunks table (pgvector, for Phase 3 prep).

**Allowed files:**
```
supabase/migrations/
supabase/seed.sql
lib/db/schema.ts
lib/db/client.ts
lib/db/__tests__/schema.test.ts
.env.example
```

**Verify:**
- All migrations apply cleanly against a fresh Supabase project
- `lib/db/schema.ts` Zod schemas match actual database column types
- `supabase/seed.sql` seeds at least 3 test skills, 5 test reviews
- No migration references a column or table that doesn't exist

**Stop if:**
- Supabase connection string not available in environment — do not proceed without it
- pgvector extension not available in the provisioned Supabase tier
- Need files outside allowed_files

---

### T102 — GitHub OAuth Integration

**Type:** Worker  
**Depends on:** T101

**Objective:** Implement GitHub OAuth for reviewer identity. Users authenticate before submitting a review. Session stored in Supabase auth. Verified install signal checked via deploy event log before review is accepted.

**Allowed files:**
```
app/api/auth/
lib/auth/github.ts
lib/auth/session.ts
lib/auth/__tests__/
components/skill-mall/auth/
```

**Verify:**
- `npx tsc --noEmit` clean
- OAuth flow completes: redirect to GitHub → callback → session cookie set
- Unauthenticated review submission returns 401
- Authenticated review without install signal returns 403
- Session expires correctly (check cookie max-age)
- No access tokens stored in the database (store only user ID and scopes)

**Stop if:**
- GitHub OAuth app credentials not available in environment
- Need files outside allowed_files

---

## Ratings and Reviews Tasks (Requires T102)

---

### T103 — Ratings and Reviews Backend

**Type:** Worker  
**Depends on:** T101, T102

**Objective:** Implement review submission API, review retrieval, effectiveness score computation (quality-weighted average), moderation logic (generic reviews deprioritized but not deleted).

**Allowed files:**
```
app/api/reviews/route.ts
app/api/reviews/[skillSlug]/route.ts
lib/reviews.ts
lib/__tests__/reviews.test.ts
```

**Verify:**
- `npx tsc --noEmit` clean
- POST /api/reviews: authenticated, install verified → review stored, 201 returned
- POST /api/reviews: unauthenticated → 401
- POST /api/reviews: review > 150 chars → 400
- GET /api/reviews/[slug]: returns reviews with effectiveness score and popularity count
- Generic review ("great skill") stored but `priority: low` set
- Effectiveness score is quality-weighted average (longer, specific reviews weight higher)

**Stop if:**
- Need files outside allowed_files

---

### T104 — Ratings and Reviews UI

**Type:** Worker  
**Depends on:** T103

**Objective:** Add ratings UI to skill detail page: star rating input, review text field (150 char limit with live counter), review feed with specific reviews above fold. Display effectiveness score and popularity count as separate metrics — never combined.

**Allowed files:**
```
app/skills/[category]/[slug]/page.tsx
components/skill-mall/reviews/
```

**Verify:**
- `npx tsc --noEmit` clean
- `npm run build` succeeds
- Star rating and review text field render on skill detail page
- 150 char limit enforced with live counter
- Effectiveness score and install count displayed as separate metrics
- Generic reviews appear below specific ones (order by priority)
- Unauthenticated users see sign-in prompt, not review form

**Stop if:**
- Need files outside allowed_files

---

## Collections Tasks (Requires T101)

---

### T105 — Skill Collections Backend and CLI

**Type:** Worker  
**Depends on:** T101

**Objective:** Implement the collections format (`collections/<pack-name>/collection.json`), deploy-pack CLI command, and collection validation in CI.

**Allowed files:**
```
cli/src/commands/deploy-pack.ts
lib/collections.ts
lib/__tests__/collections.test.ts
collections/
scripts/validate-skill.sh
```

**Verify:**
- `cd cli && npm run build` succeeds
- `npx skill-mall deploy-pack strategic-business --agent claude-code` deploys all skills in order
- Missing skill slug in collection.json: `npx skill-mall validate` reports error
- All 3 starter collections (Full-Stack Developer Kit, Strategic Business Pack, Documentation Suite) exist and validate

**Stop if:**
- Need files outside allowed_files

---

## Forking, Publishing, and Multi-Agent Deploy Tasks

---

### T106 — Skill Forking (UI and CLI)

**Type:** Worker  
**Depends on:** Phase 1 (T011)

**Objective:** Implement fork command (CLI) and Fork button (UI). Fork creates independent copy with `forked_from` frontmatter. Detail page shows fork count. Multi-level fork chain tracked.

**Allowed files:**
```
cli/src/commands/fork.ts
app/skills/[category]/[slug]/page.tsx
lib/forking.ts
lib/__tests__/forking.test.ts
components/skill-mall/fork-button.tsx
```

**Verify:**
- `npx skill-mall fork blue-ocean-strategy my-version` creates independent copy
- Fork copy has `forked_from: "blue-ocean-strategy@X.Y.Z"` in frontmatter
- Original skill detail page shows fork count
- Multi-level fork: `fork_chain` array contains full lineage

**Stop if:**
- Need files outside allowed_files

---

### T107 — Publish to skills.sh (CLI)

**Type:** Worker  
**Depends on:** Phase 1 (T013)

**Objective:** Implement `npx skill-mall publish <slug> --registry skills.sh`. Pre-publish validation (quality score ≥ 70, description ≤ 1024, license present). OAuth flow. Post-publish frontmatter update.

**Allowed files:**
```
cli/src/commands/publish.ts
lib/publish/skills-sh.ts
lib/__tests__/publish.test.ts
```

**Verify:**
- `cd cli && npm run build` succeeds
- Quality score < 70: publish blocked with specific message
- Missing license field: publish blocked
- OAuth flow opens browser and completes (manual test)
- Post-publish: `metadata.skills_sh_id` and `metadata.skills_sh_url` written to SKILL.md

**Stop if:**
- skills.sh OAuth credentials not available
- Need files outside allowed_files

---

### T108 — Multi-Agent Deploy (UI and CLI)

**Type:** Worker  
**Depends on:** Phase 1 (T013)

**Objective:** Implement `npx skill-mall deploy --all-agents` and `--agents` flag. Detect agents by checking filesystem for 54 known home directories. Deploy only to detected agents. Show per-agent status.

**Allowed files:**
```
cli/src/commands/deploy.ts
lib/agents/detector.ts
lib/agents/agent-registry.ts
lib/__tests__/agent-detection.test.ts
app/skills/[category]/[slug]/page.tsx
components/skill-mall/deploy-button.tsx
```

**Verify:**
- `cd cli && npm run build` succeeds
- Agent detection: `~/.claude` exists → Claude Code detected
- Agent detection: `~/.cursor` not present → Cursor not detected, skipped
- `npx skill-mall deploy blue-ocean-strategy --all-agents` shows per-agent status
- UI: "Deploy to All Agents" button appears in Phase 2 (replaces single-agent deploy)

**Stop if:**
- Need files outside allowed_files

---

### T109 — SkillMall MCP Server

**Type:** Worker  
**Depends on:** Phase 1 (T011)

**Objective:** Implement the MCP server at `/api/mcp`. Expose: `search_skills`, `get_skill`, `get_prompts`, `list_categories`, `deploy_skill`. Host on Vercel serverless. Local dev mode: `npx skill-mall mcp-server`.

**Allowed files:**
```
app/api/mcp/route.ts
lib/mcp/server.ts
lib/mcp/tools.ts
lib/__tests__/mcp.test.ts
cli/src/commands/mcp-server.ts
```

**Verify:**
- `npx tsc --noEmit` clean
- `npm run build` succeeds
- `search_skills("blue ocean")` returns matching skills
- `get_skill("business", "blue-ocean-strategy")` returns full skill data
- `deploy_skill("blue-ocean-strategy", "claude-code", "global")` calls deploy logic
- `/api/mcp` responds to MCP protocol requests

**Stop if:**
- Need files outside allowed_files

---

## Analytics Tasks (Requires T101)

---

### T110 — Trending Dashboard and Skill Analytics

**Type:** Worker  
**Depends on:** T101, T102

**Objective:** Implement install event logging (aggregate, no PII), trending computation (7-day and 30-day velocity), Trending and Rising public views, contributor private dashboard for own skills.

**Allowed files:**
```
app/api/events/install/route.ts
app/trending/page.tsx
app/dashboard/page.tsx
lib/analytics.ts
lib/__tests__/analytics.test.ts
```

**Verify:**
- Install event logged on skill deploy (no user identity stored)
- Trending page shows top 10 by 7-day install velocity
- Rising page shows skills with >50% velocity acceleration
- Contributor dashboard shows their skills' install counts by agent type
- No personally identifiable data in any analytics query

**Stop if:**
- Need files outside allowed_files

---

## Skill Tooling Tasks (Requires Phase 1 stable)

---

### T111 — Description Trigger Evaluator (UI and CLI)

**Type:** Worker  
**Depends on:** Phase 1 (T011)

**Objective:** Implement the Description Trigger Evaluator: generates 20 queries (10 positive, 10 negative), simulates agent selection, reports true positive / false positive / false negative rates. UI as "Trigger Analysis" tab on detail page. CLI as `npx skill-mall eval-triggers`.

**Allowed files:**
```
lib/trigger-evaluator.ts
lib/__tests__/trigger-evaluator.test.ts
app/skills/[category]/[slug]/page.tsx
components/skill-mall/trigger-analysis/
cli/src/commands/eval-triggers.ts
```

**Verify:**
- `npx tsc --noEmit` clean
- `npm run build` succeeds
- Generates exactly 10 positive and 10 negative test queries
- Reports true positive rate, false positive rate, false negative rate, overall accuracy
- Accuracy < 80%: warning generated (not blocking by default)

**Stop if:**
- Need files outside allowed_files

---

### T112 — Skill Version History (UI and CLI)

**Type:** Worker  
**Depends on:** Phase 1 (T013)

**Objective:** Read git log for a skill directory and render a changelog timeline. Semantic diff (describes class of change in plain language). Revert via CLI creates a branch.

**Allowed files:**
```
lib/version-history.ts
lib/__tests__/version-history.test.ts
app/skills/[category]/[slug]/page.tsx
components/skill-mall/version-history/
cli/src/commands/revert.ts
```

**Verify:**
- `npx tsc --noEmit` clean
- `npm run build` succeeds
- Version history tab renders on skill detail page
- Each entry shows: semver, date, author, semantic diff description
- `npx skill-mall revert blue-ocean-strategy --version 1.0.0` creates branch `revert/blue-ocean-strategy-v1.0.0`

**Stop if:**
- Need files outside allowed_files

---

## Documentation Tasks (Runs Throughout Phase 2)

---

### T113 — Phase 2 Documentation

**Type:** Worker  
**Depends on:** T103, T105, T106, T107, T108, T109

**Objective:** Write all Phase 2 documentation deliverables.

**Allowed files:**
```
docs/reference/database-schema.md
docs/reference/collection-format.md
docs/user/publishing-skills.md
docs/user/mcp-server.md
docs/user/community-guide.md
docs/user/multi-agent-deploy.md
```

**Verify:**
- All 6 doc files exist and are >500 words each
- Database schema doc matches actual Supabase migration files
- Publishing guide documents the full skills.sh OAuth flow
- MCP server doc includes the MCP config JSON snippet
- Community guide explains rating requirements (verified install signal)

**Stop if:**
- A doc contradicts the actual implementation — fix the implementation or the doc
- Need files outside allowed_files

---

### T114 — Phase 2 Completion Audit (Judge)

**Type:** Judge  
**Depends on:** all T101–T113 receipts

**Objective:** Audit whether Phase 2 is complete. All community features working, backend stable, docs reviewed.

**Do not mark complete if:**
- Any Phase 2 Worker task is queued or active
- `npm run build` fails or `npm test` fails
- Supabase migrations have not been applied
- Ratings and reviews have not been tested with real data
- Phase 2 documentation is missing or contains stubs
- Phase 3 features are present

**Expected output:**
- `complete | not_complete`
- `full_outcome_complete: true | false`
- Missing items if not_complete

---

## GoalBuddy Setup

To create a GoalBuddy board from this plan:

```bash
# /goal-prep
# Slug: skillmall-phase2
# Input shape: existing_plan
# This file: docs/superpowers/plans/PHASE-2-PLAN.md
# Gate: do not start until Phase 1 completion audit passed
```

Task type map:
- T101–T112: Worker tasks
- T113: Worker (documentation)
- T114: Judge (completion audit)
