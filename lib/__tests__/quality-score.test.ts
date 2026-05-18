import { describe, it, expect } from "vitest";
import { computeQualityScore } from "../quality-score";
import type { Skill } from "../skills";

function mockSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    slug: "my-skill",
    category: "business",
    name: "my-skill",
    description: "Apply this skill to analyze competitive landscapes using Blue Ocean Strategy.",
    version: "1.0.0",
    tags: ["strategy", "blue-ocean", "business"],
    author: "test-author",
    license: "MIT",
    compatibility: "",
    linked_skills: [],
    content: "---\nname: my-skill\n---\n",
    path: "skills/business/my-skill/SKILL.md",
    hasScripts: true,
    hasTemplates: true,
    hasSamples: true,
    ...overrides,
  };
}

// Mock fs for directory checks — we test scoring logic directly
import { vi, beforeEach } from "vitest";
import fs from "fs";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("computeQualityScore", () => {
  // Test 1: All criteria met — high score (approximate, depends on fs mocks)
  it("description quality: imperative first word scores full description points", () => {
    const skill = mockSkill();
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["file1.md", "file2.md", "file3.md"] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = computeQualityScore(skill);

    // "Apply" is imperative — should not deduct 7 pts from description
    const desc = result.dimensions.descriptionQuality;
    const imperativeDeduction = desc.deductions.find((d) => d.message.includes("imperative"));
    expect(imperativeDeduction).toBeUndefined();
  });

  // Test 2: Non-imperative first word deducts 7 points
  it("description quality: non-imperative first word deducts 7 points", () => {
    const skill = mockSkill({ description: "This skill helps with Blue Ocean Strategy analysis." });
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = computeQualityScore(skill);
    const desc = result.dimensions.descriptionQuality;

    expect(desc.deductions.some((d) => d.points === 7)).toBe(true);
  });

  // Test 3: Description > 150 chars deducts 6 points
  it("description quality: description > 150 chars deducts 6 points", () => {
    const longDesc = "Apply " + "x".repeat(200);
    const skill = mockSkill({ description: longDesc });
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = computeQualityScore(skill);
    const desc = result.dimensions.descriptionQuality;

    expect(desc.deductions.some((d) => d.points === 6 && d.message.includes("150-character"))).toBe(true);
  });

  // Test 4: Missing README deducts 5 points from completeness
  it("completeness: missing README deducts 5 points", () => {
    const skill = mockSkill({ hasTemplates: true, hasSamples: true });
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      if (String(p).endsWith("README.md")) return false;
      return true;
    });
    vi.spyOn(fs, "readdirSync").mockReturnValue(["prompt1.md"] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = computeQualityScore(skill);
    const comp = result.dimensions.completeness;

    expect(comp.deductions.some((d) => d.points === 5 && d.message.includes("README"))).toBe(true);
  });

  // Test 5: Feedback messages are specific
  it("feedback contains specific actionable messages for each deduction", () => {
    const skill = mockSkill({
      description: "This skill helps with things.",
      tags: [],
      version: "",
      author: "",
    });
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "readdirSync").mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = computeQualityScore(skill);

    expect(result.feedback.length).toBeGreaterThan(0);
    // Each message should have a (-N) point deduction marker
    expect(result.feedback.some((f) => f.includes("(-"))).toBe(true);
  });

  // Test 6: _template skill scores < 40
  it("_template skill scores below 40", () => {
    const templateSkill = mockSkill({
      name: "skill-name", // matches template placeholder
      description: "One-line key use case.",
      category: "development",
      tags: [],
      version: "",
      author: "",
      hasTemplates: false,
      hasSamples: false,
      hasScripts: false,
      linked_skills: [],
      path: "skills/_template/SKILL.md",
    });
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "readdirSync").mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = computeQualityScore(templateSkill);
    expect(result.total).toBeLessThan(40);
  });

  // Test 7: Broken linked skill deducts from link health
  it("link health: broken linked skill deducts points", () => {
    const skill = mockSkill({ linked_skills: ["nonexistent-skill"] });
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["f.md"] as unknown as ReturnType<typeof fs.readdirSync>);

    const allSlugs = new Set<string>(["my-skill"]); // nonexistent-skill not in catalog
    const result = computeQualityScore(skill, allSlugs);

    expect(result.dimensions.linkHealth.score).toBeLessThan(10);
    expect(result.dimensions.linkHealth.deductions.some((d) => d.message.includes("nonexistent-skill"))).toBe(true);
  });
});
