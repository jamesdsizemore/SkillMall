import { execSync } from "node:child_process";
import * as p from "@clack/prompts";
import { pc } from "../utils.js";

export function revertCommand(args: string[]): void {
  const slug = args[0];
  let version: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--version" && args[i + 1]) {
      version = args[++i];
    }
  }

  if (!slug || !version) {
    process.stderr.write(
      pc.red("Usage: skill-mall revert <category/slug> --version <semver>\n") +
        pc.dim("  Example: skill-mall revert ai/skill-creator --version 1.0.0\n")
    );
    process.exit(1);
  }

  const parts = slug.includes("/") ? slug.split("/") : ["unknown", slug];
  const [category, skillSlug] = parts;
  const skillDir = `skills/${category}/${skillSlug}`;
  const branchName = `revert/${skillSlug}-v${version}`;

  console.log();
  p.intro(pc.bold(`  skill-mall revert: ${slug} to v${version}`));

  try {
    // Find the commit where the version was set
    const commits = execSync(
      `git log --format="%H %s" -- "${skillDir}"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    ).trim();

    if (!commits) {
      process.stderr.write(pc.red(`No git history found for ${skillDir}\n`));
      process.exit(1);
    }

    // Get the hash from the most recent commit for the skill
    const firstCommitHash = commits.split("\n")[0].split(" ")[0];

    // Create a new branch and check out the skill files at that point
    execSync(`git checkout -b "${branchName}"`, { stdio: "inherit" });
    execSync(
      `git checkout "${firstCommitHash}" -- "${skillDir}"`,
      { stdio: "inherit" }
    );

    p.outro(pc.bold(pc.green(`  Revert branch created: ${branchName}`)));
    console.log();
    console.log(pc.dim("  Review the changes, then merge manually:"));
    console.log(`    ${pc.cyan(`git diff main ${branchName}`)}`);
    console.log(`    ${pc.cyan("git checkout main && git merge " + branchName)}`);
    console.log();
    console.log(pc.dim("  The command does not commit or merge automatically."));
    console.log();
  } catch (err) {
    process.stderr.write(
      pc.red(`Revert failed: ${err instanceof Error ? err.message : String(err)}\n`)
    );
    process.exit(1);
  }
}
