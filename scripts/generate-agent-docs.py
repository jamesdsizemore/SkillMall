#!/usr/bin/env python3
"""
Generates docs/agents/human/<agent>.md and docs/agents/skill-creation/<agent>.md
for every agent in AGENTS. Skips files that already exist.
"""

import os

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..")
HUMAN_DIR = os.path.join(REPO_ROOT, "docs/agents/human")
SKILL_DIR = os.path.join(REPO_ROOT, "docs/agents/skill-creation")

os.makedirs(HUMAN_DIR, exist_ok=True)
os.makedirs(SKILL_DIR, exist_ok=True)

# (key, display_name, project_path, global_path, description, native_extensions, quirks)
AGENTS = [
    ("adal",          "AdaL",               ".adal/skills",              "~/.adal/skills",                      "AI development assistant.", None, None),
    ("aider-desk",    "AiderDesk",          ".aider-desk/skills",        "~/.aider-desk/skills",                "Desktop interface for the Aider AI coding assistant.", None, None),
    ("amp",           "Amp",                ".agents/skills",            "~/.config/agents/skills",             "AI coding agent by Sourcegraph.", None, "Uses the XDG config home for global skills: `~/.config/agents/skills`."),
    ("antigravity",   "Antigravity",        ".agents/skills",            "~/.gemini/antigravity/skills",        "AI agent in the Gemini ecosystem.", None, "Global path is nested inside the Gemini home directory: `~/.gemini/antigravity/skills`."),
    ("augment",       "Augment",            ".augment/skills",           "~/.augment/skills",                   "AI coding assistant with codebase understanding. [augmentcode.com](https://augmentcode.com)", None, None),
    ("bob",           "IBM Bob",            ".bob/skills",               "~/.bob/skills",                       "IBM's AI coding assistant.", None, None),
    ("cline",         "Cline",              ".agents/skills",            "~/.agents/skills",                    "Autonomous AI coding agent for VS Code. [github.com/cline/cline](https://github.com/cline/cline)", None, None),
    ("codearts-agent","CodeArts Agent",     ".codeartsdoer/skills",      "~/.codeartsdoer/skills",              "Huawei CodeArts AI coding agent.", None, "Project path uses `.codeartsdoer/skills` — note the unusual directory name."),
    ("codebuddy",     "CodeBuddy",          ".codebuddy/skills",         "~/.codebuddy/skills",                 "Tencent Cloud AI coding assistant.", None, None),
    ("codemaker",     "Codemaker",          ".codemaker/skills",         "~/.codemaker/skills",                 "AI coding assistant.", None, None),
    ("codestudio",    "Code Studio",        ".codestudio/skills",        "~/.codestudio/skills",                "AI coding studio environment.", None, None),
    ("command-code",  "Command Code",       ".commandcode/skills",       "~/.commandcode/skills",               "AI coding agent.", None, None),
    ("cortex",        "Cortex Code",        ".cortex/skills",            "~/.snowflake/cortex/skills",          "Snowflake Cortex AI coding agent.", None, "Global path is nested under Snowflake home: `~/.snowflake/cortex/skills`."),
    ("crush",         "Crush",              ".crush/skills",             "~/.config/crush/skills",              "AI coding agent.", None, "Global path uses XDG config: `~/.config/crush/skills`."),
    ("deepagents",    "Deep Agents",        ".agents/skills",            "~/.deepagents/agent/skills",          "AI agents platform.", None, "Global path uses a nested structure: `~/.deepagents/agent/skills`."),
    ("devin",         "Devin for Terminal", ".devin/skills",             "~/.config/devin/skills",              "Terminal interface for Devin AI. [cognition.ai](https://cognition.ai)", None, "Global path uses XDG config: `~/.config/devin/skills`."),
    ("dexto",         "Dexto",              ".agents/skills",            "~/.agents/skills",                    "AI coding agent.", None, None),
    ("droid",         "Droid",              ".factory/skills",           "~/.factory/skills",                   "AI coding agent.", None, "Project path uses `.factory/skills` — note the non-standard directory name."),
    ("firebender",    "Firebender",         ".agents/skills",            "~/.firebender/skills",                "AI coding agent for VS Code.", None, None),
    ("forgecode",     "ForgeCode",          ".forge/skills",             "~/.forge/skills",                     "AI coding agent.", None, None),
    ("goose",         "Goose",              ".goose/skills",             "~/.config/goose/skills",              "Open-source AI coding agent by Block. [block.github.io/goose](https://block.github.io/goose)", None, "Global path uses XDG config: `~/.config/goose/skills`."),
    ("hermes-agent",  "Hermes Agent",       ".hermes/skills",            "~/.hermes/skills",                    "AI coding agent.", None, None),
    ("iflow-cli",     "iFlow CLI",          ".iflow/skills",             "~/.iflow/skills",                     "AI coding agent CLI.", None, None),
    ("junie",         "Junie",              ".junie/skills",             "~/.junie/skills",                     "JetBrains AI coding agent.", None, None),
    ("kilo",          "Kilo Code",          ".kilocode/skills",          "~/.kilocode/skills",                  "AI coding agent.", None, None),
    ("kimi-cli",      "Kimi Code CLI",      ".agents/skills",            "~/.config/agents/skills",             "Moonshot AI coding CLI.", None, "Uses the shared `~/.config/agents/skills` global path."),
    ("kiro-cli",      "Kiro CLI",           ".kiro/skills",              "~/.kiro/skills",                      "Amazon Kiro AI coding agent.", None, None),
    ("kode",          "Kode",               ".kode/skills",              "~/.kode/skills",                      "AI coding agent.", None, None),
    ("mcpjam",        "MCPJam",             ".mcpjam/skills",            "~/.mcpjam/skills",                    "MCP-first AI coding environment.", None, None),
    ("mistral-vibe",  "Mistral Vibe",       ".vibe/skills",              "~/.vibe/skills",                      "Mistral AI coding agent.", None, None),
    ("mux",           "Mux",                ".mux/skills",               "~/.mux/skills",                       "AI coding agent.", None, None),
    ("neovate",       "Neovate",            ".neovate/skills",           "~/.neovate/skills",                   "AI coding agent.", None, None),
    ("openclaw",      "OpenClaw",           "skills",                    "~/.openclaw/skills",                  "AI coding agent with OpenClaw compatibility layer.", None, "Project path is `skills/` at the repo root — not a dotfile directory. Also responds to `~/.clawdbot` and `~/.moltbot`."),
    ("opencode",      "OpenCode",           ".agents/skills",            "~/.config/opencode/skills",           "Open-source terminal AI coding agent. [opencode.ai](https://opencode.ai)", None, "Global path uses XDG config: `~/.config/opencode/skills`."),
    ("openhands",     "OpenHands",          ".openhands/skills",         "~/.openhands/skills",                 "Formerly OpenDevin. Open-source autonomous AI agent. [github.com/All-Hands-AI/OpenHands](https://github.com/All-Hands-AI/OpenHands)", None, None),
    ("pi",            "Pi",                 ".pi/skills",                "~/.pi/agent/skills",                  "AI coding agent.", None, "Global path uses a nested structure: `~/.pi/agent/skills`."),
    ("pochi",         "Pochi",              ".pochi/skills",             "~/.pochi/skills",                     "AI coding agent.", None, None),
    ("qoder",         "Qoder",              ".qoder/skills",             "~/.qoder/skills",                     "AI coding agent.", None, None),
    ("qwen-code",     "Qwen Code",          ".qwen/skills",              "~/.qwen/skills",                      "Alibaba Qwen AI coding agent.", None, None),
    ("replit",        "Replit",             ".agents/skills",            "~/.config/agents/skills",             "Replit AI coding agent.", None, "Uses the shared `~/.config/agents/skills` global path."),
    ("roo",           "Roo Code",           ".roo/skills",               "~/.roo/skills",                       "AI coding agent for VS Code.", None, None),
    ("rovodev",       "Rovo Dev",           ".rovodev/skills",           "~/.rovodev/skills",                   "Atlassian Rovo Dev AI coding agent.", None, None),
    ("tabnine-cli",   "Tabnine CLI",        ".tabnine/agent/skills",     "~/.tabnine/agent/skills",             "Tabnine AI coding CLI. [tabnine.com](https://tabnine.com)", None, "Both project and global paths use a nested `agent/skills` structure."),
    ("trae",          "Trae",               ".trae/skills",              "~/.trae/skills",                      "ByteDance AI coding agent.", None, None),
    ("trae-cn",       "Trae CN",            ".trae/skills",              "~/.trae-cn/skills",                   "ByteDance AI coding agent (China region). Project path is shared with `trae`; global path differs.", None, "Project path `.trae/skills` is shared with the `trae` agent. Global path is `~/.trae-cn/skills`."),
    ("warp",          "Warp",               ".agents/skills",            "~/.agents/skills",                    "AI-powered terminal. [warp.dev](https://warp.dev)", None, None),
    ("windsurf",      "Windsurf",           ".windsurf/skills",          "~/.codeium/windsurf/skills",          "Codeium's AI-powered IDE. [codeium.com/windsurf](https://codeium.com/windsurf)", None, "Global path is nested under Codeium home: `~/.codeium/windsurf/skills`."),
    ("zencoder",      "Zencoder",           ".zencoder/skills",          "~/.zencoder/skills",                  "AI coding agent.", None, None),
]

