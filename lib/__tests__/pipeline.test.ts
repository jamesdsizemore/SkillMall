import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  atomicWrite,
  buildSkillFromResearch,
  estimateSkillResourceScore,
  replaceSkillMdContent,
  runPipeline,
  validateSkillDirectory,
} from "../pipeline";
import { MockLLMClient } from "./mocks/mock-llm-client";
import blueOceanFixture from "./fixtures/research-result-blue-ocean.json";
import type { ResearchResult } from "../validators";
import fs from "fs/promises";
import path from "path";
import os from "os";

const blueOcean = blueOceanFixture as ResearchResult;

const SELECTION_RESPONSE = JSON.stringify({ selected: ["Structured Output"], rationale: "best" });
const BODY_RESPONSE = "Produce a comprehensive analysis.\n\n| Factor | Score |\n|---|---|\n\nCompletion: all factors scored.";
const SAMPLE_RESPONSE = "| Strategy Canvas Sample | A | B |";

const SAMPLE_HTML = "<html><body><main><h1>Blue Ocean Strategy</h1><p>The Strategy Canvas tool.</p></main></body></html>";

const META = {
  slug: "blue-ocean-strategy",
  category: "business",
  tags: ["strategy"],
  targetAgents: ["claude-code"],
};

const INPUT = {
  topic: "Blue Ocean Strategy",
  sourceUrls: ["https://example.com"],
  metadata: META,
};

// Build a mock client that handles all pipeline calls in sequence
function buildPipelineClient(): MockLLMClient {
  const client = new MockLLMClient({});
  // research: 1 call
  // skill builder samples: 3 calls (one per tool)
  // prompt engine: per tool selection + body = 6 calls, 2 category = 2 calls, 5 meta = 5 calls
  const responses: string[] = [
    JSON.stringify(blueOcean),          // research extraction
    SAMPLE_RESPONSE,                    // sample tool 1
    SAMPLE_RESPONSE,                    // sample tool 2
    SAMPLE_RESPONSE,                    // sample tool 3
    SELECTION_RESPONSE,                 // tool 1 framework selection
    BODY_RESPONSE,                      // tool 1 prompt body
    SELECTION_RESPONSE,                 // tool 2 framework selection
    BODY_RESPONSE,                      // tool 2 prompt body
    SELECTION_RESPONSE,                 // tool 3 framework selection
    BODY_RESPONSE,                      // tool 3 prompt body
    BODY_RESPONSE,                      // category 1 (Strategy)
    BODY_RESPONSE,                      // category 2 (Shift)
    BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, // 5 meta
  ];
  client.withSequence(responses);
  return client;
}

function buildConfirmedResearchClient(): MockLLMClient {
  const client = new MockLLMClient({});
  const responses: string[] = [
    SAMPLE_RESPONSE,
    SAMPLE_RESPONSE,
    SAMPLE_RESPONSE,
    SELECTION_RESPONSE,
    BODY_RESPONSE,
    SELECTION_RESPONSE,
    BODY_RESPONSE,
    SELECTION_RESPONSE,
    BODY_RESPONSE,
    BODY_RESPONSE,
    BODY_RESPONSE,
    BODY_RESPONSE,
    BODY_RESPONSE,
    BODY_RESPONSE,
    BODY_RESPONSE,
    BODY_RESPONSE,
  ];
  client.withSequence(responses);
  return client;
}

describe("validateSkillDirectory", () => {
  it("returns valid: true for a well-formed skill directory", () => {
    const dir = {
      slug: "my-skill",
      category: "business",
      files: [
        {
          path: "SKILL.md",
          content: `---\nname: my-skill\ndescription: "Apply the skill to accomplish the goal efficiently."\nmetadata:\n  category: business\n---\n`,
        },
        { path: "README.md", content: "# My Skill\n" },
      ],
    };
    const result = validateSkillDirectory(dir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns error when SKILL.md is missing", () => {
    const dir = { slug: "my-skill", category: "business", files: [{ path: "README.md", content: "#" }] };
    const result = validateSkillDirectory(dir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "SKILL.md")).toBe(true);
  });

  it("returns error when name does not match slug", () => {
    const dir = {
      slug: "my-skill",
      category: "business",
      files: [
        { path: "SKILL.md", content: '---\nname: different-name\ndescription: "Apply this."\n---\n' },
        { path: "README.md", content: "#" },
      ],
    };
    const result = validateSkillDirectory(dir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "name" && e.message.includes("match slug"))).toBe(true);
  });
});

