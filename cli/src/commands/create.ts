import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import {
  requireRepoRoot,
  isValidSkillName,
  pc,
} from "../utils.js";
import { validateCommand } from "./validate.js";
import { resolveProviderConfig, createLLMClient } from "@/lib/providers/index.js";
import { runResearchEngine } from "@/lib/research-engine.js";

interface CreateArgs {
  topic: string;
  urls: string[];
  category: string;
  author?: string;
}

function parseArgs(rawArgs: string[]): CreateArgs {
  const urls: string[] = [];
  let category = "business";
  let author: string | undefined;
  const topicParts: string[] = [];

  let i = 0;
  while (i < rawArgs.length) {
    if ((rawArgs[i] === "--urls" || rawArgs[i] === "--url") && rawArgs[i + 1]) {
      // Collect all following non-flag args as URLs
      i++;
      while (i < rawArgs.length && !rawArgs[i].startsWith("--")) {
        urls.push(rawArgs[i]);
        i++;
      }
    } else if (rawArgs[i] === "--category" && rawArgs[i + 1]) {
      category = rawArgs[++i];
      i++;
    } else if (rawArgs[i] === "--author" && rawArgs[i + 1]) {
      author = rawArgs[++i];
      i++;
    } else if (!rawArgs[i].startsWith("--")) {
      topicParts.push(rawArgs[i]);
      i++;
    } else {
      i++;
    }
  }

  return { topic: topicParts.join(" ").trim(), urls, category, author };
}

// ─── Pipeline-based create (with --urls or explicit research mode) ────────

async function pipelineCreate(args: CreateArgs): Promise<void> {
  console.log();
  p.intro(pc.bold("  skill-mall create (research pipeline)"));

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

  console.log(`  ${pc.dim("Topic:")} ${args.topic}`);
  console.log(`  ${pc.dim("Provider:")} ${config.provider} / ${config.model}`);
  if (args.urls.length > 0) {
    console.log(`  ${pc.dim("Source URLs:")} ${args.urls.join(", ")}`);
  } else {
    console.log(`  ${pc.dim("Source URLs:")} none — using training knowledge (research-unverified)`);
  }
  console.log();

  const s = p.spinner();
  s.start("Running Research Engine...");

  let researchResult;
  try {
    researchResult = await runResearchEngine(args.topic, args.urls, client);
  } catch (err) {
    s.stop("Research failed");
    process.stderr.write(
      pc.red(`Research error: ${err instanceof Error ? err.message : String(err)}\n`)
    );
    process.exit(2);
  }

  s.stop(`Research complete. ${researchResult.tools.length} tools extracted.`);

  // Generate slug from topic
  const slug = args.topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);

  // Write research-result.json
  const outputDir = path.join("skill-builder-output", slug);
  fs.mkdirSync(outputDir, { recursive: true });
  const researchPath = path.join(outputDir, "research-result.json");
  fs.writeFileSync(researchPath, JSON.stringify(researchResult, null, 2) + "\n", "utf-8");

  if (researchResult.researchUnverified) {
    console.log();
    console.log(
      pc.yellow("  Warning: Research unverified — provide source URLs with --urls for authoritative results.")
    );
  }

  p.outro(pc.bold(pc.green("  Research complete.")));
  console.log();
  console.log(
    `  ${pc.green("Review:")} ${researchPath}`
  );
  console.log();
  console.log(
    `  When ready: ${pc.cyan(`npx skill-mall confirm-research ${slug}`)}`
  );
  console.log();

  process.exit(0);
}

// ─── Template-based create (legacy interactive mode) ─────────────────────

