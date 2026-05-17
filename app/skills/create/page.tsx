"use client";

import { WizardProvider } from "@/components/skill-mall/wizard/WizardContext";
import { WizardShell } from "@/components/skill-mall/wizard/WizardShell";

export default function CreateSkillPage() {
  return (
    <WizardProvider>
      <WizardShell />
    </WizardProvider>
  );
}
