<original_task>
Build SkillMall — an open-source skill catalog and generation platform. The project creates, manages, and deploys structured AI agent skills across Claude Code, Cursor, Codex, Gemini CLI, and any AgentSkills-compatible agent. Three phases of work were planned; Phases 1 and 2 are complete; Phase 3 is ready to execute.
</original_task>

<work_completed>

## Phase 1 — Core System (COMPLETE)

**Pipeline (lib/):**
- `lib/providers/` — 5-provider LLM abstraction (OpenAI, Claude Code CLI via execFile subprocess NO Anthropic SDK, Gemini, Groq, Ollama). Config resolves from env vars → ~/.skill-mall/config.json
- `lib/research-engine.ts` — URL fetching via cheerio, LLM extraction, Zod validation, retry on failure
- `lib/skill-builder.ts` — deterministic SKILL.md/README/template generation + LLM sample generation per tool
- `lib/prompt-engine.ts` + `lib/pe-frameworks.ts` — framework pre-filter by artifact type, LLM framework selection, self-contained prompt body generation
- `lib/prompt-optimizer.ts` — 4-dimension LLM audit (token efficiency, intent completeness, output clarity, trigger sharpness)
- `lib/pipeline.ts` — 5-stage orchestration with confirmation gate + atomic write (temp+rename)
- `lib/quality-score.ts` — 5-dimension 0-100 rubric
- `lib/validators.ts` — all Zod schemas
- `lib/design-tokens.ts` — Nothing design system token values
- `lib/build-metadata.ts` — BuildMetadata type (needed by T261 regen-prompt)

**UI (Next.js 15, Tailwind v4, Nothing design system):**
- Homepage: HeroSection (scan reveal animation), StatCounters (Doto count-up), WhatIsASkill
- Skill cards with segmented quality bar fill animation
- 6-step Wizard with WizardContext (useReducer + sessionStorage persistence)
- Skill detail page with dark quality score panel (Doto number hero), SkillTabs (OVERVIEW/SKILL.MD/HISTORY/TRIGGER ANALYSIS tabs)
- /optimize page (prompt optimizer UI)
- /prompt-library (40+ framework cards by category)
- /settings/providers (LLM provider configuration)

**API routes (app/api/):**
- GET/POST /api/providers, POST /api/providers/configure
- POST /api/research, POST /api/confirm-research, POST /api/create-skill
- POST /api/optimize-prompt
- GET /api/version-history, POST /api/fork-skill
- POST /api/eval-triggers, POST /api/budget-check (stub)

**CLI (cli/src/):**
- configure, create (research pipeline), confirm-research, deploy (--all-agents, --agents), deploy-pack, fork, revert, publish (npm + skills.sh), validate, new, extract (stub), test-skill (stub), eval-triggers

**Database:** SQLite via better-sqlite3, WAL mode, migrations at db/migrations/
- 001_initial.sql: sessions, install_events, reviews, fork_events (003), search_clicks (004)

**Testing:** 109 tests passing (Vitest), 17 test files

**CI/CD:** .github/workflows/validate-skills.yml + .github/actions/skill-mall-validate/action.yml

---

## Phase 2 — Community and Ecosystem (COMPLETE)

**Authentication:** GitHub OAuth (manual, no next-auth), CSRF state cookie, sm_session cookie (httpOnly, SameSite=Strict, 7-day), sessions in SQLite
- lib/auth/github.ts, lib/auth/middleware.ts
- /api/auth/login, /api/auth/callback/github, /api/auth/logout
- AuthButton component in header

**Community features:**
- Ratings/reviews (lib/reviews.ts) — effectiveness score (specific reviews 2x weighted), generic review detection, UNIQUE(skill+user) constraint
- ReviewForm, ReviewFeed, EffectivenessPanel components on skill detail page
- Install event tracking (lib/analytics.ts) — zero PII
- Trending dashboard (/trending) — install velocity, rising skills (Community Favorites and High Quality views missing → T266 on Phase 3 board)
- Contributor dashboard (/dashboard) — auth required, shows own skills' install counts

**Catalog features:**
- Skill Collections (lib/collections.ts) — 3 starter packs, deploy-pack CLI, collection.json format
- Skill Forking (lib/forking.ts) — forked_from + fork_chain frontmatter, CLI fork command, Fork button
- Skills.sh publish (lib/publish/skills-sh.ts) — pre-publish validation, OAuth stubbed (endpoint not documented)
- Multi-agent deploy (lib/agents/registry.ts + detector.ts) — 7-agent registry, filesystem detection

