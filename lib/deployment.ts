import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  detectAgentsForScope,
  deployToAgents,
  type DeployAgentResult,
  type DetectedAgent,
} from "./agents/detector";
import { getAvailableLocales, getLocaleContent } from "./i18n";

export type DeployScope = "user" | "project";

export interface SkillDeploySource {
  skillDir: string;
  category: string;
  skillName: string;
}

export interface LocaleDeployResult {
  destDir: string;
  requestedLocale: string;
  availableLocales: string[];
  fellBackToCanonical: boolean;
}

export interface AgentDeploySummary {
  agents: DetectedAgent[];
  results: DeployAgentResult[];
  deployed: string[];
  failed: Array<{ agent: string; error?: string }>;
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function getClaudeSkillsDir(scope: DeployScope = "user"): string {
  return scope === "project"
    ? path.join(process.cwd(), ".claude", "skills")
    : path.join(os.homedir(), ".claude", "skills");
}

export function resolveSkillDeploySource(
  repoRoot: string,
  target: string
): SkillDeploySource | null {
  const parts = target.split("/");
  if (parts.length === 2) {
    const [category, skillName] = parts;
    const skillDir = path.join(repoRoot, "skills", category, skillName);
    return fs.existsSync(skillDir) ? { skillDir, category, skillName } : null;
  }

  const skillsDir = path.join(repoRoot, "skills");
  if (!fs.existsSync(skillsDir)) return null;

  for (const category of fs.readdirSync(skillsDir)) {
    const skillDir = path.join(skillsDir, category, target);
    if (fs.existsSync(skillDir)) {
      return { skillDir, category, skillName: target };
    }
  }

  return null;
}

export function deploySkillToBase(
  source: SkillDeploySource,
  destBase: string
): string {
  const destDir = path.join(destBase, source.category, source.skillName);
  copyDirRecursive(source.skillDir, destDir);
  return destDir;
}

export function deployLocalizedSkillToBase(
  source: SkillDeploySource,
  lang: string,
  destBase: string
): LocaleDeployResult {
  const destDir = path.join(destBase, source.category, source.skillName);
  const localeFile = path.join(source.skillDir, `SKILL.${lang}.md`);
  const availableLocales = getAvailableLocales(source.skillDir);
  const content = getLocaleContent(source.skillDir, lang);

  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(source.skillDir, { withFileTypes: true })) {
    const srcPath = path.join(source.skillDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (!entry.name.startsWith("SKILL")) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  fs.writeFileSync(path.join(destDir, "SKILL.md"), content, "utf-8");

  return {
    destDir,
    requestedLocale: lang,
    availableLocales,
    fellBackToCanonical: !fs.existsSync(localeFile),
  };
}

export function deploySkillToAgents(
  source: SkillDeploySource,
  options: { agentIds?: string[]; scope?: DeployScope } = {}
): AgentDeploySummary {
  const scope = options.scope ?? "user";
  const agents = detectAgentsForScope(scope);
  const results = deployToAgents(source.skillDir, options.agentIds, scope);

  return {
    agents,
    results,
    deployed: results.filter((result) => result.success).map((result) => result.agent.id),
    failed: results
      .filter((result) => !result.success)
      .map((result) => ({ agent: result.agent.id, error: result.error })),
  };
}
