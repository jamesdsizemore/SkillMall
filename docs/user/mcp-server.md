# SkillMall MCP Server

The SkillMall MCP server exposes the skill catalog as a Model Context Protocol server. Any MCP-compatible agent can search, browse, and read skills from within a conversation without leaving the agent context.

## Setup

Add the following to your agent's MCP configuration:

```json
{
  "mcpServers": {
    "skillmall": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

For Claude Code, this goes in your project's `.claude/settings.json` or user settings.

The SkillMall app must be running (`npm run dev`) for the MCP server to respond.

---

## Available Tools

### search_skills

Search the catalog for skills matching a query.

**Input:**
```json
{
  "query": "string",
  "category": "string (optional)"
}
```

**Example call:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_skills",
      "arguments": { "query": "strategy" }
    }
  }'
```

**Returns:** Array of up to 20 matching skills with slug, category, name, description, tags, version, and author. Does not return full SKILL.md content — use `get_skill` for that.

---

### get_skill

Get full details for a specific skill, including its SKILL.md content.

**Input:**
```json
{
  "category": "string",
  "slug": "string"
}
```

**Example call:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_skill",
      "arguments": { "category": "ai", "slug": "skill-creator" }
    }
  }'
```

**Returns:** Full skill object including `content` (the full SKILL.md text), `hasTemplates`, `hasSamples`, `hasScripts`.

---

### list_categories

List all skill categories and their skill counts.

**Input:** No parameters required.

**Example call:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_categories",
      "arguments": {}
    }
  }'
```

**Returns:** Array of `{ slug: string; skillCount: number }` for every category that has at least one skill.

---

## Protocol Details

The MCP server implements JSON-RPC 2.0. It handles two methods:

- `tools/list` — returns the list of available tools
- `tools/call` — executes a named tool with arguments

**GET /api/mcp** — returns server metadata and tool list (useful for verifying the server is running).

**POST /api/mcp** — handles all JSON-RPC method calls.

---

## In-Agent Usage

Once configured, you can ask your agent:

- "Search SkillMall for skills about code review"
- "Get the full content of the skill-creator skill"
- "What skill categories are available in SkillMall?"

The agent uses the MCP tools to fetch real data from your local catalog and can display skill content directly in the conversation.

---

## Production Deployment

For a deployed SkillMall instance, change the MCP server URL to your production domain:

```json
{
  "mcpServers": {
    "skillmall": {
      "url": "https://your-skillmall-instance.vercel.app/api/mcp"
    }
  }
}
```

Note: the MCP server reads skills from the local filesystem at runtime. In a serverless deployment, the skills are baked in at build time via Next.js static generation — the MCP server serves the same skill data as the catalog UI.

## Limitations

The MCP server reads skills from the local filesystem. Skills must be present in the `skills/` directory of the running SkillMall instance. Remote skills or skills installed only to agent skill directories are not available through the MCP server.

The `deploy_skill` tool is not yet implemented — the server exposes read-only catalog access in Phase 2. Write operations (deploying, creating, forking) require the CLI or web UI.

## Verifying the Server

Test that the server is running correctly:

```bash
# Check tool list
curl http://localhost:3000/api/mcp

# Search for a skill
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_categories","arguments":{}}}'
```

A successful response returns a JSON-RPC 2.0 result with skill data in the `content[0].text` field (JSON-encoded).

## JSON-RPC 2.0 Format

All requests are JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": { ... }
  }
}
```

Error responses use the standard JSON-RPC error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": { "code": -32601, "message": "Method not found: unknown_method" }
}
```

