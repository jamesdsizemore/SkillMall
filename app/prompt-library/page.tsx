import { FRAMEWORK_DESCRIPTIONS } from "@/lib/pe-frameworks";

const FRAMEWORK_CATEGORIES: Record<string, string[]> = {
  reasoning: [
    "Chain of Thought", "Zero-Shot CoT", "Tree of Thoughts", "Graph of Thoughts",
    "Self-Consistency", "Least-to-Most", "Step-Back Prompting", "Analogical Prompting",
    "Skeleton-of-Thought", "Metacognitive Prompting", "ReAct (Reasoning + Acting)",
    "PAL (Program-Aided Language Models)",
  ],
  context: [
    "Role / Expert Persona", "Few-Shot", "Zero-Shot", "One-Shot", "Many-Shot",
    "Generated Knowledge", "Contrastive CoT", "Active Prompting",
  ],
  structure: [
    "Instruction Engineering", "Task Decomposition", "Structured Output (XML/JSON)",
    "Prompt Chaining", "Constrained Generation", "Negative Prompting",
    "Directional Stimulus", "Template / Variable",
  ],
  output: [
    "Artifact Production", "Maieutic Prompting", "Expert Prompting", "Emotional Prompting",
    "Batch Prompting", "Structured Decomposition",
  ],
  meta: [
    "Self-Critique", "Auto-CoT", "Complexity-Based Prompting",
    "Token Efficiency Audit", "9-Dimension Intent Extraction",
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  reasoning: "Reasoning",
  context: "Context",
  structure: "Structure",
  output: "Output",
  meta: "Meta & Optimization",
};

const allFrameworks = Object.values(FRAMEWORK_CATEGORIES).flat();

export default function PromptLibraryPage() {
  const totalCount = allFrameworks.length;

  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p
          className="mb-2 text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ TOOLS / PROMPT LIBRARY ]
        </p>
        <h1 className="mb-2 text-2xl font-bold text-sm-display">Prompt Engineering Library</h1>
        <p className="mb-2 text-sm text-sm-secondary">
          {totalCount} framework patterns for writing effective AI prompts. Reference when creating or overriding skill prompts.
        </p>
        <p
          className="mb-10 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ {totalCount} FRAMEWORKS ]
        </p>

        {Object.entries(FRAMEWORK_CATEGORIES).map(([categoryKey, frameworks]) => (
          <div key={categoryKey} className="mb-12">
            <p
              className="mb-4 text-[10px] tracking-widest text-sm-secondary border-b border-sm-border pb-2"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ {CATEGORY_LABELS[categoryKey]?.toUpperCase()} ] [{" "}
              {frameworks.length} ]
            </p>

            <div className="grid grid-cols-1 gap-px border border-sm-border bg-sm-border sm:grid-cols-2 lg:grid-cols-3">
              {frameworks.map((name) => (
                <div key={name} className="bg-sm-surface p-4">
                  <h3 className="mb-2 text-sm font-semibold text-sm-display leading-snug">
                    {name}
                  </h3>
                  <p className="text-xs leading-relaxed text-sm-secondary">
                    {FRAMEWORK_DESCRIPTIONS[name] ?? "A prompt engineering framework pattern."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
