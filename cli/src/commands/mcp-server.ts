import http from 'node:http'
import { requireRepoRoot, pc } from '../utils.js'
import { getAllSkills, getSkill, getSkillsByCategory, searchSkills } from '@/lib/skills.js'

const DEFAULT_PORT = 3001

const TOOLS = [
  {
    name: 'search_skills',
    description: 'Search the SkillMall catalog for skills matching a query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_skill',
    description: 'Get full details for a specific skill',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        slug: { type: 'string' },
      },
      required: ['category', 'slug'],
    },
  },
  {
    name: 'list_categories',
    description: 'List all skill categories with their skill counts',
    inputSchema: { type: 'object', properties: {} },
  },
]

function handleTool(
  name: string,
  params: Record<string, unknown>,
  repoRoot: string
): unknown {
  if (name === 'search_skills') {
    const query = String(params.query ?? '')
    const category = params.category ? String(params.category) : undefined
    return searchSkills(query, { repoRoot, category, limit: 20 })
      .map(s => ({
        slug: s.slug,
        category: s.category,
        name: s.name,
        description: s.description,
        tags: s.tags,
      }))
  }

  if (name === 'get_skill') {
    const skill = getSkill(String(params.category), String(params.slug), { repoRoot })
    if (!skill) return { error: `Skill not found: ${params.category}/${params.slug}` }
    return skill
  }

  if (name === 'list_categories') {
    return getSkillsByCategory({ repoRoot }).map((category) => ({
      slug: category.slug,
      skillCount: category.skills.length,
    }))
  }

  return { error: `Unknown tool: ${name}` }
}

export function mcpServerCommand(args: string[]): void {
  let port = DEFAULT_PORT

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: skill-mall mcp-server [--port <n>]

Starts a standalone MCP HTTP server on port ${DEFAULT_PORT} (default).
Serves the SkillMall skill catalog without requiring Next.js.

Add to your MCP config:
  {
    "mcpServers": {
      "skillmall": {
        "url": "http://localhost:${DEFAULT_PORT}"
      }
    }
  }

Options:
  --port <n>   Port to listen on (default: ${DEFAULT_PORT})
  --help       Show this help
`)
      process.exit(0)
    }
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[++i], 10)
    }
  }

  const repoRoot = requireRepoRoot()
  const skillCount = getAllSkills({ repoRoot }).length

  const server = http.createServer((req, res) => {
    // Reload skills on each request so catalog stays fresh without restart
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        name: 'skillmall',
        version: '1.0.0',
        description: 'SkillMall skill catalog MCP server',
        tools: TOOLS,
      }))
      return
    }

    if (req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const rpc = JSON.parse(body) as {
            jsonrpc: string; id: string | number; method: string;
            params?: { name?: string; arguments?: Record<string, unknown> }
          }

          if (rpc.method === 'tools/list') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: { tools: TOOLS } }))
            return
          }

          if (rpc.method === 'tools/call') {
            const { name, arguments: toolArgs } = rpc.params ?? {}
            const result = handleTool(name ?? '', toolArgs ?? {}, repoRoot)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              jsonrpc: '2.0', id: rpc.id,
              result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
            }))
            return
          }

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            jsonrpc: '2.0', id: rpc.id,
            error: { code: -32601, message: `Method not found: ${rpc.method}` },
          }))
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }))
        }
      })
      return
    }

    res.writeHead(405)
    res.end()
  })

  server.listen(port, () => {
    console.log()
    console.log(pc.bold('  SkillMall MCP Server'))
    console.log(pc.dim(`  Listening on http://localhost:${port}`))
    console.log()
    console.log(`  Add to your MCP config:`)
    console.log(`  ${pc.cyan(`{ "mcpServers": { "skillmall": { "url": "http://localhost:${port}" } } }`)}`)
    console.log()
    console.log(pc.dim(`  ${skillCount} skills loaded from ${repoRoot}`))
    console.log(pc.dim('  Press Ctrl+C to stop.'))
    console.log()
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      process.stderr.write(pc.red(`Port ${port} is already in use. Try --port ${port + 1}\n`))
    } else {
      process.stderr.write(pc.red(`Server error: ${err.message}\n`))
    }
    process.exit(1)
  })
}
