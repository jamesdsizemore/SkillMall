---
name: debugging-session
description: "Run a structured debugging session: reproduce, hypothesize, test, find root cause, fix, and prevent recurrence."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: development
  tags: "debugging, troubleshooting, root-cause-analysis, engineering"
---

# Debugging Session

Apply scientific debugging methodology to find and fix bugs systematically rather than by trial and error. Each debugging session produces a documented trail from reproduction to prevention.

## When to use

- A bug is not immediately obvious from reading the code
- A fix attempt failed or made the issue worse
- You need to explain the root cause to someone else
- The bug is intermittent or environment-specific

## The debugging loop

**Step 1 — Reproduce before anything else.** Do not change a single line of code until you have a reliable reproduction. A bug you cannot reproduce is a bug you cannot verify fixed.

**Step 2 — State what you expect vs. what you observe.** Write it down: "When I call X with Y, I expect Z, but I get W." Vague bug descriptions produce vague fixes.

**Step 3 — Form a hypothesis.** Based on the error message, stack trace, or behavior, propose the simplest possible explanation. "I think the DB connection is not being released because the finally block is missing."

**Step 4 — Test one hypothesis at a time.** Change one variable. Add one log statement. Check one assumption. If you change three things and the bug disappears, you do not know which change fixed it.

**Step 5 — Record what you tried.** If it did not work, write down what you tried and what you learned. This prevents re-testing the same dead ends.

**Step 6 — Narrow the scope.** Use binary search: which half of the code path can you eliminate? Can you reproduce in a unit test? Can you reproduce with a minimal input?

## Observability tools available in your stack

Use these to gather evidence: [FILL-IN: observability-tools]

## If you need to roll back

Emergency rollback command: [FILL-IN: rollback-command]

## Root cause vs. symptom

Fix the root cause. Document both the symptom (what the user saw) and the root cause (why it happened) in your commit message and the bug report. A fix that only addresses the symptom will recur.
