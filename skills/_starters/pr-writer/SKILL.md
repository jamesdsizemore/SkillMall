---
name: pr-writer
description: "Draft pull request descriptions: what changed, why, how to test, and what reviewers need to know."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: development
  tags: "pull-request, git, code-review, documentation"
---

# PR Description Writer

Draft complete, reviewable pull request descriptions that give reviewers everything they need without asking follow-up questions.

## When to use

- Drafting a PR description before opening a PR
- Improving an existing thin PR description
- Writing breaking-change or migration PRs that need extra care

## What makes a good PR description

**The WHAT tells reviewers what changed.** Summarize the change in 1-3 sentences. Link the issue or ticket. If the change is large, add a brief overview of the approach.

**The WHY tells reviewers what problem this solves.** The code diff shows what changed — the description explains why that change is the right one. "Fixes the timeout because we were not releasing the DB connection after each request" is useful. "Updates the code" is not.

**A test plan tells reviewers how to verify it works.** List specific steps: what to click, what to run, what the expected output is. For backend changes, provide a curl example. For UI changes, include a screenshot or screen recording.

## Checklist items

Apply your team's standard PR checklist: [FILL-IN: review-checklist-items]

## Breaking changes

If this PR changes a public API, CLI flag, config key, database schema, or any interface used by other teams:
1. State the breaking change clearly at the top: "BREAKING: removes the `--legacy` flag"
2. Include a migration guide in the PR body
3. Reference any deprecation notice you added
4. List downstream consumers who need to update

## PR template

Your team's PR template is at: [FILL-IN: pr-template-url]

Follow the structure exactly. Fill every section — do not delete optional sections without a reason.

## Size guidelines

- Small PRs (< 200 lines changed) are reviewed in < 30 minutes
- Large PRs (> 500 lines) often block teams — consider splitting into a feature branch with sub-PRs
- If you cannot explain the change in 3 sentences, the PR may be doing too many things
