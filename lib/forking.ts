import fs from "fs";
import path from "path";
import { getSkill, getAllSkills } from "./skills";
import { logForkEvent } from "./analytics";

export interface ForkResult {
  sourceSlug: string;
  sourceVersion: string;
  newSlug: string;
  newPath: string;
  category: string;
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

function getExistingForkChain(content: string): string[] {
  const match = content.match(/fork_chain:\s*\n((?:\s+-\s+.+\n?)+)/);
  if (!match) return [];
  return match[1]
    .trim()
    .split("\n")
    .map((l) => l.replace(/^\s+-\s+"?/, "").replace(/"?$/, "").trim())
    .filter(Boolean);
}

/**
 * Fork a skill into a new directory with forked_from frontmatter tracking.
 * Creates an independent copy — changes to the original never propagate automatically.
 */
export function forkSkill(
  sourceCategory: string,
  sourceSlug: string,
  newSlug: string,
  targetCategory?: string
): ForkResult {
  const source = getSkill(sourceCategory, sourceSlug);
  if (!source) {
    throw new Error(`Skill not found: ${sourceCategory}/${sourceSlug}`);
  }

  const effectiveCategory = targetCategory ?? sourceCategory;
  // source.path is relative to the skills/ directory
  const sourceDir = path.join(process.cwd(), "skills", path.dirname(source.path));
  const destDir = path.join(process.cwd(), "skills", effectiveCategory, newSlug);

  if (fs.existsSync(destDir)) {
    throw new Error(
      `Destination already exists: skills/${effectiveCategory}/${newSlug}. Remove it first or choose a different slug.`
    );
  }

  copyDirRecursive(sourceDir, destDir);

  const skillMdPath = path.join(destDir, "SKILL.md");
  let content = fs.readFileSync(skillMdPath, "utf-8");

  // Update name field
  content = content.replace(/^name:\s*.+$/m, `name: ${newSlug}`);

  // Build fork metadata
  const existingChain = getExistingForkChain(content);
  const forkedFrom = `${sourceSlug}@${source.version}`;
  const fullChain = [...existingChain, forkedFrom];

  const metaLines =
    fullChain.length === 1
      ? `  forked_from: "${forkedFrom}"`
      : `  forked_from: "${forkedFrom}"\n  fork_chain:\n${fullChain
          .map((e) => `    - "${e}"`)
          .join("\n")}`;

  // Inject into existing metadata section or create one
  if (/^metadata:/m.test(content)) {
    content = content.replace(/^(metadata:\n)/m, `$1${metaLines}\n`);
  } else {
    // Add before closing ---
    const parts = content.split(/^---\s*$/m);
    if (parts.length >= 2) {
      content = `${parts[0]}metadata:\n${metaLines}\n---${parts.slice(2).join("---")}`;
    }
  }

  fs.writeFileSync(skillMdPath, content, "utf-8");

  // Track fork event for Community Favorites analytics
  logForkEvent(sourceSlug, newSlug);

  return {
    sourceSlug,
    sourceVersion: source.version,
    newSlug,
    newPath: destDir,
    category: effectiveCategory,
  };
}
