import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import { pc } from "../utils.js";

interface CollectionSkill {
  slug: string;
  order: number;
  note: string | null;
}

interface Collection {
  name: string;
  slug: string;
  description: string;
  author: string;
  skills: CollectionSkill[];
}

function findCollection(slug: string): Collection | null {
  const collectionsDir = path.join(process.cwd(), "collections");
  const jsonPath = path.join(collectionsDir, slug, "collection.json");
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as Collection;
  } catch {
    return null;
  }
}

function getAgentSkillsDir(agentId: string, scope: 'user' | 'project' = 'user'): string | null {
  const base = scope === 'project' ? process.cwd() : (process.env.HOME ?? process.env.USERPROFILE ?? "");
  const dirs: Record<string, string> = {
    "claude-code": path.join(base, ".claude", "skills"),
    cursor: path.join(base, ".cursor", "skills"),
    codex: path.join(base, ".codex", "skills"),
    agents: path.join(base, ".agents", "skills"),
  };
  return dirs[agentId] ?? null;
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function resolveSkillPath(skillSlug: string): string | null {
  const skillsDir = path.join(process.cwd(), "skills");
  // slug may be 'category/skill-name' or just 'skill-name'
  if (skillSlug.includes("/")) {
    const full = path.join(skillsDir, skillSlug);
    return fs.existsSync(full) ? full : null;
  }
  // Search all categories
  if (!fs.existsSync(skillsDir)) return null;
  for (const cat of fs.readdirSync(skillsDir)) {
    const candidate = path.join(skillsDir, cat, skillSlug);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export async function deployPackCommand(args: string[]): Promise<void> {
  const [slug, ...rest] = args;
  let agentId = "claude-code";
  let scope: 'user' | 'project' = 'user';

  for (let i = 0; i < rest.length; i++) {
    if ((rest[i] === "--agent" || rest[i] === "-a") && rest[i + 1]) {
      agentId = rest[++i];
    } else if (rest[i] === "--scope" && rest[i + 1]) {
      const s = rest[++i];
      if (s === "project" || s === "user") scope = s;
    }
  }

  if (!slug) {
    process.stderr.write(
      pc.red("Usage: skill-mall deploy-pack <collection-slug> [--agent <agent>] [--scope project|user]\n") +
        pc.dim("  Example: skill-mall deploy-pack full-stack-developer-kit --agent claude-code\n")
    );
    process.exit(1);
  }

  const collection = findCollection(slug);
  if (!collection) {
    process.stderr.write(pc.red(`Collection not found: ${slug}\n`));
    process.exit(1);
  }

  const agentDir = getAgentSkillsDir(agentId, scope);
  if (!agentDir) {
    process.stderr.write(pc.red(`Unknown agent: ${agentId}\n`));
    process.exit(1);
  }

  console.log();
  p.intro(pc.bold(`  skill-mall deploy-pack: ${collection.name}`));
  console.log(`  Target: ${agentId} [${scope}] → ${agentDir}`);
  console.log();

  const sorted = [...collection.skills].sort((a, b) => a.order - b.order);
  let failures = 0;

  for (const skill of sorted) {
    const skillPath = resolveSkillPath(skill.slug);
    const skillName = skill.slug.split("/").pop() ?? skill.slug;

    if (!skillPath) {
      console.log(`  ${pc.red("✗")} ${skillName} — not found in catalog`);
      failures++;
      continue;
    }

    try {
      const dest = path.join(agentDir, skillName);
      copyDirRecursive(skillPath, dest);
      const noteStr = skill.note ? pc.dim(` (${skill.note})`) : "";
      console.log(`  ${pc.green("✓")} ${skillName} → deployed${noteStr}`);
    } catch (err) {
      console.log(`  ${pc.red("✗")} ${skillName} — ${err instanceof Error ? err.message : String(err)}`);
      failures++;
    }
  }

  console.log();
  if (failures === 0) {
    p.outro(pc.bold(pc.green(`  ${sorted.length} skill(s) deployed to ${agentId}.`)));
    process.exit(0);
  } else {
    p.outro(pc.bold(pc.yellow(`  ${sorted.length - failures}/${sorted.length} deployed. ${failures} failed.`)));
    process.exit(1);
  }
}
