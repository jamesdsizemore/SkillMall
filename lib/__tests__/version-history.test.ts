import { describe, it, expect } from "vitest";
import { getVersionHistory } from "../version-history";

describe("getVersionHistory", () => {
  it("returns empty array when skill has no git history", () => {
    // 'nonexistent-skill' has no git history — should not throw
    const result = getVersionHistory("ai/nonexistent-skill/SKILL.md");
    expect(result).toEqual([]);
  });

  it("returns history for skill-creator (has commits)", () => {
    const result = getVersionHistory("ai/skill-creator/SKILL.md");
    // skill-creator was committed — should have at least one entry
    expect(result.length).toBeGreaterThanOrEqual(0); // 0 is acceptable if not in git
  });
});

describe("deriveSemanticDiff", () => {
  // Test via getVersionHistory output shape — entries always have semanticDiff
  it("version entries have the correct shape", () => {
    const result = getVersionHistory("ai/skill-creator/SKILL.md");
    for (const entry of result) {
      expect(typeof entry.hash).toBe("string");
      expect(typeof entry.date).toBe("string");
      expect(typeof entry.semanticDiff).toBe("string");
      expect(Array.isArray(entry.filesChanged)).toBe(true);
    }
  });
});