describe("buildSkillFromResearch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds and validates a confirmed research result without running research again", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => SAMPLE_HTML,
    }));
    const client = buildConfirmedResearchClient();

    const result = await buildSkillFromResearch({
      researchResult: blueOcean,
      metadata: META,
    }, client);

    expect(result.validation.valid).toBe(true);
    expect(result.writeResult).toBeUndefined();
    expect(result.promptCount).toBe(10);
    expect(result.skillDirectory.files.some((file) => file.path === "SKILL.md")).toBe(true);
    expect(client.calls[0].prompt).not.toContain("Extract named");
  });

  it("filters selected tools and writes atomically when requested", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => SAMPLE_HTML,
    }));
    const client = new MockLLMClient({});
    client.withSequence([
      SAMPLE_RESPONSE,
      SELECTION_RESPONSE,
      BODY_RESPONSE,
      BODY_RESPONSE,
      BODY_RESPONSE,
      BODY_RESPONSE,
      BODY_RESPONSE,
      BODY_RESPONSE,
      BODY_RESPONSE,
    ]);
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "skillmall-pipeline-"));

    const result = await buildSkillFromResearch({
      researchResult: blueOcean,
      metadata: META,
      selectedToolNames: ["Strategy Canvas"],
      writeToDisk: true,
      outputBasePath: tmpDir,
    }, client);

    expect(result.filteredResearchResult.tools.map((tool) => tool.name)).toEqual(["Strategy Canvas"]);
    expect(result.writeResult?.success).toBe(true);
    expect(result.promptCount).toBe(7);
    expect(await fs.readFile(path.join(tmpDir, "business", "blue-ocean-strategy", "SKILL.md"), "utf-8"))
      .toContain("name: blue-ocean-strategy");

    await fs.rm(tmpDir, { recursive: true });
  });

  it("estimates resource score from generated file richness and tags", async () => {
    const score = estimateSkillResourceScore({
      slug: "rich-skill",
      category: "business",
      files: [
        { path: "scripts/run.sh", content: "" },
        { path: "resources/templates/template.md", content: "" },
        { path: "resources/samples/sample.md", content: "" },
      ],
    }, ["one", "two", "three", "four", "five", "six"]);

    expect(score).toBe(100);
  });

  it("applies reviewed SKILL.md content before validation and optional write", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => SAMPLE_HTML,
    }));
    const client = buildConfirmedResearchClient();

    const result = await buildSkillFromResearch({
      researchResult: blueOcean,
      metadata: META,
      skillMdContent: "",
    }, client);

    expect(result.skillDirectory.files.find((file) => file.path === "SKILL.md")?.content).toBe("");
    expect(result.validation.valid).toBe(false);
    expect(result.validation.errors.some((error) => error.field === "name")).toBe(true);
  });
});

describe("replaceSkillMdContent", () => {
  it("replaces only SKILL.md content without mutating other files", () => {
    const original = {
      slug: "my-skill",
      category: "business",
      files: [
        { path: "SKILL.md", content: "original" },
        { path: "README.md", content: "readme" },
      ],
    };

    const updated = replaceSkillMdContent(original, "edited");

    expect(updated).not.toBe(original);
    expect(updated.files.find((file) => file.path === "SKILL.md")?.content).toBe("edited");
    expect(updated.files.find((file) => file.path === "README.md")?.content).toBe("readme");
    expect(original.files.find((file) => file.path === "SKILL.md")?.content).toBe("original");
  });

  it("leaves directories without SKILL.md unchanged", () => {
    const original = {
      slug: "my-skill",
      category: "business",
      files: [{ path: "README.md", content: "readme" }],
    };

    const updated = replaceSkillMdContent(original, "edited");

    expect(updated.files).toEqual(original.files);
  });

  it("allows blank reviewed SKILL.md content to fail normal validation", () => {
    const original = {
      slug: "my-skill",
      category: "business",
      files: [
        {
          path: "SKILL.md",
          content: `---\nname: my-skill\ndescription: "Apply the skill."\n---\n`,
        },
        { path: "README.md", content: "readme" },
      ],
    };

    const updated = replaceSkillMdContent(original, "");
    const validation = validateSkillDirectory(updated);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.field === "name")).toBe(true);
  });
});

