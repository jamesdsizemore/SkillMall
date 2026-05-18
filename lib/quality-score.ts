import fs from "fs";
import path from "path";
import type { Skill } from "./skills";

export interface DimensionScore {
  score: number;
  maxScore: number;
  deductions: Array<{ points: number; message: string }>;
}

export interface QualityScore {
  total: number;
  dimensions: {
    descriptionQuality: DimensionScore;
    completeness: DimensionScore;
    frontmatterHealth: DimensionScore;
    resourceRichness: DimensionScore;
    linkHealth: DimensionScore;
  };
  feedback: string[];
}

// ─── Dimension 1: Description Quality (25 pts max) ────────────────────────

function scoreDescriptionQuality(skill: Skill): DimensionScore {
  const desc = skill.description;
  const deductions: Array<{ points: number; message: string }> = [];
  let score = 25;

  // Imperative first sentence (7 pts)
  const IMPERATIVE_VERBS = [
    "apply", "run", "analyze", "use", "execute", "generate", "create",
    "build", "perform", "conduct", "evaluate", "assess", "produce",
    "identify", "extract", "implement", "write", "review", "plan",
  ];
  const firstWord = desc.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!IMPERATIVE_VERBS.some((v) => firstWord === v || firstWord === v + "s")) {
    score -= 7;
    deductions.push({
      points: 7,
      message: `Description starts with "${desc.slice(0, 30)}..." — rewrite to start with an imperative verb like "Apply", "Run", or "Analyze" (-7)`,
    });
  }

  // ≤ 150 chars (6 pts)
  if (desc.length > 150) {
    score -= 6;
    deductions.push({
      points: 6,
      message: `Description is ${desc.length} characters (exceeds 150-character limit) — shorten it (-6)`,
    });
  }

  // Trigger phrase in first 80 chars (7 pts)
  // Proxy: skill name words appear in first 80 chars
  const nameWords = skill.name.split("-").filter((w) => w.length > 3);
  const first80 = desc.slice(0, 80).toLowerCase();
  const hasNameInFirst80 = nameWords.some((w) => first80.includes(w));
  if (!hasNameInFirst80 && desc.length > 80) {
    score -= 7;
    deductions.push({
      points: 7,
      message: `Trigger phrase not found in the first 80 characters — move the domain name earlier (-7)`,
    });
  }

  // Specificity (5 pts) — penalize generic verbs
  const GENERIC_PHRASES = ["help", "assist", "provide", "support", "enable", "allow"];
  if (GENERIC_PHRASES.some((p) => desc.toLowerCase().includes(p) && desc.length < 50)) {
    score -= 5;
    deductions.push({
      points: 5,
      message: `Description uses only generic verbs — name the specific domain, tool, or workflow (-5)`,
    });
  }

  return { score: Math.max(score, 0), maxScore: 25, deductions };
}

// ─── Dimension 2: Completeness (25 pts max) ──────────────────────────────

function scoreCompleteness(skill: Skill, skillPath: string): DimensionScore {
  const deductions: Array<{ points: number; message: string }> = [];
  let score = 25;

  const skillDir = path.dirname(skillPath);

  // README.md present (5 pts)
  if (!fs.existsSync(path.join(skillDir, "README.md"))) {
    score -= 5;
    deductions.push({ points: 5, message: "README.md missing (-5)" });
  }

  // At least one template (7 pts)
  if (!skill.hasTemplates) {
    score -= 7;
    deductions.push({
      points: 7,
      message: "No template files in resources/templates/ — add at least one artifact template (-7)",
    });
  }

  // At least one sample (7 pts)
  if (!skill.hasSamples) {
    score -= 7;
    deductions.push({
      points: 7,
      message: "No sample outputs in resources/samples/ — add at least one completed artifact example (-7)",
    });
  }

  // At least one prompt (6 pts)
  const promptDir = path.join(skillDir, "resources", "prompts");
  const hasPrompts =
    fs.existsSync(promptDir) &&
    fs.readdirSync(promptDir).some((f) => f.endsWith(".md"));

  if (!hasPrompts) {
    score -= 6;
    deductions.push({
      points: 6,
      message: "No prompt files in resources/prompts/ — add at least one prompt file (-6)",
    });
  }

  return { score: Math.max(score, 0), maxScore: 25, deductions };
}

// ─── Dimension 3: Frontmatter Health (20 pts max) ────────────────────────

const VALID_CATEGORIES = new Set([
  "development", "design", "writing", "research",
  "productivity", "infrastructure", "ai", "business",
]);

