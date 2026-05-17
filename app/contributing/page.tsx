import Link from "next/link";
import { ArrowLeft, Terminal, FolderTree, GitBranch, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Contributing — SkillMall",
  description: "How to add a skill to SkillMall",
};

export default function ContributingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="mb-8 flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to catalog
      </Link>

      <h1 className="mb-3 text-3xl font-bold tracking-tight text-zinc-100">
        Contributing a Skill
      </h1>
      <p className="mb-8 text-zinc-400">
        Every skill in SkillMall follows the same structure. Scaffold one in thirty
        seconds, fill in the content, and open a pull request.
      </p>

      <Separator className="mb-10 bg-zinc-800" />

      <div className="space-y-12">
        <Step
          icon={Terminal}
          number="01"
          title="Scaffold the skill"
          description="Run the scaffold command with your target category and a kebab-case skill name."
        >
          <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm text-zinc-300">
            {`bash scripts/new-skill.sh <category> <skill-name>

# Example:
bash scripts/new-skill.sh development tdd-enforcer`}
          </pre>
          <p className="mt-3 text-sm text-zinc-500">
            Valid categories:{" "}
            <span className="font-mono text-zinc-400">
              development, design, writing, research, productivity, infrastructure, ai,
              business
            </span>
          </p>
        </Step>

        <Step
          icon={FolderTree}
          number="02"
          title="Fill in the four files"
          description="The scaffold creates the full structure. You only need to fill in the content."
        >
          <div className="mt-4 space-y-3">
            {[
              {
                file: "SKILL.md",
                required: true,
                desc: "The skill body — frontmatter (name, description, tags) plus the instructions Claude receives when the skill is invoked.",
              },
              {
                file: "README.md",
                required: true,
                desc: "Human-readable overview: what it produces, when to use it, linked skills, and example output.",
              },
              {
                file: "scripts/",
                required: false,
                desc: "Shell scripts or utilities that automate repetitive parts of the skill workflow.",
              },
              {
                file: "resources/templates/",
                required: false,
                desc: "Reusable templates that the skill instructs Claude to fill in.",
              },
              {
                file: "resources/samples/",
                required: false,
                desc: "Completed examples showing what a good output looks like.",
              },
            ].map(({ file, required, desc }) => (
              <div
                key={file}
                className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-zinc-200">{file}</code>
                    {required ? (
                      <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                        required
                      </span>
                    ) : (
                      <span className="rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600">
                        optional
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Step>

        <Step
          icon={Sparkles}
          number="03"
          title="SKILL.md frontmatter"
          description="Every skill must have valid frontmatter. Here is the complete schema."
        >
          <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm text-zinc-300">
            {`---
name: tdd-enforcer          # kebab-case, unique across all skills
description: >              # one-line summary shown in the catalog
  Enforce write-tests-first workflow for any feature or bugfix.
version: 1.0.0              # semver
category: development       # must match a valid category slug
tags:                       # 2–6 lowercase tags
  - testing
  - tdd
  - workflow
author: your-github-handle  # your GitHub username
linked_skills:              # optional: skill names this pairs with
  - systematic-debugging
---

# Skill body starts here...`}
          </pre>
        </Step>

        <Step
          icon={GitBranch}
          number="04"
          title="Open a pull request"
          description="Commit your skill. AGENTS.md regenerates automatically via the pre-commit hook."
        >
          <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm text-zinc-300">
            {`git add skills/development/tdd-enforcer
git commit -m "feat: add tdd-enforcer skill"
# AGENTS.md updates automatically
gh pr create --title "feat: add tdd-enforcer skill"`}
          </pre>
        </Step>
      </div>

      <Separator className="my-12 bg-zinc-800" />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Quality bar</h2>
        <ul className="space-y-2 text-sm text-zinc-400">
          {[
            "SKILL.md has complete frontmatter with a clear, specific description",
            "README.md describes what the skill produces and when to use it",
            "Linked skills are real skills that exist in the catalog",
            "Tags are lowercase, general, and match the skill's actual scope",
            "Templates and samples are provided if the skill produces structured artifacts",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-0.5 text-zinc-600">—</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  number,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800">
          <Icon className="h-4 w-4 text-zinc-300" />
        </div>
        <div className="mt-2 flex-1 border-l border-zinc-800" />
      </div>
      <div className="pb-12">
        <p className="mb-0.5 font-mono text-xs text-zinc-600">{number}</p>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
        {children}
      </div>
    </div>
  );
}
