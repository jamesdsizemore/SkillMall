"use client";

type Props = {
  skillMdPreview: string;
  onNext: () => void;
  onBack: () => void;
};

export function Step4Preview({ skillMdPreview, onNext, onBack }: Props) {
  return (
    <div className="space-y-6">
      <p
        className="text-[9px] tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ SKILL.MD PREVIEW ]
      </p>

      <div className="border border-sm-border bg-sm-surface">
        <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-sm-secondary whitespace-pre-wrap">
          {skillMdPreview}
        </pre>
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
          [ SELECT PROMPTS → ]
        </button>
      </div>
    </div>
  );
}