**MCP server:** /api/mcp — search_skills, get_skill, list_categories (get_prompts and deploy_skill missing → T265 on Phase 3 board)

**Version history:** lib/version-history.ts — git log parsing, semantic diff, HISTORY tab in SkillTabs, revert CLI

**Trigger evaluator:** lib/trigger-evaluator.ts — 20-query eval, Trigger Analysis tab in SkillTabs

**Docs infrastructure (Phase 2 stubs — will be replaced by Phase 4):**
- docs/user/: configuring-providers, using-the-wizard, using-the-cli, mcp-server, multi-agent-deploy, community-guide, publishing-skills
- docs/reference/: pipeline-architecture, provider-catalog, research-result-schema, prompt-file-format, quality-score-rubric, api-routes, database-schema, collection-format

---

## Process Infrastructure Built This Session

**Skills installed to ~/.claude/skills/:**
- `development-workflow` — mandatory 16-step loop for every implementation task
- `phased-implementation-plan` — 50KB+ self-contained plan standard
- `feature-inventory-check` — mandatory pre-flight before writing any phase plan (reads spec, verifies every feature is a Worker task card)
- `plan-review` — mandatory two-pass review before committing any plan doc
- `plan-review` also in skills/productivity/plan-review/ for the SkillMall catalog

**Hooks installed:**
- `~/.claude/hooks/plan-write-guard.sh` — fires on any Write to plan docs or state.yaml; auto-validates GoalBuddy boards; injects skill reminders
- `~/.claude/hooks/process-stop-check.sh` — fires at Stop; injects process checklist based on what was modified
- `~/.claude/hooks/plan-request-preflight.sh` — fires on UserPromptSubmit when plan writing detected; injects mandatory pre-flight
- `~/.claude/settings.json` — registered all 3 hooks system-wide (PostToolUse, Stop, UserPromptSubmit)
- `.claude/settings.json` (project-level) — same 3 hooks with project-specific path resolution

**Memory saved (~/.claude/projects/-Users-jamesdsizemore-Developer-skill-mall/memory/):**
- feedback_plan_quality.md — 50KB+ minimum, self-contained, no external refs
- feedback_self_contained_plans.md — plans embed all implementation details inline
- feedback_feature_inventory.md — feature-inventory-check before every phase plan
- feedback_plan_review.md — two-pass review (write→Pass1→fix→Pass2→fix→Pass1→commit)

---

## Plans Written This Session

- `docs/superpowers/plans/PHASE-1-PLAN.md` — 104KB, complete Phase 1 spec
- `docs/superpowers/plans/PHASE-2-PLAN.md` — 64KB, complete Phase 2 spec
- `docs/superpowers/plans/PHASE-3-PLAN.md` — 74KB, all 30 tasks, two passes reviewed
- `docs/superpowers/plans/PHASE-4-PLAN.md` — 84KB, 27 tasks, documentation suite
- `docs/superpowers/specs/IMPLEMENTATION-BLUEPRINT.md` — architectural reference

---

## Phase 3 Board Created and Validated

Board: `docs/goals/skillmall-phase3/state.yaml`
- 30 tasks, `ok: true`, zero errors
- Active task: T251 (Domain Starter Templates)
- T263 marked blocked (merged into T261)
- T280 audit gate separates missed Phase 1/2 features from Phase 3 features
- T201 (SQLite Phase 3 migration) properly gated on T280

---

## Phase 4 Board Created

Board: `docs/goals/skillmall-phase4/state.yaml`
- 27 tasks, `ok: true`
- Active task: T401 (Developer Getting Started)
- Activates after Phase 3 T280 passes
- Target: 67,000+ words across 20 new documents

</work_completed>

<work_remaining>

## Immediate Next Action

Start Phase 3 execution:

```
/goal Follow docs/goals/skillmall-phase3/goal.md.
```

This executes T251 first: Domain Starter Templates.

---

## Phase 3 Task Sequence (30 tasks)

### Missed Phase 1/2 Features (T251–T275, T257) — execute before T280

