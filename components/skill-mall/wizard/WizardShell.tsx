"use client";

import { useWizard } from "./useWizard";
import { Step1Topic } from "./Step1Topic";
import { Step2Research } from "./Step2Research";
import { Step3Metadata } from "./Step3Metadata";
import { Step4Preview } from "./Step4Preview";
import { Step5PromptOptions } from "./Step5PromptOptions";
import { Step6Confirm } from "./Step6Confirm";
import type { ResearchResult } from "./WizardContext";

const STEP_LABELS = ["TOPIC", "RESEARCH", "METADATA", "PREVIEW", "PROMPTS", "CONFIRM"] as const;

export function WizardShell() {
  const wizard = useWizard();

  // Step 1 → 2: call /api/research
  const handleStep1Next = async () => {
    wizard.setLoading(true);
    wizard.setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: wizard.topic, sourceUrls: wizard.sourceUrls }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Research failed (${res.status})`);
      }
      const result: ResearchResult = await res.json();
      wizard.setResearchResult(result);
      wizard.nextStep();
    } catch (err) {
      wizard.setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      wizard.setLoading(false);
    }
  };

  // Step 5 → 6: call /api/confirm-research (preview, no disk write)
  const handleStep5Next = async () => {
    if (!wizard.researchResult) return;
    wizard.setLoading(true);
    wizard.setError(null);
    try {
      const slug = wizard.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const res = await fetch("/api/confirm-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchResult: wizard.researchResult,
          metadata: { slug, category: wizard.category, tags: wizard.tags, targetAgents: wizard.targetAgents },
          selectedToolNames: wizard.selectedToolNames,
          selectedMetaTypes: wizard.selectedMetaTypes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Preview failed (${res.status})`);
      }
      const { skillDirectory } = await res.json();
      const skillMd = skillDirectory.files.find((f: { path: string }) => f.path === "SKILL.md")?.content ?? "";
      wizard.setPreview(skillDirectory, skillMd);
      wizard.nextStep();
    } catch (err) {
      wizard.setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      wizard.setLoading(false);
    }
  };

  // Step 6 confirm: call /api/create-skill (writes to disk)
  const handleConfirm = async () => {
    if (!wizard.researchResult) return;
    wizard.setLoading(true);
    wizard.setError(null);
    try {
      const slug = wizard.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const res = await fetch("/api/create-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchResult: wizard.researchResult,
          metadata: { slug, category: wizard.category, tags: wizard.tags, targetAgents: wizard.targetAgents },
          selectedToolNames: wizard.selectedToolNames,
          selectedMetaTypes: wizard.selectedMetaTypes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Creation failed (${res.status})`);
      }
      const { slug: createdSlug } = await res.json();
      window.location.href = `/skills/${wizard.category}/${createdSlug}`;
    } catch (err) {
      wizard.setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      wizard.setLoading(false);
    }
  };

  const toolCount = wizard.researchResult?.tools.filter((t) =>
    wizard.selectedToolNames.includes(t.name)
  ).length ?? 0;

  const categoryCount = wizard.researchResult
    ? new Set(
        wizard.researchResult.tools
          .filter((t) => wizard.selectedToolNames.includes(t.name))
          .map((t) => t.category)
      ).size
    : 0;

  return (
    <div className="bg-sm-bg min-h-screen">
      {/* Step indicator */}
      <div className="border-b border-sm-border bg-sm-surface px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-0">
            {STEP_LABELS.map((label, i) => {
              const num = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
              const isActive = wizard.step === num;
              const isDone = wizard.step > num;
              return (
                <div key={label} className="flex items-center">
                  <span
                    className={`px-2 py-1 text-[9px] tracking-widest transition-colors ${
                      isActive
                        ? "border border-sm-display text-sm-display"
                        : isDone
                        ? "text-sm-blue"
                        : "text-sm-disabled"
                    }`}
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    {isDone ? "✓" : `0${num}`} {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && (
                    <span
                      className="px-1 text-sm-border"
                      style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                    >
                      —
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {wizard.step === 1 && (
          <Step1Topic
            topic={wizard.topic}
            sourceUrls={wizard.sourceUrls}
            onTopicChange={wizard.setTopic}
            onUrlAdd={wizard.addUrl}
            onUrlRemove={wizard.removeUrl}
            onNext={handleStep1Next}
            isLoading={wizard.isLoading}
            error={wizard.error}
          />
        )}

        {wizard.step === 2 && wizard.researchResult && (
          <Step2Research
            researchResult={wizard.researchResult}
            selectedToolNames={wizard.selectedToolNames}
            onToggleTool={wizard.toggleTool}
            onNext={() => wizard.nextStep()}
            isLoading={wizard.isLoading}
          />
        )}

        {wizard.step === 3 && (
          <Step3Metadata
            category={wizard.category}
            tags={wizard.tags}
            targetAgents={wizard.targetAgents}
            onCategoryChange={(cat) => wizard.setMetadata(cat, wizard.tags, wizard.targetAgents)}
            onTagsChange={(tags) => wizard.setMetadata(wizard.category, tags, wizard.targetAgents)}
            onNext={() => wizard.nextStep()}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.step === 4 && (
          <Step4Preview
            skillMdPreview={wizard.skillMdPreview ?? ""}
            onNext={() => wizard.nextStep()}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.step === 5 && (
          <Step5PromptOptions
            selectedMetaTypes={wizard.selectedMetaTypes}
            toolCount={toolCount}
            categoryCount={categoryCount}
            onToggleMetaType={wizard.toggleMetaType}
            onNext={handleStep5Next}
            onBack={wizard.prevStep}
          />
        )}

        {wizard.step === 6 && (
          <Step6Confirm
            files={wizard.previewDirectory?.files ?? []}
            isLoading={wizard.isLoading}
            error={wizard.error}
            onConfirm={handleConfirm}
            onBack={wizard.prevStep}
          />
        )}
      </div>
    </div>
  );
}
