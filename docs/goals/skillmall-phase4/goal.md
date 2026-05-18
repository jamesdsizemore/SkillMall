# SkillMall Phase 4 — Comprehensive Documentation

## What we're building

Three complete documentation suites totaling 67,000+ words across 20 new documents:

**Suite 1 — Developer Documentation:** Getting started, architecture deep dive, complete API reference, CLI reference, contributing guide, extending guide, deployment guide, FAQ, security guide. Dense, code-heavy, assumes TypeScript competence.

**Suite 2 — End-User Documentation:** Introduction, quick start tutorial, wizard tutorial, CLI tutorial, customizing skills tutorial, quality score guide, collections guide, prompt optimization guide, troubleshooting guide (25+ problem entries), glossary (40+ terms). Tutorial-based, step-by-step, assumes nothing.

**Suite 3 — Marketing Documentation:** Landing page copy (with email drip and social posts), value proposition for 4 audiences, 6 detailed use cases with before/after metrics, comparison guide, press kit.

**Infrastructure:** `/docs` section in Next.js app with navigation, syntax highlighting, and search. Existing 500-word stub docs in `docs/user/` and `docs/reference/` replaced or redirected.

## Gate into Phase 4

Phase 3 T280 (missed features audit) must pass. The codebase being documented must work. Every command in every tutorial is verified against `npm run dev` before publishing.

**Phase 4 does NOT require Phase 3 to be complete.** Developer docs and marketing docs start immediately after T280 passes. End-user docs covering Phase 3 features wait until those features are built.

## Completion proof

- All 20 new content documents exist above their word count minimums
- All existing stubs replaced or redirected (T428)
- `/docs` site renders with navigation, code highlighting, search
- T427 audit passes with every command verified on fresh clone
- Total word count >= 67,000 words
- `npm run build` succeeds

## Full plan

`docs/superpowers/plans/PHASE-4-PLAN.md` — 84KB, fully self-contained, all content specifications and word count requirements embedded.
