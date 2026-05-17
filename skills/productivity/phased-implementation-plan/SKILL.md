---
name: phased-implementation-plan
description: "Create comprehensive, self-contained phased implementation plans for GoalBuddy. Each phase plan is 50KB+ minimum, embeds all TypeScript types, LLM prompts, and algorithms. Zero external references."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: productivity
  tags: "planning, goalbuddy, implementation, phased, autonomous-agents"
---

# Phased Implementation Plan

This skill creates comprehensive, GoalBuddy-ready phased implementation plans. Every decision the user has made about quality, format, and content is embedded in this skill — no interpretation required.

## Non-Negotiable Quality Standards

These are not preferences. These are the rules. Plans that violate them are not acceptable output.

**1. Minimum 50KB per phase plan document.**
Plans below 50KB are not comprehensive enough. A Worker receiving a thin plan will drift, vibe-code, or hallucinate implementations. Every decision must be made in the plan document — if a Worker has to decide something that isn't specified, the plan failed.

**2. Fully self-contained — zero references to external documents.**
Plans must not say "see Blueprint Section 3" or "reference the feature spec" or "as defined in IMPLEMENTATION-BLUEPRINT.md." The plan contains everything. A Worker executes from the plan alone. If an implementation detail lives only in an external document, copy it into the plan.

**3. Embed the actual implementation, not descriptions of it.**
Do not write "implement the provider abstraction layer." Write the TypeScript interfaces, the exact function signatures, the exact LLM prompt templates word-for-word, the exact Zod schemas, the exact algorithm data structures. The Worker's job is to make these compile and pass tests — not to invent the implementation.

**4. GoalBuddy T### task format — no sub-phase numbering.**
Tasks use T001, T002, T003 format. Never T001a, T001b, or Phase 1a, Phase 1b — GoalBuddy cannot parse these. Section headers organize tasks by dependency group (e.g., "Foundation Tasks", "UI Tasks") without numbering the sections.

**5. Development workflow embedded in every plan.**
Every plan must include the full development loop that applies to every Worker task in that plan. Do not reference it elsewhere — embed it.

**6. Documentation tasks are first-class Workers, not afterthoughts.**
Every phase plan includes a documentation Worker task. Documentation files are listed in allowed_files. Minimum word counts are specified in verify conditions. Doc tasks have the same weight and rigor as implementation tasks.

**7. Judge tasks only at real decision points.**
Judge tasks exist at: UI approval gates, phase completion audits, and risk-boundary decisions. Not after every Worker. Repeated Judge tasks that only confirm "the last thing worked" are overhead — eliminate them.

**8. Every Worker task has these four sections:**
- `objective`: one sentence, concrete, names the specific output
- `allowed_files`: complete list of every file the Worker may touch
- `verify`: specific commands that must pass, specific observable behaviors
- `stop_if`: conditions under which the Worker stops and reports rather than solves

---

## Plan Structure

Every phase plan is a single Markdown document with this structure:

```
# Phase N Plan — [Name]

## Goal
One paragraph. What the user can do when this phase is complete.

## Completion Proof
Bulleted list of specific, observable, testable conditions.
Not "system works" — specific: "npm run build exits 0", "GET /api/providers returns configured: true".

## Likely Misfire
How this phase could "complete" the wrong thing. What to avoid.

## Non-Goals
Explicit list of things that must not appear in this phase.

## Development Workflow
The full 16-step loop, embedded here, applied to every Worker task in this phase.

## All Shared TypeScript Types
Every interface and type used by multiple tasks in this phase.
Full TypeScript code — not descriptions.

## All Zod Schemas
Every schema used for LLM output validation.
Full zod code.

## All LLM Prompt Templates
Every prompt template used by any task in this phase.
Full text with {{variable}} placeholders marked.

## All Algorithm Data
Framework lookup tables, scoring rubrics, config values.
Full data structures — not descriptions.

## [Dependency Group Name] Tasks

### T001 — [Task Name]
**Type:** Worker | Judge | Scout
**Depends on:** nothing | T00X, T00Y
**Objective:** One sentence naming the specific output.
**Implementation:** Full implementation details. No "as described in." Embed the actual code, prompts, algorithms.
**Allowed files:** Complete list.
**Test cases:** Specific test cases that must pass.
**Verify:** Specific commands and observable behaviors.
**Stop if:** Conditions that stop the Worker.
```

