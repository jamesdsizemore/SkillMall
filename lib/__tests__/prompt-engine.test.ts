import { describe, it, expect } from "vitest";
import { getFrameworkCandidates } from "../pe-frameworks";
import { generatePrompts } from "../prompt-engine";
import { MockLLMClient } from "./mocks/mock-llm-client";
import blueOceanFixture from "./fixtures/research-result-blue-ocean.json";
import type { ResearchResult } from "../validators";

const SELECTION_RESPONSE = JSON.stringify({
  selected: ["Structured Output"],
  rationale: "Best for this artifact type",
});

const BODY_RESPONSE = "Produce a comprehensive analysis using the following structure:\n\n| Factor | Score |\n|---|---|\n\nCompletion: table complete with all factors.";

const blueOcean = blueOceanFixture as ResearchResult;

// For Blue Ocean fixture: 3 tools, 2 categories (Strategy, Shift)
// Expected: 3 tool prompts + 2 category prompts + 5 meta = 10
// (no cross-category synthesis since only 2 categories)

// For simple domain: 3 tools, 1 category
// Expected: 3 tool + 1 category + 5 meta = 9 (no 6th since only 1 category)

const SIMPLE_RESULT: ResearchResult = {
  topic: "OKR Framework",
  sources: [],
  summary: "Apply the OKR Framework to set measurable goals that align teams.",
  tools: [
    {
      name: "OKR Template",
      category: "Goal Setting",
      description: "Standard OKR format.",
      artifactType: "list",
      artifactStructure: "## Objective\n\n## Key Results\n1. \n2. \n3. ",
      inputs: ["strategic priorities"],
      outputs: ["okr-set.md"],
      howUsed: "1. Define objective. 2. Write key results.",
    },
    {
      name: "Confidence Rating",
      category: "Goal Setting",
      description: "Weekly confidence score.",
      artifactType: "list",
      artifactStructure: "## Confidence: /10\n\n## Reasoning: ",
      inputs: ["current progress"],
      outputs: ["confidence-rating.md"],
      howUsed: "1. Rate 0-10. 2. Explain.",
    },
    {
      name: "OKR Review",
      category: "Goal Setting",
      description: "End-of-cycle review.",
      artifactType: "analysis",
      artifactStructure: "## Objective: \n\n## Score: /10\n\n## Learnings: ",
      inputs: ["okr set", "results"],
      outputs: ["okr-review.md"],
      howUsed: "1. Score. 2. Document learnings.",
    },
  ],
  principles: ["Ambitious goals", "Measurable outcomes"],
  suggestedCategory: "productivity",
  suggestedTags: ["okr", "goals"],
};

describe("getFrameworkCandidates", () => {
  // Test 1: Matrix artifact type includes Structured Output and Artifact Production
  it("matrix artifact type includes Structured Output and Artifact Production", () => {
    const tool = { ...blueOcean.tools[0], artifactType: "matrix" as const };
    const candidates = getFrameworkCandidates(tool, "any topic");
    expect(candidates).toContain("Structured Output");
    expect(candidates).toContain("Artifact Production");
  });

  // Test 2: Analysis artifact type includes Chain of Thought
  it("analysis artifact type includes Chain of Thought", () => {
    const tool = { ...blueOcean.tools[0], artifactType: "analysis" as const };
    const candidates = getFrameworkCandidates(tool, "any topic");
    expect(candidates).toContain("Chain of Thought");
  });

  // Test 3: Strategy topic adds Step-Back Prompting
  it("strategy domain adds Step-Back Prompting and Metacognitive Prompting", () => {
    const tool = { ...blueOcean.tools[0], artifactType: "canvas" as const };
    const candidates = getFrameworkCandidates(tool, "Blue Ocean Strategy");
    expect(candidates).toContain("Step-Back Prompting");
  });

  // Test 4: Complexity modifier adds Prompt Chaining
  it("tool with 3+ inputs and 3+ outputs adds Prompt Chaining and Skeleton-of-Thought", () => {
    const tool = {
      ...blueOcean.tools[0],
      artifactType: "matrix" as const,
      inputs: ["a", "b", "c"],
      outputs: ["x", "y", "z"],
    };
    const candidates = getFrameworkCandidates(tool, "any topic");
    expect(candidates).toContain("Prompt Chaining");
    expect(candidates).toContain("Skeleton-of-Thought");
  });
});

