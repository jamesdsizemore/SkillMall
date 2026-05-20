import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface SkillCatalogOptions {
  repoRoot?: string;
}

export type Skill = {
  slug: string;
  category: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  author: string;
  license: string;
  compatibility: string;
  linked_skills: string[];
  content: string;
  path: string;
  hasReadme: boolean;
  hasScripts: boolean;
  hasTemplates: boolean;
  hasSamples: boolean;
  skills_sh_id?: string | null;
};

export type Category = {
  slug: string;
  skills: Skill[];
};

export type PromptFileInfo = {
  file: string;
  path: string;
};

function getRepoRoot(options: SkillCatalogOptions = {}): string {
  return options.repoRoot ?? process.cwd();
}

export function getSkillsDir(options: SkillCatalogOptions = {}): string {
  return path.join(getRepoRoot(options), "skills");
}

function parseStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function parseSkill(filePath: string, skillsDir: string): Skill | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const rel = path.relative(skillsDir, filePath);
    const parts = rel.split(path.sep);
    const dirCategory = parts[0];
    const slug = parts[1];
    const dir = path.dirname(filePath);

    // AgentSkills spec: name, description, license, compatibility, metadata (key-value map)
    // SkillMall catalog fields live inside metadata: (version, author, category, tags, linked-skills)
    // For backward compat, also check top-level fields from the old format.
    const meta =
      data.metadata && typeof data.metadata === "object" ? data.metadata : {};

    const hasReadme = fs.existsSync(path.join(dir, "README.md"));
    const hasScripts =
      fs.existsSync(path.join(dir, "scripts")) &&
      fs.readdirSync(path.join(dir, "scripts")).some((f) => f !== ".gitkeep");

    const hasTemplates =
      fs.existsSync(path.join(dir, "resources", "templates")) &&
      fs
        .readdirSync(path.join(dir, "resources", "templates"))
        .some((f) => f !== ".gitkeep");

    const hasSamples =
      fs.existsSync(path.join(dir, "resources", "samples")) &&
      fs
        .readdirSync(path.join(dir, "resources", "samples"))
        .some((f) => f !== ".gitkeep");

    return {
      slug,
      // dirCategory is the filesystem truth and the canonical URL segment.
      // metadata.category is informational only — it may differ from the directory name.
      category: dirCategory,
      name: String(data.name ?? slug),
      description: String(data.description ?? ""),
      version: String(meta.version ?? data.version ?? "1.0.0"),
      tags: parseTags(meta.tags ?? data.tags),
      author: String(meta.author ?? data.author ?? ""),
      license: String(data.license ?? ""),
      compatibility: String(data.compatibility ?? ""),
      linked_skills: parseLinkedSkills(
        meta["linked-skills"] ?? data.linked_skills
      ),
      content,
      path: rel,
      hasReadme,
      hasScripts,
      hasTemplates,
      hasSamples,
      skills_sh_id: meta["skills_sh_id"] ? String(meta["skills_sh_id"]) : null,
    };
  } catch (err) {
    console.error(`[skill-catalog] failed to parse ${filePath}:`, err)
    return null;
  }
}

export function parseTags(raw: unknown): string[] {
  return parseStringList(raw);
}

export function parseLinkedSkills(raw: unknown): string[] {
  return parseStringList(raw);
}

export function getAllSkills(options: SkillCatalogOptions = {}): Skill[] {
  const skillsDir = getSkillsDir(options);
  const skills: Skill[] = [];

  if (!fs.existsSync(skillsDir)) return skills;

  const categories = fs
    .readdirSync(skillsDir)
    .filter((d) => d !== "_template" && !d.startsWith("."))
    .filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory());

  for (const cat of categories) {
    const catDir = path.join(skillsDir, cat);
    const skillDirs = fs
      .readdirSync(catDir)
      .filter((d) => !d.startsWith("."))
      .filter((d) => fs.statSync(path.join(catDir, d)).isDirectory());

    for (const skillDir of skillDirs) {
      const skillFile = path.join(catDir, skillDir, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        const skill = parseSkill(skillFile, skillsDir);
        if (skill) skills.push(skill);
      }
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function getSkillsByCategory(options: SkillCatalogOptions = {}): Category[] {
  const skills = getAllSkills(options);
  const map = new Map<string, Skill[]>();

  for (const skill of skills) {
    const list = map.get(skill.category) ?? [];
    list.push(skill);
    map.set(skill.category, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, skills]) => ({ slug, skills }));
}

export function getSkill(category: string, slug: string, options: SkillCatalogOptions = {}): Skill | null {
  const skillsDir = getSkillsDir(options);
  const filePath = path.join(skillsDir, category, slug, "SKILL.md");
  if (!fs.existsSync(filePath)) return null;
  return parseSkill(filePath, skillsDir);
}

export function getSkillReadme(category: string, slug: string, options: SkillCatalogOptions = {}): string | null {
  const filePath = path.join(getSkillsDir(options), category, slug, "README.md");
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function getSkillDir(category: string, slug: string, options: SkillCatalogOptions = {}): string {
  return path.join(getSkillsDir(options), category, slug);
}

export function searchSkills(
  query: string,
  options: SkillCatalogOptions & { category?: string; limit?: number } = {}
): Skill[] {
  const normalizedQuery = query.toLowerCase();
  const skills = getAllSkills(options);

  return skills
    .filter((skill) => {
      const matchesCategory = !options.category || skill.category === options.category;
      const matchesQuery =
        skill.name.toLowerCase().includes(normalizedQuery) ||
        skill.description.toLowerCase().includes(normalizedQuery) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
        skill.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    })
    .slice(0, options.limit ?? 20);
}

export function getPromptFiles(
  category: string,
  slug: string,
  options: SkillCatalogOptions = {}
): PromptFileInfo[] {
  const promptsDir = path.join(getSkillDir(category, slug, options), "resources", "prompts");

  if (!fs.existsSync(promptsDir)) return [];

  return fs
    .readdirSync(promptsDir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => ({
      file,
      path: `resources/prompts/${file}`,
    }));
}

/**
 * Count how many skills in the catalog reference each framework.
 * Scans resources/prompts/ frontmatter for 'framework' field matches.
 * Returns a map of framework name → skill count.
 */
export function getFrameworkSkillCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  const skills = getAllSkills();

  for (const skill of skills) {
    const promptsDir = path.join(
      getSkillsDir(), skill.category, skill.slug, "resources", "prompts"
    );
    if (!fs.existsSync(promptsDir)) continue;

    const seenFrameworks = new Set<string>();
    for (const file of fs.readdirSync(promptsDir)) {
      if (!file.endsWith(".md")) continue;
      try {
        const { data } = matter(
          fs.readFileSync(path.join(promptsDir, file), "utf-8")
        );
        const fw = String(data.framework ?? "")
        if (!fw) continue;
        // A framework field may be comma-separated (e.g. "Chain of Thought, ERRC")
        for (const name of fw.split(",").map((s) => s.trim()).filter(Boolean)) {
          seenFrameworks.add(name);
        }
      } catch {
        // Skip malformed prompt files
      }
    }

    for (const fw of seenFrameworks) {
      counts[fw] = (counts[fw] ?? 0) + 1;
    }
  }

  return counts;
}
