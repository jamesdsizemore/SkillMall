# Multi-Agent Deploy

Deploy a skill to multiple agents in one command. SkillMall detects which agents are installed by checking for their skills directories on the filesystem.

## Supported Agents

| Agent ID | Name | Detected at |
|---|---|---|
| `claude-code` | Claude Code | `~/.claude/skills` |
| `cursor` | Cursor | `~/.cursor/skills` |
| `codex` | Codex | `~/.codex/skills` |
| `gemini-cli` | Gemini CLI | `~/.gemini/skills` |
| `copilot` | GitHub Copilot | `~/.copilot/skills` |
| `continue` | Continue | `~/.continue/skills` |
| `agents` | AgentSkills (universal) | `~/.agents/skills` |

Detection is filesystem-only — an agent is reported as detected only if its skills directory exists and is readable. No running process check is performed.

## Commands

### Deploy to all detected agents

```bash
npx skill-mall deploy <category/slug> --all-agents
```

**Example:**
```bash
npx skill-mall deploy business/blue-ocean-strategy --all-agents
```

**Output:**
```
Deploying blue-ocean-strategy...

  Claude Code          deployed ✓
  Cursor               deployed ✓
  Codex                not detected — skipped
  Gemini CLI           not detected — skipped
  GitHub Copilot       not detected — skipped
  Continue             not detected — skipped
  AgentSkills (universal) deployed ✓

Deployed to 3 of 7 detected agent(s).
```

### Deploy to specific agents

```bash
npx skill-mall deploy <category/slug> --agents claude-code,cursor
```

Only the listed agents receive the skill. Agents not in the list are skipped regardless of detection.

### Single-agent deploy (original behavior)

```bash
npx skill-mall deploy <category/slug>
# Deploys to Claude Code only (default)
```

## Install Event Logging

Every successful multi-agent deployment logs an install event per agent to the SQLite database. These events power the trending analytics at `/trending` and the contributor dashboard at `/dashboard`.

```
skill: blue-ocean-strategy
agent: claude-code   → install event logged
agent: cursor        → install event logged
```

No user identity is stored in install events — only the skill slug and agent type.

## Deploy Packs (Collections)

To deploy a curated collection of skills to a specific agent:

```bash
npx skill-mall deploy-pack full-stack-developer-kit --agent claude-code
```

Collections deploy all skills in the specified order. See [Collection Format](../reference/collection-format.md) for details.

## Adding More Agents

The registry is in `lib/agents/registry.ts`. Adding a new agent:

```typescript
{
  id: "new-agent",
  name: "New Agent Name",
  skillsDir: (h) => `${h}/.new-agent/skills`,
}
```

The full 54-agent registry from vercel-labs/skills can be added incrementally. The current 7 agents cover the most widely deployed installations.

## Web UI Multi-Agent Deploy

The Deploy button on the skill detail page shows a "Deploy to All Agents" option alongside the single-agent selector. The UI deploy logs install events the same way as the CLI.

## How Detection Works

Agent detection reads the filesystem at deploy time. No process check, no version check — only whether the skills directory exists:

```typescript
const detected = fs.existsSync(agent.skillsDir(os.homedir()))
```

This means:
- An agent installed but never launched still shows as detected (directory created on install)
- An agent uninstalled but whose directory remains shows as detected
- An agent installed in a custom location (custom `--skills-dir`) will not be detected

Detection is intentionally conservative — a false negative (missed agent) is safer than a false positive (deploying to the wrong directory).

## Scoped Deploy

For CLI-managed agent installations that support project-scoped skills:

```bash
# Project-scoped deploy (current directory)
npx skill-mall deploy ai/skill-creator --agent claude-code --scope project
# Deploys to .claude/skills/ in the current directory
```

Note: project-scoped deploy is not yet implemented. The current `deploy` command always deploys to the global skills directory (`~/.agent/skills`).

## Verification After Deploy

After deploying, verify the skill appears in your agent:

**Claude Code:**
```bash
ls ~/.claude/skills/skill-creator/
# Should show SKILL.md, README.md, resources/, scripts/
```

The skill is immediately available in the agent without restarting. Claude Code loads skills at session start — open a new Claude Code session to invoke the skill.

