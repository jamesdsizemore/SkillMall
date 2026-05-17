# OpenAI Codex

> OpenAI's coding agent, available via CLI and API. [platform.openai.com/docs/codex](https://platform.openai.com/docs/codex)

## Quick reference

| | Value |
|--|-------|
| Project path | `.agents/skills/` |
| Global path | `~/.codex/skills/` |
| Native extensions | No |
| Install method | `cp -r skills/<category>/<slug> ~/.codex/skills/` |

## Frontmatter support

Codex follows the AgentSkills standard. It reads the standard fields and ignores fields it does not recognize.

| Field | Supported | Notes |
|-------|-----------|-------|
| `name` | Yes | Required. Used for skill discovery and invocation. |
| `description` | Yes | Required. Primary text Codex uses for skill matching. |
| `license` | Yes | Stored; not surfaced in the agent UI. |
| `compatibility` | Yes | Visible when skills are listed. |
| `metadata` | Yes | Key-value map. SkillMall catalog fields are read by the SkillMall CLI. Codex ignores unrecognized metadata keys. |
| `when_to_use` | No | Claude Code extension. Silently ignored. |
| `disable-model-invocation` | No | Claude Code extension. Silently ignored. |
| `user-invocable` | No | Claude Code extension. Silently ignored. |
| `argument-hint` | No | Claude Code extension. Silently ignored. |
| `allowed-tools` | No | Claude Code extension syntax. Silently ignored. |
| `context: fork` | No | Claude Code extension. Silently ignored. |
| Dynamic context injection (`!` commands) | No | `!` lines appear as literal text. Do not include them. |

## Creating universal skills

A skill written to the universal standard works in Codex without modification. Use only the standard fields:

```yaml
---
name: systematic-debugging
description: "Use when stuck on a bug. Methodical root cause investigation with evidence gathering."
license: MIT
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "debugging, investigation, workflow"
---
```

Do not include any Claude Code-specific fields. Codex silently ignores them, so they do not cause errors, but they create a misleading skill file that implies features Codex does not support.

For the full universal skill specification, see [universal.md](universal.md).

## Creating Codex-specific skills

Codex does not extend the AgentSkills standard with its own fields. There is no Codex-specific frontmatter. All Codex skills are universal skills.

If your skill is designed around Codex's specific capabilities (its code generation model, its API-first integration patterns, or OpenAI-specific tools), document those in the skill body and `compatibility` field as plain Markdown instructions.

Example:

```yaml
---
name: openai-api-reviewer
description: "Use when reviewing OpenAI API integration code. Checks for best practices and cost."
license: MIT
compatibility: "Intended for projects using the OpenAI Python or Node.js SDK."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: development
  tags: "openai, api, code-review"
---

# OpenAI API Reviewer

Reviews code that calls the OpenAI API for correctness, cost efficiency, and best practices.

## When to Use

- Code imports `openai` or `@openai/openai`
- User asks to review AI integration code
- User wants to reduce OpenAI API costs

## What This Produces

- Review with findings categorized by type: correctness, cost, best practice
- Recommendations for each finding

## Instructions

### Step 1 — Read the code
Read all files that import the OpenAI SDK.

### Step 2 — Check for issues
- Missing error handling on API calls
- Hardcoded API keys (flag as critical)
- Missing streaming where it would improve UX
- Unnecessary token usage (verbose prompts, large context without need)
- Missing retry logic for transient failures

### Step 3 — Report
List findings with file and line. Include a cost impact note where relevant.
```

## Invocation

Check current Codex documentation for exact invocation syntax. The AgentSkills standard defines `/skill-name` as the conventional slash-command invocation. Natural language matching against the `description` field is also supported if Codex implements standard skill discovery.

## Description budget behavior

Follows the universal best practice — keep descriptions under 150 chars. Codex implements a skill listing budget. Descriptions over 150 chars risk truncation when many skills are loaded concurrently.

## Testing skills

1. Copy the skill directory to `~/.codex/skills/` (global) or `.agents/skills/` in your project.
2. Start a Codex session.
3. Confirm the skill is discoverable — check current Codex documentation for how to list loaded skills.
4. Invoke the skill using `/skill-name` or by typing a trigger phrase from the `description`.
5. Verify the skill produces the expected output.

## Known quirks

- Codex uses `.agents/skills/` for project-level skills. This is the same path used by Cursor, Copilot, Gemini CLI, and Cline. A skill placed in `.agents/skills/` is potentially available to any agent that uses that convention.
- Codex's skill loading behavior and path resolution may evolve. Check current Codex documentation before deploying skills in production.
- If `compatibility` notes requirements that Codex cannot meet (e.g., bash scripts on a Windows environment without WSL), document that clearly so users know before deploying.
