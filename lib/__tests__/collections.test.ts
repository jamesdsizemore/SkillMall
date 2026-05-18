import { describe, it, expect } from "vitest";
import { getAllCollections, getCollection, validateCollection, type Collection } from "../collections";

describe("getAllCollections", () => {
  it("returns all 3 starter collections", () => {
    const collections = getAllCollections();
    expect(collections.length).toBe(3);
    const slugs = collections.map((c) => c.slug);
    expect(slugs).toContain("full-stack-developer-kit");
    expect(slugs).toContain("strategic-business-pack");
    expect(slugs).toContain("documentation-suite");
  });

  it("each collection has required fields", () => {
    for (const col of getAllCollections()) {
      expect(col.name).toBeTruthy();
      expect(col.slug).toBeTruthy();
      expect(col.description).toBeTruthy();
      expect(col.skills.length).toBeGreaterThan(0);
    }
  });
});

describe("getCollection", () => {
  it("returns collection by slug", () => {
    const col = getCollection("full-stack-developer-kit");
    expect(col).not.toBeNull();
    expect(col!.name).toBe("Full-Stack Developer Kit");
  });

  it("returns null for unknown slug", () => {
    expect(getCollection("nonexistent")).toBeNull();
  });
});

describe("validateCollection", () => {
  const allSlugs = new Set(["skill-creator", "development-workflow", "phased-implementation-plan"]);

  it("returns empty errors for valid collection", () => {
    const col = getCollection("full-stack-developer-kit")!;
    const errors = validateCollection(col, allSlugs);
    expect(errors).toHaveLength(0);
  });

  it("returns error for missing skill slug", () => {
    const col: Collection = {
      name: "Test",
      slug: "test-pack",
      description: "test",
      author: "test",
      skills: [{ slug: "nonexistent-skill", order: 1, note: null }],
    };
    const errors = validateCollection(col, allSlugs);
    expect(errors.some((e) => e.includes("nonexistent-skill"))).toBe(true);
  });

  it("returns error for missing name", () => {
    const col = { name: "", slug: "test", description: "d", author: "a", skills: [] };
    const errors = validateCollection(col as Collection, allSlugs);
    expect(errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("returns error for empty skills array", () => {
    const col = { name: "Test", slug: "test", description: "d", author: "a", skills: [] };
    const errors = validateCollection(col as Collection, allSlugs);
    expect(errors.some((e) => e.includes("1 skill"))).toBe(true);
  });
});
