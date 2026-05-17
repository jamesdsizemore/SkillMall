import { describe, it, expect } from "vitest";
import { optimizePrompt } from "../prompt-optimizer";
import { MockLLMClient } from "./mocks/mock-llm-client";
import auditFixture from "./fixtures/prompt-audit-response.json";

const PROMPT = "This is basically a very simple prompt that produces a strategy canvas showing competitive landscape.";
const AUDIT_JSON = JSON.stringify(auditFixture);

describe("optimizePrompt", () => {
  // Test 1: Successful audit returns populated PromptAudit
  it("returns populated PromptAudit on successful LLM call", async () => {
    const client = new MockLLMClient({ "": AUDIT_JSON });
    const result = await optimizePrompt(PROMPT, client);

    expect(result.optimizationFailed).toBeUndefined();
    expect(result.optimizedPrompt).toBe("Produce a strategy canvas showing the competitive landscape.");
    expect(result.intentDimensionsMissing).toContain("success-criteria");
    expect(result.intentDimensionsMissing).toContain("examples");
    expect(result.tokenCountBefore).toBeGreaterThan(0);
    expect(result.outputClarityPasses).toBe(true);
    expect(result.triggerSharpnessPasses).toBe(true);
  });

  // Test 2: Retry on Zod validation failure — succeeds on second call
  it("retries once on Zod validation failure and succeeds on second call", async () => {
    const invalidResponse = JSON.stringify({ token_efficiency: { score: "not-a-number" } });
    const client = new MockLLMClient({});
    client.withSequence([invalidResponse, AUDIT_JSON]);

    const result = await optimizePrompt(PROMPT, client);

    expect(client.calls).toHaveLength(2);
    expect(client.calls[1].prompt).toContain("Previous response failed validation");
    expect(result.optimizationFailed).toBeUndefined();
  });

  // Test 3: Both calls fail — returns graceful fallback with optimizationFailed: true
  it("returns fallback with optimizationFailed: true when both calls fail", async () => {
    const client = new MockLLMClient({});
    client.withSequence(["not json", "also not json"]);

    const result = await optimizePrompt(PROMPT, client);

    expect(client.calls).toHaveLength(2);
    expect(result.optimizationFailed).toBe(true);
    expect(result.optimizedPrompt).toBe(PROMPT);
    expect(result.tokenCountBefore).toBeGreaterThan(0);
    expect(result.tokenCountAfter).toBe(result.tokenCountBefore);
  });

  // Test 4: Token count before > token count after when optimizer removes words
  it("tokenCountAfter < tokenCountBefore when optimized prompt is shorter", async () => {
    const client = new MockLLMClient({ "": AUDIT_JSON });
    const result = await optimizePrompt(PROMPT, client);

    // The fixture optimized_text is shorter than PROMPT
    expect(result.tokenCountAfter).toBeLessThan(result.tokenCountBefore);
    expect(result.tokenReductionPercent).toBeGreaterThan(0);
  });
});
