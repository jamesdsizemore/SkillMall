import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MockLLMClient } from "./mocks/mock-llm-client";
import {
  extractToolContext,
  listPromptFiles,
  parsePromptFile,
  PromptRegenerationError,
  regeneratePromptFile,
  resolvePromptFilePath,
  resolveSkillPromptFilePath,
  resolveSkillPromptTarget,
} from "../prompt-regenerator";

describe("prompt regenerator", () => {
  let repoRoot: string;
  let promptPath: string;

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skillmall-regen-"));
    const promptDir = path.join(repoRoot, "skills", "business", "strategy-canvas", "resources", "prompts");
    fs.mkdirSync(promptDir, { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, "skills", "business", "strategy-canvas", "SKILL.md"),
      "---\nname: strategy-canvas\n---\n",
      "utf-8"
    );

    promptPath = path.join(promptDir, "tool-strategy-canvas.md");
    fs.writeFileSync(
      promptPath,
      `---
framework: Chain of Thought
skill: strategy-canvas
tool: Strategy Canvas
type: tool-specific
produces:
  - canvas.md
when_to_use: "Use when mapping market factors"
complexity: thorough
---

{
  "tools": [
    {
      "name": "Strategy Canvas",
      "artifactType": "matrix",
      "artifactStructure": "| Factor | Score |",
      "inputs": ["market"],
      "outputs": ["canvas.md"],
      "howUsed": "Map factors and score competitors."
    }
  ]
}
`,
      "utf-8"
    );
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it("lists prompt metadata from a skill prompt directory", () => {
    expect(listPromptFiles("business", "strategy-canvas", { repoRoot })).toEqual([
      {
        file: "tool-strategy-canvas.md",
        name: "Strategy Canvas",
        framework: "Chain of Thought",
        originalFramework: "Chain of Thought",
        type: "tool-specific",
        complexity: "thorough",
        whenToUse: "Use when mapping market factors",
        produces: ["canvas.md"],
      },
    ]);
  });

  it("resolves category-qualified and category-less skill targets", () => {
    expect(resolveSkillPromptTarget("business/strategy-canvas", { repoRoot })?.category).toBe("business");
    expect(resolveSkillPromptTarget("strategy-canvas", { repoRoot })?.slug).toBe("strategy-canvas");
    expect(resolveSkillPromptTarget("missing", { repoRoot })).toBeNull();
  });

  it("rejects prompt paths outside the prompt directory", () => {
    const baseDir = path.dirname(promptPath);

    expect(() => resolvePromptFilePath(baseDir, "../SKILL.md")).toThrow(PromptRegenerationError);
  });

  it("resolves CLI prompt paths from either file name or resources path", () => {
    const target = resolveSkillPromptTarget("business/strategy-canvas", { repoRoot });
    expect(target).not.toBeNull();

    expect(resolveSkillPromptFilePath(target!, "tool-strategy-canvas.md")).toBe(promptPath);
    expect(resolveSkillPromptFilePath(target!, "resources/prompts/tool-strategy-canvas.md")).toBe(promptPath);
  });

  it("extracts tool context from JSON prompt bodies and falls back to prose", () => {
    const parsed = parsePromptFile(promptPath);

    expect(extractToolContext(parsed?.content ?? "")).toContain("Tool: Strategy Canvas");
    expect(extractToolContext("Produce a short analysis.")).toBe("Produce a short analysis.");
  });

  it("regenerates the prompt body and preserves original framework metadata", async () => {
    const client = new MockLLMClient({
      "Rewrite this skill prompt": "Produce a revised strategy canvas.",
    });

    const result = await regeneratePromptFile({
      promptPath,
      framework: "Step-Back Prompting",
      client,
    });

    const parsed = parsePromptFile(promptPath);

    expect(result).toEqual({
      framework: "Step-Back Prompting",
      originalFramework: "Chain of Thought",
      content: "Produce a revised strategy canvas.",
    });
    expect(parsed?.meta.framework).toBe("Step-Back Prompting");
    expect(parsed?.meta.originalFramework).toBe("Chain of Thought");
    expect(parsed?.content).toContain("Produce a revised strategy canvas.");
    expect(client.calls[0].prompt).toContain("Tool: Strategy Canvas");
    expect(client.calls[0].prompt).toContain("Original prompt purpose: Use when mapping market factors");
  });
});
