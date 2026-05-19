import {
  requireRepoRoot,
  pc,
} from "../utils.js";
import {
  deployLocalizedSkillToBase,
  deploySkillToAgents,
  deploySkillToBase,
  getClaudeSkillsDir,
  resolveSkillDeploySource,
} from "@/lib/deployment.js";

export function deployCommand(args: string[]): void {
  const positional: string[] = [];
  let allAgents = false;
  let agentList: string[] = [];
  let lang: string | null = null;
  let scope: 'user' | 'project' = 'user';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--all-agents") {
      allAgents = true;
    } else if (args[i] === "--agents" && args[i + 1]) {
      agentList = args[++i].split(",").map((s) => s.trim());
    } else if (args[i] === "--lang" && args[i + 1]) {
      lang = args[++i];
    } else if (args[i] === "--scope" && args[i + 1]) {
      const s = args[++i];
      if (s === "project" || s === "user") scope = s;
    } else if (!args[i].startsWith("--")) {
      positional.push(args[i]);
    }
  }

  const target = positional[0];

  if (!target) {
    process.stderr.write(
      pc.red("Usage: skill-mall deploy <category/skill-name> [--scope project|user] [--lang <locale>] [--all-agents] [--agents <id,id>]\n")
    );
    process.exit(1);
  }

  const repoRoot = requireRepoRoot();
  const source = resolveSkillDeploySource(repoRoot, target);

  if (!source) {
    process.stderr.write(pc.red(`Skill not found: ${target}\n`));
    process.exit(1);
  }

  const skillName = source.skillName;

  // --lang mode: deploy locale-specific SKILL.<locale>.md as SKILL.md
  if (lang) {
    const result = deployLocalizedSkillToBase(source, lang, getClaudeSkillsDir("user"));

    console.log();
    console.log(
      pc.dim("Deploying ") +
        pc.bold(pc.green(skillName)) +
        pc.dim(` [${lang}] to `) +
        pc.cyan(result.destDir)
    );

    if (result.fellBackToCanonical) {
      if (result.availableLocales.length > 0) {
        process.stderr.write(
          pc.yellow(`No SKILL.${lang}.md found. Available: ${result.availableLocales.join(", ")}\n`) +
          pc.dim("  Falling back to canonical SKILL.md\n")
        );
      } else {
        process.stderr.write(pc.dim(`No SKILL.${lang}.md found — deploying canonical SKILL.md\n`));
      }
    }

    console.log(pc.green("  Deployed to: ") + pc.dim(result.destDir));
    console.log();
    return;
  }

  // Multi-agent deploy
  if (allAgents || agentList.length > 0) {
    console.log();
    console.log(pc.dim(`Deploying ${skillName}...`));
    console.log();

    const summary = deploySkillToAgents(source, {
      agentIds: agentList.length > 0 ? agentList : undefined,
      scope,
    });

    for (const agent of summary.agents) {
      const result = summary.results.find((r) => r.agent.id === agent.id);
      if (!agent.detected) {
        console.log(`  ${pc.dim(agent.name.padEnd(20))} not detected — skipped`);
      } else if (result?.success) {
        console.log(`  ${pc.green(agent.name.padEnd(20))} deployed ✓`);
      } else if (result) {
        console.log(`  ${pc.red(agent.name.padEnd(20))} failed: ${result.error}`);
      }
    }

    console.log();
    console.log(pc.dim(`Deployed to ${summary.deployed.length} of ${summary.results.length} detected agent(s).`));
    console.log();
    return;
  }

  // Single-agent deploy (Claude Code default)
  const destBase = getClaudeSkillsDir(scope);

  console.log();
  console.log(
    pc.dim("Deploying ") +
      pc.bold(pc.green(skillName)) +
      pc.dim(scope === 'project' ? " [project] to " : " to ") +
      pc.cyan(destBase)
  );

  let destDir: string;
  try {
    destDir = deploySkillToBase(source, destBase);
  } catch (err) {
    process.stderr.write(
      pc.red(`Deploy failed: ${err instanceof Error ? err.message : String(err)}\n`)
    );
    process.exit(1);
  }

  console.log(pc.green("  Deployed to: ") + pc.dim(destDir));
  console.log();
  console.log("  Invoke this skill in Claude Code with:");
  console.log("    " + pc.bold(pc.cyan(`/${skillName}`)));
  console.log();
}
