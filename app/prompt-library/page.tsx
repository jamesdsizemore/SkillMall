import { FRAMEWORK_DESCRIPTIONS } from "@/lib/pe-frameworks";
import { getFrameworkSkillCounts } from "@/lib/skills";

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
  const frameworkCounts = getFrameworkSkillCounts();

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
              {frameworks.map((name) => {
                const skillCount = frameworkCounts[name] ?? 0;
                const filterUrl = `/?q=${encodeURIComponent(name)}`;
                return (
                  <div key={name} className="bg-sm-surface p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-sm-display leading-snug flex-1">
                        {name}
                      </h3>
                      {/* Copy button — handled by inline event-delegation script below */}
                      <button
                        data-copy={name}
                        className="shrink-0 border border-sm-border px-2 py-0.5 text-[8px] tracking-widest text-sm-disabled hover:border-sm-display hover:text-sm-display transition-colors"
                        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                      >
                        [ COPY ]
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed text-sm-secondary mb-2">
                      {FRAMEWORK_DESCRIPTIONS[name] ?? "A prompt engineering framework pattern."}
                    </p>
                    {/* Skills using this framework */}
                    <div className="flex items-center gap-2">
                      {skillCount > 0 ? (
                        <a
                          href={filterUrl}
                          className="text-[8px] tracking-widest text-sm-secondary hover:text-sm-display transition-colors"
                          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                        >
                          {skillCount} skill{skillCount !== 1 ? "s" : ""} →
                        </a>
                      ) : (
                        <span
                          className="text-[8px] tracking-widest text-sm-disabled"
                          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                        >
                          0 skills
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Copy button handler — event delegation, no React state needed */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('click', function(e) {
          var btn = e.target && e.target.closest('[data-copy]');
          if (!btn) return;
          var text = btn.getAttribute('data-copy');
          if (!text) return;
          navigator.clipboard && navigator.clipboard.writeText(text).then(function() {
            var orig = btn.textContent;
            btn.textContent = '[ COPIED ]';
            setTimeout(function() { btn.textContent = orig; }, 1500);
          }).catch(function() {});
        });
      `}} />
    </div>
  );
}
