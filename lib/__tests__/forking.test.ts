import { describe, it, expect, afterEach } from "vitest";
import { forkSkill } from "../forking";
import fs from "fs";
import path from "path";

const FORK_SLUG = "skill-creator-fork-test";
const FORK_PATH = path.join(process.cwd(), "skills", "ai", FORK_SLUG);

afterEach(() => {
  if (fs.existsSync(FORK_PATH)) {
    fs.rmSync(FORK_PATH, { recursive: true });
  }
});

describe("forkSkill", () => {
  it("creates a fork directory with forked_from frontmatter", () => {
    const result = forkSkill("ai", "skill-creator", FORK_SLUG);

    expect(result.newSlug).toBe(FORK_SLUG);
    expect(result.sourceSlug).toBe("skill-creator");
    expect(fs.existsSync(FORK_PATH)).toBe(true);
    expect(fs.existsSync(path.join(FORK_PATH, "SKILL.md"))).toBe(true);

    const content = fs.readFileSync(path.join(FORK_PATH, "SKILL.md"), "utf-8");
    expect(content).toContain("forked_from:");
    expect(content).toContain("skill-creator@");
  });

  it("updates the name field to the new slug", () => {
    forkSkill("ai", "skill-creator", FORK_SLUG);
    const content = fs.readFileSync(path.join(FORK_PATH, "SKILL.md"), "utf-8");
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    expect(nameMatch?.[1]?.trim()).toBe(FORK_SLUG);
  });

  it("throws if destination already exists", () => {
    forkSkill("ai", "skill-creator", FORK_SLUG);
    expect(() => forkSkill("ai", "skill-creator", FORK_SLUG)).toThrow(
      "already exists"
    );
  });

  it("throws if source skill not found", () => {
    expect(() => forkSkill("ai", "nonexistent-skill", "my-fork")).toThrow(
      "Skill not found"
    );
  });
});
