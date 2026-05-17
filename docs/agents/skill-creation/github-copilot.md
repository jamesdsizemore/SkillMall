# GitHub Copilot

> GitHub's AI pair programmer, available in VS Code, JetBrains, and other editors via Copilot Chat. [github.com/features/copilot](https://github.com/features/copilot)

## Quick reference

| | Value |
|--|-------|
| Project path | `.agents/skills/` |
| Global path | `~/.copilot/skills/` |
| Native extensions | No |
| Install method | `cp -r skills/<category>/<slug> ~/.copilot/skills/` |

## Frontmatter support

GitHub Copilot follows the AgentSkills standard. It reads the standard fields and ignores fields it does not recognize.

| Field | Supported | Notes |
|-------|-----------|-------|
| `name` | Yes | Required. Used for `#` invocation and skill discovery. |
| `description` | Yes | Required. Primary text Copilot uses for skill matching. |
| `license` | Yes | Stored; not displayed in the Copilot Chat UI. |
| `compatibility` | Yes | May be visible when skills are browsed. |
| `metadata` | Yes | Key-value map. SkillMall catalog fields are read by the SkillMall CLI. Copilot ignores unrecognized metadata keys. |
| `when_to_use` | No | Claude Code extension. Silently ignored. |
| `disable-model-invocation` | No | Claude Code extension. Silently ignored. |
| `user-invocable` | No | Claude Code extension. Silently ignored. |
| `argument-hint` | No | Claude Code extension. Silently ignored. |
| `allowed-tools` | No | Claude Code extension syntax. Silently ignored. |
| `context: fork` | No | Claude Code extension. Silently ignored. |
| Dynamic context injection (`!` commands) | No | `!` lines appear as literal text. Do not include them. |
| Shell script execution in `scripts/` | Varies | Copilot may or may not execute scripts in `scripts/`. Check current Copilot documentation. |

## Creating universal skills

A skill written to the universal standard works in Copilot without modification. Use only the standard fields:

```yaml
---
name: code-review
description: "Use when reviewing code changes. Checks for bugs, style issues, and missing tests."
license: MIT
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "code-review, quality, workflow"
---
```

Do not include Claude Code-specific fields. Copilot silently ignores them, but they signal that the skill was written for a different agent and may create confusion.

For the full universal skill specification, see [universal.md](universal.md).

## Creating Copilot-specific skills

GitHub Copilot does not extend the AgentSkills standard with its own frontmatter fields. There is no Copilot-specific YAML to add. All Copilot skills are universal skills.

If your skill is designed for GitHub-specific workflows (PRs, Issues, Actions, Packages), document those requirements in the skill body and `compatibility` field.

Example:

```yaml
---
name: github-pr-writer
description: "Use when opening a GitHub pull request. Writes title, body, and label recommendations."
license: MIT
compatibility: "Requires GitHub CLI (gh) and a GitHub remote."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "github, pull-requests, workflow"
---

# GitHub PR Writer

Writes a complete GitHub pull request title, body, and label recommendations from the current branch.

## When to Use

- User is about to open a pull request
- User says "write a PR description" or "help me open a PR"
- Branch has commits that need to be described for reviewers

## What This Produces

- PR title (under 72 characters, imperative mood)
- PR body (summary, motivation, test plan)
- Label recommendations

## Instructions

### Step 1 — Gather context

Run `git log main..HEAD --oneline` to see the commits. Read the diff with `git diff main..HEAD`.

### Step 2 — Write the PR

Write a title that describes what changed, not how. Write a body with:
- A 2–3 sentence summary
- Why the change is needed
- What to test

### Step 3 — Suggest labels

Based on the nature of the change (bug fix, feature, docs, refactor), suggest appropriate GitHub labels.
```

## Invocation

In Copilot Chat (VS Code, JetBrains, or the GitHub web interface), reference skills using the `#` prefix:

```
#skill-name
```

Type `#` to see available skills in autocomplete. Natural language matching against `description` is also supported — Copilot loads relevant skills automatically based on the conversation context.

Check current Copilot documentation for the exact invocation syntax, as it may vary between editor integrations and Copilot tiers.

## Description budget behavior

Follows the universal best practice — keep descriptions under 150 chars. Copilot implements a skill listing budget. The exact limit is not publicly documented, but descriptions over 150 chars risk truncation when many skills are loaded in a Copilot Chat session.

## Testing skills

1. Copy the skill directory to `~/.copilot/skills/` (global) or `.agents/skills/` in your project.
2. Open Copilot Chat in your editor.
3. Type `#` to confirm the skill appears in autocomplete.
4. Type `#skill-name` to invoke and verify output.
5. Also test natural language invocation using a trigger phrase from the `description`.

## Known quirks

- Copilot uses `.agents/skills/` for project-level skills. This path is shared with Cursor, Codex, Gemini CLI, and Cline. A skill here is potentially available to any of those agents in the same project.
- Copilot's skill support behavior may differ between the VS Code extension, JetBrains plugin, and GitHub.com web interface. Test in your specific integration.
- Enterprise Copilot deployments may restrict which skills can be loaded or which paths are scanned. Check with your organization's Copilot configuration if skills do not appear.
- The `#` prefix invocation is distinct from VS Code's `@` extension references. Do not confuse the two.
