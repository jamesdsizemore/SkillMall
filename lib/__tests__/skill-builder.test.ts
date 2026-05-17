import { describe, it, expect } from "vitest";
import { buildSkillDirectory } from "../skill-builder";
import { MockLLMClient } from "./mocks/mock-llm-client";
import blueOceanFixture from "./fixtures/research-result-blue-ocean.json";
import type { ResearchResult } from "../validators";

const SAMPLE_RESPONSE = "| Strategy Canvas Sample | Score 1 | Score 2 |";

const META = {
  slug: "blue-ocean-strategy",
  category: "business",
  tags: ["strategy", "blue-ocean"],
  targetAgents: ["claude-code"],
};

describe("buildSkillDirectory", () => {
  // Test 1: SKILL.md snapshot (description ≤ 150 chars)
  it("generates SKILL.md with description ≤ 150 chars", async () => {
    const client = new MockLLMClient({ "": SAMPLE_RESPONSE });
    const dir = await buildSkillDirectory(blueOceanFixture as ResearchResult, META, client);

    const skillMd = dir.files.find((f) => f.path === "SKILL.md");
    expect(skillMd).toBeDefined();

    const descMatch = skillMd!.content.match(/description: "(.+?)"/);
    expect(descMatch).toBeTruthy();
    expect(descMatch![1].length).toBeLessThanOrEqual(150);
  });

  // Test 2: Template contains artifactStructure verbatim
  it("embeds artifactStructure verbatim in each template file", async () => {
    const client = new MockLLMClient({ "": SAMPLE_RESPONSE });
    const dir = await buildSkillDirectory(blueOceanFixture as ResearchResult, META, client);

    const firstTool = (blueOceanFixture as ResearchResult).tools[0];
    const templatePath = `resources/templates/${firstTool.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.md`;
    const template = dir.files.find((f) => f.path === templatePath);
    expect(template).toBeDefined();
    expect(template!.content).toContain(firstTool.artifactStructure);
  });

  // Test 3: README.md present and contains tool index table
  it("generates README.md with tool index table", async () => {
    const client = new MockLLMClient({ "": SAMPLE_RESPONSE });
    const dir = await buildSkillDirectory(blueOceanFixture as ResearchResult, META, client);

    const readme = dir.files.find((f) => f.path === "README.md");
    expect(readme).toBeDefined();
    expect(readme!.content).toContain("| Tool |");
    expect(readme!.content).toContain("Strategy Canvas");
  });

  // Test 4: Correct file count
  it("produces correct file count: 1 SKILL.md + 1 README.md + N templates + N samples + scripts", async () => {
    const client = new MockLLMClient({ "": SAMPLE_RESPONSE });
    const dir = await buildSkillDirectory(blueOceanFixture as ResearchResult, META, client);

    const toolCount = (blueOceanFixture as ResearchResult).tools.length;
    const skillMdFiles = dir.files.filter((f) => f.path === "SKILL.md").length;
    const readmeFiles = dir.files.filter((f) => f.path === "README.md").length;
    const templates = dir.files.filter((f) => f.path.startsWith("resources/templates/")).length;
    const samples = dir.files.filter((f) => f.path.startsWith("resources/samples/")).length;
    const scripts = dir.files.filter((f) => f.path.startsWith("scripts/")).length;

    expect(skillMdFiles).toBe(1);
    expect(readmeFiles).toBe(1);
    expect(templates).toBe(toolCount);
    expect(samples).toBe(toolCount);
    expect(scripts).toBeGreaterThanOrEqual(1); // at least run-full-analysis.sh
  });

  // Test 5: Unverified banner present when researchUnverified is true
  it("includes unverified banner in SKILL.md when researchUnverified is true", async () => {
    const client = new MockLLMClient({ "": SAMPLE_RESPONSE });
    const unverifiedResult: ResearchResult = {
      ...(blueOceanFixture as ResearchResult),
      researchUnverified: true,
    };

    const dir = await buildSkillDirectory(unverifiedResult, META, client);
    const skillMd = dir.files.find((f) => f.path === "SKILL.md");
    expect(skillMd!.content).toContain("Research unverified");
  });

  // Test 6: Sample generation called once per tool
  it("calls LLM once per tool for sample generation", async () => {
    const client = new MockLLMClient({ "": SAMPLE_RESPONSE });
    const toolCount = (blueOceanFixture as ResearchResult).tools.length;

    await buildSkillDirectory(blueOceanFixture as ResearchResult, META, client);

    expect(client.calls).toHaveLength(toolCount);
  });

  // Test 7: Does not import from research-engine (structural check via no-op)
  it("produces slug matching meta.slug", async () => {
    const client = new MockLLMClient({ "": SAMPLE_RESPONSE });
    const dir = await buildSkillDirectory(blueOceanFixture as ResearchResult, META, client);
    expect(dir.slug).toBe("blue-ocean-strategy");
    expect(dir.category).toBe("business");
  });
});
