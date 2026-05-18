---
name: plan-review
description: "Mandatory two-pass review of any plan document, spec, or GoalBuddy board before handoff. Catches external references, missing implementations, drift vectors, and hallucination risks."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: productivity
  tags: "planning, review, quality-control, goalbuddy, phase-plans"
---

# Plan Review

This skill exists because the Phase 3 plan was handed off with six tasks that said "see the old plan for implementation" — violating the self-contained requirement. The two-pass review process catches this before handoff.

Run this skill on every plan document, GoalBuddy board, and spec before calling it done. It is not optional. It is not a suggestion. The workflow rule is: **write → review → fix → review again → commit.**

## When to Run

- After writing any phase plan document (PHASE-N-PLAN.md)
- After creating or updating a GoalBuddy state.yaml board
- After writing any spec or implementation blueprint
- Before every git commit of a planning document
- Never: "I'll review it later" is not a valid response

---

## Pass 1 — Self-Containment Check

Read every task card in the document. For each task, verify:

**No external references.** The following phrases mean the task is not self-contained — fix before proceeding:
- "Full implementation is in [other document]"
- "See [spec section] for details"
- "As described in [plan name]"
- "Follow the approach in [file]"
- "Reference [document] for implementation"

A Worker handed this task must be able to implement it from only this document. If that's not true, embed what's missing.

**All architectural decisions are made.** For every task that involves a technology choice, algorithm, or design decision, the choice must be specified explicitly. Phrases like "use an appropriate approach" or "implement a suitable algorithm" are not acceptable. The approach must be named.

**No invented data.** Any task that requires per-agent values, external API endpoints, or undocumented thresholds must either cite a verified source or specify a user-configurable approach. Never hardcode invented numbers.

**All verify conditions are testable.** Each verify condition must be a specific command with an expected exit code or a specific observable behavior. "Works correctly" is not a verify condition. "Renders without error" requires naming the URL. "Tests pass" requires naming the test file.

**All stop_if conditions cover the obvious failure modes.** For every task that touches:
- External APIs: stop_if the endpoint is undocumented
- npm publish or destructive operations: stop_if the guard flag is missing
- Auth-gated actions: stop_if author identity is not verified
- Filesystem writes in deployed environments: stop_if read-only filesystem not handled

**All allowed_files are complete.** If the implementation requires modifying a file not listed in allowed_files, the task will fail or drift. Check every file the implementation touches.

---

## Pass 2 — Drift and Conflict Check

After fixing all Pass 1 issues, do a second complete read. This time check for:

**File conflicts.** List every file modified by more than one task. Add them to the "File Conflict Ordering" section. Any file touched by multiple tasks must have an explicit sequential order. There are no exceptions.

**Creative/hallucination tasks.** Any task that requires the agent to produce original content (templates, test suites, documentation prose) must have a content specification or a citation requirement. The agent cannot produce accurate domain content from general knowledge alone.

**Verify conditions that require external infrastructure.** If a verify condition requires a running LLM, a live API, or a real credential, it must have a fallback: either a mock-based test that passes without the external dependency, or a clear stop_if that blocks the task when the dependency is absent.

**Missing task dependencies.** Check every task that depends on another task's output actually lists that dependency. A task that reads `resources/build-metadata.json` depends on whatever task writes it — that dependency must be explicit.

**Board consistency.** For every task in the plan document, verify a corresponding task card exists in the GoalBuddy board. For every task card on the board, verify the plan has implementation specs. Mismatches between plan and board mean one of them is wrong.

**Merged/cancelled tasks.** If any task was merged into another or cancelled, the board card must be marked `blocked` with a receipt explaining why. Queued cards that should never be executed are invisible blockers.

---

## The Two-Pass Rule

You are not done until you have:

1. Completed Pass 1 and fixed every issue found
2. Completed Pass 2 and fixed every issue found
3. Run Pass 1 again on the fixed document to confirm no new issues were introduced by the fixes
4. Only then committed

**The order is: write → Pass 1 → fix → Pass 2 → fix → Pass 1 again → commit.**

Skipping any step is not permitted. "I reviewed it mentally" is not a review. The review must be documented — either the issues found and fixed are listed in the commit message, or this skill was not applied.

---

## What Was Missed Without This Skill

From the SkillMall Phase 3 plan rewrite:

**Pass 1 would have caught (first write):**
- T202–T207: six tasks said "see the original PHASE-3-PLAN.md" — zero implementation specs
- T261: `selectedFrameworks: []` was permanently empty — framework override would never show original framework
- T262: specified writing a `.diff` file but `PromptAudit` has no diff field — unimplementable as written

**Pass 2 would have caught (first write):**
- File conflict ordering said `T263 → T266` but T263 was merged into T261
- T255 and T268 both modified `.github/workflows/validate-skills.yml` — not in the conflict ordering table
- T263 on the board was `queued` but the plan said it was merged — invisible blocker

These issues required a second complete rewrite of a 74KB document. The two-pass review process prevents this.
