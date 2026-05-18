import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  deploySkill,
  requireRepoRoot,
  CLAUDE_SKILLS_DIR,
  pc,
} from "../utils.js";
import { detectAgents, deployToAgents } from "@/lib/agents/detector.js";

function resolveSkillDir(repoRoot: string, target: string): string | null {
  const parts = target.split("/");
  if (parts.length === 2) {
    const dir = path.join(repoRoot, "skills", parts[0], parts[1]);
    return fs.existsSync(dir) ? dir : null;
  }
  // Search all categories
  const skillsDir = path.join(repoRoot, "skills");
  if (!fs.existsSync(skillsDir)) return null;
  for (const cat of fs.readdirSync(skillsDir)) {
    const candidate = path.join(skillsDir, cat, target);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function deployCommand(args: string[]): void {
  const positional: string[] = [];
  let allAgents = false;
  let agentList: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--all-agents") {
      allAgents = true;
    } else if (args[i] === "--agents" && args[i + 1]) {
      agentList = args[++i].split(",").map((s) => s.trim());
    } else if (!args[i].startsWith("--")) {
      positional.push(args[i]);
    }
  }

  const target = positional[0];

  if (!target) {
    process.stderr.write(
      pc.red("Usage: skill-mall deploy <category/skill-name> [--all-agents] [--agents <id,id>]\n")
    );
    process.exit(1);
  }

  const repoRoot = requireRepoRoot();
  const srcDir = resolveSkillDir(repoRoot, target);

  if (!srcDir) {
    process.stderr.write(pc.red(`Skill not found: ${target}\n`));
    process.exit(1);
  }

  const skillName = path.basename(srcDir);

  // Multi-agent deploy
  if (allAgents || agentList.length > 0) {
    console.log();
    console.log(pc.dim(`Deploying ${skillName}...`));
    console.log();

    const results = deployToAgents(srcDir, agentList.length > 0 ? agentList : undefined);
    const all = detectAgents();

    for (const agent of all) {
      const result = results.find((r) => r.agent.id === agent.id);
      if (!agent.detected) {
        console.log(`  ${pc.dim(agent.name.padEnd(20))} not detected — skipped`);
      } else if (result?.success) {
        console.log(`  ${pc.green(agent.name.padEnd(20))} deployed ✓`);
      } else if (result) {
        console.log(`  ${pc.red(agent.name.padEnd(20))} failed: ${result.error}`);
      }
    }

    const deployed = results.filter((r) => r.success).length;
    console.log();
    console.log(pc.dim(`Deployed to ${deployed} of ${results.length} detected agent(s).`));
    console.log();
    return;
  }

  // Single-agent deploy (original behavior, defaults to Claude Code)
  console.log();
  console.log(
    pc.dim("Deploying ") +
      pc.bold(pc.green(skillName)) +
      pc.dim(" to ") +
      pc.cyan(CLAUDE_SKILLS_DIR)
  );

  let destDir: string;
  try {
    destDir = deploySkill(srcDir, CLAUDE_SKILLS_DIR);
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
