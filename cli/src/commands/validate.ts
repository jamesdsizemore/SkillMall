import fs from "node:fs";
import path from "node:path";
import {
  parseSkillFrontmatter,
  getAllSkills,
  requireRepoRoot,
  isValidSkillName,
  pc,
} from "../utils.js";

interface ValidationResult {
  skillPath: string;
  errors: string[];
  warnings: string[];
}

const NAME_MAX = 64;
const DESC_MAX = 150;
const WHEN_MAX = 150;

export function validateCommand(args: string[]): void {
  const targetPath = args[0];
  const repoRoot = requireRepoRoot();

  let targets: string[] = [];

  if (targetPath) {
    // Resolve to absolute path
    const abs = path.isAbsolute(targetPath)
      ? targetPath
      : path.resolve(process.cwd(), targetPath);

    // If it's a SKILL.md file directly
    if (abs.endsWith("SKILL.md") && fs.existsSync(abs)) {
      targets = [abs];
    } else if (fs.statSync(abs).isDirectory()) {
      // Directory containing SKILL.md
      const skillMd = path.join(abs, "SKILL.md");
      if (fs.existsSync(skillMd)) {
        targets = [skillMd];
      } else {
        process.stderr.write(
          pc.red(`No SKILL.md found in: ${abs}\n`)
        );
        process.exit(1);
      }
    } else {
      process.stderr.write(
        pc.red(`Path not found or not a SKILL.md file: ${abs}\n`)
      );
      process.exit(1);
    }
  } else {
    // Validate all skills
    const allSkills = getAllSkills(repoRoot);
    targets = allSkills.map((s) => s.filePath);
  }

  if (targets.length === 0) {
    console.log(pc.yellow("No SKILL.md files to validate."));
    return;
  }

  console.log();
  console.log(
    pc.bold(
      `  Validating ${targets.length} skill${targets.length === 1 ? "" : "s"}...`
    )
  );
  console.log();

  const results: ValidationResult[] = [];

  for (const filePath of targets) {
    results.push(validateSingleSkill(filePath));
  }

  let errorCount = 0;
  let warnCount = 0;

  for (const result of results) {
    const skillDir = path.dirname(result.skillPath);
    const relPath = path.relative(repoRoot, result.skillPath);
    const hasErrors = result.errors.length > 0;
    const hasWarns = result.warnings.length > 0;

    if (!hasErrors && !hasWarns) {
      console.log("  " + pc.green("OK") + "  " + pc.dim(relPath));
    } else {
      const tag = hasErrors ? pc.red("ERROR") : pc.yellow("WARN ");
      console.log("  " + tag + "  " + relPath);

      for (const err of result.errors) {
        console.log("         " + pc.red("x") + " " + err);
        errorCount++;
      }
      for (const warn of result.warnings) {
        console.log("         " + pc.yellow("!") + " " + warn);
        warnCount++;
      }
    }
  }

  console.log();

  const okCount = results.filter(
    (r) => r.errors.length === 0 && r.warnings.length === 0
  ).length;

  if (errorCount === 0 && warnCount === 0) {
    console.log(
      pc.green("  All skills valid.") +
        pc.dim(` (${results.length} checked)`)
    );
  } else {
    console.log(
      pc.dim(`  ${okCount} OK`) +
        (warnCount ? pc.yellow(`  ${warnCount} warning${warnCount === 1 ? "" : "s"}`) : "") +
        (errorCount ? pc.red(`  ${errorCount} error${errorCount === 1 ? "" : "s"}`) : "")
    );
  }

  console.log();

  if (errorCount > 0) {
    process.exit(1);
  }
}

function validateSingleSkill(filePath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const skillDir = path.dirname(filePath);

  let parsed: ReturnType<typeof parseSkillFrontmatter>;
  try {
    parsed = parseSkillFrontmatter(filePath);
  } catch (err) {
    return {
      skillPath: filePath,
      errors: [
        `Could not parse SKILL.md: ${err instanceof Error ? err.message : String(err)}`,
      ],
      warnings: [],
    };
  }

  const { frontmatter } = parsed;

  // --- name ---
  if (!frontmatter.name || frontmatter.name === "skill-name") {
    errors.push("name is required and must not be the template placeholder");
  } else {
    if (frontmatter.name.length > NAME_MAX) {
      errors.push(
        `name too long: ${frontmatter.name.length} chars (max ${NAME_MAX})`
      );
    }
    if (!isValidSkillName(frontmatter.name)) {
      errors.push(
        `name contains invalid characters: "${frontmatter.name}". Use lowercase letters, numbers, and hyphens only.`
      );
    }
  }

  // --- description ---
  if (!frontmatter.description) {
    warnings.push("description is recommended");
  } else {
    if (frontmatter.description.length > DESC_MAX) {
      errors.push(
        `description too long: ${frontmatter.description.length} chars (max ${DESC_MAX})`
      );
    }
  }

  // --- when_to_use ---
  if (frontmatter.when_to_use !== undefined) {
    if (frontmatter.when_to_use.length > WHEN_MAX) {
      errors.push(
        `when_to_use too long: ${frontmatter.when_to_use.length} chars (max ${WHEN_MAX})`
      );
    }
  }

  // --- version ---
  if (!frontmatter.version) {
    warnings.push("version is recommended (e.g. 1.0.0)");
  }

  // --- category ---
  if (!frontmatter.category) {
    warnings.push("category is recommended");
  }

  // --- author ---
  if (!frontmatter.author) {
    warnings.push("author is recommended");
  }

  // --- README.md ---
  const readmePath = path.join(skillDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    warnings.push("README.md is missing");
  }

  return { skillPath: filePath, errors, warnings };
}
