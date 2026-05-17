import type { LLMClient } from "./providers";
import type { ResearchResult, ResearchTool } from "./validators";
import type { InMemoryFile } from "./skill-builder";
import {
  getFrameworkCandidates,
  FRAMEWORK_DESCRIPTIONS,
  type ArtifactType,
} from "./pe-frameworks";
import { FrameworkSelectionSchema } from "./validators";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Framework selection ──────────────────────────────────────────────────

async function selectFramework(
  tool: ResearchTool,
  topic: string,
  candidates: string[],
  client: LLMClient
): Promise<string[]> {
  const candidateDescriptions = candidates
    .map((f) => `- **${f}**: ${FRAMEWORK_DESCRIPTIONS[f] ?? "A prompt engineering framework."}`)
    .join("\n");

  const prompt = `Select the optimal prompt engineering framework(s) for this artifact generation task.

Tool name: ${tool.name}
Artifact type: ${tool.artifactType}
Domain: ${topic}
Tool description: ${tool.description}
Inputs required: ${tool.inputs.join(", ")}
Outputs produced: ${tool.outputs.join(", ")}
How it is used: ${tool.howUsed}

Candidate frameworks (select ONLY from this list):
${candidateDescriptions}

Select 1-3 frameworks that will produce the highest-quality, most complete ${tool.artifactType} output for this specific tool. Combine frameworks only when the combination is demonstrably better.

Return JSON only. No markdown fences:
{"selected": ["Framework Name 1"], "rationale": "<why these frameworks>"}`;

  const raw = await client.complete(prompt, {
    responseFormat: "json_object",
    temperature: 0.1,
    maxTokens: 300,
    systemPrompt:
      "You are a prompt engineering expert. Return only valid JSON. Select only from the provided candidates list.",
  });

  try {
    const parsed = FrameworkSelectionSchema.parse(JSON.parse(raw));
    const valid = parsed.selected.filter((f) => candidates.includes(f));
    if (valid.length === 0) {
      // Fallback: use first two candidates
      return candidates.slice(0, 2);
    }
    return valid;
  } catch {
    return candidates.slice(0, 2);
  }
}

// ─── Prompt body generation ───────────────────────────────────────────────

async function generatePromptBody(
  tool: ResearchTool,
  topic: string,
  selectedFrameworks: string[],
  client: LLMClient
): Promise<string> {
  const frameworkGuides = selectedFrameworks
    .map((f) => `${f}: ${FRAMEWORK_DESCRIPTIONS[f] ?? ""}`)
    .join("; ");

  const prompt = `Write a self-contained prompt that an AI agent will use to produce a ${tool.name} artifact for the ${topic} domain.

Selected framework(s) to apply structurally: ${selectedFrameworks.join(", ")}
Framework application guidance: ${frameworkGuides}

Tool description: ${tool.description}
Artifact type: ${tool.artifactType}
Inputs required: ${tool.inputs.join(", ")}
Expected outputs: ${tool.outputs.join(", ")}
Procedure: ${tool.howUsed}

Artifact structure to embed INLINE in the prompt body (do not reference it — include the actual structure):
${tool.artifactStructure}

Requirements:
1. First sentence is imperative: "Produce...", "Analyze...", "Generate..." — never "This prompt helps..."
2. The artifact structure is embedded inline as markdown — user never sees another file
3. All validation rules the agent must check before delivering are listed explicitly
4. The selected framework(s) are structurally evident in the prompt design
5. A completion checklist specifies exactly what a valid, complete output contains

Write the prompt body only. No frontmatter. No preamble.`;

  return client.complete(prompt, {
    temperature: 0.2,
    maxTokens: 2000,
    systemPrompt:
      "You are an expert prompt engineer writing self-contained artifact generation prompts. Write only the prompt body as instructed.",
  });
}

// ─── Prompt file assembly ─────────────────────────────────────────────────

function buildFrontmatter(
  tool: ResearchTool,
  skillSlug: string,
  selectedFrameworks: string[],
  promptType: "tool-specific" | "category" | "meta",
  complexity: "quick" | "thorough" | "exhaustive"
): string {
  return `---
framework: ${selectedFrameworks.join(", ")}
original_framework: ${selectedFrameworks.join(", ")}
skill: ${skillSlug}
tool: ${toSlug(tool.name)}
type: ${promptType}
produces: [${tool.outputs.map((o) => `"${toSlug(o)}.md"`).join(", ")}]
when_to_use: "Use when you need to produce a ${tool.name} for ${tool.category} analysis"
complexity: ${complexity}
generated_by: prompt-engine
---`;
}

function getComplexity(
  tool: ResearchTool,
  promptType: "tool-specific" | "category" | "meta",
  metaType?: string
): "quick" | "thorough" | "exhaustive" {
  if (promptType === "meta") {
    if (metaType === "meta-comprehensive-analysis" || metaType === "meta-cross-category-synthesis") {
      return "exhaustive";
    }
    if (metaType === "meta-quick-assessment") return "quick";
    return "thorough";
  }
  if (promptType === "category") return "thorough";
  if (tool.inputs.length >= 3 && tool.outputs.length >= 3) return "thorough";
  return "quick";
}

// ─── Category prompt generation ───────────────────────────────────────────

