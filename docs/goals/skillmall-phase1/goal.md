# SkillMall Phase 1

## What we're building

A working SkillMall Next.js application with:
- Nothing design UI (homepage, skill creation wizard, skill detail page)
- Research-first skill creation pipeline (Research Engine → Skill Builder → Prompt Engine)
- Prompt generation system (dynamic count, all 40+ PE frameworks, fully self-contained prompts)
- CLI updated to use the new pipeline
- Quality tooling (Skill Quality Score, Prompt Optimizer, Prompt Library, CI Validation Action)

## Phase ordering — UI ships first

The UI must be approved by James before any pipeline work begins. If the UI is wrong, nothing else gets built on top of it. T004b is the explicit UI approval gate — T005 (pipeline) does not activate until T004b passes.

## Completion proof

- `npm run build` passes
- All tests pass
- App runs at `localhost:3000` with homepage, wizard, and skill detail working
- James explicitly approves the UI at T004b
- All Phase 1 spec features implemented and verified

## Non-goals (do not implement)

- Phase 2 features (multi-agent deploy, ratings, collections, MCP server, trending, forking)
- Phase 3 features (skill chains, RAG, self-improvement, marketplace)
- Prompt ELO Tester (Future Development — permanently deferred)

## Key constraints

- Nothing design system throughout: Space Grotesk / Space Mono / Doto fonts, light mode default, blues/greys/red only, no green, no purple
- Dot-matrix animations are required, not optional: scan reveal, Doto counter tick-up, staggered segmented bar fill, character-by-character text reveal
- Prompt Engine: no hardcoded framework defaults — evaluates all 40+ frameworks per tool
- All prompts fully self-contained — zero references to external template files
- ResearchResult / ResearchTool TypeScript types established before any parallel pipeline dispatch
- Git commit + push after every phase

## Development loop (apply to every Worker task)

1. Read relevant spec section
2. Map task dependencies — identify parallel vs serial
3. Establish shared contracts (types, schemas) if needed
4. Dispatch parallel subagents with: spec section, allowed files, interface contracts, acceptance criteria
5. Write tests (alongside or before implementation)
6. `npx tsc --noEmit`
7. `npm run lint`
8. `npm run build`
9. First code review
10. Fixes
11. Second code review
12. Smoke test running app in browser
13. Security check (if touches file I/O, auth, or external APIs)
14. Update docs
15. Final review
16. `git commit && git push`

## References

- Spec: `docs/superpowers/specs/2026-05-17-skillmall-feature-expansion-design.md`
- Feature roadmap: `docs/FEATURE_ROADMAP.md`
- Nothing design skill: `github.com/dominikmartn/nothing-design-skill`
- UI direction prototype: `.superpowers/brainstorm/` (directional only — not a pixel spec)
