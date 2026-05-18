import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getSkill } from "./skills";

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
  const sourceDir = path.join(process.cwd(), "skills", path.dirname(source.path));
  const destDir = path.join(process.cwd(), "skills", effectiveCategory, newSlug);

  if (fs.existsSync(destDir)) {
    throw new Error(
      `Destination already exists: skills/${effectiveCategory}/${newSlug}. Remove it first or choose a different slug.`
    );
  }

  copyDirRecursive(sourceDir, destDir);

  const skillMdPath = path.join(destDir, "SKILL.md");
  const raw = fs.readFileSync(skillMdPath, "utf-8");
  const { data: fm, content: body } = matter(raw);

  // Update name field safely via parsed frontmatter (not regex)
  fm.name = newSlug;

  // Build fork chain from existing metadata (if this is a fork of a fork)
  const meta = (fm.metadata && typeof fm.metadata === "object")
    ? fm.metadata as Record<string, unknown>
    : {};
  const existingChain: string[] = Array.isArray(meta.fork_chain)
    ? (meta.fork_chain as unknown[]).map(String)
    : [];
  const forkedFrom = `${sourceSlug}@${source.version}`;
  const fullChain = [...existingChain, forkedFrom];

  meta.forked_from = forkedFrom;
  if (fullChain.length > 1) {
    meta.fork_chain = fullChain;
  }
  fm.metadata = meta;

  fs.writeFileSync(skillMdPath, matter.stringify(body, fm), "utf-8");

  // Track fork event via dynamic import to avoid bundling SQLite into CLI
  import("./analytics").then(({ logForkEvent }) => logForkEvent(sourceSlug, newSlug)).catch(() => {});

  return {
    sourceSlug,
    sourceVersion: source.version,
    newSlug,
    newPath: destDir,
    category: effectiveCategory,
  };
}
