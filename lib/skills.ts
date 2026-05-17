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
  linked_skills: string[];
  content: string;
  path: string;
  hasScripts: boolean;
  hasTemplates: boolean;
  hasSamples: boolean;
};

export type Category = {
  slug: string;
  skills: Skill[];
};

function parseSkill(filePath: string): Skill | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const rel = path.relative(SKILLS_DIR, filePath);
    const parts = rel.split(path.sep);
    const category = parts[0];
    const slug = parts[1];
    const dir = path.dirname(filePath);

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
      category,
      name: data.name ?? slug,
      description: data.description ?? "",
      version: data.version ?? "1.0.0",
      tags: Array.isArray(data.tags) ? data.tags : [],
      author: data.author ?? "",
      linked_skills: Array.isArray(data.linked_skills) ? data.linked_skills : [],
      content,
      path: rel,
      hasScripts,
      hasTemplates,
      hasSamples,
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
    .filter((d) =>
      fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
    );

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
