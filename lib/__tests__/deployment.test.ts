import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  deployLocalizedSkillToBase,
  deploySkillToAgents,
  deploySkillToBase,
  resolveSkillDeploySource,
} from "../deployment";

describe("deployment", () => {
  const originalCwd = process.cwd();
  let repoRoot: string;
  let source: NonNullable<ReturnType<typeof resolveSkillDeploySource>>;

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skillmall-deploy-"));
    const skillDir = path.join(repoRoot, "skills", "business", "strategy-canvas");
    fs.mkdirSync(path.join(skillDir, "resources", "templates"), { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), "canonical skill\n", "utf-8");
    fs.writeFileSync(path.join(skillDir, "SKILL.es.md"), "localized skill\n", "utf-8");
    fs.writeFileSync(path.join(skillDir, "README.md"), "# Strategy Canvas\n", "utf-8");
    fs.writeFileSync(path.join(skillDir, "resources", "templates", "canvas.md"), "# Canvas\n", "utf-8");

    const resolved = resolveSkillDeploySource(repoRoot, "business/strategy-canvas");
    if (!resolved) throw new Error("test setup failed");
    source = resolved;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it("resolves category-qualified and category-less skill targets", () => {
    expect(resolveSkillDeploySource(repoRoot, "business/strategy-canvas")).toMatchObject({
      category: "business",
      skillName: "strategy-canvas",
    });
    expect(resolveSkillDeploySource(repoRoot, "strategy-canvas")).toMatchObject({
      category: "business",
      skillName: "strategy-canvas",
    });
    expect(resolveSkillDeploySource(repoRoot, "missing")).toBeNull();
  });

  it("deploys a skill under category/name for single-agent destinations", () => {
    const destBase = path.join(repoRoot, "dest");

    const destDir = deploySkillToBase(source, destBase);

    expect(destDir).toBe(path.join(destBase, "business", "strategy-canvas"));
    expect(fs.readFileSync(path.join(destDir, "SKILL.md"), "utf-8")).toBe("canonical skill\n");
    expect(fs.existsSync(path.join(destDir, "resources", "templates", "canvas.md"))).toBe(true);
  });

  it("deploys locale content as SKILL.md and leaves other SKILL variants out", () => {
    const destBase = path.join(repoRoot, "localized-dest");

    const result = deployLocalizedSkillToBase(source, "es", destBase);

    expect(result.fellBackToCanonical).toBe(false);
    expect(fs.readFileSync(path.join(result.destDir, "SKILL.md"), "utf-8")).toBe("localized skill\n");
    expect(fs.existsSync(path.join(result.destDir, "SKILL.es.md"))).toBe(false);
    expect(fs.existsSync(path.join(result.destDir, "README.md"))).toBe(true);
  });

  it("reports canonical fallback when requested locale is unavailable", () => {
    const destBase = path.join(repoRoot, "fallback-dest");

    const result = deployLocalizedSkillToBase(source, "fr", destBase);

    expect(result.fellBackToCanonical).toBe(true);
    expect(result.availableLocales).toEqual(["es"]);
    expect(fs.readFileSync(path.join(result.destDir, "SKILL.md"), "utf-8")).toBe("canonical skill\n");
  });

  it("deploys to all project-scope agent directories without touching user homes", () => {
    process.chdir(repoRoot);

    const summary = deploySkillToAgents(source, { scope: "project" });

    expect(summary.results).toHaveLength(7);
    expect(summary.deployed).toContain("claude-code");
    expect(fs.readFileSync(path.join(repoRoot, ".claude", "skills", "strategy-canvas", "SKILL.md"), "utf-8"))
      .toBe("canonical skill\n");
  });
});
