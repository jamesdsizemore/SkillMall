import type { LLMClient } from "./providers";
import type { ResearchResult, ResearchTool } from "./validators";

export interface InMemoryFile {
  path: string;
  content: string;
}

export interface InMemorySkillDirectory {
  slug: string;
  category: string;
  files: InMemoryFile[];
}

export interface SkillMetadata {
  slug: string;
  title?: string;
  author?: string;
  category: string;
  tags: string[];
  targetAgents: string[];
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Deterministic generators (no LLM) ───────────────────────────────────

function generateSkillMd(result: ResearchResult, meta: SkillMetadata): InMemoryFile {
  const firstSentence = result.summary.split(".")[0].trim();
  const description =
    firstSentence.length > 150 ? firstSentence.slice(0, 147) + "..." : firstSentence;

  const toolIndex = result.tools
    .map((t) => `- **${t.name}** (\`${t.artifactType}\`) — ${t.description}`)
    .join("\n");

  const unverifiedBanner = result.researchUnverified
    ? '> **Research unverified** — generated from training knowledge. Provide source URLs for authoritative results.\n\n'
    : "";

  const content = `---
name: ${meta.slug}
description: "${description.replace(/"/g, '\\"')}"
license: MIT
metadata:
  version: "1.0.0"
  author: ${meta.author ?? "skill-mall"}
  category: ${meta.category}
  tags: "${meta.tags.slice(0, 6).join(", ")}"
---

${unverifiedBanner}# ${meta.title ?? result.topic}

${result.summary}

## Tools (${result.tools.length})

${toolIndex}

## Principles

${result.principles.map((p) => `- ${p}`).join("\n")}

## Usage

Describe the ${result.topic} task you need to complete. The skill applies the appropriate tool based on your goal.
`;

  return { path: "SKILL.md", content };
}

function generateTemplate(tool: ResearchTool): InMemoryFile {
  const content = `# ${tool.name} — Template

**Artifact type:** \`${tool.artifactType}\`

## How to use

${tool.howUsed}

## Inputs required

${tool.inputs.map((i) => `- ${i}`).join("\n")}

## Template

${tool.artifactStructure}

## Expected outputs

${tool.outputs.map((o) => `- ${o}`).join("\n")}
`;

  return {
    path: `resources/templates/${toSlug(tool.name)}.md`,
    content,
  };
}

function generateReadme(result: ResearchResult, meta: SkillMetadata): InMemoryFile {
  const rows = result.tools
    .map(
      (t) =>
        `| ${t.name} | ${t.artifactType} | resources/templates/${toSlug(t.name)}.md | resources/samples/${toSlug(t.name)}-sample.md |`
    )
    .join("\n");

  const content = `# ${meta.title ?? result.topic}

${result.summary}

## Tool Index

| Tool | Type | Template | Sample |
|---|---|---|---|
${rows}

## Principles

${result.principles.map((p) => `- ${p}`).join("\n")}
`;

  return { path: "README.md", content };
}

function generateScripts(result: ResearchResult): InMemoryFile[] {
  const files: InMemoryFile[] = [];

  // Main analysis script
  const mainScript = `#!/bin/bash
# Run a complete ${result.topic} analysis
echo "Use the prompts in resources/prompts/ with your AI agent."
echo "For a full analysis: resources/prompts/meta-comprehensive-analysis.md"
`;
  files.push({ path: "scripts/run-full-analysis.sh", content: mainScript });

  // Per-tool scripts (first 5 only)
  result.tools.slice(0, 5).forEach((tool) => {
    const slug = toSlug(tool.name);
    const script = `#!/bin/bash
# Generate a ${tool.name} artifact
echo "Use prompt: resources/prompts/tool-${slug}.md"
`;
    files.push({ path: `scripts/generate-${slug}.sh`, content: script });
  });

  return files;
}

// ─── LLM-based sample generator ───────────────────────────────────────────

async function generateSample(
  tool: ResearchTool,
  topic: string,
  client: LLMClient
): Promise<InMemoryFile> {
  const prompt = `Fill in this blank ${tool.name} template with illustrative examples for the ${topic} domain.

Use domain-appropriate examples. If the domain has canonical illustrative examples used in educational contexts, use them. Otherwise use generic but realistic placeholder values.

Template to fill in:
${tool.artifactStructure}

Return the completed template as markdown. Start directly with the content. No preamble.`;

  const filled = await client.complete(prompt, {
    temperature: 0.3,
    maxTokens: 1500,
    systemPrompt:
      "You are a domain expert filling in a structured analysis template with illustrative examples. Return only the completed template as markdown.",
  });

  return {
    path: `resources/samples/${toSlug(tool.name)}-sample.md`,
    content: `# ${tool.name} — Sample Output\n\n*Sample for the ${topic} domain.*\n\n${filled}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Build the complete in-memory skill directory from a ResearchResult.
 * Generates SKILL.md, README.md, templates, and scripts deterministically.
 * Generates samples via one LLM call per tool (run in parallel).
 * Does NOT write to disk — returns all files as InMemoryFile[].
 */
export async function buildSkillDirectory(
  result: ResearchResult,
  meta: SkillMetadata,
  client: LLMClient
): Promise<InMemorySkillDirectory> {
  const files: InMemoryFile[] = [];

  // Deterministic files
  files.push(generateSkillMd(result, meta));
  files.push(generateReadme(result, meta));

  for (const tool of result.tools) {
    files.push(generateTemplate(tool));
  }

  files.push(...generateScripts(result));

  // LLM-based sample files (parallel)
  const samples = await Promise.all(
    result.tools.map((tool) => generateSample(tool, result.topic, client))
  );
  files.push(...samples);

  return { slug: meta.slug, category: meta.category, files };
}