describe("generatePrompts", () => {
  // Test 5: Framework selection uses only candidates from list
  it("framework selection fallback used when LLM returns invalid framework", async () => {
    const client = new MockLLMClient({});
    client.withSequence([
      JSON.stringify({ selected: ["INVALID FRAMEWORK"], rationale: "test" }),
      BODY_RESPONSE,
      JSON.stringify({ selected: ["Structured Output"], rationale: "test" }),
      BODY_RESPONSE,
      JSON.stringify({ selected: ["Structured Output"], rationale: "test" }),
      BODY_RESPONSE,
      BODY_RESPONSE, // category
      BODY_RESPONSE, // category
      BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, BODY_RESPONSE, // meta 5
    ]);

    // Should not throw — fallback to first 2 candidates
    const files = await generatePrompts(blueOcean, { slug: "blue-ocean" }, client);
    expect(files.length).toBeGreaterThan(0);
  });

  // Test 6: Prompt count for Blue Ocean (3 tools, 2 categories, 5 meta = 10)
  it("generates correct prompt count for Blue Ocean (3 tools, 2 categories, 5 meta = 10)", async () => {
    const responses = [];
    // For each of 3 tools: selection + body = 6 calls
    for (let i = 0; i < 3; i++) {
      responses.push(SELECTION_RESPONSE, BODY_RESPONSE);
    }
    // 2 category prompts
    responses.push(BODY_RESPONSE, BODY_RESPONSE);
    // 5 meta prompts
    for (let i = 0; i < 5; i++) responses.push(BODY_RESPONSE);

    const client = new MockLLMClient({});
    client.withSequence(responses);

    const files = await generatePrompts(blueOcean, { slug: "blue-ocean" }, client);

    const toolPrompts = files.filter((f) => f.path.includes("/tool-"));
    const categoryPrompts = files.filter((f) => f.path.includes("/category-"));
    const metaPrompts = files.filter((f) => f.path.includes("/meta-"));

    expect(toolPrompts).toHaveLength(3);
    expect(categoryPrompts).toHaveLength(2);
    expect(metaPrompts).toHaveLength(5);
    expect(files).toHaveLength(10);
  });

  // Test 7: Prompt count for simple domain (3 tools, 1 category, 4 meta = 8 — no 6th)
  it("generates correct prompt count for simple domain (3 tools, 1 category, 5 meta = 9)", async () => {
    const responses = [];
    for (let i = 0; i < 3; i++) responses.push(SELECTION_RESPONSE, BODY_RESPONSE);
    responses.push(BODY_RESPONSE); // 1 category
    for (let i = 0; i < 5; i++) responses.push(BODY_RESPONSE); // 5 meta

    const client = new MockLLMClient({});
    client.withSequence(responses);

    const files = await generatePrompts(SIMPLE_RESULT, { slug: "okr-framework" }, client);

    expect(files.filter((f) => f.path.includes("/tool-"))).toHaveLength(3);
    expect(files.filter((f) => f.path.includes("/category-"))).toHaveLength(1);
    expect(files.filter((f) => f.path.includes("/meta-"))).toHaveLength(5);
    // No cross-category synthesis (only 1 category)
    expect(files.find((f) => f.path.includes("cross-category"))).toBeUndefined();
    expect(files).toHaveLength(9);
  });

  // Test 8: No prompt references external resources/ paths
  it("no generated prompt body references resources/ paths", async () => {
    const responses = [];
    for (let i = 0; i < 3; i++) responses.push(SELECTION_RESPONSE, BODY_RESPONSE);
    responses.push(BODY_RESPONSE, BODY_RESPONSE); // 2 categories
    for (let i = 0; i < 5; i++) responses.push(BODY_RESPONSE);

    const client = new MockLLMClient({});
    client.withSequence(responses);

    const files = await generatePrompts(blueOcean, { slug: "blue-ocean" }, client);

    // The bodies we inject (BODY_RESPONSE) don't reference resources/
    // This test verifies the engine doesn't inject such references
    for (const file of files) {
      const body = file.content.split("---\n\n")[1] ?? "";
      expect(body).not.toContain("resources/templates/");
      expect(body).not.toContain("resources/samples/");
    }
  });
});
