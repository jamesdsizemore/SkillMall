import { describe, it, expect } from "vitest";
import { evaluateTriggers } from "../trigger-evaluator";
import { MockLLMClient } from "./mocks/mock-llm-client";
import type { Skill } from "../skills";

const MOCK_SKILL: Skill = {
  slug: "skill-creator",
  category: "ai",
  name: "skill-creator",
  description: "Create new AI agent skills from a description. Use when building a new skill for any agent.",
  version: "1.0.0",
  tags: ["skills", "ai", "creation"],
  author: "test",
  license: "MIT",
  compatibility: "",
  linked_skills: [],
  content: "",
  path: "ai/skill-creator/SKILL.md",
  hasScripts: false,
  hasTemplates: false,
  hasSamples: false,
};

const MOCK_QUERIES = JSON.stringify({
  positive: [
    "Create a skill for code review",
    "I need a new skill for writing tests",
    "Build me a skill for daily standups",
    "Make a skill that helps with PR descriptions",
    "Create a skill for OKR planning",
    "I want a skill for incident postmortems",
    "Build a skill for customer interviews",
    "Create a skill for sprint planning",
    "I need a skill for technical documentation",
    "Make a skill for competitive analysis",
  ],
  negative: [
    "Review my pull request",
    "Write unit tests for this function",
    "What's the weather like today?",
    "Help me debug this error",
    "Summarize this article",
    "Translate this to Spanish",
    "Calculate my expenses",
    "Schedule a meeting",
    "Write an email to my client",
    "Explain this concept to me",
  ],
});

const MOCK_EVAL = JSON.stringify({
  results: [
    // 10 positive queries — 8 trigger, 2 don't
    { query: "Create a skill for code review", would_trigger: true, confidence: 0.95 },
    { query: "I need a new skill for writing tests", would_trigger: true, confidence: 0.9 },
    { query: "Build me a skill for daily standups", would_trigger: true, confidence: 0.9 },
    { query: "Make a skill that helps with PR descriptions", would_trigger: true, confidence: 0.85 },
    { query: "Create a skill for OKR planning", would_trigger: true, confidence: 0.9 },
    { query: "I want a skill for incident postmortems", would_trigger: true, confidence: 0.85 },
    { query: "Build a skill for customer interviews", would_trigger: true, confidence: 0.9 },
    { query: "Create a skill for sprint planning", would_trigger: true, confidence: 0.85 },
    { query: "I need a skill for technical documentation", would_trigger: false, confidence: 0.45 },
    { query: "Make a skill for competitive analysis", would_trigger: false, confidence: 0.4 },
    // 10 negative queries — 1 incorrectly triggers
    { query: "Review my pull request", would_trigger: false, confidence: 0.1 },
    { query: "Write unit tests for this function", would_trigger: false, confidence: 0.1 },
    { query: "What's the weather like today?", would_trigger: false, confidence: 0.05 },
    { query: "Help me debug this error", would_trigger: false, confidence: 0.1 },
    { query: "Summarize this article", would_trigger: false, confidence: 0.05 },
    { query: "Translate this to Spanish", would_trigger: false, confidence: 0.05 },
    { query: "Calculate my expenses", would_trigger: false, confidence: 0.05 },
    { query: "Schedule a meeting", would_trigger: false, confidence: 0.05 },
    { query: "Write an email to my client", would_trigger: false, confidence: 0.05 },
    { query: "Explain this concept to me", would_trigger: true, confidence: 0.55 }, // false positive
  ],
});

describe("evaluateTriggers", () => {
  it("generates exactly 10 positive and 10 negative queries", async () => {
    const client = new MockLLMClient({});
    client.withSequence([MOCK_QUERIES, MOCK_EVAL]);

    const result = await evaluateTriggers(MOCK_SKILL, client);

    expect(result.positiveQueries).toHaveLength(10);
    expect(result.negativeQueries).toHaveLength(10);
    expect(client.calls).toHaveLength(2);
  });

  it("computes correct accuracy rates", async () => {
    const client = new MockLLMClient({});
    client.withSequence([MOCK_QUERIES, MOCK_EVAL]);

    const result = await evaluateTriggers(MOCK_SKILL, client);

    // 8/10 positive triggered → 80%
    expect(result.truePositiveRate).toBe(80);
    // 2/10 didn't trigger → 20% false negative
    expect(result.falseNegativeRate).toBe(20);
    // 1/10 incorrectly triggered → 10% false positive
    expect(result.falsePositiveRate).toBe(10);
    // overall: (8 + 9) / 20 = 85%
    expect(result.overallAccuracy).toBe(85);
  });

  it("identifies failing queries with suggestions", async () => {
    const client = new MockLLMClient({});
    client.withSequence([MOCK_QUERIES, MOCK_EVAL]);

    const result = await evaluateTriggers(MOCK_SKILL, client);

    // 2 false negatives + 1 false positive = 3 failing queries
    expect(result.failingQueries).toHaveLength(3);

    const fnQueries = result.failingQueries.filter((q) => q.type === "fn");
    const fpQueries = result.failingQueries.filter((q) => q.type === "fp");

    expect(fnQueries).toHaveLength(2);
    expect(fpQueries).toHaveLength(1);

    for (const failing of result.failingQueries) {
      expect(failing.suggestion).toBeTruthy();
      expect(failing.query).toBeTruthy();
    }
  });
});
