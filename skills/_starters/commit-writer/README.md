# Commit Writer Starter

A starter skill for writing Conventional Commits 1.0.0 compliant commit messages. Works with semantic-release, conventional-changelog, and any Conventional Commits tooling.

## What's included

- Full Conventional Commits 1.0.0 format specification
- Type guide (feat, fix, docs, style, refactor, perf, test, chore, ci)
- Breaking change format
- Team-customizable allowed types and scope examples
- Templates for standard and breaking-change commits

## Fill-in markers

### [FILL-IN: github-username]
Your GitHub username for the author field.

### [FILL-IN: allowed-types]
Your team's allowed commit types. If you only use a subset of the standard types, list them here. Example: `feat, fix, docs, chore` (dropping style/refactor/perf/test/ci if not used).

### [FILL-IN: scope-examples]
Scope names used in your codebase. Examples:
- For a monorepo: `auth, api, dashboard, cli, shared`
- For a microservice: `handlers, models, migrations, config`

## Source

Based on [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
