---
name: commit-writer
description: "Write Conventional Commits: type(scope): description with correct body, footer, and breaking-change format."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: development
  tags: "git, commits, conventional-commits, changelog"
---

# Conventional Commit Writer

Write git commit messages following the Conventional Commits 1.0.0 specification. These messages are machine-readable (changelog generators, semantic release tools) and human-readable (git log scanning).

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

Your team's allowed commit types: [FILL-IN: allowed-types]

Standard types and when to use each:
- `feat` — adds a new user-visible capability. Triggers a minor version bump.
- `fix` — corrects a bug. Triggers a patch version bump.
- `docs` — changes to documentation only (README, API docs, comments)
- `style` — formatting, whitespace, punctuation — no behavior change
- `refactor` — restructures code without adding features or fixing bugs
- `perf` — changes that improve performance
- `test` — adds or corrects tests, no production code change
- `chore` — build system, dependency updates, tooling — nothing users see
- `ci` — CI configuration files and scripts

## Scope

Scope is optional but recommended for large repos. Use your team's established scopes: [FILL-IN: scope-examples]

Scope goes in parentheses: `feat(auth): add OAuth2 login`

## Description

- Imperative mood: "add" not "added", "fix" not "fixed"
- Lowercase first letter
- No period at the end
- Under 72 characters
- Complete the sentence: "If applied, this commit will [your description]"

## Body

Wrap at 72 characters. Explain WHY, not WHAT (the diff already shows WHAT). Leave a blank line between the subject and body.

## Footer

- Breaking changes: `BREAKING CHANGE: <description of what broke and migration path>`
- Issue references: `Closes #123` or `Fixes #456`
- Co-authors: `Co-authored-by: Name <email@example.com>`

## Breaking changes

Breaking changes require `BREAKING CHANGE:` in the footer OR `!` after the type: `feat!: remove legacy API endpoint`. This triggers a major version bump.
