import path from "node:path";
import * as p from "@clack/prompts";
import { pc } from "../utils.js";
import { validateForPublish } from "@/lib/publish/skills-sh.js";
import { getAllSkills } from "@/lib/skills.js";

export async function publishCommand(args: string[]): Promise<void> {
  const slug = args[0];
  let registry = "skills.sh";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--registry" && args[i + 1]) registry = args[++i];
  }

  if (!slug) {
    process.stderr.write(
      pc.red("Usage: skill-mall publish <category/slug> --registry skills.sh\n")
    );
    process.exit(1);
  }

  const parts = slug.includes("/") ? slug.split("/") : [null, slug];
  const [category, skillSlug] = parts;

  const allSkills = getAllSkills();
  const skill = allSkills.find(
    (s) =>
      s.slug === skillSlug &&
      (category === null || s.category === category)
  );

  if (!skill) {
    process.stderr.write(pc.red(`Skill not found: ${slug}\n`));
    process.exit(1);
  }

  console.log();
  p.intro(pc.bold(`  skill-mall publish: ${skill.name} → ${registry}`));

  // Pre-publish validation
  const allSlugs = new Set(allSkills.map((s) => s.slug));
  const validation = validateForPublish(skill, allSlugs);

  if (!validation.valid) {
    console.log();
    console.log(pc.bold(pc.red("  Pre-publish validation failed:")));
    for (const err of validation.errors) {
      console.log(`  ${pc.red("✗")} [${err.check}] ${err.message}`);
    }
    console.log();
    p.outro(pc.bold(pc.red("  Fix the issues above before publishing.")));
    process.exit(1);
  }

  console.log(pc.green("  ✓ Pre-publish validation passed."));
  console.log();

  // OAuth flow — currently stubbed
  try {
    const { openSkillsShOAuth } = await import("@/lib/publish/skills-sh.js");
    const token = await openSkillsShOAuth();
    console.log(pc.dim(`  OAuth token obtained: ${token.slice(0, 8)}...`));

    const { publishToSkillsSh } = await import("@/lib/publish/skills-sh.js");
    const result = await publishToSkillsSh(skill, token);

    const { updateFrontmatterAfterPublish } = await import(
      "@/lib/publish/skills-sh.js"
    );
    const fullPath = path.join(process.cwd(), "skills", skill.category, skill.slug, "SKILL.md");
    updateFrontmatterAfterPublish(skill.path, fullPath, result.id, result.url);

    p.outro(pc.bold(pc.green(`  Published: ${result.url}`)));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log();
    console.log(pc.yellow("  " + message));
    console.log();
    p.outro(pc.bold(pc.yellow("  Publish incomplete — see above.")));
    process.exit(1);
  }
}
