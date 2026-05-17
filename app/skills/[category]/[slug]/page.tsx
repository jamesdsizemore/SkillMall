import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileCode2, BookOpen, FlaskConical,
  Link2, Tag, User, Hash,
} from "lucide-react";
import { getSkill, getSkillReadme, getAllSkills } from "@/lib/skills";
import { CategoryBadge } from "@/components/skill-mall/category-badge";
import { DeployButton } from "@/components/skill-mall/deploy-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateStaticParams() {
  const skills = getAllSkills();
  return skills.map((s) => ({ category: s.category, slug: s.slug }));
}

export default async function SkillPage({ params }: Props) {
  const { category, slug } = await params;
  const skill = getSkill(category, slug);
  if (!skill) notFound();

  const readme = getSkillReadme(category, slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Back */}
      <Link
        href={`/?cat=${category}`}
        className="mb-6 flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {category}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CategoryBadge category={skill.category} />
          <span className="text-xs text-zinc-600">v{skill.version}</span>
          {skill.author && (
            <span className="flex items-center gap-1 text-xs text-zinc-600">
              <User className="h-3 w-3" />
              {skill.author}
            </span>
          )}
        </div>

        <h1 className="mb-2 font-mono text-2xl font-bold text-zinc-100 sm:text-3xl">
          {skill.name}
        </h1>
        <p className="text-base text-zinc-400">{skill.description}</p>

        {skill.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Tag className="h-3.5 w-3.5 text-zinc-600 self-center" />
            {skill.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-zinc-700 bg-zinc-800/50 text-xs text-zinc-400"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Deploy */}
      <div className="mb-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Deploy to Claude Code
        </h2>
        <DeployButton skillPath={skill.path} />
      </div>

      <Separator className="mb-8 bg-zinc-800" />

      {/* Content tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6 border-b border-zinc-800 bg-transparent p-0">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 text-sm text-zinc-400 data-[state=active]:border-zinc-100 data-[state=active]:bg-transparent data-[state=active]:text-zinc-100"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="skill-md"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 text-sm text-zinc-400 data-[state=active]:border-zinc-100 data-[state=active]:bg-transparent data-[state=active]:text-zinc-100"
          >
            <Hash className="mr-1.5 inline h-3.5 w-3.5" />
            SKILL.md
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Metadata */}
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Details
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Category</dt>
                  <dd className="font-mono text-zinc-300">{skill.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Slug</dt>
                  <dd className="font-mono text-zinc-300">{skill.slug}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Version</dt>
                  <dd className="font-mono text-zinc-300">{skill.version}</dd>
                </div>
                {skill.author && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Author</dt>
                    <dd className="text-zinc-300">{skill.author}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Includes */}
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Includes
              </h3>
              <ul className="space-y-2 text-sm">
                {skill.hasScripts && (
                  <li className="flex items-center gap-2 text-zinc-300">
                    <FileCode2 className="h-4 w-4 text-zinc-500" />
                    Scripts
                  </li>
                )}
                {skill.hasTemplates && (
                  <li className="flex items-center gap-2 text-zinc-300">
                    <BookOpen className="h-4 w-4 text-zinc-500" />
                    Templates
                  </li>
                )}
                {skill.hasSamples && (
                  <li className="flex items-center gap-2 text-zinc-300">
                    <FlaskConical className="h-4 w-4 text-zinc-500" />
                    Samples
                  </li>
                )}
                {!skill.hasScripts && !skill.hasTemplates && !skill.hasSamples && (
                  <li className="text-zinc-600">SKILL.md only</li>
                )}
              </ul>
            </div>
          </div>

          {/* Linked skills */}
          {skill.linked_skills.length > 0 && (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                <Link2 className="h-3.5 w-3.5" />
                Linked Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {skill.linked_skills.map((linked) => (
                  <span
                    key={linked}
                    className="rounded-md border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 font-mono text-xs text-zinc-300"
                  >
                    {linked}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* README */}
          {readme && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                README
              </h3>
              <div className="prose prose-invert prose-sm max-w-none rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-400">
                  {readme}
                </pre>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="skill-md">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="font-mono text-xs text-zinc-500">SKILL.md</span>
              <span className="text-xs text-zinc-600">{skill.path}</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-zinc-300">
              {skill.content}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
