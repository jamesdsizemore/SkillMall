import type { ResearchTool } from "./validators";

export type ArtifactType = "matrix" | "canvas" | "grid" | "list" | "flowchart" | "analysis";

// ─── Framework candidates by artifact type ────────────────────────────────

export const FRAMEWORK_CANDIDATES: Record<ArtifactType, string[]> = {
  matrix: [
    "Structured Output",
    "Artifact Production",
    "Constrained Generation",
    "Task Decomposition",
    "Few-Shot",
  ],
  canvas: [
    "Structured Output",
    "Artifact Production",
    "Few-Shot",
    "Role / Expert Persona",
    "Constrained Generation",
  ],
  grid: [
    "Structured Output",
    "Artifact Production",
    "Constrained Generation",
    "Batch Prompting",
  ],
  list: [
    "Constrained Generation",
    "Task Decomposition",
    "Batch Prompting",
    "Structured Output",
    "Negative Prompting",
  ],
  flowchart: [
    "Least-to-Most",
    "Chain of Thought",
    "Task Decomposition",
    "Structured Output",
  ],
  analysis: [
    "Chain of Thought",
    "Step-Back Prompting",
    "Role / Expert Persona",
    "Tree of Thoughts",
    "Self-Critique",
  ],
};

// ─── Domain modifier rules ────────────────────────────────────────────────

export const DOMAIN_MODIFIER_RULES: Array<{
  pattern: RegExp;
  additionalCandidates: string[];
}> = [
  {
    pattern: /strateg|competi|market|business|growth/i,
    additionalCandidates: ["Step-Back Prompting", "Metacognitive Prompting"],
  },
  {
    pattern: /process|workflow|operation|pipeline|procedure/i,
    additionalCandidates: ["Least-to-Most", "PAL (Program-Aided Language Models)"],
  },
  {
    pattern: /customer|interview|user|stakeholder|persona/i,
    additionalCandidates: ["Role / Expert Persona", "Emotional Prompting"],
  },
  {
    pattern: /code|software|engineer|debug|test|review/i,
    additionalCandidates: ["PAL (Program-Aided Language Models)", "Self-Critique"],
  },
];

export const COMPLEXITY_CANDIDATES = ["Prompt Chaining", "Skeleton-of-Thought"];
export const COMPLEXITY_THRESHOLD = { inputs: 3, outputs: 3 };

// ─── Framework descriptions (used in selection prompts) ───────────────────

export const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  "Chain of Thought": "Explicit step-by-step reasoning trace before the final answer. Use for sequential analytical steps.",
  "Structured Output": "Specifies the exact output schema the model must conform to. Primary choice for any artifact with defined structure.",
  "Artifact Production": "Optimized for producing a specific named deliverable. Use as the core framework for any artifact-generating prompt.",
  "Constrained Generation": "Specifies what must and must not be included. Use for artifacts with strict inclusion/exclusion rules.",
  "Task Decomposition": "Breaks a complex task into numbered subtasks. Use for multi-stage artifacts.",
  "Few-Shot": "Provides 2-5 worked examples before the task. Use when the output format is complex and an example clarifies it.",
  "Role / Expert Persona": "Assigns a specific expert identity. Use when domain expertise framing improves output quality.",
  "Batch Prompting": "Processes multiple items in a single call with consistent formatting. Use for grids and tables with repeated row structure.",
  "Negative Prompting": "Defines what to exclude or avoid. Use to sharpen the output space through elimination.",
  "Least-to-Most": "Decomposes from simplest to hardest sub-problems, solving in order. Use for sequential processes.",
  "Step-Back Prompting": "Prompts for higher-level principles before the specific case. Use for strategic or conceptual analysis.",
  "Tree of Thoughts": "Explores multiple reasoning paths before selecting the strongest. Use for high-stakes decisions.",
  "Self-Critique": "Model generates, critiques, then revises. Use for high-quality single-pass outputs.",
  "Metacognitive Prompting": "Prompts the model to reflect on its reasoning as it works. Use when reasoning quality matters.",
  "Prompt Chaining": "Sequences multiple prompts where each output becomes the next input. Use for multi-stage analysis.",
  "Skeleton-of-Thought": "Generates an answer outline first, then fills each section. Use for complex multi-section artifacts.",
  "PAL (Program-Aided Language Models)": "Generates pseudocode as the reasoning intermediate. Use for quantitative or scoring tasks.",
  "Emotional Prompting": "Incorporates high-stakes framing. Use for critical decisions requiring accuracy-maximizing behavior.",
  "Zero-Shot": "No examples; relies entirely on instruction precision. Use when the output format is simple and unambiguous.",
  "Instruction Engineering": "Precise, unambiguous task decomposition with explicit constraints. Use for any structured artifact.",
};

// ─── Candidate selection function ────────────────────────────────────────

export function getFrameworkCandidates(tool: ResearchTool, topic: string): string[] {
  const candidates = new Set<string>(FRAMEWORK_CANDIDATES[tool.artifactType]);

  for (const rule of DOMAIN_MODIFIER_RULES) {
    if (rule.pattern.test(topic)) {
      rule.additionalCandidates.forEach((c) => candidates.add(c));
    }
  }

  if (
    tool.inputs.length >= COMPLEXITY_THRESHOLD.inputs &&
    tool.outputs.length >= COMPLEXITY_THRESHOLD.outputs
  ) {
    COMPLEXITY_CANDIDATES.forEach((c) => candidates.add(c));
  }

  return [...candidates].slice(0, 8);
}
