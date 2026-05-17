import fs from "fs/promises";
import path from "path";
import { PipelineInputSchema } from "./validators";
import { runResearchEngine } from "./research-engine";
import { buildSkillDirectory } from "./skill-builder";
import { generatePrompts } from "./prompt-engine";
import type { LLMClient } from "./providers";
import type { ResearchResult } from "./validators";
import type { InMemoryFile, InMemorySkillDirectory, SkillMetadata } from "./skill-builder";

export type { InMemoryFile, InMemorySkillDirectory, SkillMetadata };

export interface PipelineInput {
  topic: string;
  sourceUrls: string[];
  metadata: SkillMetadata;
  selectedToolNames?: string[];
  selectedMetaTypes?: string[];
  writeToDisk?: boolean;
  outputBasePath?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string; value?: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface WriteResult {
  success: boolean;
  path: string;
  fileCount: number;
}

export type PipelineStage =
  | { stage: "awaiting-confirmation"; researchResult: ResearchResult }
  | { stage: "complete"; result: CompletePipelineResult };

export interface CompletePipelineResult {
  researchResult: ResearchResult;
  skillDirectory: InMemorySkillDirectory;
  validation: ValidationResult;
  writeResult?: WriteResult;
}

// ─── Validation ───────────────────────────────────────────────────────────

export function validateSkillDirectory(dir: InMemorySkillDirectory): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  const skillMd = dir.files.find((f) => f.path === "SKILL.md");
  const readme = dir.files.find((f) => f.path === "README.md");

  if (!skillMd) errors.push({ field: "SKILL.md", message: "Required file missing" });
  if (!readme) errors.push({ field: "README.md", message: "Required file missing" });

  if (skillMd) {
    const nameMatch = skillMd.content.match(/^name:\s*(.+)$/m);
    const descMatch = skillMd.content.match(/^description:\s*"?(.+?)"?\s*$/m);

    if (!nameMatch) {
      errors.push({ field: "name", message: "Required frontmatter field missing" });
    } else {
      const name = nameMatch[1].trim();
      if (name.length > 64) {
        errors.push({ field: "name", message: `Exceeds 64 chars (${name.length})`, value: name });
      }
      if (!/^[a-z0-9-]+$/.test(name)) {
        errors.push({ field: "name", message: "Must be kebab-case", value: name });
      }
      if (name !== dir.slug) {
        errors.push({ field: "name", message: `Must match slug "${dir.slug}"`, value: name });
      }
    }

    if (!descMatch) {
      errors.push({ field: "description", message: "Required frontmatter field missing" });
    } else {
      const desc = descMatch[1].trim();
      if (desc.length > 1024) {
        errors.push({ field: "description", message: `Exceeds 1024 chars (${desc.length})` });
      }
      if (desc.length > 150) {
        warnings.push({ field: "description", message: `Exceeds 150 chars (${desc.length}) — may truncate in agent skill listings` });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Atomic write ─────────────────────────────────────────────────────────

export async function atomicWrite(
  directory: InMemorySkillDirectory,
  outputPath: string
): Promise<WriteResult> {
  const absOutput = path.resolve(outputPath);
  const tempPath = `${absOutput}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    await fs.mkdir(tempPath, { recursive: true });

    for (const file of directory.files) {
      const filePath = path.join(tempPath, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");
    }

    try {
      await fs.rm(absOutput, { recursive: true });
    } catch {
      // Does not exist — fine
    }
    await fs.rename(tempPath, absOutput);

    return { success: true, path: absOutput, fileCount: directory.files.length };
  } catch (error) {
    await fs.rm(tempPath, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

// ─── Main pipeline ────────────────────────────────────────────────────────

/**
 * Run the 5-stage pipeline.
 * When requireConfirmation is true, returns after Stage 2 for user review.
 * When writeToDisk is true (and requireConfirmation is false), writes to disk atomically.
 */
export async function runPipeline(
  input: PipelineInput,
  client: LLMClient,
  options: { requireConfirmation: boolean } = { requireConfirmation: true }
): Promise<PipelineStage> {
  // Stage 1: validate input
  PipelineInputSchema.parse({
    ...input,
    sourceUrls: input.sourceUrls ?? [],
  });

  // Stage 2: Research Engine
  const researchResult = await runResearchEngine(
    input.topic,
    input.sourceUrls ?? [],
    client
  );

  // Confirmation gate — UI/CLI pause before pipeline continues
  if (options.requireConfirmation) {
    return { stage: "awaiting-confirmation", researchResult };
  }

  // Apply tool filter (user removed tools in UI Step 2)
  const filteredResult =
    input.selectedToolNames && input.selectedToolNames.length > 0
      ? { ...researchResult, tools: researchResult.tools.filter((t) => input.selectedToolNames!.includes(t.name)) }
      : researchResult;

  // Stages 3 + 4: Skill Builder and Prompt Engine run in parallel
  const [skillDirectory, promptFiles] = await Promise.all([
    buildSkillDirectory(filteredResult, input.metadata, client),
    generatePrompts(filteredResult, input.metadata, client, input.selectedMetaTypes),
  ]);

  const completeDirectory: InMemorySkillDirectory = {
    ...skillDirectory,
    files: [...skillDirectory.files, ...promptFiles],
  };

  // Stage 5: Validate
  const validation = validateSkillDirectory(completeDirectory);
  if (!validation.valid) {
    return {
      stage: "complete",
      result: { researchResult, skillDirectory: completeDirectory, validation },
    };
  }

  // Stage 5b: Write to disk (atomic)
  let writeResult: WriteResult | undefined;
  if (input.writeToDisk) {
    const outputPath = path.join(
      input.outputBasePath ?? "skills",
      input.metadata.category,
      input.metadata.slug
    );
    writeResult = await atomicWrite(completeDirectory, outputPath);
  }

  return {
    stage: "complete",
    result: { researchResult, skillDirectory: completeDirectory, validation, writeResult },
  };
}
