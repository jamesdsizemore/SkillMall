"use client";

import { useState } from "react";
import { WizardProvider } from "@/components/skill-mall/wizard/WizardContext";
import { WizardShell } from "@/components/skill-mall/wizard/WizardShell";
import { TemplateBrowser } from "@/components/skill-mall/templates/TemplateBrowser";

type Mode = "choose" | "template" | "scratch";

export default function CreateSkillPage() {
  const [mode, setMode] = useState<Mode>("choose");

  if (mode === "choose") {
    return (
      <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ CREATE A SKILL ]
          </p>
          <h1 className="mb-8 text-2xl font-bold text-sm-display">Create a New Skill</h1>

          <div className="space-y-3">
            <button
              onClick={() => setMode("template")}
              className="group w-full border border-sm-border bg-sm-surface p-5 text-left transition-colors hover:border-sm-display"
            >
              <p className="mb-1 font-semibold text-sm-display">Start from Template</p>
              <p className="text-sm text-sm-secondary">
                20+ hand-curated starters — 80% complete with fill-in markers for your context.
              </p>
            </button>

            <button
              onClick={() => setMode("scratch")}
              className="group w-full border border-sm-border bg-sm-surface p-5 text-left transition-colors hover:border-sm-display"
            >
              <p className="mb-1 font-semibold text-sm-display">Create from Scratch</p>
              <p className="text-sm text-sm-secondary">
                Use the AI Research Wizard — provide a topic and source URLs to generate a complete skill.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "template") {
    return (
      <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => setMode("choose")}
            className="mb-6 text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            ← [ BACK ]
          </button>
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ START FROM TEMPLATE ]
          </p>
          <h1 className="mb-2 text-2xl font-bold text-sm-display">Choose a Starter Template</h1>
          <p className="mb-8 text-sm text-sm-secondary">
            Click any template to see the CLI command. Each starter is 80% complete — fill in the marked sections for your context.
          </p>
          <TemplateBrowser />
        </div>
      </div>
    );
  }

  return (
    <WizardProvider>
      <div className="bg-sm-bg min-h-screen">
        <div className="px-4 pt-6 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <button
              onClick={() => setMode("choose")}
              className="text-[9px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              ← [ BACK ]
            </button>
          </div>
        </div>
        <WizardShell />
      </div>
    </WizardProvider>
  );
}
