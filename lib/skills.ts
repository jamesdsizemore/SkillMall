import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SKILLS_DIR = path.join(process.cwd(), "skills");

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
  hasScripts: boolean;
  hasTemplates: boolean;
  hasSamples: boolean;
  skills_sh_id?: string | null;
};

export type Category = {
  slug: string;
  skills: Skill[];
};

// Parse tags from either a comma-separated string ("tag-one, tag-two")
// or a YAML array — both are valid per the SkillMall template.
function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

// Parse linked-skills from either a comma-separated string or array.
function parseLinkedSkills(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseSkill(filePath: string): Skill | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const rel = path.relative(SKILLS_DIR, filePath);
    const parts = rel.split(path.sep);
    const dirCategory = parts[0];
    const slug = parts[1];
    const dir = path.dirname(filePath);

    // AgentSkills spec: name, description, license, compatibility, metadata (key-value map)
    // SkillMall catalog fields live inside metadata: (version, author, category, tags, linked-skills)
    // For backward compat, also check top-level fields from the old format.
    const meta =
      data.metadata && typeof data.metadata === "object" ? data.metadata : {};

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
      // Use metadata.category if present, fall back to directory name
      category: String(meta.category ?? data.category ?? dirCategory),
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
      hasScripts,
      hasTemplates,
      hasSamples,
      skills_sh_id: meta["skills_sh_id"] ? String(meta["skills_sh_id"]) : null,
    };
  } catch {
    return null;
  }
}

export function getAllSkills(): Skill[] {
  const skills: Skill[] = [];

  if (!fs.existsSync(SKILLS_DIR)) return skills;

  const categories = fs
    .readdirSync(SKILLS_DIR)
    .filter((d) => d !== "_template" && !d.startsWith("."))
    .filter((d) => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory());

  for (const cat of categories) {
    const catDir = path.join(SKILLS_DIR, cat);
    const skillDirs = fs
      .readdirSync(catDir)
      .filter((d) => !d.startsWith("."))
      .filter((d) => fs.statSync(path.join(catDir, d)).isDirectory());

    for (const skillDir of skillDirs) {
      const skillFile = path.join(catDir, skillDir, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        const skill = parseSkill(skillFile);
        if (skill) skills.push(skill);
      }
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function getSkillsByCategory(): Category[] {
  const skills = getAllSkills();
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

export function getSkill(category: string, slug: string): Skill | null {
  const filePath = path.join(SKILLS_DIR, category, slug, "SKILL.md");
  if (!fs.existsSync(filePath)) return null;
  return parseSkill(filePath);
}

export function getSkillReadme(category: string, slug: string): string | null {
  const filePath = path.join(SKILLS_DIR, category, slug, "README.md");
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
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
      SKILLS_DIR, skill.category, skill.slug, "resources", "prompts"
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
