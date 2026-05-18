# plan-review

Mandatory two-pass review for any plan document, GoalBuddy board, or spec before handoff. Catches external references, missing implementations, file conflicts, and hallucination risks.

## Why this exists

The Phase 3 plan was handed off with six task cards that said "see the old plan for implementation" — violating the self-contained requirement. A second plan rewrite was required. This skill enforces the review process that prevents that.

## The two-pass rule

1. **Pass 1:** self-containment — no external references, all decisions made, all verify conditions testable, all stop_if conditions cover obvious failure modes
2. **Pass 2:** drift and conflict — file conflicts documented, creative tasks have content specs, board and plan are consistent, merged tasks are marked blocked

**Order: write → Pass 1 → fix → Pass 2 → fix → Pass 1 again → commit.**

There are no shortcuts.