**T251 — Domain Starter Templates** (ACTIVE)
- Create skills/_starters/ with 20 domain starters
- Each: SKILL.md (real content, not generic), README.md (citation required), resources/templates/, starter-config.json
- Implement `npx skill-mall new --from-template <slug> <new-name>` CLI flag
- CRITICAL: Every starter README.md must cite its authoritative source URL
- 20 domains listed in PHASE-3-PLAN.md with their authoritative URLs

**T252 — Agent Budget Analyzer**
- lib/budget-analyzer.ts — user-configurable --chars-available N (NOT per-agent hardcoded values)
- Budget Analysis tab in SkillTabs
- CLI: npx skill-mall budget-check --chars-available 200 (--agent flag accepted but only for display)

**T253 — Codebase-to-Skill Extractor**
- Add runResearchEngineFromText() to lib/research-engine.ts (allowed_files includes research-engine.ts)
- CLI: npx skill-mall extract <dir> --output <slug> [--focus "patterns"]
- Path traversal security check required

**T254 — Skill Dependency Graph**
- /graph page using reactflow (NOT custom physics simulation)
- lib/graph.ts: computeGraph(skills) → { nodes, edges }
- Hub skills (>3 connections), orphan skills (0 connections)

**T255 — Skill Testing Framework**
- lib/skill-tester.ts — test case runner (tests/<slug>/*.json format)
- CLI: npx skill-mall test <slug>
- THIS TASK creates framework + one example (tests/skill-creator/ with 3 test cases)
- Does NOT write 50 test suites — that is T257
- DO NOT reference Phase 3 SQLite tables (002_phase3.sql not applied yet)

**T256 — Multilingual Skill Support**
- lib/i18n.ts, SKILL.<locale>.md convention in resources/i18n/
- CLI: npx skill-mall deploy <slug> --lang es (deploys translation AS SKILL.md in target dir)
- CI validation: translation structure matches canonical

**T257 — Write Test Suites** (depends on T251 + T255)
- Write >= 72 test case JSON files in tests/ (24 skills × 3 tests each)
- Tests must be domain-specific, not generic
- File: tests/ only

**T261 — User Framework Override + Prompts Tab** (MERGED — T263 is blocked)
- Add Prompts tab to SkillTabs showing all prompt files from resources/prompts/
- Framework badge on each prompt card → clickable dropdown → POST /api/regen-prompt
- CRITICAL: regen-prompt requires build-metadata.json — must add to lib/pipeline.ts first
- lib/build-metadata.ts type is defined; pipeline.ts needs to write resources/build-metadata.json
- allowed_files includes lib/pipeline.ts

**T262 — optimize-prompt CLI**
- Wraps existing lib/prompt-optimizer.ts
- Accepts file path or --stdin
- Writes <filename>-optimized.md (before/after word counts inline, no diff file)

**T264 — npm Package Publisher**
- Default is --dry-run; actual publish requires explicit --publish flag
- NEVER publish without --publish flag guard

**T265 — MCP Missing Tools + Search Tracking**
- Add get_prompts and deploy_skill to /api/mcp (deploy_skill checks filesystem writability first)
- Add search click tracking (db/migrations/004_search_clicks.sql)
- File conflict: lib/analytics.ts — do AFTER T266

**T266 — Trending Missing Views + Fork Tracking**
- db/migrations/003_fork_events.sql
- Community Favorites view (top by fork count)
- High Quality view (quality > 90 AND effectiveness > 4.5)
- Fork count display on detail page
- File conflict: lib/analytics.ts — do BEFORE T265 modifies same file

**T267 — --scope project Deploy Flag**
- Project-scoped paths for all 7 agents specified in PHASE-3-PLAN.md
- Copilot uses different convention (.github/copilot-instructions/<skill>.md)

**T268 — CI Trigger Evaluator Integration**
- OPTIONAL step in CI — skips when SKILL_MALL_PROVIDER/SKILL_MALL_API_KEY absent
- Never fails build when secrets missing
- continue-on-error: true required

**T271 — skills.sh Static Badge**
- Static only — NO live API calls (skills.sh API undocumented)
- Show badge when metadata.skills_sh_id exists in frontmatter

**T272 — CI README Badge**
- Add GitHub Actions status badge to README.md

**T273 — mcp-server CLI**
- Standalone HTTP server — NO Next.js imports
- Must use standalone catalog reader (pure Node.js, gray-matter only)

**T274 — Review Score Trend Dashboard**
- SQLite recursive CTE for 30-day daily averages
- Falls back to simple query if CTE not available

**T275 — Prompt Library Copy + Skills Using Framework**
- One-click copy button on /prompt-library framework cards
- Count of skills using each framework (computed from prompt frontmatter at build time)

### T280 — Missed Features Audit (Judge — GATES ALL PHASE 3 FEATURES)
- Must pass before T201-T209 activate
- Runs feature-inventory-check one final time
- Verifies every feature in spec works in running app
- Checklist in PHASE-3-PLAN.md T280 section

### Phase 3 Features (T201–T209) — activate after T280

**T201 — SQLite Phase 3 Migration**
- Install reactflow, stripe, @stripe/stripe-js
- db/migrations/002_phase3.sql (6 tables: skill_feedback, improvement_suggestions, knowledge_bases, knowledge_chunks, purchases, skill_tiers)
- Note: migrations 001, 003, 004 already exist — 002 applies alphabetically between them

**T202 — Skill Chain Builder**
- React Flow canvas at /skills/chains/new — MUST use dynamic import with ssr: false
- lib/chains.ts: buildChainDirectory
- POST /api/create-chain, GET /api/chains, GET /api/chains/[slug]

**T203 — RAG Knowledge Attachment**
- sqlite-vss extension for vector similarity search
- lib/rag/embeddings.ts, lib/rag/chunker.ts, lib/rag/knowledge-base.ts
- Claude Code CLI does NOT support embeddings — throw helpful error
- Use SKILL_MALL_EMBEDDING_PROVIDER env var for separate embedding provider

**T204 — Self-Improvement Feedback Collection**
- Opt-in feedback form, NEVER auto-prompted
- POST /api/feedback, trigger analysis at 10+ submissions

**T205 — Self-Improvement Approval and Application**
- CRITICAL: ALWAYS verify session.github_login === skill.author before any file write
- No automatic writes under any circumstances

**T206 — Marketplace Gate and Tier System**
- checkMarketplaceReady() uses real data — 4 conditions (catalog>=200, community>=500, ratings>=3months, skillsWithTests>=50)
- Marketplace UI hidden (not disabled) when ready: false

**T207 — Stripe Payment Integration**
- MUST have export const runtime = 'nodejs' in webhook route
- Webhook reads raw bytes BEFORE any JSON parsing
- STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET required in .env.local

**T208 — Phase 3 Documentation**
- Write 9 new doc files (5 Phase 3 + 4 missed-feature docs) at >= 500 words each
- These are stubs — Phase 4 will make them comprehensive

**T209 — Phase 3 Completion Audit (Judge)**
- Runs feature-inventory-check one final time
- All 30 tasks done, build/test/tsc passing

</work_remaining>

<attempted_approaches>

## Plans Rewritten Due to Quality Issues

**Original Phase 3 plan (58KB):** Discarded because 6 of 9 Phase 3 tasks said "Full implementation is in the original PHASE-3-PLAN.md" — violating the self-contained requirement. Also had architectural problems: per-agent hardcoded budget values (hallucination risk), custom physics simulation for dependency graph (drift risk), missing build-metadata.json for regen-prompt.

**Original Phase 1 and Phase 2 plans:** Missed 14 features from the original feature spec across two rounds of "checking." The feature-inventory-check skill now exists to prevent this.

## GoalBuddy Board Issues Fixed

**T004b ID format:** Original board had T004b which GoalBuddy checker rejected. Renamed to T005, renumbering T005–T013 to T006–T014.

**T268 broken YAML:** Line 422 had unescaped double quotes inside a double-quoted YAML string (`"python3 -c "import yaml...""`). Fixed by changing to `python3 -m yaml` alternative.

**Thin MASTER-PLAN.md:** Original thin overview doc deleted — replaced with self-contained per-phase plans.

## Process Failures Captured in Memory

- **Phase 1 missed:** Agent Budget Analyzer, Domain Starter Templates
- **Phase 2 missed:** Codebase-to-Skill Extractor, Skill Dependency Graph, Skill Testing Framework, Multilingual Support
- **Round 2 Phase 1/2 misses:** User Framework Override, optimize-prompt CLI, Prompts tab, npm Publisher, MCP get_prompts/deploy_skill, Trending sub-features, --scope project flag, CI trigger integration
- **Round 3 Phase 1/2 misses:** skills.sh badge, CI README badge, mcp-server CLI, review score trend, prompt library copy

</attempted_approaches>

<critical_context>

## Architecture Decisions (Non-Negotiable)

1. **No Anthropic SDK.** Claude Code provider uses `execFile('claude', ['--print', '--model', model, prompt])` — subprocess invocation only. No api.anthropic.com calls.

2. **No Supabase.** SQLite via better-sqlite3. WAL mode. Migrations in db/migrations/. Runner: `npm run db:migrate`.

3. **Budget Analyzer is user-configurable.** NOT per-agent hardcoded values. Use `--chars-available N`. Per-agent values are undocumented and would be hallucinated.

4. **Skill Dependency Graph uses reactflow.** Already installed for T202. Do NOT implement custom physics simulation.

5. **regen-prompt requires build-metadata.json.** The pipeline must be updated (T261 allowed_files includes lib/pipeline.ts) to write `resources/build-metadata.json` containing the full ResearchResult data including selectedFrameworks per tool. Without this, framework override cannot reconstruct ResearchTool data.

6. **npm publish is --dry-run by default.** Explicit --publish flag required for actual publish. No code path publishes without this guard.

7. **MCP deploy_skill checks filesystem writability.** Returns friendly error in read-only environments (Vercel). Never crashes.

8. **CI eval-triggers step is optional.** Skips gracefully when SKILL_MALL_PROVIDER/SKILL_MALL_API_KEY absent. Uses `continue-on-error: true`. Never fails build when secrets missing.

9. **skills.sh badge is static only.** skills.sh API is undocumented. No live API calls.

10. **mcp-server CLI is pure Node.js.** No Next.js imports. Uses gray-matter and fs directly.

11. **T263 is merged into T261.** The Prompts tab and Framework Override are one feature. T263 is marked blocked on the board.

## File Conflict Ordering (Phase 3)

| File | Execution order |
|---|---|
| `cli/src/index.ts` | T262 → T261 → T264 → T273 → T267 → T265 → T268 |
| `components/skill-mall/skill-detail/SkillTabs.tsx` | T252 → T256 → T261 |
| `app/skills/[category]/[slug]/page.tsx` | T261 → T266 → T271 → T256 |
| `lib/analytics.ts` | T265 → T266 → T274 |
| `.github/workflows/validate-skills.yml` | T255 → T268 |

## Key File Paths

```
Project root: /Users/jamesdsizemore/Developer/skill-mall/
Phase 3 board: docs/goals/skillmall-phase3/state.yaml
Phase 3 plan: docs/superpowers/plans/PHASE-3-PLAN.md (74KB — read this, not the old plan)
Phase 4 plan: docs/superpowers/plans/PHASE-4-PLAN.md (84KB)
Feature spec: docs/superpowers/specs/2026-05-17-skillmall-feature-expansion-design.md
Skills catalog: skills/ (4 skills currently: ai/skill-creator, productivity/development-workflow, productivity/phased-implementation-plan, business/wrong-slug)
Test fixtures: lib/__tests__/fixtures/ (Blue Ocean research result, framework selection, etc.)
Mock LLM: lib/__tests__/mocks/mock-llm-client.ts
```

## Enforcement Mechanism

Every time a plan document is written: the PostToolUse Write hook fires, injects mandatory skill checklist (feature-inventory-check + plan-review two passes).

Every time Claude stops: the Stop hook fires, injects process checklist based on what was modified.

Every time a phase plan is requested: the UserPromptSubmit hook fires, injects mandatory pre-flight.

## Provider Configuration

User's .env.local has GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET set (added in Phase 2 session). No LLM provider currently configured for skill creation — user must run `npx skill-mall configure` before T251 can use the Research Engine.

However: T251 (Domain Starter Templates) does NOT use the Research Engine. The starters are hand-written content. No LLM provider needed for T251.

T252 and beyond may need provider configured for any LLM-powered tasks.

## GoalBuddy Board Validation

After any state.yaml modification, always run:
```bash
node ~/.claude/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/skillmall-phase3/state.yaml
```

The PostToolUse Write hook does this automatically, but verify manually before committing.

## Existing Skills in Catalog

The catalog currently has only 4 skills:
- ai/skill-creator (created manually, no resources/prompts/ dir)
- productivity/development-workflow (created manually)
- productivity/phased-implementation-plan (created manually)
- business/wrong-slug (has resources/prompts/ — used for T261 Prompts tab verification)

The `wrong-slug` skill is a test artifact from Phase 1. It has actual prompt files. T261's verify condition specifically uses it.

## Task Cards with Special Notes

**T255 verify says:** "npm run db:migrate exits 0 (only 001_initial.sql exists at this point)" — T265 adds 004 and T266 adds 003, but those run AFTER T255. So at T255 time, only 001 should be applied.

**T257 depends on T251 AND T255.** Both must be done before T257 starts.

**T201 (SQLite migration) is gated on T280.** Do not activate until T280 audit passes.

**T208 (Phase 3 docs) should write stubs.** Phase 4 will make them comprehensive. 500-word minimum is sufficient for Phase 3 completion.

</critical_context>

<current_state>

## Repository State

Branch: main
All work committed and pushed to: https://github.com/jamesdsizemore/SkillMall

Latest commits (most recent first):
- `fix: correct SkillTabs.tsx file conflict ordering in Phase 3 plan`
- `docs: PHASE-4-PLAN.md (84KB) + GoalBuddy board`
- `fix: repair broken YAML in T268 verify condition`
- `feat: plan-review skill + 3 enforcement hooks (system-wide + project-level)`
- `fix: add 5 more missed spec features T271-T275`
- `fix: add T280 missed-features audit gate`
- `fix: add 8 more missed spec features T261-T268`
- `fix: add 6 missed Phase 1/2 features to Phase 3 board (T251-T256)`

## Test Status

```bash
npm test  # 109 tests, 17 files, all passing
npm run build  # Clean
npx tsc --noEmit  # Clean
npm run db:migrate  # Clean (migrations 001, 003, 004 applied)
```

## GoalBuddy Boards

| Board | File | Status | Active Task |
|---|---|---|---|
| Phase 1 | docs/goals/skillmall-phase1/state.yaml | done (full_outcome_complete: true) | null |
| Phase 2 | docs/goals/skillmall-phase2/state.yaml | done (full_outcome_complete: true) | null |
| Phase 3 | docs/goals/skillmall-phase3/state.yaml | active | T251 |
| Phase 4 | docs/goals/skillmall-phase4/state.yaml | active | T401 |

## Phase 3 Board: Ready to Execute

**Command to start:**
```
/goal Follow docs/goals/skillmall-phase3/goal.md.
```

**First task:** T251 — Domain Starter Templates. 20 starters in skills/_starters/. CLI --from-template flag. No LLM needed (hand-written content). Citations required in each README.md.

**Board is `ok: true`, zero errors.** The GoalBuddy checker validates automatically on every board write via the PostToolUse hook.

## Visual Boards Running

Both Phase 3 and Phase 4 boards are registered with the local GoalBuddy hub:
- http://goalbuddy.localhost:41737/skillmall-phase3/
- http://goalbuddy.localhost:41737/skillmall-phase4/

## Open Questions / Decisions Needed

1. **LLM provider for pipeline tasks:** User will need to configure a provider before LLM-dependent tasks (T252+). `npx skill-mall configure` handles this.

2. **Stripe credentials:** Required for T207 (Stripe webhook). Not yet in .env.local. STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET needed.

3. **sqlite-vss for RAG (T203):** Native extension that requires node-gyp. If loadExtension() fails, T203 is blocked but all other tasks proceed. This is explicitly handled as a stop condition.

4. **skills.sh OAuth (T107/T264):** Still stubbed. The skills.sh API OAuth endpoint is undocumented. T264 (npm publisher) works; skills.sh publishing will remain stubbed until docs are available.

5. **Phase 4 execution:** Activates after Phase 3 T280 audit passes. The Phase 4 board (T401 active) is ready but should not be started until Phase 3 T280 passes.

## Nothing Design System Rules (Enforced Throughout Phase 3 UI Tasks)

- NO green, purple, gradients, box-shadows, border-radius > 16px on cards, toast popups, skeleton loaders
- Light hero backgrounds (--bg: #F5F5F5), dark mode toggle via data-theme attribute
- Space Grotesk (body), Space Mono (labels, ALL CAPS bracket notation), Doto (display numbers)
- Bracket notation: `[ STATUS ]`, `[ X SKILLS ]`, `[ CONFIRM → ]`
- Underline-style inputs (bottom border only)
- One high-contrast element per screen (the Doto number panel)
- Segmented bars as data visualization throughout

</current_state>