---

## Before Writing: Gather These Inputs

Before writing a phase plan, confirm you have answers to:

1. **Tech stack**: languages, frameworks, libraries — be specific about versions
2. **LLM backend**: which provider(s), which model(s), how authentication works
3. **Deployment target**: local only, Vercel, AWS, etc. — affects API route patterns
4. **State management approach**: React Context, Zustand, URL state, server state
5. **Testing framework**: Vitest, Jest, Playwright — affects test case syntax
6. **Development workflow**: the 16-step loop or a variant — embed the exact steps
7. **Phase gate conditions**: what blocks the next phase from starting
8. **Documentation requirements**: what docs must exist before this phase is done

If any of these are missing, ask before writing. A plan written with wrong assumptions wastes more time than the time spent asking.

---

## Writing the Implementation Section

This is the most important section of every Worker task. It is where plan quality is won or lost.

**Do:**
- Write the TypeScript function signature with all parameters typed
- Write the TypeScript interface definitions
- Write the exact LLM prompt text (system prompt and user prompt separately)
- Write the exact Zod schema
- Write the algorithm with the specific data it operates on (lookup tables, scoring rubrics, thresholds)
- Write the edge cases: what happens when the LLM returns invalid JSON, what happens when all URLs fail to fetch
- Write the error classes that are thrown and their message format

**Do not:**
- Write "implement the provider abstraction" — write the TypeScript interfaces and each provider's implementation pattern
- Write "call the LLM with a research extraction prompt" — write the exact prompt
- Write "validate with Zod" — write the Zod schema
- Write "handle errors appropriately" — write the specific error handling

**Test of completeness:** Could a Worker with no context about the project — having read only this plan — implement this task correctly? If the answer is "they would need to make decisions not specified here," the Implementation section is incomplete.

---

## Writing Verify Conditions

Verify conditions are commands that produce binary pass/fail results and observable behaviors that confirm the feature works.

**Good verify conditions:**
```
- "npx tsc --noEmit" exits 0
- "npm test lib/__tests__/research-engine" all pass
- "grep -n 'import.*anthropic' lib/providers/claude-code.ts gives 0 matches"
- "Step 1: zero URL inputs visible on load at localhost:3000 (smoke test)"
- "POST /api/research with SKILL_MALL_PROVIDER unset -> 503 response (test)"
```

**Bad verify conditions:**
```
- "Works correctly"
- "Tests pass"
- "Implementation is complete"
- "The feature behaves as expected"
```

Every verify condition specifies either a shell command with its expected exit code, a test file with "all pass," or a smoke test observation with the exact URL and element to check.

---

## Writing Stop Conditions

Stop conditions tell the Worker when to stop working and report rather than continuing to solve a problem that may be outside their scope.

**Stop conditions are for:**
- External dependency conflicts that require investigation (`openai npm package version conflicts — report version info before resolving`)
- CLI flags or API behaviors that might not match what the plan assumes (`claude --print may not be a valid flag — verify with claude --help and report the correct flag`)
- Type mismatches between tasks that indicate the shared contract is wrong (`ResearchTool type from T007 differs from plan — report mismatch before resolving`)
- Scope expansion (files needed outside allowed_files)

**Stop conditions are not for:** normal bugs. A Worker encountering a failing test fixes it within their allowed_files. Only stop when the problem requires decisions beyond the task's scope.

---

## GoalBuddy Task Type Reference

Use these task types correctly:

