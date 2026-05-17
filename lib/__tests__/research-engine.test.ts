import { describe, it, expect, vi, beforeEach } from "vitest";
import { runResearchEngine, FetchError, ExtractionError } from "../research-engine";
import { MockLLMClient } from "./mocks/mock-llm-client";
import blueOceanFixture from "./fixtures/research-result-blue-ocean.json";
import noUrlsFixture from "./fixtures/research-result-no-urls.json";

// ─── Mock fetch globally ────────────────────────────────────────────────────

const mockFetchResponse = (html: string, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => html,
});

const SAMPLE_HTML = `
<html><body>
  <main>
    <h1>Blue Ocean Strategy Tools</h1>
    <p>The Strategy Canvas is a diagnostic tool that visualizes the competitive landscape.</p>
    <p>The ERRC Grid helps identify which factors to eliminate, reduce, raise, or create.</p>
  </main>
</body></html>
`;

describe("runResearchEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Happy path with URL
  it("returns valid ResearchResult when URL fetch and extraction succeed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(SAMPLE_HTML)));
    const client = new MockLLMClient({ "Blue Ocean": JSON.stringify(blueOceanFixture) });

    const result = await runResearchEngine("Blue Ocean Strategy", ["https://example.com"], client);

    expect(result.topic).toBe("Blue Ocean Strategy");
    expect(result.sources).toContain("https://example.com");
    expect(result.tools.length).toBeGreaterThan(0);
    expect(result.researchUnverified).toBeUndefined();
  });

  // Test 2: Multi-URL — both succeed
  it("combines text from multiple URLs and includes all sources", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(SAMPLE_HTML)));
    const client = new MockLLMClient({ "Blue Ocean": JSON.stringify(blueOceanFixture) });

    const result = await runResearchEngine(
      "Blue Ocean Strategy",
      ["https://url1.com", "https://url2.com"],
      client
    );

    expect(result.sources).toContain("https://url1.com");
    expect(result.sources).toContain("https://url2.com");
    expect(result.partialSources).toBeUndefined();
  });

  // Test 3: One URL fails — partial sources
  it("continues when one URL fails and sets partialSources: true", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue(mockFetchResponse(SAMPLE_HTML));
    vi.stubGlobal("fetch", fetchMock);
    const client = new MockLLMClient({ "Blue Ocean": JSON.stringify(blueOceanFixture) });

    const result = await runResearchEngine(
      "Blue Ocean Strategy",
      ["https://failing.com", "https://working.com"],
      client
    );

    expect(result.partialSources).toBe(true);
    expect(result.sources).toContain("https://working.com");
    expect(result.sources).not.toContain("https://failing.com");
  });

  // Test 4: All URLs fail
  it("throws FetchError when all URLs fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const client = new MockLLMClient({});

    await expect(
      runResearchEngine("Blue Ocean Strategy", ["https://failing.com"], client)
    ).rejects.toThrow(FetchError);
  });

  // Test 5: No URLs — training knowledge fallback
  it("returns result with researchUnverified: true when no URLs provided", async () => {
    const client = new MockLLMClient({ "OKR": JSON.stringify(noUrlsFixture) });

    const result = await runResearchEngine("OKR Framework", [], client);

    expect(result.researchUnverified).toBe(true);
    expect(result.sources).toHaveLength(0);
    expect(result.tools.length).toBeGreaterThan(0);
  });

  // Test 6: Invalid JSON on first attempt — retries and succeeds
  it("retries once on invalid JSON and returns result on second call", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(SAMPLE_HTML)));
    const client = new MockLLMClient({});
    client.withSequence([
      "this is not valid json { broken",
      JSON.stringify(blueOceanFixture),
    ]);

    const result = await runResearchEngine("Blue Ocean Strategy", ["https://example.com"], client);

    expect(client.calls).toHaveLength(2);
    expect(result.topic).toBe("Blue Ocean Strategy");
  });

  // Test 7: Zod validation fails on first attempt — retries with error context
  it("retries once when Zod validation fails and succeeds on second call", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(SAMPLE_HTML)));
    const invalidResult = { ...blueOceanFixture, summary: "too short" }; // fails min(50) check
    const client = new MockLLMClient({});
    client.withSequence([
      JSON.stringify(invalidResult),
      JSON.stringify(blueOceanFixture),
    ]);

    const result = await runResearchEngine("Blue Ocean Strategy", ["https://example.com"], client);

    expect(client.calls).toHaveLength(2);
    // Second call should include error context
    expect(client.calls[1].prompt).toContain("failed validation");
    expect(result.topic).toBe("Blue Ocean Strategy");
  });

  // Test 8: Two consecutive failures — throws ExtractionError
  it("throws ExtractionError after two consecutive failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(SAMPLE_HTML)));
    const client = new MockLLMClient({});
    client.withSequence([
      "not json",
      "also not json",
    ]);

    await expect(
      runResearchEngine("Blue Ocean Strategy", ["https://example.com"], client)
    ).rejects.toThrow(ExtractionError);

    expect(client.calls).toHaveLength(2);
  });

  // Test 9: Timeout — fetch times out
  it("treats timed-out URLs as failed and continues with remaining URLs", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(Object.assign(new Error("AbortError"), { name: "AbortError" }));
      }
      return Promise.resolve(mockFetchResponse(SAMPLE_HTML));
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new MockLLMClient({ "Blue Ocean": JSON.stringify(blueOceanFixture) });

    const result = await runResearchEngine(
      "Blue Ocean Strategy",
      ["https://slow.com", "https://fast.com"],
      client
    );

    expect(result.partialSources).toBe(true);
    expect(result.sources).not.toContain("https://slow.com");
    expect(result.sources).toContain("https://fast.com");
  });
});
