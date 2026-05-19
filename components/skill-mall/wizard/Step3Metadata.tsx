"use client";

const CATEGORIES = [
  "development", "design", "writing", "research",
  "productivity", "infrastructure", "ai", "business",
] as const;

type Props = {
  category: string;
  tags: string[];
  targetAgents: string[];
  onCategoryChange: (v: string) => void;
  onTagsChange: (tags: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
};

export function Step3Metadata({
  category,
  tags,
  onCategoryChange,
  onTagsChange,
  onNext,
  onBack,
  isLoading = false,
  error,
}: Props) {
  const tagString = tags.join(", ");

  return (
    <div className="space-y-8">
      <div>
        <label
          className="mb-2 block text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ CATEGORY ]
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 text-[10px] tracking-widest border transition-colors ${
                category === cat
                  ? "border-sm-display bg-sm-display text-sm-bg"
                  : "border-sm-border text-sm-secondary hover:border-sm-primary"
              }`}
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ {cat.toUpperCase()} ]
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          className="mb-2 block text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ TAGS — COMMA SEPARATED ]
        </label>
        <div className="border-b border-sm-border focus-within:border-sm-display transition-colors">
          <input
            value={tagString}
            onChange={(e) => onTagsChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            placeholder="strategy, analysis, business"
            className="w-full bg-transparent py-2 text-sm text-sm-primary outline-none placeholder:text-sm-disabled"
          />
        </div>
      </div>

      {error && (
        <p
          className="text-[10px] tracking-widest text-sm-accent"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ERROR: {error.toUpperCase()} ]
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="border border-sm-border px-5 py-2.5 text-[10px] tracking-widest text-sm-secondary hover:border-sm-primary hover:text-sm-primary transition-colors"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ ← BACK ]
        </button>
        <button
          onClick={onNext}
          disabled={isLoading}
          className="bg-sm-display px-6 py-2.5 text-[10px] tracking-widest text-sm-bg hover:opacity-80 transition-opacity disabled:opacity-30"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {isLoading ? "[ GENERATING SKILL.MD... ]" : "[ PREVIEW SKILL → ]"}
        </button>
      </div>
    </div>
  );
}
