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
import { getLocaleContent, getAvailableLocales } from "@/lib/i18n.js";

function resolveSkillDir(repoRoot: string, target: string): string | null {
  const parts = target.split("/");
  if (parts.length === 2) {
    const dir = path.join(repoRoot, "skills", parts[0], parts[1]);
    return fs.existsSync(dir) ? dir : null;
  }
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
  const srcDir = resolveSkillDir(repoRoot, target);

  if (!srcDir) {
    process.stderr.write(pc.red(`Skill not found: ${target}\n`));
    process.exit(1);
  }

  const skillName = path.basename(srcDir);

  // --lang mode: deploy locale-specific SKILL.<locale>.md as SKILL.md
  if (lang) {
    const localeFile = path.join(srcDir, `SKILL.${lang}.md`);
    const destBase = CLAUDE_SKILLS_DIR;
    const destDir = path.join(destBase, path.basename(path.dirname(srcDir)), skillName);

    if (!fs.existsSync(localeFile)) {
      const available = getAvailableLocales(srcDir);
      if (available.length > 0) {
        process.stderr.write(
          pc.yellow(`No SKILL.${lang}.md found. Available: ${available.join(", ")}\n`) +
          pc.dim("  Falling back to canonical SKILL.md\n")
        );
      } else {
        process.stderr.write(pc.dim(`No SKILL.${lang}.md found — deploying canonical SKILL.md\n`));
      }
    }

    const content = getLocaleContent(srcDir, lang);

    console.log();
    console.log(
      pc.dim("Deploying ") +
        pc.bold(pc.green(skillName)) +
        pc.dim(` [${lang}] to `) +
        pc.cyan(destDir)
    );

    fs.mkdirSync(destDir, { recursive: true });

    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const subSrc = path.join(srcDir, entry.name);
        const subDest = path.join(destDir, entry.name);
        fs.mkdirSync(subDest, { recursive: true });
        copyDirRecursive(subSrc, subDest);
      } else if (!entry.name.startsWith("SKILL")) {
        fs.copyFileSync(path.join(srcDir, entry.name), path.join(destDir, entry.name));
      }
    }

    fs.writeFileSync(path.join(destDir, "SKILL.md"), content, "utf-8");
    console.log(pc.green("  Deployed to: ") + pc.dim(destDir));
    console.log();
    return;
  }

  // Multi-agent deploy
  if (allAgents || agentList.length > 0) {
    console.log();
    console.log(pc.dim(`Deploying ${skillName}...`));
    console.log();

    const results = deployToAgents(srcDir, agentList.length > 0 ? agentList : undefined, scope);
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

  // Single-agent deploy (Claude Code default)
  const destBase = scope === 'project'
    ? path.join(process.cwd(), ".claude", "skills")
    : CLAUDE_SKILLS_DIR;

  console.log();
  console.log(
    pc.dim("Deploying ") +
      pc.bold(pc.green(skillName)) +
      pc.dim(scope === 'project' ? " [project] to " : " to ") +
      pc.cyan(destBase)
  );

  let destDir: string;
  try {
    destDir = deploySkill(srcDir, destBase);
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

function copyDirRecursive(src: string, dest: string): void {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
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
