# SkillMall Phase 2 — Community and Ecosystem

## What we're building

A community platform on top of Phase 1: ratings and reviews (SQLite + GitHub OAuth), skill collections and packs, forking with lineage tracking, publish to skills.sh, multi-agent deploy, an MCP server, trending analytics, a description trigger evaluator, and skill version history.

## Gate into Phase 2

Phase 1 T018 completion audit returned `full_outcome_complete: true`. ✓

Remaining prerequisite before T102 activates: GitHub OAuth app credentials (GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET) registered at github.com/settings/developers.

T101 (SQLite schema) is safe to start immediately — it has no OAuth dependency.

## Backend decision

**SQLite via better-sqlite3. No Supabase. No pgvector.**

Database: `data/skillmall.db` (gitignored)
Migrations: `db/migrations/` (SQL only, committed)
Runner: `npm run db:migrate` (node scripts/migrate.js)

## Phase ordering

```
T101 (SQLite schema)
  ├── T102 (GitHub OAuth) — blocked until credentials provisioned
  ├── T103 (Reviews backend) — requires T101 + T102
  │     └── T104 (Reviews UI) — requires T103
  ├── T105 (Collections) — requires Phase 1 only
  ├── T106 (Forking) — requires Phase 1 only
  ├── T107 (Publish to skills.sh) — requires Phase 1 + T014
  ├── T108 (Multi-agent deploy) — requires Phase 1 only
  ├── T109 (MCP server) — requires Phase 1 only
  ├── T110 (Trending dashboard) — requires T103
  ├── T111 (Trigger evaluator) — requires Phase 1 only
  └── T112 (Version history) — requires Phase 1 only

T113 (Documentation) — parallel with T103-T112
T114 (Completion audit, Judge)
```

## Completion proof

- `npm run build` passes
- `npm test` passes
- `npm run db:migrate` on fresh DB creates all 3 tables cleanly
- GitHub OAuth round-trip works: login → callback → session → cookie
- Review submission: authenticated user + install signal → review stored → appears on detail page
- Collection deploy: `npx skill-mall deploy-pack full-stack-developer-kit --agent claude-code`
- Fork: `npx skill-mall fork ai/skill-creator my-fork` creates independent copy with `forked_from` frontmatter
- MCP: `POST /api/mcp` with `search_skills` call returns matching skills
- Trending page renders with real data
- All 6 Phase 2 doc files exist and are >= 500 words each
- James explicitly approves Phase 2 at T114

## Likely misfire

Building community features before T101 (SQLite) and T102 (OAuth) are working. Starting T102 before GitHub OAuth app is registered. Building the MCP server before the deploy flow is tested.

## Non-goals

Supabase. pgvector. Phase 3 features (chains, RAG, marketplace, self-improvement).

## Full implementation spec

`docs/superpowers/plans/PHASE-2-PLAN.md` — 64KB, fully self-contained. Every TypeScript type, SQL schema, API contract, and implementation pattern embedded directly. Workers read the plan, not this file.
