"use client";

const META_TYPES = [
  { id: "meta-comprehensive-analysis",     label: "Comprehensive Analysis",     complexity: "exhaustive" },
  { id: "meta-quick-assessment",           label: "Quick Assessment",           complexity: "quick" },
  { id: "meta-stakeholder-presentation",   label: "Stakeholder Presentation",   complexity: "thorough" },
  { id: "meta-first-principles-exploration",label: "First Principles",          complexity: "thorough" },
  { id: "meta-competitive-response",       label: "Competitive Response",       complexity: "thorough" },
] as const;

const COMPLEXITY_COLOR: Record<string, string> = {
  quick: "bg-sm-blue",
  thorough: "bg-sm-secondary",
  exhaustive: "bg-sm-accent",
};

type Props = {
  selectedMetaTypes: string[];
  toolCount: number;
  categoryCount: number;
  onToggleMetaType: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
};

export function Step5PromptOptions({ selectedMetaTypes, toolCount, categoryCount, onToggleMetaType, onNext, onBack }: Props) {
  const promptCount = toolCount + categoryCount + selectedMetaTypes.length;

  return (
    <div className="space-y-8">
      <div>
        <p
          className="mb-4 text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SELECT META PROMPT TYPES ]
        </p>

        <div className="space-y-2">
          {META_TYPES.map((type) => {
            const checked = selectedMetaTypes.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => onToggleMetaType(type.id)}
                className={`flex w-full items-center justify-between border px-4 py-3 text-left transition-colors ${
                  checked ? "border-sm-display" : "border-sm-border hover:border-sm-primary"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 ${checked ? "bg-sm-display" : "border border-sm-border"}`}
                  />
                  <span className="text-sm text-sm-primary">{type.label}</span>
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${COMPLEXITY_COLOR[type.complexity]}`}
                  title={type.complexity}
                />
              </button>
            );
          })}
        </div>

        <p
          className="mt-4 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ TOTAL PROMPTS: {promptCount} — {toolCount} TOOL + {categoryCount} CATEGORY + {selectedMetaTypes.length} META ]
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="border border-sm-border px-5 py-2.5 text-[10px] tracking-widest text-sm-secondary hover:border-sm-primary transition-colors"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ← BACK ]
        </button>
        <button
          onClick={onNext}
          className="bg-sm-display px-6 py-2.5 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ PREVIEW DIRECTORY → ]
        </button>
      </div>
    </div>
  );
}
