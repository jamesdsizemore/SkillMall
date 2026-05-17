# Continue

> Open-source AI code assistant for VS Code and JetBrains. [continue.dev](https://continue.dev)

## Quick reference

| | Value |
|--|-------|
| Project path | `.continue/skills/` |
| Global path | `~/.continue/skills/` |
| Native extensions | No |
| Install method | `cp -r skills/<category>/<slug> ~/.continue/skills/` |

## Frontmatter support

Continue follows the AgentSkills standard. It reads the standard fields and ignores fields it does not recognize.

| Field | Supported | Notes |
|-------|-----------|-------|
| `name` | Yes | Required. Used for skill discovery and invocation. |
| `description` | Yes | Required. Primary text Continue uses for skill matching. |
| `license` | Yes | Stored; not displayed in the Continue UI. |
| `compatibility` | Yes | May be visible when skills are browsed. |
| `metadata` | Yes | Key-value map. SkillMall catalog fields are read by the SkillMall CLI. Continue ignores unrecognized metadata keys. |
| `when_to_use` | No | Claude Code extension. Silently ignored. |
| `disable-model-invocation` | No | Claude Code extension. Silently ignored. |
| `user-invocable` | No | Claude Code extension. Silently ignored. |
| `argument-hint` | No | Claude Code extension. Silently ignored. |
| `allowed-tools` | No | Claude Code extension syntax. Silently ignored. |
| `context: fork` | No | Claude Code extension. Silently ignored. |
| Dynamic context injection (`!` commands) | No | `!` lines appear as literal text. Do not include them. |

## Path distinction

Continue uses a **different project path** than most other agents. Where Cursor, Codex, Copilot, and Gemini CLI all use `.agents/skills/`, Continue uses `.continue/skills/`.

This means:

- A skill in `.agents/skills/` is **not** automatically available to Continue.
- A skill in `.continue/skills/` is **not** automatically available to other agents using `.agents/skills/`.
- If you want a skill available to both Continue and other agents in the same project, you must deploy it to both paths.

The global path (`~/.continue/skills/`) is separate from all other agents.

## Creating universal skills

A skill written to the universal standard works in Continue without modification:

```yaml
---
name: refactor-guide
description: "Use when refactoring code. Produces a structured plan before touching any file."
license: MIT
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "refactoring, planning, workflow"
---
```

Do not include Claude Code-specific fields. Continue silently ignores them, but they create a misleading skill file.

For the full universal skill specification, see [universal.md](universal.md).

## Creating Continue-specific skills

Continue does not extend the AgentSkills standard with its own frontmatter fields. All Continue skills are universal skills.

Continue supports model configuration via `config.json` (or `config.yaml` in newer versions) and context providers via `@` references in the chat. If your skill is designed around Continue's context provider system, document those instructions in the skill body.

Example of a skill that references Continue's context provider conventions:

```yaml
---
name: context-review
description: "Use when reviewing code in context. Reads the current file and recent edits."
license: MIT
compatibility: "Instructions reference Continue's @file context provider. Works in any agent — the @file reference is illustrative."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "code-review, context, editor"
---

# Context Review

Reviews the current file with awareness of recent edits.

## When to Use

- User wants feedback on what they are currently writing
- User says "review this" or "what do you think about this file"

## Instructions

### Step 1 — Load context

Read the file the user is working on. In Continue, you can reference it with `@filename`.

### Step 2 — Review

Check for:
- Logic errors relative to the file's purpose
- Missing error handling
- Functions or variables that could be simplified

### Step 3 — Report

Output findings with line numbers. Keep the list focused — 3–5 items unless there are critical issues.
```

## Invocation

In Continue's chat panel (VS Code or JetBrains), invoke skills using `/skill-name`. Tab-completion shows available skills.

Natural language matching against `description` is also performed — Continue may load relevant skills automatically based on the conversation.

Check current Continue documentation for the exact invocation syntax and any differences between the VS Code and JetBrains integrations.

## Description budget behavior

Follows the universal best practice — keep descriptions under 150 chars. Continue implements a skill listing budget. Descriptions over 150 chars risk truncation when many skills are loaded in a session.

## Testing skills

1. Copy the skill directory to `~/.continue/skills/` (global) or `.continue/skills/` in your project.
2. Open the Continue chat panel in your editor.
3. Type `/` to confirm the skill appears in autocomplete.
4. Type `/skill-name` to invoke and verify output.
5. Test natural language invocation using a phrase from the `description`.
6. Restart the Continue extension if skills do not appear after deployment — Continue may cache its skill index.

## Known quirks

- Continue uses `.continue/skills/` (not `.agents/skills/`) for project-level skills. This is intentionally different from the other agents listed in this catalog. Deploy to both paths if you need multi-agent availability in the same project.
- Continue is open-source and actively developed. Path behavior, invocation syntax, and skill support features may change. Check [continue.dev](https://continue.dev) for the current documentation.
- Continue supports multiple model backends (OpenAI, Anthropic, local models via Ollama, etc.). Skill body instructions should be written to work with any capable language model, not assume Claude-specific behavior.
- The Continue extension may require a restart or reload after adding new skills to the skills directory.
