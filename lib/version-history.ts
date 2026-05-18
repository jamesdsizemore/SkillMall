import { execSync } from "child_process";
import path from "path";

export interface VersionEntry {
  hash: string;
  date: string;
  author: string;
  message: string;
  semanticDiff: string;
  filesChanged: string[];
}

function deriveSemanticDiff(files: string[]): string {
  const changed: string[] = [];
  if (files.some((f) => f.endsWith("SKILL.md"))) changed.push("skill instructions updated");
  if (files.some((f) => f.includes("resources/templates/"))) changed.push("templates updated");
  if (files.some((f) => f.includes("resources/samples/"))) changed.push("samples updated");
  if (files.some((f) => f.includes("resources/prompts/"))) changed.push("prompts updated");
  if (files.some((f) => f.includes("scripts/"))) changed.push("scripts updated");
  if (files.some((f) => f.endsWith("README.md"))) changed.push("README updated");
  return changed.length > 0 ? changed.join(", ") : "files updated";
}

/**
 * Read git log for a skill directory and return structured version entries.
 * Returns empty array if the skill has no git history or git is not available.
 */
export function getVersionHistory(skillPath: string): VersionEntry[] {
  // skillPath is relative to SKILLS_DIR — e.g. "ai/skill-creator/SKILL.md"
  const skillDir = path.dirname(
    path.join(process.cwd(), "skills", skillPath)
  );
  const relDir = path.relative(process.cwd(), skillDir);

  try {
    const log = execSync(
      `git log --follow --format="%H|%ai|%an|%s" -- "${relDir}"`,
      { cwd: process.cwd(), encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    ).trim();

    if (!log) return [];

    return log.split("\n").map((line) => {
      const [hash, date, author, ...msgParts] = line.split("|");
      const message = msgParts.join("|").trim();

      let filesChanged: string[] = [];
      try {
        const diffOut = execSync(
          `git diff-tree --no-commit-id -r --name-only "${hash}" -- "${relDir}"`,
          { cwd: process.cwd(), encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
        ).trim();
        filesChanged = diffOut.split("\n").filter(Boolean);
      } catch {
        // diff-tree unavailable — skip file list
      }

      return {
        hash: hash.slice(0, 8),
        date: date.slice(0, 10),
        author: author.trim(),
        message: message,
        semanticDiff: deriveSemanticDiff(filesChanged),
        filesChanged,
      };
    });
  } catch {
    return [];
  }
}
