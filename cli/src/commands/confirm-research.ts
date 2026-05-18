import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import { pc } from "../utils.js";
import { resolveProviderConfig, createLLMClient } from "@/lib/providers/index.js";
import { ResearchResultSchema } from "@/lib/validators.js";
import { buildSkillDirectory } from "@/lib/skill-builder.js";
import { generatePrompts } from "@/lib/prompt-engine.js";
import { validateSkillDirectory, atomicWrite } from "@/lib/pipeline.js";

export async function confirmResearchCommand(args: string[]): Promise<void> {
  const slug = args[0];

  if (!slug) {
    process.stderr.write(
      pc.red("Usage: skill-mall confirm-research <slug>\n") +
        pc.dim("  Example: skill-mall confirm-research blue-ocean-strategy\n")
    );
    process.exit(1);
  }

  const researchPath = path.join("skill-builder-output", slug, "research-result.json");

  if (!fs.existsSync(researchPath)) {
    process.stderr.write(
      pc.red(`Research result not found: ${researchPath}\n`) +
        pc.dim(`  Run: npx skill-mall create "topic" --category <cat> first\n`)
    );
    process.exit(1);
  }

  console.log();
  p.intro(pc.bold(`  skill-mall confirm-research: ${slug}`));

  // Read and validate research result
  let researchResult;
  try {
    const raw = JSON.parse(fs.readFileSync(researchPath, "utf-8"));
    researchResult = ResearchResultSchema.parse(raw);
  } catch (err) {
    process.stderr.write(
      pc.red(`Invalid research-result.json: ${err instanceof Error ? err.message : String(err)}\n`)
    );
    process.exit(1);
  }

  // Resolve provider
  let config;
  try {
    config = resolveProviderConfig();
  } catch {
    process.stderr.write(
      pc.red("No LLM provider configured.\n") +
        pc.dim("  Run: npx skill-mall configure\n")
    );
    process.exit(1);
  }

  const client = createLLMClient(config);

  console.log(
    `  ${pc.dim("Provider:")} ${config.provider} / ${config.model}`
  );
  console.log(
    `  ${pc.dim("Tools:")} ${researchResult.tools.length}`
  );
  console.log();

  const s = p.spinner();
  s.start("Building skill directory...");

  let skillDirectory;
  let promptFiles;
  try {
    [skillDirectory, promptFiles] = await Promise.all([
      buildSkillDirectory(researchResult, {
        slug,
        category: researchResult.suggestedCategory,
        tags: researchResult.suggestedTags,
        targetAgents: ["claude-code"],
      }, client),
      generatePrompts(researchResult, { slug }, client),
    ]);
  } catch (err) {
    s.stop("Failed");
    process.stderr.write(
      pc.red(`Pipeline error: ${err instanceof Error ? err.message : String(err)}\n`)
    );
    process.exit(1);
  }

  const completeDirectory = {
    ...skillDirectory,
    files: [...skillDirectory.files, ...promptFiles],
  };

  s.stop("Skill directory built.");

  // Validate
  const validation = validateSkillDirectory(completeDirectory);
  if (!validation.valid) {
    process.stderr.write(pc.red("Validation failed:\n"));
    for (const err of validation.errors) {
      process.stderr.write(pc.red(`  - ${err.field}: ${err.message}\n`));
    }
    process.exit(1);
  }

  // Write to disk
  const outputPath = path.join(
    "skills",
    researchResult.suggestedCategory,
    slug
  );

  s.start(`Writing to ${outputPath}...`);
  let writeResult;
  try {
    writeResult = await atomicWrite(completeDirectory, outputPath);
  } catch (err) {
    s.stop("Write failed");
    process.stderr.write(
      pc.red(`Write error: ${err instanceof Error ? err.message : String(err)}\n`)
    );
    process.exit(1);
  }

  s.stop(`Written to ${outputPath}`);

  // Quality score estimate
  const resourceScore =
    (completeDirectory.files.some((f) => f.path.startsWith("scripts/")) ? 20 : 0) +
    (completeDirectory.files.some((f) => f.path.startsWith("resources/templates/")) ? 30 : 0) +
    (completeDirectory.files.some((f) => f.path.startsWith("resources/samples/")) ? 30 : 0) +
    Math.min(researchResult.suggestedTags.length * 4, 20);

  p.outro(pc.bold(pc.green("  Skill created successfully.")));
  console.log();
  console.log(
    `  ${pc.green("Created:")} skills/${researchResult.suggestedCategory}/${slug}/`
  );
  console.log(`  ${pc.dim("Files written:")} ${writeResult.fileCount}`);
  console.log(`  ${pc.dim("Prompts:")} ${promptFiles.length}`);
  console.log(`  ${pc.dim("Quality score:")} ${resourceScore}/100`);
  console.log();
}
