import { describe, it, expect } from "vitest";
import { wizardReducer, INITIAL_WIZARD_STATE } from "../wizard-reducer";
import type { WizardAction, ResearchResult } from "../WizardContext";

const mockResearchResult: ResearchResult = {
  topic: "Blue Ocean Strategy",
  sources: ["https://blueoceanstrategy.com"],
  summary: "Apply Blue Ocean Strategy to identify uncontested market spaces.",
  tools: [
    {
      name: "Strategy Canvas",
      category: "Strategy",
      description: "Visualizes the competitive landscape.",
      artifactType: "canvas",
      artifactStructure: "| Factor | Current | Proposed |",
      inputs: ["competing factors", "company scores"],
      outputs: ["current-state canvas", "proposed canvas"],
      howUsed: "1. List factors. 2. Score each.",
    },
    {
      name: "ERRC Grid",
      category: "Strategy",
      description: "Defines strategic moves across four actions.",
      artifactType: "grid",
      artifactStructure: "| Eliminate | Reduce | Raise | Create |",
      inputs: ["competitive factors"],
      outputs: ["errc grid"],
      howUsed: "1. Identify factors. 2. Assign to quadrants.",
    },
  ],
  principles: ["Value innovation", "Make competition irrelevant"],
  suggestedCategory: "business",
  suggestedTags: ["strategy", "blue-ocean", "business"],
};

describe("wizardReducer", () => {
  it("initial state matches INITIAL_WIZARD_STATE", () => {
    expect(wizardReducer(INITIAL_WIZARD_STATE, { type: "RESET" })).toEqual(INITIAL_WIZARD_STATE);
  });

  it("SET_TOPIC updates topic", () => {
    const state = wizardReducer(INITIAL_WIZARD_STATE, { type: "SET_TOPIC", topic: "OKR Framework" });
    expect(state.topic).toBe("OKR Framework");
  });

  it("ADD_URL appends to sourceUrls", () => {
    const state = wizardReducer(INITIAL_WIZARD_STATE, { type: "ADD_URL", url: "https://example.com" });
    expect(state.sourceUrls).toContain("https://example.com");
    expect(state.sourceUrls).toHaveLength(1);
  });

  it("REMOVE_URL removes by index", () => {
    let state = wizardReducer(INITIAL_WIZARD_STATE, { type: "ADD_URL", url: "https://a.com" });
    state = wizardReducer(state, { type: "ADD_URL", url: "https://b.com" });
    state = wizardReducer(state, { type: "REMOVE_URL", index: 0 });
    expect(state.sourceUrls).toEqual(["https://b.com"]);
  });

  it("SET_RESEARCH_RESULT sets result and selectedToolNames to all tool names", () => {
    const state = wizardReducer(INITIAL_WIZARD_STATE, {
      type: "SET_RESEARCH_RESULT",
      result: mockResearchResult,
    });
    expect(state.researchResult).toEqual(mockResearchResult);
    expect(state.selectedToolNames).toEqual(["Strategy Canvas", "ERRC Grid"]);
    expect(state.category).toBe("business");
    expect(state.tags).toEqual(["strategy", "blue-ocean", "business"]);
  });

  it("NEXT_STEP increments step", () => {
    const state = wizardReducer(INITIAL_WIZARD_STATE, { type: "NEXT_STEP" });
    expect(state.step).toBe(2);
  });

  it("NEXT_STEP caps at 6", () => {
    let state = INITIAL_WIZARD_STATE;
    for (let i = 0; i < 10; i++) state = wizardReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe(6);
  });

  it("PREV_STEP decrements step", () => {
    let state = wizardReducer(INITIAL_WIZARD_STATE, { type: "NEXT_STEP" });
    state = wizardReducer(state, { type: "PREV_STEP" });
    expect(state.step).toBe(1);
  });

  it("PREV_STEP floors at 1", () => {
    let state = INITIAL_WIZARD_STATE;
    for (let i = 0; i < 5; i++) state = wizardReducer(state, { type: "PREV_STEP" });
    expect(state.step).toBe(1);
  });

  it("SET_LOADING sets isLoading", () => {
    const state = wizardReducer(INITIAL_WIZARD_STATE, { type: "SET_LOADING", loading: true });
    expect(state.isLoading).toBe(true);
    const state2 = wizardReducer(state, { type: "SET_LOADING", loading: false });
    expect(state2.isLoading).toBe(false);
  });

  it("SET_ERROR sets error", () => {
    const state = wizardReducer(INITIAL_WIZARD_STATE, { type: "SET_ERROR", error: "test error" });
    expect(state.error).toBe("test error");
  });

  it("RESET returns INITIAL_WIZARD_STATE", () => {
    let state = wizardReducer(INITIAL_WIZARD_STATE, { type: "SET_TOPIC", topic: "Something" });
    state = wizardReducer(state, { type: "NEXT_STEP" });
    state = wizardReducer(state, { type: "RESET" });
    expect(state).toEqual(INITIAL_WIZARD_STATE);
  });
});
