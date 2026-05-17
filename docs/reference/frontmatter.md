# Frontmatter Reference

Every skill's `SKILL.md` starts with YAML frontmatter between `---` markers. SkillMall follows the [AgentSkills open standard](https://agentskills.io/specification) with SkillMall-specific catalog fields inside the `metadata` block.

## Standard fields (AgentSkills spec)

These fields are read by all compatible agents.

| Field | Required | Limit | Description |
|-------|----------|-------|-------------|
| `name` | Yes | 64 chars | Lowercase letters, numbers, hyphens. No leading/trailing/consecutive hyphens. Must match directory name. |
| `description` | Yes | 1024 chars | What the skill does and when to use it. Imperative: "Use when..." — put the trigger phrase first. |
| `license` | No | — | License name (e.g., `MIT`, `Apache-2.0`). |
| `compatibility` | No | 500 chars | Note environment requirements (Python version, network access, specific agent). Omit if universally compatible. |
| `metadata` | No | — | Key-value map for additional fields. SkillMall catalog fields live here. |
| `allowed-tools` | No | — | Space-separated pre-approved tools (experimental — support varies by agent). |

## SkillMall catalog fields (inside `metadata`)

These fields are read by the SkillMall catalog UI and CLI. Agents that don't recognize `metadata` keys ignore them.

| Field | Type | Description |
|-------|------|-------------|
| `metadata.version` | string | Semver version of the skill (e.g., `"1.0.0"`). |
| `metadata.author` | string | GitHub username of the primary author. |
| `metadata.category` | string | One of: `development`, `design`, `writing`, `research`, `productivity`, `infrastructure`, `ai`, `business`. |
| `metadata.tags` | string | Comma-separated lowercase tags (e.g., `"testing, tdd, workflow"`). 2–6 tags. |
| `metadata.linked-skills` | string | Comma-separated skill names that compound this skill's output. |

## Claude Code extensions

These fields are read only by Claude Code. Other agents silently ignore them.

| Field | Description |
|-------|-------------|
| `when_to_use` | Additional trigger context. Appended to `description` in Claude Code's skill listing. Combined with `description`, capped at 1,536 chars. |
| `disable-model-invocation` | `true` to prevent Claude from loading the skill automatically. |
| `user-invocable` | `false` to hide from the `/` menu (background knowledge only). |
| `argument-hint` | Hint shown in autocomplete, e.g., `[issue-number]`. |
| `arguments` | Named positional arguments for `$name` substitution. |
| `allowed-tools` | Extended tool syntax for Claude Code: `Bash(git *)`, `Read`, etc. |
| `model` | Override the active model for this skill's turn. |
| `effort` | Override effort level: `low`, `medium`, `high`, `xhigh`, `max`. |
| `context` | `fork` to run in an isolated subagent context. |
| `agent` | Which subagent type when `context: fork`. |
| `hooks` | Lifecycle hooks scoped to this skill. |
| `paths` | Glob patterns limiting when this skill auto-activates. |

## Minimal example

```yaml
---
name: commit-writer
description: "Use when writing a commit message. Summarizes staged diff and flags risky changes."
license: MIT
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "git, commits, workflow"
---
```

## Full example

```yaml
---
name: pr-reviewer
description: "Use when reviewing a pull request. Checks for bugs, style issues, and missing tests."
license: MIT
compatibility: "Requires git and GitHub CLI (gh). Works best with Claude Code."
metadata:
  version: "1.2.0"
  author: jamesdsizemore
  category: development
  tags: "code-review, pull-requests, git"
  linked-skills: "commit-writer, tdd-enforcer"

# Claude Code extensions
when_to_use: "'review this PR', 'check my changes', 'what's wrong with this code'"
allowed-tools: "Bash(gh pr *) Read Grep"
disable-model-invocation: false
argument-hint: "[PR number or branch name]"
---
```

## Character limit guidance

| Agent | Description limit | Behavior when exceeded |
|-------|------------------|------------------------|
| AgentSkills spec | 1,024 chars | Technical maximum — above this is a spec violation |
| All agents (effective) | ~150 chars | All agents implement skill listing budgets. Descriptions over ~150 chars risk silent truncation when the agent's context fills with many skills. |

**Recommendation**: Keep `description` under 150 chars and put the primary trigger phrase in the first 80 characters. This is a universal best practice — every coding agent implements some form of skill listing budget, and all are affected by descriptions that exceed it.