**Worker:** Implementation tasks. Has `allowed_files`, `verify`, `stop_if`. Writes code, docs, config. The only type that changes files.

**Judge:** Decision and audit tasks. Read-only. Used for: approval gates (UI approval before pipeline work), phase completion audits, risk-boundary reviews. Does NOT review after every Worker — only at phase boundaries or when scope is unclear.

**Scout:** Evidence gathering. Read-only. Used when: the implementation is unclear and you need to map the codebase before planning. Not needed when the plan is already comprehensive. A comprehensive plan eliminates the need for Scout tasks.

**When to use Judge vs proceeding directly:** Use a Judge task when a wrong decision would waste significant implementation work. UI approval gates are the canonical example — if the UI is rejected, all pipeline work built on top of it is wasted. Use Judge sparingly for everything else.

---

## Dependency Ordering Rules

1. **Foundation tasks run first and in parallel** when they have no dependencies on each other (T001 and T002 if they touch disjoint files)
2. **Shared type definitions must be committed before dependent Workers start** — not "started," committed
3. **UI approval gates block all downstream implementation** — make this explicit with `stop_if` conditions on pipeline tasks
4. **Documentation Workers can run in parallel with final implementation Workers** when docs depend on a stable API (not actively changing)
5. **Completion audit (T999 pattern) is always last** and never marks complete while any Worker task is queued

---

## Phase Gates

Every multi-phase plan has explicit gates between phases. Gates are Judge tasks with concrete, binary `do not approve if` conditions.

Example Phase 1 → Phase 2 gate:
```yaml
- id: T018
  type: judge
  constraints:
    - "Do not mark complete if npm run build exits nonzero"
    - "Do not mark complete if npm test exits nonzero"
    - "Do not mark complete if npx tsc --noEmit exits nonzero"
    - "Do not mark complete if T006 receipt does not show approved"
    - "Do not mark complete if any Phase 1 Worker task is queued or active"
    - "Do not mark complete if any Phase 2 feature is present in the codebase"
```

The gate is not "Phase 1 looks good." The gate is a list of specific falsifiable conditions.

---

## Applying This Skill

When a user asks for an implementation plan:

1. Gather the inputs listed in "Before Writing: Gather These Inputs"
2. Determine the phases: what must be true at the end of each phase, and what gates between them
3. Write the Shared Types section first — this establishes the contracts everything else depends on
4. Write the LLM Prompt Templates section — these are the highest-specificity, hardest-to-get-right artifacts
5. Write each task in dependency order
6. For each task: write Implementation before writing Verify — the verify conditions flow naturally from the implementation
7. Check the file size: if the plan is under 50KB, it is not comprehensive enough — find what's missing and add it
8. Review every Implementation section: "Could a Worker implement this correctly from only this plan?" If not, add what's missing.

---

## Example: What Comprehensive Looks Like

The Phase 1 plan for SkillMall is the reference implementation of this skill's output. It is at `docs/superpowers/plans/PHASE-1-PLAN.md` (104KB). It contains:

- All TypeScript interfaces (ResearchResult, ResearchTool, InMemoryFile, WizardState, PromptAudit, etc.)
- All Zod schemas (ResearchResultSchema, PromptAuditSchema, PipelineInputSchema, etc.)
- All LLM prompt templates word-for-word (research extraction, framework selection, prompt body generation, sample generation, optimizer audit)
- All algorithm data (FRAMEWORK_CANDIDATES lookup table for all 6 artifact types, DOMAIN_MODIFIER_RULES, FRAMEWORK_DESCRIPTIONS for 40+ frameworks)
- All CSS custom properties with exact hex values
- All animation keyframe implementations
- All API route contracts (request/response shapes, all error codes)
- All wizard state types and reducer action types
- All quality score rubric values (exact point values per criterion)
- Helper function implementations (toSlug, atomicWrite)
- Mock LLM client implementation for tests
- Required test cases for every module (specific scenarios, not just "tests pass")

That is what comprehensive means.
