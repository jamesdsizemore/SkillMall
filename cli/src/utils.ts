import matter from "gray-matter";
import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { getAllSkills as getCatalogSkills } from "@/lib/skills.js";

export interface SkillFrontmatter {
  name: string;
  description?: string;
  when_to_use?: string;
  version?: string;
  category?: string;
  tags?: string[];
  author?: string;
  license?: string;
  linked_skills?: string[];
  "disable-model-invocation"?: boolean;
  "user-invocable"?: boolean;
  "allowed-tools"?: string;
  "argument-hint"?: string;
  context?: string;
  agent?: string;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  filePath: string;
  skillDir: string;
  category: string;
  skillName: string;
  hasReadme: boolean;
}

/** Parse a SKILL.md file and return frontmatter + metadata */
export function parseSkillFrontmatter(filePath: string): ParsedSkill {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const fm = parsed.data as SkillFrontmatter;
  const skillDir = path.dirname(filePath);
  const skillName = path.basename(skillDir);
  const category = path.basename(path.dirname(skillDir));
  const hasReadme = fs.existsSync(path.join(skillDir, "README.md"));

  return {
    frontmatter: fm,
    filePath,
    skillDir,
    category,
    skillName,
    hasReadme,
  };
}

/** Walk the skills/ directory and return all parsed skills */
export function getAllSkills(repoRoot: string): ParsedSkill[] {
  return getCatalogSkills({ repoRoot }).map((skill) => ({
    frontmatter: {
      name: skill.name,
      description: skill.description,
      version: skill.version,
      category: skill.category,
      tags: skill.tags,
      author: skill.author,
      license: skill.license,
      linked_skills: skill.linked_skills,
    },
    filePath: path.join(repoRoot, "skills", skill.path),
    skillDir: path.join(repoRoot, "skills", skill.category, skill.slug),
    category: skill.category,
    skillName: skill.slug,
    hasReadme: skill.hasReadme,
  }));
}

/** Copy a skill directory to a destination base path */
export function deploySkill(srcDir: string, destBase: string): string {
  const skillName = path.basename(srcDir);
  const category = path.basename(path.dirname(srcDir));
  const destDir = path.join(destBase, category, skillName);

  fs.mkdirSync(destDir, { recursive: true });
  copyDirRecursive(srcDir, destDir);
  return destDir;
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

/**
 * Walk up from cwd until we find skills/_template/SKILL.md.
 * Returns the repo root or null if not found.
 */
export function getRepoRoot(): string | null {
  let dir = process.cwd();
  while (true) {
    const marker = path.join(dir, "skills", "_template", "SKILL.md");
    if (fs.existsSync(marker)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Require a repo root or exit with a helpful error */
export function requireRepoRoot(): string {
  const root = getRepoRoot();
  if (!root) {
    process.stderr.write(
      pc.red("Not inside a skill-mall repository.") +
        " Run from the repo root or a subdirectory.\n"
    );
    process.exit(1);
  }
  return root;
}

/** Truncate a string to maxLen chars, appending ellipsis if truncated */
export function truncate(s: string, maxLen: number): string {
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "..." : s;
}

/** Validate a skill name format: lowercase letters, numbers, hyphens; max 64 chars */
export function isValidSkillName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name) && name.length <= 64;
}

/** Expand ~ in paths */
export function expandHome(p: string): string {
  if (p.startsWith("~")) {
    return path.join(process.env.HOME ?? "/tmp", p.slice(1));
  }
  return p;
}

export const CLAUDE_SKILLS_DIR = expandHome("~/.claude/skills");

// Color shortcuts (re-export so commands don't need to import picocolors separately)
export { pc };
