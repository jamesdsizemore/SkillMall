import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getAllSkills,
  getPromptFiles,
  getSkill,
  getSkillsByCategory,
  searchSkills,
} from "../skills";

describe("Skill Catalog", () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skillmall-catalog-"));
    fs.mkdirSync(path.join(repoRoot, "skills", "business", "strategy-canvas", "resources", "prompts"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(repoRoot, "skills", "ai", "prompt-auditor"), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, "skills", "_template", "ignored"), { recursive: true });

    fs.writeFileSync(
      path.join(repoRoot, "skills", "business", "strategy-canvas", "SKILL.md"),
      `---
name: strategy-canvas
description: "Map a market strategy canvas"
license: MIT
metadata:
  version: "1.2.3"
  author: jane
  category: wrong-category
  tags: "strategy, market"
  linked-skills:
    - prompt-auditor
---

Skill body.
`,
      "utf-8"
    );
    fs.writeFileSync(
      path.join(repoRoot, "skills", "business", "strategy-canvas", "README.md"),
      "# Strategy Canvas\n",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(repoRoot, "skills", "business", "strategy-canvas", "resources", "prompts", "tool-canvas.md"),
      "---\nframework: Chain of Thought\n---\n\nPrompt body.\n",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(repoRoot, "skills", "ai", "prompt-auditor", "SKILL.md"),
      `---
name: prompt-auditor
description: "Audit prompt quality"
license: MIT
metadata:
  version: "0.1.0"
  author: sam
  tags:
    - prompt
    - quality
---

Audit body.
`,
      "utf-8"
    );
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it("reads skills from a provided repo root", () => {
    const skills = getAllSkills({ repoRoot });

    expect(skills).toHaveLength(2);
    expect(skills.map((skill) => skill.slug).sort()).toEqual([
      "prompt-auditor",
      "strategy-canvas",
    ]);
  });

  it("uses the filesystem category as catalog truth", () => {
    const skill = getSkill("business", "strategy-canvas", { repoRoot });

    expect(skill?.category).toBe("business");
    expect(skill?.path).toBe(path.join("business", "strategy-canvas", "SKILL.md"));
    expect(skill?.version).toBe("1.2.3");
    expect(skill?.author).toBe("jane");
    expect(skill?.tags).toEqual(["strategy", "market"]);
    expect(skill?.linked_skills).toEqual(["prompt-auditor"]);
    expect(skill?.hasReadme).toBe(true);
  });

  it("groups skills by category", () => {
    const categories = getSkillsByCategory({ repoRoot });

    expect(categories.map((category) => category.slug)).toEqual(["ai", "business"]);
    expect(categories.find((category) => category.slug === "business")?.skills).toHaveLength(1);
  });

  it("searches name, description, tags, and category", () => {
    expect(searchSkills("market", { repoRoot }).map((skill) => skill.slug)).toEqual([
      "strategy-canvas",
    ]);
    expect(searchSkills("prompt", { repoRoot }).map((skill) => skill.slug)).toEqual([
      "prompt-auditor",
    ]);
    expect(searchSkills("business", { repoRoot }).map((skill) => skill.slug)).toEqual([
      "strategy-canvas",
    ]);
  });

  it("lists prompt files for a skill", () => {
    expect(getPromptFiles("business", "strategy-canvas", { repoRoot })).toEqual([
      { file: "tool-canvas.md", path: "resources/prompts/tool-canvas.md" },
    ]);
    expect(getPromptFiles("ai", "prompt-auditor", { repoRoot })).toEqual([]);
  });
});
