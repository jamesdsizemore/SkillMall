import path from "node:path";
import * as p from "@clack/prompts";
import { requireRepoRoot, pc } from "../utils.js";
import { validateForPublish } from "@/lib/publish/skills-sh.js";
import { getAllSkills } from "@/lib/skills.js";
import { buildNpmPackageJson, checkNpmVersion, publishToNpm } from "@/lib/publish/npm.js";

export async function publishCommand(args: string[]): Promise<void> {
  const slug = args[0];
  let registry = "skills.sh";
  let dryRun = true; // DEFAULT: always dry-run unless --publish is explicit

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--registry" && args[i + 1]) registry = args[++i];
    else if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--publish") dryRun = false;
  }

  if (!slug) {
    process.stderr.write(
      pc.red(
        "Usage: skill-mall publish <category/slug> --registry <npm|skills.sh> [--dry-run|--publish]\n" +
        "       Default behavior is --dry-run. Pass --publish to actually publish.\n"
      )
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

  if (registry === "npm") {
    await publishNpmRegistry(skill, dryRun);
    return;
  }

  // skills.sh registry (original behavior)
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

type SkillItem = ReturnType<typeof getAllSkills>[0];

async function publishNpmRegistry(skill: SkillItem, dryRun: boolean): Promise<void> {
  const pkg = buildNpmPackageJson(skill);
  const packageName = pkg.name;
  const repoRoot = requireRepoRoot();
  const skillDir = path.join(repoRoot, "skills", skill.category, skill.slug);

  console.log();
  console.log(pc.bold("  Generated package.json:"));
  console.log(pc.dim(JSON.stringify(pkg, null, 2)));
  console.log();

  // Pre-publish: check version conflict with existing npm package
  console.log(pc.dim(`  Checking npm registry for ${packageName}...`));
  const versionCheck = checkNpmVersion(packageName, pkg.version);

  if (versionCheck.exists && versionCheck.versionMismatch) {
    process.stderr.write(
      pc.red(
        `Version conflict: ${packageName}@${versionCheck.publishedVersion} already exists on npm.\n` +
        `Local version (${pkg.version}) matches the already-published version.\n` +
        `Bump metadata.version in SKILL.md before publishing.\n`
      )
    );
    process.exit(1);
  }

  if (versionCheck.exists) {
    console.log(pc.dim(`  Existing package: ${versionCheck.publishedVersion} → new: ${pkg.version}`));
  } else {
    console.log(pc.dim(`  First publish — package does not exist on npm yet.`));
  }

  if (dryRun) {
    console.log();
    console.log(pc.yellow("  DRY RUN — not publishing. Pass --publish to actually publish."));
    console.log(pc.dim(`  Would run: npm publish --access public in ${skillDir}`));
    console.log();
    p.outro(pc.bold(pc.yellow("  Dry run complete. No changes made.")));
    return;
  }

  // Actual publish — only reachable with explicit --publish flag
  console.log();
  console.log(pc.dim(`  Publishing ${packageName}@${pkg.version}...`));

  try {
    publishToNpm(skill, { dryRun: false, skillDir });
    console.log();
    p.outro(pc.bold(pc.green(`  Published: ${packageName}@${pkg.version}`)));
  } catch (err) {
    process.stderr.write(
      pc.red(`npm publish failed: ${err instanceof Error ? err.message : String(err)}\n`)
    );
    process.exit(1);
  }
}
