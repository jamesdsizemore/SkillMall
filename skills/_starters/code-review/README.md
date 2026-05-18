# Code Review Starter

A starter skill for structured pull request code reviews, based on Google's Engineering Practices documentation.

## What's included

- Structured review methodology: correctness → tests → design → readability
- Comment severity framework with team-customizable labels
- Templates for review checklists and comment writing
- Google Engineering Practices citation

## Fill-in markers

### [FILL-IN: github-username]
Your GitHub username (sets the `author` field in frontmatter).

### [FILL-IN: severity-labels]
Your team's comment severity convention. Examples:
- `nit:` (nitpick, optional), `blocker:` (must fix), `suggestion:` (improvement idea)
- `P1:` (required), `P2:` (should fix), `P3:` (optional)

### [FILL-IN: team-review-criteria]
Your team's specific review standards beyond universal best practices. Examples:
- "Functions must be under 30 lines"
- "No magic numbers outside constants files"
- "All new endpoints must have integration tests"

## Source

Based on [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/).
