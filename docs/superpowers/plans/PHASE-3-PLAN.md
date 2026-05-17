# Phase 3 Plan — Advanced Capabilities

**Status:** Pre-planning — activates after Phase 2 completion audit passes and launch conditions are met  
**Master plan:** `docs/superpowers/plans/MASTER-PLAN.md`  
**Blueprint:** `docs/superpowers/specs/IMPLEMENTATION-BLUEPRINT.md`  
**Feature spec:** `docs/superpowers/specs/2026-05-17-skillmall-feature-expansion-design.md` (Section 7, Phase 3 features)

---

## Gate Into Phase 3

**All of the following must be true before any Phase 3 task activates:**

- Phase 2 completion audit returned `full_outcome_complete: true`
- James confirms Phase 2 is stable in production
- At least 200 skills in the catalog
- At least 500 community members (GitHub auth accounts with at least one deploy event)
- Ratings system has been operating for at least 3 months with consistent engagement
- Skill testing framework (Phase 2) has test coverage on at least 50 skills

**Do not scope, estimate, or plan any Phase 3 task in detail until these conditions are verified.** This plan contains the outcome statements and rough task breakdown only. Detailed Worker task specs (allowed_files, verify, stop_if) are written during the Phase 3 goal-prep session, informed by the actual state of Phase 2 at that time.

---

## Goal

Add advanced autonomous capabilities: skill chains, RAG-enhanced skills, self-improvement via structured feedback, and the marketplace.

## Outcome

1. Skill Chain Builder: users compose multi-skill workflows on a visual canvas; output is a wrapper skill in `skills/chains/`
2. RAG-Enhanced Skills: users attach document knowledge bases to skills via CLI; retrieval runs at invocation time
3. Skill Self-Improvement Loop: structured feedback drives LLM-generated improvement suggestions, with author approval gate before any change is applied
4. Skill Marketplace: three tiers (free, sponsored, premium); revenue split; community fund; launch conditions enforced

## Completion Proof

- Skill Chain Builder: chain skill created from at least 2 connected skills, wrapper SKILL.md valid
- RAG: `npx skill-mall attach-knowledge <slug> ./docs/` embeds documents and queries retrieve relevant chunks
- Self-Improvement: 10+ feedback items trigger suggestion generation; author approval gate works (no automatic writes)
- Marketplace: at least 1 premium skill listed and purchasable via Stripe test mode
- Phase 3 documentation deliverables complete and reviewed

## Likely Misfire

Launching the Marketplace before the catalog has critical mass. Shipping RAG before the Skill Testing Framework has adequate coverage. Building self-improvement without the feedback backend from Phase 2 in place.

## Non-Goals for Phase 3

- Prompt ELO Tester (permanently deferred — see feature spec Section 8)
- Any feature not listed in the Phase 3 section of the feature spec

---

## Development Workflow

Same 16-step loop as Phases 1 and 2. Security check is mandatory for every Phase 3 task — Phase 3 introduces Stripe payments, pgvector, and automated code execution via skill chains.

---

## Rough Task Breakdown (Detail Written During Goal-Prep)

### Skill Chain Builder

**Objective:** Visual canvas for composing multi-skill workflows. Drag-and-drop skills onto canvas, draw directed connections, configure data handoffs between skills. Output: a wrapper skill in `skills/chains/<chain-name>/` with `chain: true` frontmatter and `chain_steps` array.

**Key decisions to resolve during goal-prep:**
- Which canvas library? (React Flow is the obvious choice — confirm no license issues)
- How are chain steps validated? (Skill Testing Framework must be in place first)
- What is the execution model? (Wrapper SKILL.md uses `context: fork` per AgentSkills spec)

**Phase 3 dependency:** Skill Testing Framework from Phase 2 must be in place. Chain skills require test coverage to validate inter-skill handoffs.

---

### RAG-Enhanced Skills

**Objective:** `npx skill-mall attach-knowledge <slug> ./docs/` embeds documents using the configured provider's embedding model (or text-embedding-3-small for OpenAI), stores vectors in pgvector (Supabase), and updates SKILL.md frontmatter with `rag_enabled: true` and `knowledge_base_id`.

**Key decisions to resolve during goal-prep:**
- Embedding model per provider: OpenAI has text-embedding-3-small; what does the Claude Code CLI path use?
- pgvector table schema: confirm with Phase 2 Supabase schema before adding tables
- Chunk size and overlap: 512 tokens / 50 token overlap (confirm during goal-prep)
- Retrieval count: top-5 by default (confirm during goal-prep)

---

### Skill Self-Improvement Loop

**Objective:** After 10+ feedback submissions on a skill, the system analyzes the feedback set and generates improvement suggestions per dimension. Author reviews and approves suggestions. Approved changes applied in batch with semver bump.

**Key decisions to resolve during goal-prep:**
- Feedback storage: already in Phase 2 Supabase schema — verify it covers the fields needed
- Analysis trigger: Supabase Edge Function or scheduled job?
- LLM for analysis: user's configured provider — confirm this is appropriate for the pattern analysis task
- Approval UI: new page or modal on skill detail?

---

### Skill Marketplace

**Objective:** Three-tier marketplace (free / sponsored / premium). Stripe for premium payments. 70/20/10 revenue split (creator/operations/community fund). Launch conditions enforced as code gates — marketplace tabs hidden until conditions are met.

**Key decisions to resolve during goal-prep:**
- Stripe account setup: test mode first, live mode gated on launch condition verification
- Entitlement storage: Supabase `purchases` table — design during goal-prep
- "Free skills are never paywalled" enforcement: catalog validation must flag any attempt to change a free skill's tier
- Community fund accounting: how is the 10% tracked and disbursed?

**Phase 3 launch condition gate (code-enforced):**
```typescript
// Marketplace UI and API only activate when ALL conditions pass:
const marketplaceReady =
  catalogSkillCount >= 200 &&
  communityMemberCount >= 500 &&
  ratingsSystemAgeMonths >= 3 &&
  skillsWithTestCoverage >= 50
```

---

## Documentation Deliverables

Written during Phase 3 execution, not before:

- `docs/user/skill-chains.md` — chain builder walkthrough
- `docs/user/rag-enhanced-skills.md` — knowledge attachment guide
- `docs/user/self-improvement-loop.md` — feedback and improvement guide
- `docs/user/marketplace.md` — creator and buyer guide
- `docs/reference/chain-format.md` — chain SKILL.md format spec
- `docs/reference/rag-schema.md` — knowledge base and chunk table schema

---

## GoalBuddy Setup

Phase 3 goal-prep runs AFTER Phase 2 completion audit passes and launch conditions are verified.

```bash
# /goal-prep
# Slug: skillmall-phase3
# Input shape: existing_plan (this file)
# This file: docs/superpowers/plans/PHASE-3-PLAN.md
# Gate: verify launch conditions before creating board
```

Task types will be determined during goal-prep. Expect:
- Scout tasks: verify Phase 2 state before each Phase 3 feature activates
- Judge tasks: phase gates and completion audit
- Worker tasks: implementation (detailed during goal-prep)
