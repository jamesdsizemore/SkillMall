import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { LLMClient } from "./providers";

const SYSTEM_PROMPT =
  "You are a prompt engineering expert. You rewrite skill prompts using a new reasoning framework while preserving the original tool structure, artifact format, and output requirements. Return only the rewritten prompt body. No frontmatter, markdown fences, or explanation.";

export interface PromptMeta {
  file: string;
  name: string;
  framework: string;
  originalFramework: string;
  type: string;
  complexity: string;
  whenToUse: string;
  produces: string[];
}

export interface ParsedPromptFile {
  meta: PromptMeta;
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface PromptRegenerationResult {
  framework: string;
  originalFramework: string;
  content: string;
}

export interface SkillPromptTarget {
  category: string;
  slug: string;
  skillDir: string;
  promptsDir: string;
}

export type PromptRegenerationErrorCode =
  | "INVALID_PROMPT_PATH"
  | "PROMPT_NOT_FOUND"
  | "PROMPT_PARSE_FAILED"
  | "NO_TOOL_CONTEXT";

export class PromptRegenerationError extends Error {
  constructor(
    public readonly code: PromptRegenerationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PromptRegenerationError";
  }
}

function asString(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

function isPathInside(baseDir: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(baseDir), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function getPromptsDir(
  category: string,
  slug: string,
  options: { repoRoot?: string } = {}
): string {
  return path.join(options.repoRoot ?? process.cwd(), "skills", category, slug, "resources", "prompts");
}

export function resolveSkillPromptTarget(
  skillTarget: string,
  options: { repoRoot?: string } = {}
): SkillPromptTarget | null {
  const repoRoot = options.repoRoot ?? process.cwd();
  const skillsDir = path.join(repoRoot, "skills");

  let category = "";
  let slug = skillTarget;

  if (skillTarget.includes("/")) {
    const parts = skillTarget.split("/");
    if (parts.length !== 2) return null;
    [category, slug] = parts;
  } else {
    if (!fs.existsSync(skillsDir)) return null;
    category = fs
      .readdirSync(skillsDir)
      .find((candidate) =>
        fs.existsSync(path.join(skillsDir, candidate, skillTarget, "SKILL.md"))
      ) ?? "";
  }

  if (!category || !slug) return null;

  const skillDir = path.join(skillsDir, category, slug);
  if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) return null;

  return {
    category,
    slug,
    skillDir,
    promptsDir: getPromptsDir(category, slug, { repoRoot }),
  };
}

export function resolvePromptFilePath(baseDir: string, promptFile: string): string {
  const resolved = path.isAbsolute(promptFile)
    ? path.resolve(promptFile)
    : path.resolve(baseDir, promptFile);

  if (!isPathInside(baseDir, resolved)) {
    throw new PromptRegenerationError(
      "INVALID_PROMPT_PATH",
      "Prompt file must stay within the prompt directory."
    );
  }

  return resolved;
}

export function resolveSkillPromptFilePath(
  target: SkillPromptTarget,
  promptFile: string
): string {
  const normalized = promptFile.replaceAll("\\", "/");
  const resolved = path.isAbsolute(promptFile)
    ? path.resolve(promptFile)
    : normalized.startsWith("resources/prompts/")
      ? path.resolve(target.skillDir, promptFile)
      : path.resolve(target.promptsDir, promptFile);

  if (!isPathInside(target.promptsDir, resolved)) {
    throw new PromptRegenerationError(
      "INVALID_PROMPT_PATH",
      "Prompt file must stay within the prompt directory."
    );
  }

  return resolved;
}

export function parsePromptFile(filePath: string): ParsedPromptFile | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const frontmatter = data as Record<string, unknown>;
    const framework = asString(frontmatter.framework);

    return {
      meta: {
        file: path.basename(filePath),
        name: asString(frontmatter.tool, path.basename(filePath, ".md")),
        framework,
        originalFramework: asString(frontmatter.original_framework, framework),
        type: asString(frontmatter.type, "tool-specific"),
        complexity: asString(frontmatter.complexity, "thorough"),
        whenToUse: asString(frontmatter.when_to_use),
        produces: asStringArray(frontmatter.produces),
      },
      content,
      frontmatter,
    };
  } catch {
    return null;
  }
}

export function listPromptFiles(
  category: string,
  slug: string,
  options: { repoRoot?: string } = {}
): PromptMeta[] {
  const promptsDir = getPromptsDir(category, slug, options);
  if (!fs.existsSync(promptsDir)) return [];

  return fs
    .readdirSync(promptsDir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => parsePromptFile(path.join(promptsDir, file)))
    .filter((prompt): prompt is ParsedPromptFile => prompt !== null)
    .map((prompt) => prompt.meta);
}

export function extractToolContext(promptBody: string): string {
  try {
    const toolData = JSON.parse(promptBody.trim()) as {
      tools?: Array<{
        name?: string;
        artifactType?: string;
        artifactStructure?: string;
        inputs?: string[];
        outputs?: string[];
        howUsed?: string;
      }>;
    };
    const tool = Array.isArray(toolData.tools) ? toolData.tools[0] : null;
    if (!tool) return "";

    return [
      `Tool: ${tool.name ?? ""}`,
      `Artifact type: ${tool.artifactType ?? ""}`,
      `Artifact structure:\n${tool.artifactStructure ?? ""}`,
      `Inputs: ${tool.inputs?.join(", ") ?? ""}`,
      `Outputs: ${tool.outputs?.join(", ") ?? ""}`,
      `How used: ${tool.howUsed ?? ""}`,
    ].join("\n");
  } catch {
    return promptBody.slice(0, 2000);
  }
}

export function buildRegenerationPrompt(
  parsed: ParsedPromptFile,
  framework: string,
  toolContext: string
): string {
  return `Rewrite this skill prompt using the "${framework}" reasoning framework.

Original framework: ${parsed.meta.originalFramework}
New framework: ${framework}

Tool context:
${toolContext}

Original prompt purpose: ${parsed.meta.whenToUse}

Write the complete rewritten prompt body using ${framework} as the reasoning approach. Preserve the tool structure, artifact format, and output requirements. Focus on how ${framework} would approach this specific tool.`;
}

export async function regeneratePromptFile(input: {
  promptPath: string;
  framework: string;
  client: LLMClient;
}): Promise<PromptRegenerationResult> {
  if (!fs.existsSync(input.promptPath)) {
    throw new PromptRegenerationError(
      "PROMPT_NOT_FOUND",
      `Prompt file not found: ${input.promptPath}`
    );
  }

  const parsed = parsePromptFile(input.promptPath);
  if (!parsed) {
    throw new PromptRegenerationError("PROMPT_PARSE_FAILED", "Failed to parse prompt file.");
  }

  const toolContext = extractToolContext(parsed.content);
  if (!toolContext) {
    throw new PromptRegenerationError(
      "NO_TOOL_CONTEXT",
      "No tool structure found in prompt file. Cannot regenerate without tool context."
    );
  }

  const newBody = await input.client.complete(
    buildRegenerationPrompt(parsed, input.framework, toolContext),
    {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 2048,
    }
  );

  const updatedFrontmatter = { ...parsed.frontmatter };
  updatedFrontmatter.framework = input.framework;
  if (!updatedFrontmatter.original_framework) {
    updatedFrontmatter.original_framework = parsed.meta.originalFramework;
  }

  fs.writeFileSync(input.promptPath, matter.stringify(newBody, updatedFrontmatter), "utf-8");

  return {
    framework: input.framework,
    originalFramework: parsed.meta.originalFramework,
    content: newBody,
  };
}