async function generateCategoryPrompt(
  category: string,
  tools: ResearchTool[],
  topic: string,
  skillSlug: string,
  client: LLMClient
): Promise<InMemoryFile> {
  const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join("\n");

  const body = await client.complete(
    `Write a self-contained prompt that runs all ${category} tools from the ${topic} domain in coordinated sequence.

Tools in this category:
${toolList}

Run them in the order listed. Each tool's output feeds the next where applicable. Embed all necessary structure inline. First sentence must be imperative.`,
    {
      temperature: 0.2,
      maxTokens: 1500,
      systemPrompt:
        "You are an expert prompt engineer. Write a self-contained category analysis prompt.",
    }
  );

  const dummyTool: ResearchTool = {
    name: `${category} Category Analysis`,
    category,
    description: `Run all ${category} tools in sequence`,
    artifactType: "analysis",
    artifactStructure: "",
    inputs: ["context"],
    outputs: [`${category.toLowerCase()}-analysis.md`],
    howUsed: "Run all category tools in sequence",
  };

  const frontmatter = buildFrontmatter(
    dummyTool,
    skillSlug,
    ["Prompt Chaining", "Role / Expert Persona"],
    "category",
    "thorough"
  );

  return {
    path: `resources/prompts/category-${toSlug(category)}.md`,
    content: `${frontmatter}\n\n${body}`,
  };
}

// ─── Meta prompt generation ───────────────────────────────────────────────

const META_TYPES = [
  { id: "meta-comprehensive-analysis",      label: "Full Comprehensive Analysis",      complexity: "exhaustive" as const },
  { id: "meta-quick-assessment",            label: "Quick Assessment",                 complexity: "quick" as const },
  { id: "meta-stakeholder-presentation",    label: "Stakeholder Presentation",         complexity: "thorough" as const },
  { id: "meta-first-principles-exploration",label: "First Principles Exploration",     complexity: "thorough" as const },
  { id: "meta-competitive-response",        label: "Competitive Response",             complexity: "thorough" as const },
];

async function generateMetaPrompt(
  metaId: string,
  metaLabel: string,
  complexity: "quick" | "thorough" | "exhaustive",
  result: ResearchResult,
  skillSlug: string,
  client: LLMClient
): Promise<InMemoryFile> {
  const allToolNames = result.tools.map((t) => `- ${t.name}`).join("\n");

  const body = await client.complete(
    `Write a self-contained "${metaLabel}" prompt for the ${result.topic} domain.

This prompt produces a complete ${metaLabel.toLowerCase()} using the following ${result.topic} tools as needed:
${allToolNames}

Embed all necessary tool structures inline. First sentence must be imperative. Complexity: ${complexity}.`,
    {
      temperature: 0.2,
      maxTokens: 2000,
      systemPrompt:
        "You are an expert prompt engineer. Write a self-contained meta use-case prompt.",
    }
  );

  const dummyTool: ResearchTool = {
    name: metaLabel,
    category: "meta",
    description: metaLabel,
    artifactType: "analysis",
    artifactStructure: "",
    inputs: [result.topic],
    outputs: [`${metaId}.md`],
    howUsed: `Run a ${metaLabel.toLowerCase()} using ${result.topic} tools`,
  };

  const frontmatter = buildFrontmatter(
    dummyTool,
    skillSlug,
    ["Role / Expert Persona", "Chain of Thought", "Prompt Chaining"],
    "meta",
    complexity
  );

  return {
    path: `resources/prompts/${metaId}.md`,
    content: `${frontmatter}\n\n${body}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Generate all prompt files for a skill:
 * - 1 tool-specific prompt per tool
 * - 1 category prompt per unique tool.category
 * - 5 standard meta prompts (+ 1 cross-category synthesis if 3+ categories)
 */
export async function generatePrompts(
  result: ResearchResult,
  meta: { slug: string },
  client: LLMClient,
  selectedMetaTypes?: string[]
): Promise<InMemoryFile[]> {
  const files: InMemoryFile[] = [];

  // Tool-specific prompts — parallel framework selection + body generation
  const toolPrompts = await Promise.all(
    result.tools.map(async (tool) => {
      const candidates = getFrameworkCandidates(tool, result.topic);
      const selectedFrameworks = await selectFramework(tool, result.topic, candidates, client);
      const body = await generatePromptBody(tool, result.topic, selectedFrameworks, client);
      const complexity = getComplexity(tool, "tool-specific");
      const frontmatter = buildFrontmatter(tool, meta.slug, selectedFrameworks, "tool-specific", complexity);

      return {
        path: `resources/prompts/tool-${toSlug(tool.name)}.md`,
        content: `${frontmatter}\n\n${body}`,
      } satisfies InMemoryFile;
    })
  );
  files.push(...toolPrompts);

  // Category prompts
  const categoryMap = new Map<string, ResearchTool[]>();
  for (const tool of result.tools) {
    const existing = categoryMap.get(tool.category) ?? [];
    categoryMap.set(tool.category, [...existing, tool]);
  }

  const categoryPrompts = await Promise.all(
    [...categoryMap.entries()].map(([category, tools]) =>
      generateCategoryPrompt(category, tools, result.topic, meta.slug, client)
    )
  );
  files.push(...categoryPrompts);

  // Meta prompts
  const metaTypesToGenerate =
    selectedMetaTypes && selectedMetaTypes.length > 0
      ? META_TYPES.filter((m) => selectedMetaTypes.includes(m.id))
      : META_TYPES;

  const metaPrompts = await Promise.all(
    metaTypesToGenerate.map((m) =>
      generateMetaPrompt(m.id, m.label, m.complexity, result, meta.slug, client)
    )
  );
  files.push(...metaPrompts);

  // Cross-category synthesis if 3+ distinct categories
  if (categoryMap.size >= 3) {
    const synthesis = await generateMetaPrompt(
      "meta-cross-category-synthesis",
      "Cross-Category Synthesis",
      "exhaustive",
      result,
      meta.slug,
      client
    );
    files.push(synthesis);
  }

  return files;
}
