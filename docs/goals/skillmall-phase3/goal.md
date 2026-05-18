# SkillMall Phase 3 — Advanced Capabilities

## What we're building

Four advanced capabilities on top of Phase 2:

1. **Skill Chain Builder** — visual React Flow canvas to compose multi-skill workflows; output is a deployable wrapper skill in `skills/chains/<name>/`
2. **RAG-Enhanced Skills** — `npx skill-mall attach-knowledge <slug> <dir>` embeds documents in SQLite-VSS; retrieval runs at invocation time via `POST /api/retrieve`
3. **Skill Self-Improvement Loop** — structured feedback collection (1-5 stars + 200-char text) triggers LLM-generated improvement suggestions after 10+ submissions; author approval gate before any file is changed
4. **Skill Marketplace** — three tiers (free, sponsored, premium); Stripe payments; 70/20/10 revenue split; launch conditions enforced as code gates in the UI

## Gate status

- T201–T207 (chains, RAG, self-improvement, marketplace infrastructure): **start now**
- T206/T207 (marketplace UI + Stripe live payments): **code-gated** on launch conditions — the marketplace UI and checkout are hidden behind `checkMarketplaceReady()` until: catalog ≥ 200 skills, community ≥ 500 members, ratings ≥ 3 months active, ≥ 50 skills with test coverage. **We build the code now. The gate enforces itself at runtime.**

## Completion proof

- Skill Chain: create a chain from 2+ skills via `/skills/chains/new` canvas; wrapper SKILL.md validates; deployed chain executes in real agent
- RAG: `npx skill-mall attach-knowledge ai/skill-creator ./docs/` embeds chunks; `POST /api/retrieve` returns relevant chunks
- Self-improvement: 10+ feedback items trigger suggestion generation; approval gate prevents automatic writes
- Marketplace gate: `/api/marketplace/status` returns correct `ready: false` with current condition counts; when conditions are met, marketplace UI appears automatically
- All Phase 3 docs ≥ 500 words each

## Stack additions

- `reactflow` — visual chain canvas
- `sqlite-vss` — vector similarity search in SQLite (for RAG)
- `stripe` + `@stripe/stripe-js` — marketplace payments
- Phase 3 SQLite migration: `db/migrations/002_phase3.sql`

## Full implementation spec

`docs/superpowers/plans/PHASE-3-PLAN.md` — 58KB, fully self-contained. All TypeScript types, SQL schemas, React Flow component code, Stripe webhook implementation, vector storage approach, security requirements, and test cases embedded directly.
