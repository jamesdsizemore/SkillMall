# phased-implementation-plan

Creates comprehensive, self-contained phased implementation plans for GoalBuddy. Each phase plan is 50KB+ minimum with all TypeScript types, LLM prompt templates, Zod schemas, and algorithm data embedded directly. Zero references to external documents.

## When to use

Use when planning a multi-phase software project that will be executed by autonomous agents (GoalBuddy Workers, Claude Code, Codex). Invoke before writing any code or creating any GoalBuddy boards.

## What makes a plan meet the standard

- 50KB+ per phase document (thin plans produce agent drift)
- All TypeScript interfaces embedded as actual code
- All LLM prompt templates embedded word-for-word
- All Zod schemas embedded as actual code
- All algorithm data embedded (lookup tables, scoring rubrics, thresholds)
- GoalBuddy T### task format (no sub-phase numbers like T001a or Phase 1b)
- Development workflow (16-step loop) embedded in each phase
- Documentation as first-class Worker tasks with verify conditions
- Judge tasks only at real decision points (approval gates, completion audits)

## Reference implementation

`docs/superpowers/plans/PHASE-1-PLAN.md` in this repository — 104KB, 18 tasks, all implementation details embedded.

## The 50KB rule

If a phase plan is below 50KB, it is not comprehensive enough. A Worker receiving a thin plan will make implementation decisions not specified by the author. Those decisions are the source of agent drift, vibe-coding, and hallucination. Every decision must be pre-made in the plan.
