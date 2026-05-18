import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { requireRepoRoot, pc } from '../utils.js'

const DEFAULT_PORT = 3001

interface SkillEntry {
  slug: string
  category: string
  name: string
  description: string
  version: string
  tags: string[]
  author: string
  license: string
  content: string
  linked_skills: string[]
}

// Pure Node.js skill reader — does NOT import from lib/skills.ts to avoid
// any Next.js module dependencies in a standalone server context.
function readAllSkills(repoRoot: string): SkillEntry[] {
  const skillsDir = path.join(repoRoot, 'skills')
  if (!fs.existsSync(skillsDir)) return []

  const skills: SkillEntry[] = []

  for (const cat of fs.readdirSync(skillsDir)) {
    if (cat.startsWith('_') || cat.startsWith('.')) continue
    const catDir = path.join(skillsDir, cat)
    if (!fs.statSync(catDir).isDirectory()) continue

    for (const slug of fs.readdirSync(catDir)) {
      const skillMd = path.join(catDir, slug, 'SKILL.md')
      if (!fs.existsSync(skillMd)) continue

      try {
        const { data, content } = matter(fs.readFileSync(skillMd, 'utf-8'))
        const meta = data.metadata && typeof data.metadata === 'object' ? data.metadata as Record<string, unknown> : {}
        const tagsRaw = meta.tags ?? data.tags ?? ''
        const tags = typeof tagsRaw === 'string'
          ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
          : Array.isArray(tagsRaw) ? tagsRaw as string[] : []

        const linkedRaw = meta['linked-skills'] ?? data.linked_skills ?? ''
        const linked_skills = typeof linkedRaw === 'string'
          ? linkedRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
          : Array.isArray(linkedRaw) ? linkedRaw as string[] : []

        skills.push({
          slug,
          category: cat,
          name: String(data.name ?? slug),
          description: String(data.description ?? ''),
          version: String(meta.version ?? data.version ?? '1.0.0'),
          tags,
          author: String(meta.author ?? data.author ?? ''),
          license: String(data.license ?? ''),
          content,
          linked_skills,
        })
      } catch {
        // Skip malformed skills
      }
    }
  }

  return skills
}

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
  skills: SkillEntry[]
): unknown {
  if (name === 'search_skills') {
    const query = String(params.query ?? '').toLowerCase()
    const category = params.category ? String(params.category) : undefined
    return skills
      .filter(s => {
        const matchesCat = !category || s.category === category
        const matchesQuery =
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some(t => t.toLowerCase().includes(query))
        return matchesCat && matchesQuery
      })
      .slice(0, 20)
      .map(s => ({ slug: s.slug, category: s.category, name: s.name, description: s.description, tags: s.tags }))
  }

  if (name === 'get_skill') {
    const skill = skills.find(s => s.category === String(params.category) && s.slug === String(params.slug))
    if (!skill) return { error: `Skill not found: ${params.category}/${params.slug}` }
    return skill
  }

  if (name === 'list_categories') {
    const cats: Record<string, number> = {}
    for (const s of skills) cats[s.category] = (cats[s.category] ?? 0) + 1
    return Object.entries(cats).map(([slug, skillCount]) => ({ slug, skillCount }))
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
  let skills = readAllSkills(repoRoot)

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
            skills = readAllSkills(repoRoot) // refresh on each call
            const { name, arguments: toolArgs } = rpc.params ?? {}
            const result = handleTool(name ?? '', toolArgs ?? {}, skills)
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
    console.log(pc.dim(`  ${skills.length} skills loaded from ${repoRoot}`))
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