HUMAN_TEMPLATE = """\
# {display} — Setup Guide

{desc_line}

## Installing skills

```bash
# Global (available in all projects)
cp -r skills/<category>/<skill-name> {global_path}/

# Project-level (this project only{commit_note})
cp -r skills/<category>/<skill-name> {project_path}/

# Via the CLI
npx skill-mall deploy <category>/<skill-name> --agent {key}
npx skill-mall deploy <category>/<skill-name> --agent {key} --scope project
```

## Skill discovery paths

| Scope | Path |
|-------|------|
| Global | `{global_path}/` |
| Project | `{project_path}/` |

## Invoking a skill

```
/skill-name
```

Or describe your task — {display} matches against the skill description automatically.

## Verifying a skill is loaded

Type `/` in {display} to see available skills.

## Updating a skill

Re-copy the skill directory over the existing one. Changes take effect in the next session.

## Removing a skill

```bash
rm -rf {global_path}/<skill-name>
```
{quirks_section}
For skill creation guidance, see [skill-creation/{key}.md](../skill-creation/{key}.md).
"""

SKILL_TEMPLATE = """\
# {display}

> {description}

## Quick reference

| | Value |
|--|-------|
| Project path | `{project_path}/` |
| Global path | `{global_path}/` |
| Native extensions | No — follows AgentSkills standard only |
| Install method | `cp -r skills/<category>/<slug> {global_path}/` |

## Frontmatter support

{display} follows the [AgentSkills open standard](https://agentskills.io/specification). Only standard fields are supported.

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

{display} has no native extensions beyond the standard. Skills created using the [universal format](universal.md) work without modification.

For SkillMall skills targeting {display}, use only:

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

{display} has no extensions beyond the AgentSkills standard. There is no agent-specific skill format.

If the user asks for a "{display}-specific" skill, create a universal skill and note in `compatibility` that it targets {display}:

```yaml
compatibility: "Intended for use with {display}."
```

## Invocation

```
/skill-name
```

Or describe the task — {display} loads the skill automatically when the description matches.

## Description budget behavior

{display} follows the universal best practice. All coding agents implement skill listing budgets. Keep `description` under 150 chars to avoid silent truncation when the context fills with many skills. Put the primary trigger phrase in the first 80 characters.

## Testing skills

1. Copy the skill to the appropriate path
2. Open {display} and type `/` to verify the skill appears
3. Ask a question matching the skill description to test auto-activation
4. Invoke directly with `/skill-name` to test manual activation
{quirks_section}
See [universal.md](universal.md) for the complete guide to writing compatible skills.
"""