async function templateCreate(rawArgs: string[]): Promise<void> {
  const description = rawArgs.join(" ").trim();

  if (!description) {
    process.stderr.write(
      pc.red('Usage: skill-mall create "<description>" [--urls <url>] [--category <cat>]\n') +
        pc.dim('  Pipeline: skill-mall create "blue ocean strategy" --urls https://...\n') +
        pc.dim('  Template: skill-mall create "write conventional commits" (interactive)\n')
    );
    process.exit(1);
  }

  const repoRoot = requireRepoRoot();

  console.log();
  p.intro(pc.bold("  skill-mall create"));
  console.log();
  console.log(pc.dim("  Description: ") + description);
  console.log();

  const suggestedName = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);

  const categories = getAvailableCategories(repoRoot);

  const skillName = await p.text({
    message: "Skill name (lowercase, hyphens, max 64 chars):",
    placeholder: suggestedName,
    initialValue: suggestedName,
    validate(val) {
      if (!val) return "Name is required";
      if (!isValidSkillName(val))
        return "Name must be lowercase letters, numbers, and hyphens only (max 64 chars)";
    },
  });

  if (p.isCancel(skillName)) { p.cancel("Cancelled."); process.exit(0); }

  const categoryChoice = await p.select({
    message: "Category:",
    options: categories.map((c) => ({ value: c, label: c })),
  });

  if (p.isCancel(categoryChoice)) { p.cancel("Cancelled."); process.exit(0); }

  const skillDescription = await p.text({
    message: "One-line description (max 150 chars):",
    placeholder: description.slice(0, 150),
    initialValue: description.slice(0, 150),
    validate(val) {
      if (val && val.length > 150) return `Too long: ${val.length} chars (max 150)`;
    },
  });

  if (p.isCancel(skillDescription)) { p.cancel("Cancelled."); process.exit(0); }

  const finalName = String(skillName);
  const finalCategory = String(categoryChoice);
  const templateDir = path.join(repoRoot, "skills", "_template");
  const destDir = path.join(repoRoot, "skills", finalCategory, finalName);

  if (!fs.existsSync(templateDir)) {
    process.stderr.write(pc.red("Template not found at skills/_template/\n"));
    process.exit(1);
  }

  fs.mkdirSync(destDir, { recursive: true });
  copyDirRecursive(templateDir, destDir);

  const skillMdPath = path.join(destDir, "SKILL.md");
  if (fs.existsSync(skillMdPath)) {
    let content = fs.readFileSync(skillMdPath, "utf-8");
    content = content
      .replace(/^name: skill-name$/m, `name: ${finalName}`)
      .replace(/^category: development$/m, `category: ${finalCategory}`)
      .replace(/^description: One-line key use case\..*$/m, `description: ${String(skillDescription)}`)
      .replace(/# Skill Name/g, `# ${titleCase(finalName)}`);
    fs.writeFileSync(skillMdPath, content, "utf-8");
  }

  const readmePath = path.join(destDir, "README.md");
  if (fs.existsSync(readmePath)) {
    let content = fs.readFileSync(readmePath, "utf-8");
    content = content
      .replace(/# Skill Name/g, `# ${titleCase(finalName)}`)
      .replace(/One-line description of what this skill does\./g, String(skillDescription));
    fs.writeFileSync(readmePath, content, "utf-8");
  }

  try { validateCommand([skillMdPath]); } catch { /* validateCommand calls process.exit on errors */ }

  p.outro(pc.bold(pc.green("  Skill scaffolded.")));
  console.log();
  console.log(`  Edit: ${pc.cyan(`skills/${finalCategory}/${finalName}/SKILL.md`)}`);
  console.log(`  Deploy: ${pc.cyan(`npx skill-mall deploy ${finalCategory}/${finalName}`)}`);
  console.log();
}

// ─── Main export ─────────────────────────────────────────────────────────

export async function createCommand(rawArgs: string[]): Promise<void> {
  const args = parseArgs(rawArgs);

  // Use pipeline mode when URLs are provided (the new Research Engine path)
  if (args.urls.length > 0 && args.topic) {
    return pipelineCreate(args);
  }

  // Use pipeline mode for any topic (no URLs = training knowledge fallback)
  // Detect intent: if called with a clear topic string, use pipeline
  // If called interactively without topic context, fall back to template mode
  if (args.topic) {
    return pipelineCreate(args);
  }

  // No topic — interactive template mode
  return templateCreate(rawArgs);
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getAvailableCategories(repoRoot: string): string[] {
  const skillsDir = path.join(repoRoot, "skills");
  if (!fs.existsSync(skillsDir)) return ["development"];
  const cats = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_template" && d.name !== "src")
    .map((d) => d.name)
    .sort();
  return cats.length > 0 ? cats : ["development"];
}

function copyDirRecursive(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function titleCase(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