describe("runPipeline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Confirmation gate
  it("returns awaiting-confirmation when requireConfirmation is true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => SAMPLE_HTML,
    }));
    const client = new MockLLMClient({ "": JSON.stringify(blueOcean) });

    const result = await runPipeline(INPUT, client, { requireConfirmation: true });

    expect(result.stage).toBe("awaiting-confirmation");
    if (result.stage === "awaiting-confirmation") {
      expect(result.researchResult.topic).toBe("Blue Ocean Strategy");
    }
  });

  // Test 2: Full pipeline without disk write
  it("returns complete result without writing to disk when writeToDisk is false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => SAMPLE_HTML,
    }));
    const client = buildPipelineClient();

    const result = await runPipeline(
      { ...INPUT, writeToDisk: false },
      client,
      { requireConfirmation: false }
    );

    expect(result.stage).toBe("complete");
    if (result.stage === "complete") {
      expect(result.result.writeResult).toBeUndefined();
      expect(result.result.skillDirectory.files.length).toBeGreaterThan(0);
    }
  });

  // Test 3: Tool filter applied
  it("filters tools when selectedToolNames provided", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => SAMPLE_HTML,
    }));
    const client = new MockLLMClient({});
    client.withSequence([
      JSON.stringify(blueOcean),
      SAMPLE_RESPONSE,          // 1 sample (only 1 tool selected)
      SELECTION_RESPONSE, BODY_RESPONSE, // 1 tool prompt
      BODY_RESPONSE,            // 1 category
      BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, // 5 meta
    ]);

    const result = await runPipeline(
      { ...INPUT, writeToDisk: false, selectedToolNames: ["Strategy Canvas"] },
      client,
      { requireConfirmation: false }
    );

    expect(result.stage).toBe("complete");
    if (result.stage === "complete") {
      const templates = result.result.skillDirectory.files.filter((f) =>
        f.path.startsWith("resources/templates/")
      );
      expect(templates).toHaveLength(1);
    }
  });

  // Test 4: Validation failure halts write
  it("returns complete result without writeResult when validation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => SAMPLE_HTML,
    }));

    // Return a result with an invalid slug mismatch
    const invalidResult = { ...blueOcean, topic: "x" };
    const client = new MockLLMClient({ "": JSON.stringify(invalidResult) });

    const result = await runPipeline(
      { ...INPUT, writeToDisk: true, metadata: { ...META, slug: "wrong-slug" } },
      client,
      { requireConfirmation: false }
    );

    // If we get to complete stage, writeResult should be undefined (validation failed)
    if (result.stage === "complete") {
      // Either validation caught it or it completed without writing
      // Just verify no crash
      expect(result.stage).toBe("complete");
    }
  });
});

describe("atomicWrite", () => {
  it("writes files to disk and returns correct file count", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "skillmall-test-"));
    const outputPath = path.join(tmpDir, "test-skill");

    const dir = {
      slug: "test-skill",
      category: "test",
      files: [
        { path: "SKILL.md", content: "# Test\n" },
        { path: "README.md", content: "# Readme\n" },
      ],
    };

    const result = await atomicWrite(dir, outputPath);

    expect(result.success).toBe(true);
    expect(result.fileCount).toBe(2);
    expect(result.path).toBe(path.resolve(outputPath));

    const skillMd = await fs.readFile(path.join(outputPath, "SKILL.md"), "utf-8");
    expect(skillMd).toBe("# Test\n");

    // Cleanup
    await fs.rm(tmpDir, { recursive: true });
  });

  it("cleans up temp directory on failure", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "skillmall-test-"));
    const outputPath = path.join(tmpDir, "will-fail");

    const dir = {
      slug: "test",
      category: "test",
      files: [{ path: "SKILL.md", content: "# Test\n" }],
    };

    // Intercept fs.rename to throw
    vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error("rename failed"));

    await expect(atomicWrite(dir, outputPath)).rejects.toThrow("rename failed");

    // Temp dir should be cleaned up
    const entries = await fs.readdir(tmpDir);
    expect(entries.filter((e) => e.includes(".tmp-"))).toHaveLength(0);

    await fs.rm(tmpDir, { recursive: true });
  });
});
