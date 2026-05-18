import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";

describe("detectAgents", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns detected: true for directories that exist", async () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) =>
      String(p).endsWith(".claude/skills")
    );

    const { detectAgents } = await import("../agents/detector");
    const agents = detectAgents();

    const claude = agents.find((a) => a.id === "claude-code");
    expect(claude?.detected).toBe(true);

    const cursor = agents.find((a) => a.id === "cursor");
    expect(cursor?.detected).toBe(false);
  });

  it("returns detected: false for directories that do not exist", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const { detectAgents } = await import("../agents/detector");
    const agents = detectAgents();

    expect(agents.every((a) => !a.detected)).toBe(true);
  });

  it("returns all 7 agents in registry", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const { detectAgents } = await import("../agents/detector");
    const agents = detectAgents();
    expect(agents).toHaveLength(7);

    const ids = agents.map((a) => a.id);
    expect(ids).toContain("claude-code");
    expect(ids).toContain("cursor");
    expect(ids).toContain("codex");
    expect(ids).toContain("gemini-cli");
  });
});
