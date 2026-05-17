# Claude Code

> The official Anthropic CLI for Claude. [claude.ai/code](https://claude.ai/code)

## Quick reference

| | Value |
|--|-------|
| Project path | `.claude/skills/` |
| Global path | `~/.claude/skills/` |
| Native extensions | Yes — the most extensive of any agent |
| Install method | `cp -r skills/<category>/<slug> ~/.claude/skills/` |

## Frontmatter support

### Standard fields

| Field | Supported | Notes |
|-------|-----------|-------|
| `name` | Yes | Required. kebab-case, max 64 chars. |
| `description` | Yes | Required. Primary trigger text. Keep under 150 chars. |
| `license` | Yes | Stored but not displayed in the UI. |
| `compatibility` | Yes | Displayed in skill detail if present. |
| `metadata` | Yes | Key-value map; SkillMall catalog fields (`version`, `author`, `category`, `tags`, `linked-skills`) live here. |

### Claude Code-specific extensions

These fields are parsed only by Claude Code. All other agents silently ignore them.

| Field | Type | Description |
|-------|------|-------------|
| `when_to_use` | string | Additional trigger context appended to `description` in the skill listing. Combined with `description`, capped at 1,536 chars total. |
| `disable-model-invocation` | bool | `true` prevents Claude from loading the skill automatically via natural language matching. Skill still available via `/skill-name`. |
| `user-invocable` | bool | `false` hides the skill from the `/` autocomplete menu. Skill acts as background knowledge only. |
| `argument-hint` | string | Hint shown in `/` autocomplete, e.g., `[issue-number]`. |
| `arguments` | map | Named positional arguments available as `$name` in the skill body. |
| `allowed-tools` | string | Space-separated list of pre-approved tools. Extended syntax: `Bash(git *)`, `Read`, `Grep`. Bypasses permission prompts for matched commands. |
| `model` | string | Override the active model for this skill's execution turn. |
| `effort` | string | Override effort level: `low`, `medium`, `high`, `xhigh`, `max`. |
| `context` | string | `fork` runs the skill in an isolated subagent context (separate conversation turn). |
| `agent` | string | Which subagent type to use when `context: fork`. |
| `hooks` | map | Lifecycle hooks scoped to this skill's execution. |
| `paths` | string[] | Glob patterns limiting when this skill auto-activates by file path. |
| `shell` | string | Shell to use when executing `!` commands in the body. |

## Dynamic context injection

Claude Code supports `!` commands in the skill body. When Claude loads a skill, any line beginning with `!` is executed as a shell command. The command's stdout is injected into the content Claude sees — the raw `!` line is replaced with the output.

This happens before Claude reads the skill, so the injected output becomes part of the skill's context, not an action Claude takes.

Example:

```markdown
## Current State

!git log --oneline -10
!git status --short
```

When Claude loads this skill, it sees the actual git log and status output, not the `!` lines. This gives Claude real, up-to-date context without requiring it to run those commands itself.

Rules for `!` commands:

- They run in the directory where Claude Code is running (typically the project root).
- They run at skill load time, not at invocation time.
- Failures (non-zero exit) produce empty output — they do not abort skill loading.
- Do not use `!` commands in universal skills. They are a Claude Code extension and will appear as literal text in other agents.

## Subagent execution

Setting `context: fork` runs the skill in an isolated subagent context. This creates a separate conversation turn with its own context window.

```yaml
context: fork
agent: researcher
```

Use subagent execution when:

- The skill's work should not pollute the main conversation context.
- The skill performs a large research or analysis task that would consume significant context.
- The skill's output should be returned as a discrete artifact to the parent context.

The `agent` field specifies which subagent type handles execution. Check current Claude Code documentation for the list of available subagent types.

## Skill listing budget

Claude Code has two relevant limits:

1. **Universal 150-char effective limit.** Descriptions over 150 chars risk truncation when many skills are loaded concurrently. This applies to all agents.

2. **Claude Code-specific 1,536-char combined cap.** The `description` and `when_to_use` fields are combined and capped at 1,536 characters total in Claude Code's skill listing. This is a hard cap — content above it is dropped.

Practical guidance:

- Keep `description` under 150 chars for universal compatibility.
- Use `when_to_use` to add trigger phrases, example phrasings, and context that benefit from more space.
- The combined 1,536-char cap is generous. In practice, 150 chars for `description` + 300–500 chars for `when_to_use` is sufficient for most skills.

## Creating Claude Code-native skills

A native skill uses Claude Code extensions to provide better trigger accuracy, tool safety, or execution isolation. Here is a full example:

```yaml
---
name: pr-reviewer
description: "Use when reviewing a pull request. Checks for bugs, style, and missing tests."
license: MIT
compatibility: "Requires git and GitHub CLI (gh). Dynamic context injection requires Claude Code."
metadata:
  version: "1.2.0"
  author: jamesdsizemore
  category: development
  tags: "code-review, pull-requests, git"
  linked-skills: "tdd-enforcer"
when_to_use: >
  Trigger phrases: "review this PR", "check my changes", "what's wrong with this diff",
  "look at my pull request". Use after a branch is ready but before merging.
allowed-tools: "Bash(gh pr *) Bash(git log *) Bash(git diff *) Read Grep"
argument-hint: "[PR number or branch name]"
disable-model-invocation: false
---

# PR Reviewer

Reviews a pull request for bugs, style issues, and missing tests.

## Current Branch State

!git log --oneline -10
!git diff --stat HEAD~1

## When to Use

- User says "review this PR" or "check my changes"
- A branch is ready for review but not yet merged
- User wants a second opinion before opening a PR

## What This Produces

- Line-by-line review with categorized findings (bug, style, missing test, suggestion)
- Summary verdict: ready / needs changes / needs discussion

## Instructions

### Step 1 — Load context

Read the diff. Use `gh pr view` if a PR number was provided. Read the files changed.

### Step 2 — Review

Check for:
- Logic errors and off-by-one bugs
- Missing error handling
- Missing or inadequate tests
- Style inconsistencies with the surrounding code
- Security issues (hardcoded secrets, injection vectors, unvalidated input)

### Step 3 — Report

Output findings grouped by severity: Bug, Missing Test, Style, Suggestion.
End with a one-sentence verdict.
```

## Creating universal skills on Claude Code

If you want a skill to work on Claude Code and other agents, use only the standard fields:

```yaml
---
name: commit-writer
description: "Use when writing a commit message. Analyzes staged diff and produces a semantic message."
license: MIT
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "git, commits, workflow"
---
```

Do not add `when_to_use`, `allowed-tools`, `!` commands, or any other Claude Code extension. The skill will work on Claude Code without them — it will simply use the standard skill listing behavior instead of the enhanced behavior.

See [universal.md](universal.md) for the full universal skill specification.

## Invocation

Users invoke skills in Claude Code two ways:

1. **Slash command:** `/skill-name` typed in the prompt. Tab-completion shows all available skills.
2. **Natural language:** Claude matches the user's message against skill `description` and `when_to_use` fields and loads the skill automatically if the match is strong enough.

To disable natural language matching for a skill: `disable-model-invocation: true`.

To hide a skill from the `/` menu (background knowledge only): `user-invocable: false`.

## Live reload behavior

Claude Code reads skills from disk at the start of each conversation turn, not at application startup. Changes to a skill file take effect on the next invocation — no restart required.

Skills placed in `~/.claude/skills/` are global and available in all projects. Skills in `.claude/skills/` (project-level) are available only in that project. Project-level skills take precedence over global skills with the same name.

## Testing skills

1. Copy the skill to `~/.claude/skills/` or `.claude/skills/`.
2. Start a new Claude Code session or begin a new conversation turn.
3. Type `/skill-name` to confirm it appears in autocomplete and invokes correctly.
4. Test the natural language trigger by typing a phrase that matches your `description`.
5. If the skill uses `!` commands, verify the injected output appears correctly by examining what Claude reports seeing at load time.

## Known quirks

- The `when_to_use` field is appended to `description` in the skill listing, not displayed separately. Write `when_to_use` content that reads coherently when concatenated with the description.
- `allowed-tools` uses an extended glob syntax specific to Claude Code (`Bash(git *)`). The standard `allowed-tools` field in the AgentSkills spec uses a simpler space-separated format. If writing a universal skill, use the simple format; Claude Code accepts both.
- Skills with `user-invocable: false` do not appear in `/` autocomplete but can still be referenced in Claude's system context as background knowledge. Use this for skills that should inform Claude's behavior passively rather than being explicitly invoked.
- Project-level skills in `.claude/skills/` override global skills in `~/.claude/skills/` with the same `name`. This is intentional for project-specific customization.
