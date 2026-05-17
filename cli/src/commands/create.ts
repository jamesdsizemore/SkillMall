import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import {
  requireRepoRoot,
  isValidSkillName,
  pc,
} from "../utils.js";
import { validateCommand } from "./validate.js";

interface SkillsShResult {
  id: string;
  name: string;
  installs: number;
  source: string;
}

interface SkillsShResponse {
  skills: SkillsShResult[];
}

export async function createCommand(args: string[]): Promise<void> {
  const description = args.join(" ").trim();

  if (!description) {
    process.stderr.write(
      pc.red('Usage: skill-mall create "<description>"\n') +
        pc.dim('  Example: skill-mall create "write conventional commit messages"\n')
    );
    process.exit(1);
  }

  const repoRoot = requireRepoRoot();

  console.log();
  p.intro(pc.bold("  skill-mall create"));
  console.log();
  console.log(pc.dim("  Description: ") + description);
  console.log();

  // Step 1: Search skills.sh
  console.log(pc.dim("  [1/5] Searching skills.sh for related skills..."));

  let related: SkillsShResult[] = [];
  try {
    const url = `https://skills.sh/api/search?q=${encodeURIComponent(description)}&limit=5`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as SkillsShResponse;
      related = data.skills ?? [];
    }
  } catch {
    // Non-fatal — proceed without related skills
    console.log(pc.yellow("  Could not reach skills.sh. Continuing without related skills."));
  }

  if (related.length > 0) {
    console.log();
    console.log(
      pc.bold(`  Related skills on skills.sh (${related.length} found):`)
    );
    for (const skill of related) {
      console.log(
        `    ${pc.green(skill.name)}  ` +
          pc.dim(`${skill.installs ?? 0} installs`) +
          (skill.source ? pc.dim(`  ${skill.source}`) : "")
      );
    }
    console.log();

    const useExisting = await p.confirm({
      message: "A related skill exists on skills.sh. Continue creating a new one?",
      initialValue: true,
    });

    if (p.isCancel(useExisting) || !useExisting) {
      p.cancel("Cancelled.");
      console.log();
      console.log(
        "  Try deploying an existing skill:  " +
          pc.cyan("npx skill-mall deploy <category/name>")
      );
      console.log();
      process.exit(0);
    }
  } else {
    console.log(pc.dim("  No related skills found on skills.sh."));
  }

  // Step 2: Confirm skill name / category / description
  console.log();
  console.log(pc.dim("  [2/5] Configure the new skill:"));
  console.log();

  // Suggest a name from the description
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
      const dest = path.join(repoRoot, "skills");
      // Check uniqueness across all categories
      for (const cat of categories) {
        if (fs.existsSync(path.join(dest, cat, val))) {
          return `A skill named "${val}" already exists in category "${cat}"`;
        }
      }
    },
  });

  if (p.isCancel(skillName)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const categoryChoice = await p.select({
    message: "Category:",
    options: categories.map((c) => ({ value: c, label: c })),
  });

  if (p.isCancel(categoryChoice)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const skillDescription = await p.text({
    message: "One-line description (max 150 chars, front-load the trigger phrase):",
    placeholder: description.slice(0, 150),
    initialValue: description.slice(0, 150),
    validate(val) {
      if (!val) return "Description is recommended";
      if (val.length > 150)
        return `Description too long: ${val.length} chars (max 150)`;
    },
  });

  if (p.isCancel(skillDescription)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  // Step 3: Scaffold
  console.log();
  console.log(pc.dim("  [3/5] Scaffolding skill..."));

  const finalName = String(skillName);
  const finalCategory = String(categoryChoice);
  const templateDir = path.join(repoRoot, "skills", "_template");
  const destDir = path.join(repoRoot, "skills", finalCategory, finalName);

  if (!fs.existsSync(templateDir)) {
    process.stderr.write(
      pc.red("Template not found at skills/_template/\n")
    );
    process.exit(1);
  }

  fs.mkdirSync(destDir, { recursive: true });
  copyDirRecursive(templateDir, destDir);

  // Patch SKILL.md
  const skillMdPath = path.join(destDir, "SKILL.md");
  if (fs.existsSync(skillMdPath)) {
    let content = fs.readFileSync(skillMdPath, "utf-8");
    content = content
      .replace(/^name: skill-name$/m, `name: ${finalName}`)
      .replace(/^category: development$/m, `category: ${finalCategory}`)
      .replace(
        /^description: One-line key use case\..*$/m,
        `description: ${String(skillDescription)}`
      )
      .replace(/# Skill Name/g, `# ${titleCase(finalName)}`);
    fs.writeFileSync(skillMdPath, content, "utf-8");
  }

  // Patch README.md
  const readmePath = path.join(destDir, "README.md");
  if (fs.existsSync(readmePath)) {
    let content = fs.readFileSync(readmePath, "utf-8");
    content = content
      .replace(/# Skill Name/g, `# ${titleCase(finalName)}`)
      .replace(
        /One-line description of what this skill does\./g,
        String(skillDescription)
      );
    fs.writeFileSync(readmePath, content, "utf-8");
  }

  console.log(
    pc.green("  Created: ") +
      pc.dim(`skills/${finalCategory}/${finalName}/`)
  );

  // Step 4: Validate
  console.log();
  console.log(pc.dim("  [4/5] Validating..."));
  try {
    validateCommand([skillMdPath]);
  } catch {
    // validateCommand calls process.exit on errors; if we get here it passed
  }

  // Step 5: Print deploy command
  console.log(pc.dim("  [5/5] Done."));
  console.log();
  p.outro(pc.bold(pc.green("  Skill scaffolded successfully.")));
  console.log();
  console.log("  Edit the skill:");
  console.log(
    `    ${pc.cyan(`skills/${finalCategory}/${finalName}/SKILL.md`)}`
  );
  console.log();
  console.log("  Deploy when ready:");
  console.log(
    `    ${pc.cyan(`npx skill-mall deploy ${finalCategory}/${finalName}`)}`
  );
  console.log();
}

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
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
