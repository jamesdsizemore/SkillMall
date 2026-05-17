---
name: development-workflow
description: "Apply the 16-step development loop to any implementation task. Steps 6 (tsc), 7 (lint), 8 (build), 9 (first review), 11 (second review) are never skipped."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: productivity
  tags: "development, workflow, code-review, testing, quality, typescript"
---

# Development Workflow

This skill enforces a specific, non-negotiable 16-step loop for every implementation task. Every feature, bug fix, and refactor follows this loop. No steps are optional. No steps are skipped because the task "seems simple."

## Rule Zero

Read the spec or plan for this task completely before writing a single line of code. If you don't fully understand the implementation, re-read it. If it is genuinely underspecified, stop and surface the gap — do not invent.

## The 16 Steps

---

### Step 1 — Read the specification

Read every input: the task spec, the plan, the interface contracts, the acceptance criteria. If the spec references types or schemas, read those. If you do not understand what the implementation must do and what its interfaces look like after reading, re-read. Do not begin until you have complete clarity.

---

### Step 2 — Map dependencies

Identify which parts of this task are parallel (disjoint file scopes, no shared state) and which are serial (one must complete before the other starts). Write this down before dispatching anything. Parallel work saves time only when scopes are genuinely disjoint.

---

### Step 3 — Establish contracts first

If this task defines TypeScript types, Zod schemas, or interface contracts that other tasks or modules depend on, write and export those first. Run `npx tsc --noEmit` on just the types file before writing any implementation. Contracts published with type errors waste everyone's time.

---

### Step 4 — Dispatch parallel subagents

For each parallel unit of work: give the subagent the spec section covering their scope, the allowed files, the interface contracts, and the acceptance criteria. Nothing else. Do not give subagents open-ended access or ambiguous objectives — ambiguous objectives produce vibe-coded output.

---

### Step 5 — Write tests

Write Vitest (or Jest) tests alongside or before the implementation. Tests must cover:
- The happy path
- At least one failure case for every external call (LLM, fetch, filesystem, database)
- Boundary conditions (empty arrays, max lengths, null/undefined inputs)
- Every error class thrown by this module

A test suite that only covers the happy path is not complete. Do not proceed until tests are written.

---

### Step 6 — TypeScript check (NEVER SKIP)

```bash
npx tsc --noEmit
```

Must exit 0. Zero errors. Do not proceed to Step 7 until this passes. Fix every error. Do not use `// @ts-ignore` or `as any` to silence errors — fix the underlying type issue.

---

### Step 7 — Lint (NEVER SKIP)

```bash
npm run lint
```

Must exit 0. Fix every lint error and warning. Do not disable rules with inline comments unless the rule is categorically inapplicable to the code (and document why). Do not proceed to Step 8 until this passes.

---

### Step 8 — Build (NEVER SKIP)

```bash
npm run build
```

Must succeed. A passing TypeScript check does not guarantee a passing build. Do not proceed to Step 9 until this passes.

---

### Step 9 — First code review (NEVER SKIP)

Use the `code-reviewer` subagent or perform a thorough manual review. Review covers:
- Correctness: does the code do what the spec says?
- Error handling: are all failure cases handled?
- Security: see Step 13 criteria
- TypeScript type safety: no unnecessary `any`, proper generic constraints
- Project pattern adherence: consistent with existing codebase conventions
- Performance: no obvious algorithmic problems, no N+1 queries

Record every issue found. Do not discard findings because they seem minor.

---

### Step 10 — Fix every issue from Step 9

Fix every issue identified in Step 9. No finding is too small. Do not rationalize away a code review finding with "it probably doesn't matter." If you disagree with a finding, surface the disagreement explicitly — do not silently ignore it.

---

### Step 11 — Second code review (NEVER SKIP)

Run a second code review confirming all Step 9 issues are resolved. Verify no new issues were introduced by the fixes. If new issues are found, fix them and run a third review. The task does not advance until the second review is clean.

---

### Step 12 — Smoke test

Run `npm run dev`, open `localhost:3000`, and manually verify the implemented feature works end-to-end in the browser. For CLI tasks: run the actual command and verify the terminal output.

Tests passing does not replace this step. Tests verify code correctness. This step verifies feature correctness. They are different things.

---

### Step 13 — Security check

**Mandatory when the task involves any of the following:**
- File I/O (reading or writing files, especially user-supplied paths)
- LLM calls (prompt injection via user-supplied content)
- User-supplied input processed or rendered anywhere
- API keys, tokens, or credentials
- External HTTP requests
- Database writes

**What to check:**
- Path traversal: does any file path include unsanitized user input? (`path.join(basePath, userInput)` without validation is dangerous)
- Command injection: does any `execFile` or `exec` call include user-supplied content?
- API key exposure: are keys logged, included in error messages, or returned in API responses?
- Prompt injection: is user-supplied text embedded in LLM prompts without escaping or sandboxing?
- Unsafe deserialization: is `JSON.parse` called on user-supplied strings without try/catch and validation?

If a security issue is found that cannot be fixed within this task's allowed_files scope, stop and report before proceeding.

---

### Step 14 — Update documentation

Update any documentation that describes the interface, behavior, or configuration this task changed:
- JSDoc on any public function whose signature or behavior changed
- API reference docs if an API route changed
- User guides if visible behavior changed
- CONTRIBUTING.md if contribution patterns changed

Never leave documentation inconsistent with the implementation. An inconsistent doc is worse than no doc.

---

### Step 15 — Final review

Check the task's acceptance criteria one by one. Confirm each is met. If any criterion is not met, return to the relevant step and fix it. Do not claim completion until every criterion passes.

---

### Step 16 — Commit and push

```bash
git add <specific files by name — never git add -A or git add .>
git commit -m "$(cat <<'EOF'
<type>: <what changed and why — one line>
EOF
)"
git push
```

**Commit type conventions:**
- `feat`: new feature or capability
- `fix`: bug fix
- `refactor`: code change with no behavior change
- `test`: tests only
- `docs`: documentation only
- `chore`: tooling, config, build changes

**Never:**
- Use `--no-verify` to bypass hooks
- Commit `.env`, `.env.local`, or any file containing secrets
- Use `git add -A` or `git add .` (accidentally includes sensitive files or build artifacts)
- Commit commented-out code
- Commit with a message like "fix" or "wip" or "updates"

A task is complete when Step 16 is done. "It works locally" is not complete.

---

## Stop Conditions

Stop the task and surface the issue when any of the following occur:
- Step 6 (tsc) fails after two rounds of fixes — the type issue requires architectural clarification
- Step 8 (build) fails after two rounds of fixes — the build issue may be a dependency or config problem outside this task's scope
- Step 13 finds a security issue that requires changes outside this task's allowed_files — stop, report the issue and which files would need to change
- Step 12 (smoke test) reveals behavior that contradicts the spec — the spec may be wrong or the implementation misread it; stop and clarify before continuing

---

## What This Skill Does Not Cover

This skill enforces HOW to build. The spec, plan, or task definition tells you WHAT to build. Read those first.
