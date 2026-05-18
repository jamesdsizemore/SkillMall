---
name: code-review
description: "Review pull requests using Google's Engineering Practices: correctness, tests, design, readability, security."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: development
  tags: "code-review, pull-request, engineering-practices, quality"
---

# Code Review

Use this skill to conduct structured, actionable code reviews on pull requests. Based on Google's Engineering Practices, which distinguishes between what the reviewer and author are each responsible for.

## When to use

- Reviewing a PR before approving or requesting changes
- Writing your first review on an unfamiliar codebase
- Mentoring a junior engineer through review practices
- Establishing team review norms

## The review loop

**Step 1 — Understand the change before commenting.** Read the PR description, the linked issue or ticket, and the test diff before reading the implementation. Know what problem the change solves.

**Step 2 — Check correctness first.** Does the code do what the description says? Test the edge cases mentally: empty inputs, concurrent access, large inputs, error paths.

**Step 3 — Check tests.** Are there tests for the new behavior? Do they test behavior, not implementation? Would the tests catch a regression if someone reverted the fix?

**Step 4 — Check design.** Does this belong here? Could it be simpler? Are there abstractions being introduced prematurely? Does this make the codebase harder to change later?

**Step 5 — Check readability.** Can you understand this in 6 months without asking the author? Are variable and function names honest? Are comments explaining WHY, not WHAT?

## Writing comments

Use these severity levels: [FILL-IN: severity-labels]

Every comment must include:
- What is wrong or unclear
- Why it matters
- A specific suggestion for how to fix it

Example: "nit: `getUserData()` reads as if it fetches a single user but it returns an array. Rename to `getUserDataList()` to avoid surprising callers."

Avoid: "this is wrong", "I don't like this", "refactor this".

## Your team's review criteria

Beyond universal correctness and readability checks, apply these team-specific standards: [FILL-IN: team-review-criteria]

## Handling pushback

If the author disagrees, ask clarifying questions before re-asserting. If the disagreement is about taste, not correctness, it is usually better to defer to the author — the reviewer's job is to raise the issue, not to win.

## The author's obligations

Reviewers should approve a CL once it improves the overall code health of the codebase, even if it is not perfect. Authors should respond to every comment (with a fix or a reason why they disagree).
