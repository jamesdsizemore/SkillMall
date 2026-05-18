import fs from "fs";
import path from "path";

export interface CollectionSkill {
  slug: string;
  order: number;
  note: string | null;
}

export interface Collection {
  name: string;
  slug: string;
  description: string;
  author: string;
  skills: CollectionSkill[];
}

/** Return all collections from the collections/ directory. */
export function getAllCollections(): Collection[] {
  const collectionsDir = path.join(process.cwd(), "collections");
  if (!fs.existsSync(collectionsDir)) return [];

  return fs
    .readdirSync(collectionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const jsonPath = path.join(collectionsDir, d.name, "collection.json");
      if (!fs.existsSync(jsonPath)) return null;
      try {
        return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as Collection;
      } catch {
        return null;
      }
    })
    .filter((c): c is Collection => c !== null);
}

/** Return a single collection by slug. */
export function getCollection(slug: string): Collection | null {
  return getAllCollections().find((c) => c.slug === slug) ?? null;
}

/**
 * Validate a collection against the catalog.
 * Returns an array of error strings (empty = valid).
 */
export function validateCollection(
  collection: Collection,
  allSkillSlugs: Set<string>
): string[] {
  const errors: string[] = [];

  if (!collection.name) errors.push("name is required");
  if (!collection.slug || !/^[a-z0-9-]+$/.test(collection.slug)) {
    errors.push("slug must be kebab-case");
  }
  if (!collection.skills || collection.skills.length < 1) {
    errors.push("at least 1 skill required");
  }

  for (const skill of collection.skills ?? []) {
    // slug may be 'category/skill-name' or just 'skill-name'
    const skillName = skill.slug.includes("/")
      ? skill.slug.split("/").pop()!
      : skill.slug;

    if (!allSkillSlugs.has(skillName) && !allSkillSlugs.has(skill.slug)) {
      errors.push(`Skill "${skill.slug}" not found in catalog`);
    }
  }

  return errors;
}
