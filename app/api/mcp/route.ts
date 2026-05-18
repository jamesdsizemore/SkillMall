import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getAllSkills, getSkill, getSkillsByCategory } from "@/lib/skills";
import { detectAgents, deployToAgents } from "@/lib/agents/detector";

export const runtime = "nodejs"; // needs filesystem access

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

const TOOLS = [
  {
    name: "search_skills",
    description: "Search the SkillMall catalog for skills matching a query",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (skill name, tag, or category)" },
        category: { type: "string", description: "Filter by category (optional)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_skill",
    description: "Get full details for a specific skill including its content",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Skill category" },
        slug: { type: "string", description: "Skill slug" },
      },
      required: ["category", "slug"],
    },
  },
  {
    name: "list_categories",
    description: "List all skill categories with their skill counts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_prompts",
    description: "List prompt files for a skill from its resources/prompts/ directory",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Skill category" },
        slug: { type: "string", description: "Skill slug" },
      },
      required: ["category", "slug"],
    },
  },
  {
    name: "deploy_skill",
    description: "Deploy a skill to detected agents (Claude Code, Cursor, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Skill slug (category/slug format)" },
        agent: { type: "string", description: "Specific agent ID to deploy to (optional — deploys to all detected if omitted)" },
        scope: { type: "string", description: "Deployment scope: 'user' (default) or 'project' (deploys to cwd-relative .claude/skills/)" },
      },
      required: ["slug"],
    },
  },
];

function handleTool(name: string, params: Record<string, unknown>): unknown {
  if (name === "search_skills") {
    const query = String(params.query ?? "").toLowerCase();
    const category = params.category ? String(params.category) : undefined;

    return getAllSkills()
      .filter((s) => {
        const matchesCat = !category || s.category === category;
        const matchesQuery =
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some((t) => t.toLowerCase().includes(query)) ||
          s.category.toLowerCase().includes(query);
        return matchesCat && matchesQuery;
      })
      .slice(0, 20)
      .map((s) => ({
        slug: s.slug,
        category: s.category,
        name: s.name,
        description: s.description,
        tags: s.tags,
        version: s.version,
        author: s.author,
      }));
  }

  if (name === "get_skill") {
    const skill = getSkill(String(params.category), String(params.slug));
    if (!skill) return { error: `Skill not found: ${params.category}/${params.slug}` };
    return {
      slug: skill.slug,
      category: skill.category,
      name: skill.name,
      description: skill.description,
      tags: skill.tags,
      version: skill.version,
      author: skill.author,
      content: skill.content,
      hasTemplates: skill.hasTemplates,
      hasSamples: skill.hasSamples,
      hasScripts: skill.hasScripts,
    };
  }

  if (name === "list_categories") {
    return getSkillsByCategory().map((c) => ({
      slug: c.slug,
      skillCount: c.skills.length,
    }));
  }

  if (name === "get_prompts") {
    const category = String(params.category ?? "");
    const slug = String(params.slug ?? "");
    const promptsDir = path.join(process.cwd(), "skills", category, slug, "resources", "prompts");

    if (!fs.existsSync(promptsDir)) {
      return { prompts: [], message: `No prompts directory for ${category}/${slug}` };
    }

    const files = fs.readdirSync(promptsDir).filter(f => f.endsWith(".md"));
    return {
      prompts: files.map(f => ({
        file: f,
        path: `resources/prompts/${f}`,
      })),
    };
  }

  if (name === "deploy_skill") {
    const slug = String(params.slug ?? "");
    const agentId = params.agent ? String(params.agent) : undefined;

    const parts = slug.split("/");
    if (slug.includes("/") && parts.length !== 2) {
      return { error: "slug must be in category/slug format (e.g. ai/my-skill)", success: false };
    }
    const [cat, skillName] = slug.includes("/") ? parts : ["", slug];
    const skillDir = path.join(process.cwd(), "skills", cat, skillName);

    if (!fs.existsSync(skillDir)) {
      return { error: `Skill not found: ${slug}`, success: false };
    }

    // Check filesystem writability before attempting deploy
    try {
      fs.accessSync(path.join(process.cwd(), "skills"), fs.constants.R_OK);
    } catch {
      return {
        error: "Filesystem is read-only — deploy is not available in this environment (e.g., Vercel serverless). Run deploy locally with the CLI.",
        success: false,
      };
    }

    const agents = detectAgents();
    if (agents.every(a => !a.detected)) {
      return { error: "No agents detected on this system.", success: false, agents: [] };
    }

    const results = deployToAgents(skillDir, agentId ? [agentId] : undefined);
    return {
      success: results.some(r => r.success),
      deployed: results.filter(r => r.success).map(r => r.agent.id),
      failed: results.filter(r => !r.success).map(r => ({ agent: r.agent.id, error: r.error })),
    };
  }

  return { error: `Unknown tool: ${name}` };
}

export async function GET(req: NextRequest) {
  // Analytics side-channel: GET /api/mcp?event=search_click&query=xxx&slug=yyy
  const { searchParams } = new URL(req.url);
  if (searchParams.get("event") === "search_click") {
    const { logSearchClickEvent } = await import("@/lib/analytics");
    const query = searchParams.get("query") ?? "";
    const slug = searchParams.get("slug") ?? "";
    if (query && slug) logSearchClickEvent(query, slug);
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({
    name: "skillmall",
    version: "1.0.0",
    description: "SkillMall skill catalog — search, browse, and get skills for AI agents",
    tools: TOOLS,
  });
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  if (body.method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: body.id,
      result: { tools: TOOLS },
    });
  }

  if (body.method === "tools/call") {
    const { name, arguments: args } = body.params as {
      name: string;
      arguments?: Record<string, unknown>;
    };

    const result = handleTool(name, args ?? {});

    return NextResponse.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      },
    });
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    id: body.id,
    error: { code: -32601, message: `Method not found: ${body.method}` },
  });
}
