import fs from "node:fs";
import path from "node:path";
import {
  deploySkill,
  requireRepoRoot,
  CLAUDE_SKILLS_DIR,
  pc,
} from "../utils.js";

export function deployCommand(args: string[]): void {
  const target = args[0];

  if (!target) {
    process.stderr.write(
      pc.red("Usage: skill-mall deploy <category/skill-name>\n")
    );
    process.exit(1);
  }

  const parts = target.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    process.stderr.write(
      pc.red(
        `Invalid skill path: "${target}". Expected format: <category>/<skill-name>\n`
      )
    );
    process.exit(1);
  }

  const [category, skillName] = parts;
  const repoRoot = requireRepoRoot();
  const srcDir = path.join(repoRoot, "skills", category, skillName);

  if (!fs.existsSync(srcDir)) {
    process.stderr.write(
      pc.red(`Skill not found: skills/${category}/${skillName}\n`)
    );
    console.log();
    console.log(
      "  Browse available skills:  " + pc.cyan("npx skill-mall list")
    );
    process.exit(1);
  }

  const skillMd = path.join(srcDir, "SKILL.md");
  if (!fs.existsSync(skillMd)) {
    process.stderr.write(
      pc.red(`No SKILL.md found in skills/${category}/${skillName}/\n`)
    );
    process.exit(1);
  }

  console.log();
  console.log(
    pc.dim("Deploying ") +
      pc.bold(pc.green(`${category}/${skillName}`)) +
      pc.dim(" to ") +
      pc.cyan(CLAUDE_SKILLS_DIR)
  );

  let destDir: string;
  try {
    destDir = deploySkill(srcDir, CLAUDE_SKILLS_DIR);
  } catch (err) {
    process.stderr.write(
      pc.red(
        `Deploy failed: ${err instanceof Error ? err.message : String(err)}\n`
      )
    );
    process.exit(1);
  }

  console.log(pc.green("  Deployed to: ") + pc.dim(destDir));
  console.log();
  console.log("  Invoke this skill in Claude Code with:");
  console.log("    " + pc.bold(pc.cyan(`/${skillName}`)));
  console.log();
}
