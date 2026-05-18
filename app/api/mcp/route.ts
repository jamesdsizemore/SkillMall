import { NextRequest, NextResponse } from "next/server";
import { getAllSkills, getSkill, getSkillsByCategory } from "@/lib/skills";

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

  return { error: `Unknown tool: ${name}` };
}

export async function GET() {
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
