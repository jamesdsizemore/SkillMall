import * as p from "@clack/prompts";
import { pc } from "../utils.js";
import { forkSkill } from "@/lib/forking.js";

export async function forkCommand(args: string[]): Promise<void> {
  const [sourceArg, newSlug] = args;

  if (!sourceArg || !newSlug) {
    process.stderr.write(
      pc.red("Usage: skill-mall fork <category/slug> <new-slug>\n") +
        pc.dim("  Example: skill-mall fork ai/skill-creator my-custom-skill-creator\n")
    );
    process.exit(1);
  }

  const parts = sourceArg.includes("/") ? sourceArg.split("/") : [null, sourceArg];
  const [category, sourceSlug] = parts.length === 2
    ? parts
    : [null, parts[0]];

  if (!sourceSlug || !/^[a-z0-9-]+$/.test(newSlug)) {
    process.stderr.write(pc.red("New slug must be kebab-case (lowercase letters, numbers, hyphens).\n"));
    process.exit(1);
  }

  console.log();
  p.intro(pc.bold("  skill-mall fork"));

  // Find source by searching all categories if category not provided
  let resolvedCategory = category;
  if (!resolvedCategory) {
    const { getAllSkills } = await import("@/lib/skills.js");
    const all = getAllSkills();
    const match = all.find((s) => s.slug === sourceSlug);
    if (!match) {
      process.stderr.write(pc.red(`Skill not found: ${sourceSlug}\n`));
      process.exit(1);
    }
    resolvedCategory = match.category;
  }

  try {
    const result = forkSkill(resolvedCategory, sourceSlug, newSlug);

    p.outro(pc.bold(pc.green("  Fork created.")));
    console.log();
    console.log(`  ${pc.green("Source:")} ${resolvedCategory}/${sourceSlug} @ ${result.sourceVersion}`);
    console.log(`  ${pc.green("Fork:")}   ${result.category}/${newSlug}`);
    console.log(`  ${pc.green("Path:")}   ${result.newPath}`);
    console.log();
    console.log(
      pc.dim("  The fork is independent — changes to the original do not propagate.")
    );
    console.log();
  } catch (err) {
    process.stderr.write(pc.red((err instanceof Error ? err.message : String(err)) + "\n"));
    process.exit(1);
  }
}
