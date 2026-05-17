# Qwen Code

> Alibaba Qwen AI coding agent.

## Quick reference

| | Value |
|--|-------|
| Project path | `.qwen/skills/` |
| Global path | `~/.qwen/skills/` |
| Native extensions | No — follows AgentSkills standard only |
| Install method | `cp -r skills/<category>/<slug> ~/.qwen/skills/` |

## Frontmatter support

Qwen Code follows the [AgentSkills open standard](https://agentskills.io/specification). Only standard fields are supported.

| Field | Supported | Notes |
|-------|-----------|-------|
| `name` | Yes | Required. Kebab-case, max 64 chars, must match directory name. |
| `description` | Yes | Required. Keep under 150 chars (universal best practice). |
| `license` | Yes | Optional. |
| `compatibility` | Yes | Optional. Note any special environment requirements. |
| `metadata` | Yes | Optional key-value map. SkillMall catalog fields live here. |
| `allowed-tools` | Partial | Experimental per spec. Support may vary. |
| Claude Code extensions | No | `when_to_use`, `disable-model-invocation`, `context: fork`, etc. are silently ignored. |

## Creating universal skills

Qwen Code has no native extensions beyond the standard. Skills created using the [universal format](universal.md) work without modification.

For SkillMall skills targeting Qwen Code, use only:

```yaml
---
name: skill-name
description: "Use when [trigger]. Produces [output]."
license: MIT
metadata:
  version: "1.0.0"
  author: github-username
  category: development
  tags: "tag-one, tag-two"
---

# Instructions...
```

Do not include `when_to_use`, `disable-model-invocation`, `context: fork`, or other Claude Code-specific fields. They are silently ignored but add noise to the file.

## Creating agent-specific skills

Qwen Code has no extensions beyond the AgentSkills standard. There is no agent-specific skill format.

If the user asks for a "Qwen Code-specific" skill, create a universal skill and note in `compatibility` that it targets Qwen Code:

```yaml
compatibility: "Intended for use with Qwen Code."
```

## Invocation

```
/skill-name
```

Or describe the task — Qwen Code loads the skill automatically when the description matches.

## Description budget behavior

Qwen Code follows the universal best practice. All coding agents implement skill listing budgets. Keep `description` under 150 chars to avoid silent truncation when the context fills with many skills. Put the primary trigger phrase in the first 80 characters.

## Testing skills

1. Copy the skill to the appropriate path
2. Open Qwen Code and type `/` to verify the skill appears
3. Ask a question matching the skill description to test auto-activation
4. Invoke directly with `/skill-name` to test manual activation

See [universal.md](universal.md) for the complete guide to writing compatible skills.
