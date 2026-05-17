# development-workflow

Enforces a specific 16-step development loop for every implementation task. Steps 6 (TypeScript check), 7 (lint), 8 (build), 9 (first code review), and 11 (second code review) are never skipped.

## When to use

Use this skill for every implementation task — feature, bug fix, or refactor. Invoke before writing any code.

## What it covers

- Pre-implementation: reading the spec, mapping dependencies, establishing type contracts
- Implementation: writing tests first, TypeScript, lint, build
- Review: two mandatory code review passes with fixes between
- Verification: smoke test, security check, documentation update
- Delivery: proper git commit with specific file staging

## What it does not cover

This skill enforces process. The spec, plan, or task definition tells you what to build.

## The 16 steps at a glance

1. Read the spec completely
2. Map dependencies (parallel vs serial)
3. Establish TypeScript contracts first
4. Dispatch parallel subagents with bounded scope
5. Write tests before or alongside implementation
6. `npx tsc --noEmit` — NEVER SKIP
7. `npm run lint` — NEVER SKIP
8. `npm run build` — NEVER SKIP
9. First code review — NEVER SKIP
10. Fix every issue from Step 9
11. Second code review — NEVER SKIP
12. Smoke test in browser or terminal
13. Security check (mandatory for file I/O, LLM calls, user input, API keys)
14. Update documentation
15. Final review against acceptance criteria
16. `git commit && git push` with specific file staging
