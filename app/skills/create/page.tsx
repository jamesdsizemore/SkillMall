"use client";

import { useState } from "react";
import { Step1Topic } from "@/components/skill-mall/wizard/Step1Topic";
import { Step2Research } from "@/components/skill-mall/wizard/Step2Research";
import { Step3Metadata } from "@/components/skill-mall/wizard/Step3Metadata";
import { Step4Preview } from "@/components/skill-mall/wizard/Step4Preview";
import { Step5PromptOptions } from "@/components/skill-mall/wizard/Step5PromptOptions";
import { Step6Confirm } from "@/components/skill-mall/wizard/Step6Confirm";

const STEP_LABELS = [
  "TOPIC",
  "RESEARCH",
  "METADATA",
  "PREVIEW",
  "PROMPTS",
  "CONFIRM",
] as const;

type ResearchResult = {
  topic: string;
  summary: string;
  tools: Array<{
    name: string;
    category: string;
    description: string;
    artifactType: string;
    inputs: string[];
    outputs: string[];
    howUsed: string;
  }>;
  suggestedCategory: string;
  suggestedTags: string[];
};

export default function CreateSkillPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [topic, setTopic] = useState("");
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [selectedToolNames, setSelectedToolNames] = useState<string[]>([]);
  const [category, setCategory] = useState("business");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedMetaTypes, setSelectedMetaTypes] = useState([
    "meta-comprehensive-analysis",
    "meta-quick-assessment",
    "meta-stakeholder-presentation",
    "meta-first-principles-exploration",
    "meta-competitive-response",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUrl = (url: string) => setSourceUrls((prev) => [...prev, url]);
  const handleRemoveUrl = (i: number) => setSourceUrls((prev) => prev.filter((_, idx) => idx !== i));

  const handleStep1Next = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, sourceUrls }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Research failed (${res.status})`);
      }
      const result: ResearchResult = await res.json();
      setResearchResult(result);
      setSelectedToolNames(result.tools.map((t) => t.name));
      setCategory(result.suggestedCategory ?? "business");
      setTags(result.suggestedTags ?? []);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTool = (name: string) => {
    setSelectedToolNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleToggleMetaType = (id: string) => {
    setSelectedMetaTypes((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (!researchResult) return;
    setIsLoading(true);
    setError(null);
    try {
      const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const res = await fetch("/api/create-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchResult,
          metadata: { slug, category, tags, targetAgents: ["claude-code"] },
          selectedToolNames,
          selectedMetaTypes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Creation failed (${res.status})`);
      }
      const { slug: createdSlug } = await res.json();
      window.location.href = `/skills/${category}/${createdSlug}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const toolCount = researchResult?.tools.filter((t) => selectedToolNames.includes(t.name)).length ?? 0;
  const categoryCount = researchResult
    ? new Set(researchResult.tools.filter((t) => selectedToolNames.includes(t.name)).map((t) => t.category)).size
    : 0;

  return (
    <div className="bg-sm-bg min-h-screen">
      {/* Step indicator */}
      <div className="border-b border-sm-border bg-sm-surface px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-0">
            {STEP_LABELS.map((label, i) => {
              const num = i + 1;
              const isActive = step === num;
              const isDone = step > num;
              return (
                <div key={label} className="flex items-center">
                  <span
                    className={`text-[9px] tracking-widest px-2 py-1 transition-colors ${
                      isActive
                        ? "text-sm-display border border-sm-display"
                        : isDone
                        ? "text-sm-blue"
                        : "text-sm-disabled"
                    }`}
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    {isDone ? "✓" : `0${num}`} {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && (
                    <span className="px-1 text-sm-border" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {step === 1 && (
          <Step1Topic
            topic={topic}
            sourceUrls={sourceUrls}
            onTopicChange={setTopic}
            onUrlAdd={handleAddUrl}
            onUrlRemove={handleRemoveUrl}
            onNext={handleStep1Next}
            isLoading={isLoading}
            error={error}
          />
        )}

        {step === 2 && researchResult && (
          <Step2Research
            researchResult={researchResult}
            selectedToolNames={selectedToolNames}
            onToggleTool={handleToggleTool}
            onNext={() => setStep(3)}
            isLoading={isLoading}
          />
        )}

        {step === 3 && (
          <Step3Metadata
            category={category}
            tags={tags}
            targetAgents={["claude-code"]}
            onCategoryChange={setCategory}
            onTagsChange={setTags}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && researchResult && (
          <Step4Preview
            skillMdPreview={`---\nname: ${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}\ndescription: "${researchResult.summary.slice(0, 150)}"\nmetadata:\n  category: ${category}\n  tags: "${tags.join(", ")}"\n---\n\n${researchResult.summary}`}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && researchResult && (
          <Step5PromptOptions
            selectedMetaTypes={selectedMetaTypes}
            toolCount={toolCount}
            categoryCount={categoryCount}
            onToggleMetaType={handleToggleMetaType}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        )}

        {step === 6 && (
          <Step6Confirm
            files={[]}
            isLoading={isLoading}
            error={error}
            onConfirm={handleConfirm}
            onBack={() => setStep(5)}
          />
        )}
      </div>
    </div>
  );
}
