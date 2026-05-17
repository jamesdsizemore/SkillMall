import fs from "node:fs";
import path from "node:path";
import {
  requireRepoRoot,
  isValidSkillName,
  pc,
} from "../utils.js";

export function newCommand(args: string[]): void {
  const [category, name] = args;

  if (!category || !name) {
    process.stderr.write(
      pc.red("Usage: skill-mall new <category> <name>\n")
    );
    process.exit(1);
  }

  // Validate name
  if (!isValidSkillName(name)) {
    process.stderr.write(
      pc.red(
        `Invalid skill name: "${name}"\n` +
          "  Names must be lowercase letters, numbers, and hyphens only (max 64 chars).\n"
      )
    );
    process.exit(1);
  }

  if (!/^[a-z0-9-]+$/.test(category)) {
    process.stderr.write(
      pc.red(
        `Invalid category: "${category}"\n` +
          "  Categories must be lowercase letters, numbers, and hyphens only.\n"
      )
    );
    process.exit(1);
  }

  const repoRoot = requireRepoRoot();
  const templateDir = path.join(repoRoot, "skills", "_template");
  const destDir = path.join(repoRoot, "skills", category, name);

  if (!fs.existsSync(templateDir)) {
    process.stderr.write(
      pc.red(`Template not found at skills/_template/\n`)
    );
    process.exit(1);
  }

  if (fs.existsSync(destDir)) {
    process.stderr.write(
      pc.red(`Skill already exists: skills/${category}/${name}\n`)
    );
    process.exit(1);
  }

  console.log();
  console.log(
    pc.dim("Scaffolding ") +
      pc.bold(pc.green(`${category}/${name}`)) +
      pc.dim(" from template...")
  );

  // Copy template
  fs.mkdirSync(destDir, { recursive: true });
  copyDirRecursive(templateDir, destDir);

  // Patch SKILL.md
  const skillMdPath = path.join(destDir, "SKILL.md");
  if (fs.existsSync(skillMdPath)) {
    let content = fs.readFileSync(skillMdPath, "utf-8");
    content = content
      .replace(/^name: skill-name$/m, `name: ${name}`)
      .replace(/^category: development$/m, `category: ${category}`)
      .replace(/# Skill Name/g, `# ${titleCase(name)}`);
    fs.writeFileSync(skillMdPath, content, "utf-8");
  }

  // Patch README.md
  const readmePath = path.join(destDir, "README.md");
  if (fs.existsSync(readmePath)) {
    let content = fs.readFileSync(readmePath, "utf-8");
    content = content
      .replace(/# Skill Name/g, `# ${titleCase(name)}`)
      .replace(/One-line description of what this skill does\./g, name);
    fs.writeFileSync(readmePath, content, "utf-8");
  }

  console.log(
    pc.green("  Created: ") + pc.dim(`skills/${category}/${name}/`)
  );
  console.log();
  console.log(pc.bold("  Next steps:"));
  console.log(`    1. Edit  ${pc.cyan(`skills/${category}/${name}/SKILL.md`)}`);
  console.log(`    2. Edit  ${pc.cyan(`skills/${category}/${name}/README.md`)}`);
  console.log();
  console.log(pc.bold("  Character limit reminders:"));
  console.log(
    `    ${pc.yellow("name")}          max 64 chars  (lowercase letters/numbers/hyphens)`
  );
  console.log(
    `    ${pc.yellow("description")}   max 150 chars (front-load the trigger phrase)`
  );
  console.log(
    `    ${pc.yellow("when_to_use")}   max 150 chars (trigger phrases for Claude Code)`
  );
  console.log();
  console.log("  Validate when ready:");
  console.log(
    `    ${pc.cyan(`npx skill-mall validate skills/${category}/${name}/SKILL.md`)}`
  );
  console.log();
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
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