function scoreFrontmatterHealth(skill: Skill): DimensionScore {
  const deductions: Array<{ points: number; message: string }> = [];
  let score = 20;

  // All required fields present (8 pts)
  const missingFields: string[] = [];
  if (!skill.name) missingFields.push("name");
  if (!skill.description) missingFields.push("description");
  if (!skill.category) missingFields.push("category");
  if (!skill.tags || skill.tags.length === 0) missingFields.push("tags");
  if (!skill.version) missingFields.push("version");
  if (!skill.author) missingFields.push("author");

  if (missingFields.length > 0) {
    score -= 8;
    deductions.push({
      points: 8,
      message: `Missing required fields: ${missingFields.join(", ")} (-8)`,
    });
  }

  // Category valid (4 pts)
  if (skill.category && !VALID_CATEGORIES.has(skill.category)) {
    score -= 4;
    deductions.push({
      points: 4,
      message: `Category "${skill.category}" is not in the valid taxonomy (${[...VALID_CATEGORIES].join(", ")}) (-4)`,
    });
  }

  // Tag count 2-6 (4 pts)
  const tagCount = skill.tags?.length ?? 0;
  if (tagCount < 2 || tagCount > 6) {
    score -= 4;
    deductions.push({
      points: 4,
      message: `Tag count is ${tagCount} — keep between 2 and 6 (-4)`,
    });
  }

  // Directory name matches name field (4 pts)
  const dirName = path.basename(path.dirname(skill.path));
  if (skill.name && dirName !== skill.name) {
    score -= 4;
    deductions.push({
      points: 4,
      message: `Directory name "${dirName}" does not match skill name "${skill.name}" (-4)`,
    });
  }

  return { score: Math.max(score, 0), maxScore: 20, deductions };
}

// ─── Dimension 4: Resource Richness (20 pts max) ─────────────────────────

function scoreResourceRichness(skill: Skill, skillPath: string): DimensionScore {
  const skillDir = path.dirname(skillPath);
  let count = 0;

  const resourceDirs = ["resources/templates", "resources/samples", "resources/prompts", "scripts"];
  for (const dir of resourceDirs) {
    const fullDir = path.join(skillDir, dir);
    if (fs.existsSync(fullDir)) {
      count += fs.readdirSync(fullDir).filter((f) => !f.startsWith(".")).length;
    }
  }

  let score = 5;
  if (count >= 15) score = 20;
  else if (count >= 8) score = 15;
  else if (count >= 4) score = 10;

  return { score, maxScore: 20, deductions: [] };
}

// ─── Dimension 5: Link Health (10 pts max) ───────────────────────────────

function scoreLinkHealth(skill: Skill, allSkillSlugs: Set<string>): DimensionScore {
  const linked = skill.linked_skills ?? [];
  if (linked.length === 0) return { score: 10, maxScore: 10, deductions: [] };

  const deductions: Array<{ points: number; message: string }> = [];
  let score = 10;

  const brokenLinks = linked.filter((s) => !allSkillSlugs.has(s));
  if (brokenLinks.length > 0) {
    const deduction = Math.round((brokenLinks.length / linked.length) * 10);
    score -= deduction;
    for (const link of brokenLinks) {
      deductions.push({
        points: Math.ceil(10 / linked.length),
        message: `Linked skill "${link}" not found in catalog — remove the link or install the skill (-${Math.ceil(10 / linked.length)})`,
      });
    }
  }

  return { score: Math.max(score, 0), maxScore: 10, deductions };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Compute the quality score for a skill.
 * @param skill - The skill metadata from lib/skills.ts
 * @param allSkillSlugs - Set of all skill slugs in the catalog (for link health check)
 */
export function computeQualityScore(
  skill: Skill,
  allSkillSlugs: Set<string> = new Set()
): QualityScore {
  const descriptionQuality = scoreDescriptionQuality(skill);
  const completeness = scoreCompleteness(skill, skill.path);
  const frontmatterHealth = scoreFrontmatterHealth(skill);
  const resourceRichness = scoreResourceRichness(skill, skill.path);
  const linkHealth = scoreLinkHealth(skill, allSkillSlugs);

  const total =
    descriptionQuality.score +
    completeness.score +
    frontmatterHealth.score +
    resourceRichness.score +
    linkHealth.score;

  const feedback = [
    ...descriptionQuality.deductions.map((d) => d.message),
    ...completeness.deductions.map((d) => d.message),
    ...frontmatterHealth.deductions.map((d) => d.message),
    ...linkHealth.deductions.map((d) => d.message),
  ];

  return {
    total,
    dimensions: {
      descriptionQuality,
      completeness,
      frontmatterHealth,
      resourceRichness,
      linkHealth,
    },
    feedback,
  };
}