created = 0
skipped = 0

for key, display, project_path, global_path, description, native_ext, quirks in AGENTS:
    human_path = os.path.join(HUMAN_DIR, f"{key}.md")
    skill_path = os.path.join(SKILL_DIR, f"{key}.md")

    quirks_section = ""
    if quirks:
        quirks_section = f"\n## Known quirks\n\n{quirks}\n"

    commit_note = ", commit to version control" if project_path != ".agents/skills" and not project_path.startswith("skills") else ""
    desc_line = f"> {description}" if description else ""

    # Human doc
    if not os.path.exists(human_path):
        content = HUMAN_TEMPLATE.format(
            key=key,
            display=display,
            description=description or "",
            desc_line=desc_line,
            project_path=project_path,
            global_path=global_path,
            commit_note=commit_note,
            quirks_section=quirks_section,
        )
        with open(human_path, "w") as f:
            f.write(content)
        print(f"  created  human/{key}.md")
        created += 1
    else:
        print(f"  skipped  human/{key}.md (exists)")
        skipped += 1

    # Skill-creation doc
    if not os.path.exists(skill_path):
        content = SKILL_TEMPLATE.format(
            key=key,
            display=display,
            description=description or f"{display} AI coding agent.",
            project_path=project_path,
            global_path=global_path,
            quirks_section=quirks_section,
        )
        with open(skill_path, "w") as f:
            f.write(content)
        print(f"  created  skill-creation/{key}.md")
        created += 1
    else:
        print(f"  skipped  skill-creation/{key}.md (exists)")
        skipped += 1

print(f"\nDone. {created} files created, {skipped} skipped.")
