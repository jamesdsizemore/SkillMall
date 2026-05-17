# Gemini CLI

> Google's command-line AI agent powered by Gemini. [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)

## Quick reference

| | Value |
|--|-------|
| Project path | `.agents/skills/` |
| Global path | `~/.gemini/skills/` |
| Native extensions | No |
| Install method | `cp -r skills/<category>/<slug> ~/.gemini/skills/` |

## Frontmatter support

Gemini CLI follows the AgentSkills standard. It reads the standard fields and ignores fields it does not recognize.

| Field | Supported | Notes |
|-------|-----------|-------|
| `name` | Yes | Required. Used for skill discovery and invocation. |
| `description` | Yes | Required. Primary text Gemini uses for skill matching. |
| `license` | Yes | Stored; not surfaced in the CLI UI. |
| `compatibility` | Yes | Visible when skills are listed. |
| `metadata` | Yes | Key-value map. SkillMall catalog fields are read by the SkillMall CLI. Gemini CLI ignores unrecognized metadata keys. |
| `when_to_use` | No | Claude Code extension. Silently ignored. |
| `disable-model-invocation` | No | Claude Code extension. Silently ignored. |
| `user-invocable` | No | Claude Code extension. Silently ignored. |
| `argument-hint` | No | Claude Code extension. Silently ignored. |
| `allowed-tools` | No | Claude Code extension syntax. Silently ignored. |
| `context: fork` | No | Claude Code extension. Silently ignored. |
| Dynamic context injection (`!` commands) | No | `!` lines appear as literal text. Do not include them. |

## GEMINI.md project context

Gemini CLI reads a `GEMINI.md` file from the project root, analogous to Claude Code's `CLAUDE.md`. This file sets project-level context and instructions that Gemini uses in every session.

If you are creating skills for a project that uses Gemini CLI, document skill availability in `GEMINI.md` the same way you would document it in `CLAUDE.md`:

```markdown
# GEMINI.md

## Available Skills

Skills are in `.agents/skills/`. Invoke them with `/skill-name`.

- `tdd-enforcer` — Use when implementing features. Enforces test-first workflow.
- `code-review` — Use when reviewing changes before committing.
```

This is optional but improves Gemini's ability to surface skills proactively.

## Creating universal skills

A skill written to the universal standard works in Gemini CLI without modification:

```yaml
---
name: security-review
description: "Use when auditing code changes for security issues. Checks for common vulnerabilities."
license: MIT
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: infrastructure
  tags: "security, audit, workflow"
---
```

Do not include Claude Code-specific fields. Gemini CLI silently ignores unknown fields, but including them creates a misleading skill file.

For the full universal skill specification, see [universal.md](universal.md).

## Creating Gemini CLI-specific skills

Gemini CLI does not extend the AgentSkills standard with its own frontmatter fields. All Gemini CLI skills are universal skills.

If your skill is designed for Google-specific workflows (Google Cloud, BigQuery, Vertex AI, Firebase), document those in the skill body and `compatibility` field.

Example:

```yaml
---
name: gcloud-audit
description: "Use when auditing Google Cloud configuration. Reviews IAM, networking, and cost settings."
license: MIT
compatibility: "Requires gcloud CLI installed and authenticated."
metadata:
  version: "1.0.0"
  author: jamesdsizemore
  category: infrastructure
  tags: "gcp, cloud, security, audit"
---

# GCloud Audit

Reviews Google Cloud project configuration for security, IAM hygiene, and cost efficiency.

## When to Use

- User wants to audit a GCP project
- User says "check my cloud config" or "review GCP setup"
- Before a production deployment to GCP

## What This Produces

- Findings grouped by: IAM, networking, cost, compliance
- Severity rating per finding: critical, high, medium, low
- Remediation commands for each finding

## Instructions

### Step 1 — Gather configuration

Run:
- `gcloud projects list`
- `gcloud iam service-accounts list`
- `gcloud compute firewall-rules list`

### Step 2 — Review

Check for:
- Overly broad IAM roles (especially `roles/owner` or `roles/editor` granted to service accounts)
- Firewall rules allowing `0.0.0.0/0` ingress on non-HTTP ports
- Unused service accounts
- Resources without labels (cost tracking)

### Step 3 — Report

Output findings with severity and remediation command. Group by category.
```

## Invocation

In Gemini CLI, invoke skills using `/skill-name` in the prompt. Gemini also performs natural language matching against the `description` field.

Check current Gemini CLI documentation for exact invocation syntax — the CLI is actively developed and behavior may change between releases.

## Description budget behavior

Follows the universal best practice — keep descriptions under 150 chars. Gemini CLI implements a skill listing budget. Descriptions over 150 chars risk truncation when many skills are loaded.

## Testing skills

1. Copy the skill directory to `~/.gemini/skills/` (global) or `.agents/skills/` in your project.
2. Start a Gemini CLI session.
3. Type `/` to confirm the skill appears in autocomplete (if Gemini CLI supports skill autocomplete — check current documentation).
4. Type `/skill-name` to invoke and verify output.
5. Test natural language invocation using a phrase from the `description`.

## Known quirks

- Gemini CLI is actively developed. Path conventions, invocation syntax, and `GEMINI.md` support may change. Always check current Gemini CLI documentation before deploying skills.
- The `.agents/skills/` project path is shared with Cursor, Codex, Copilot, and Cline. Skills placed there are potentially available to multiple agents in the same project — which is usually desirable for universal skills.
- Gemini CLI's `GEMINI.md` context file is separate from skills and is not a skill itself. Do not place skills in the root directory; they belong in `.agents/skills/` or `~/.gemini/skills/`.
