#!/usr/bin/env node
import { getAllSkills, getRepoRoot, pc } from "./utils.js";
import { listCommand } from "./commands/list.js";
import { findCommand } from "./commands/find.js";
import { deployCommand } from "./commands/deploy.js";
import { newCommand } from "./commands/new.js";
import { validateCommand } from "./commands/validate.js";
import { createCommand } from "./commands/create.js";
import { configureCommand } from "./commands/configure.js";
import { confirmResearchCommand } from "./commands/confirm-research.js";
import { deployPackCommand } from "./commands/deploy-pack.js";
import { forkCommand } from "./commands/fork.js";
import { revertCommand } from "./commands/revert.js";
import { publishCommand } from "./commands/publish.js";
import { budgetCheckCommand } from "./commands/budget-check.js";

const LOGO = `
${pc.bold(pc.cyan("  +-+-+-+-+-+-+-+-+-+-+"))}
${pc.bold(pc.cyan("  |S|k|i|l|l|M|a|l|l|"))}
${pc.bold(pc.cyan("  +-+-+-+-+-+-+-+-+-+-+"))}
  ${pc.dim("Claude Code skill catalog")}
`;

const HELP = `
${pc.bold("Usage:")}  npx skill-mall <command> [options]

${pc.bold("Commands:")}
  ${pc.cyan("list")} [--cat <category>]         List all skills in the catalog
  ${pc.cyan("find")} <query>                     Search skills.sh for related skills
  ${pc.cyan("deploy")} <category/name>           Copy a skill to ~/.claude/skills/
  ${pc.cyan("new")} <category> <name>            Scaffold a new skill from template
  ${pc.cyan("new")} --from-template <slug> <name> Scaffold from a domain starter in skills/_starters/
  ${pc.cyan("budget-check")} <cat/slug>          Simulate description visibility at N chars (--chars-available)
  ${pc.cyan("validate")} [path]                  Check frontmatter character limits
  ${pc.cyan("configure")} [--provider <p>]       Configure LLM provider for skill generation
  ${pc.cyan("create")} "<topic>" [--urls ...]    Research-first skill creation (pipeline)
  ${pc.cyan("confirm-research")} <slug>          Build skill from research-result.json

${pc.bold("Examples:")}
  npx skill-mall list
  npx skill-mall configure --provider claude-code
  npx skill-mall create "blue ocean strategy" --urls https://blueoceanstrategy.com/tools/
  npx skill-mall confirm-research blue-ocean-strategy
  npx skill-mall validate

${pc.bold("Character limits:")}
  name           max 64 chars  (lowercase letters/numbers/hyphens)
  description    max 150 chars (front-load the trigger phrase)
  when_to_use    max 150 chars (trigger phrases for Claude Code)
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case "list":
      listCommand(rest);
      break;

    case "find":
      await findCommand(rest);
      break;

    case "deploy":
      deployCommand(rest);
      break;

    case "new":
      newCommand(rest);
      break;

    case "validate":
      validateCommand(rest);
      break;

    case "create":
      await createCommand(rest);
      break;

    case "configure":
      await configureCommand(rest);
      break;

    case "confirm-research":
      await confirmResearchCommand(rest);
      break;

    case "deploy-pack":
      await deployPackCommand(rest);
      break;

    case "fork":
      await forkCommand(rest);
      break;

    case "revert":
      revertCommand(rest);
      break;

    case "publish":
      await publishCommand(rest);
      break;

    case "budget-check":
      budgetCheckCommand(rest);
      break;

    case "--help":
    case "-h":
    case "help":
      console.log(LOGO);
      console.log(HELP);
      break;

    case "--version":
    case "-v":
    case "version": {
      // Dynamically resolve version from package.json at runtime
      // This works whether running via tsx (dev) or from dist/
      try {
        const { createRequire } = await import("node:module");
        const require = createRequire(import.meta.url);
        // Walk up to find our own package.json
        const pkgPath = new URL("../../package.json", import.meta.url);
        const pkg = JSON.parse(
          (await import("node:fs")).readFileSync(
            new URL(pkgPath).pathname,
            "utf-8"
          )
        ) as { version: string };
        console.log(pkg.version);
      } catch {
        console.log("0.1.0");
      }
      break;
    }

    default: {
      // No command — show logo + help + live catalog stats
      console.log(LOGO);
      showStats();
      console.log(HELP);
      break;
    }
  }
}

function showStats(): void {
  const root = getRepoRoot();
  if (!root) return;

  try {
    const skills = getAllSkills(root);
    const categories = [...new Set(skills.map((s) => s.category))];

    console.log(
      `  ${pc.bold(pc.green(String(skills.length)))} skills` +
        `  across ${pc.bold(String(categories.length))} categories`
    );
    console.log();

    // Top categories by skill count
    const byCat: Record<string, number> = {};
    for (const s of skills) byCat[s.category] = (byCat[s.category] ?? 0) + 1;
    const sorted = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const line = sorted
      .map(([cat, count]) => `${pc.cyan(cat)} ${pc.dim(`(${count})`)}`)
      .join("  ");
    console.log("  " + line);
    console.log();
  } catch {
    // Non-fatal — stats are cosmetic
  }
}

main().catch((err) => {
  process.stderr.write(
    pc.red(`Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`)
  );
  process.exit(1);
});
