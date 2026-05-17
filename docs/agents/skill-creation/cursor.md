# Cursor

> AI-powered code editor built on VS Code. [cursor.com](https://cursor.com)

## Quick reference

| | Value |
|--|-------|
| Project path | `.agents/skills/` |
| Global path | `~/.cursor/skills/` |
| Native extensions | No |
| Install method | `cp -r skills/<category>/<slug> ~/.cursor/skills/` |

## Frontmatter support

Cursor follows the AgentSkills standard. It reads the standard fields and ignores fields it does not recognize.

| Field | Supported | Notes |
|-------|-----------|-------|
| `name` | Yes | Required. Used for `/` invocation and skill discovery. |
| `description` | Yes | Required. Primary text Cursor uses for skill matching. |
| `license` | Yes | Stored; not displayed in the UI. |
| `compatibility` | Yes | Displayed to users when browsing skills. |
| `metadata` | Yes | Key-value map. SkillMall catalog fields (`version`, `author`, `category`, `tags`, `linked-skills`) are read by the SkillMall CLI. Cursor itself ignores unrecognized metadata keys. |
| `when_to_use` | No | Claude Code extension. Cursor silently ignores this field. |
| `disable-model-invocation` | No | Claude Code extension. Silently ignored. |
| `user-invocable` | No | Claude Code extension. Silently ignored. |
| `argument-hint` | Partial | Cursor may display this in autocomplete; check current Cursor documentation to confirm behavior. |
| `allowed-tools` | No | Claude Code extension syntax. Cursor does not use this field for tool pre-approval. |
| `context: fork` | No | Claude Code extension. Silently ignored. |
| Dynamic context injection (`!` commands) | No | `!` lines appear as literal text in Cursor. Do not include them. |

## Creating universal skills

A skill written to the universal standard works in Cursor without modification. Use only the standard fields:

```yaml
---
name: tdd-enforcer
description: "Use when implementing a feature or bugfix. Enforces write-tests-first workflow."
license: MIT
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "testing, tdd, workflow"
---
```

Do not include `when_to_use`, `allowed-tools`, `!` commands, `context`, `agent`, or any other Claude Code-specific field. Cursor silently ignores unknown fields, so including them does not cause errors — but it creates a misleading skill file that implies features Cursor does not provide.

For the full universal skill specification, see [universal.md](universal.md).

## Creating Cursor-specific skills

Cursor does not extend the AgentSkills standard with its own fields. There is no Cursor-specific frontmatter to use. All Cursor skills are universal skills.

If your skill requires behavior specific to Cursor's environment (keyboard shortcuts, editor APIs, specific file paths), document those requirements in the skill body and in the `compatibility` field — but do so as plain Markdown instructions, not as frontmatter extensions.

Example of a skill with Cursor-environment notes in the body:

```yaml
---
name: cursor-context-review
description: "Use when reviewing the current file for issues. Reads the active editor file."
license: MIT
compatibility: "Written for Cursor. Uses Cursor's @-file reference convention in instructions."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "code-review, editor"
---

# Context Review

Reviews the current file for bugs, style issues, and missing error handling.

## When to Use

- User wants a review of the currently open file
- User says "review this file" or "check what I have here"

## Instructions

### Step 1 — Load the file

Read the active file. In Cursor, the user can reference it with `@filename`.

### Step 2 — Review

Check for logic errors, missing error handling, and style inconsistencies.

### Step 3 — Report

List findings with line numbers. Group by severity.
```

## Invocation

Users invoke skills in Cursor Agent by typing `/` followed by the skill name in the Cursor Agent chat panel. Tab-completion shows available skills.

Cursor also matches skills by natural language against the `description` field, similar to Claude Code's natural language matching. The exact behavior depends on the Cursor version — check current Cursor documentation to confirm.

## Description budget behavior

Follows the universal best practice — keep descriptions under 150 chars. Cursor does not document a specific character limit, but it implements a skill listing budget like all agents. Descriptions over 150 chars risk truncation when many skills are loaded.

## Testing skills

1. Copy the skill directory to `~/.cursor/skills/` (global) or `.agents/skills/` in your project.
2. Open Cursor Agent chat.
3. Type `/` to confirm the skill appears in autocomplete.
4. Type the skill's trigger phrase to verify natural language matching works.
5. Invoke the skill and verify it produces the expected output.

## Known quirks

- Cursor uses `.agents/skills/` for project-level skills, not `.cursor/skills/`. This is the same path used by several other agents (Codex, Copilot, Gemini CLI). A skill placed in `.agents/skills/` is available to all agents that use that path convention.
- If a skill file is malformed YAML, Cursor may silently skip it without an error message. Validate your YAML before deploying.
- Check current Cursor documentation for updates to skill path behavior — Cursor updates frequently and these details can change between releases.
