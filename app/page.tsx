import { Suspense } from "react";
import { getSkillsByCategory, getAllSkills } from "@/lib/skills";
import { SkillCard } from "@/components/skill-mall/skill-card";
import { SearchBar } from "@/components/skill-mall/search-bar";
import { CategoryNav } from "@/components/skill-mall/category-nav";
import { StatsBanner } from "@/components/skill-mall/stats-banner";

type Props = {
  searchParams: Promise<{ q?: string; cat?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { q, cat } = await searchParams;
  const categories = getSkillsByCategory();
  const allSkills = getAllSkills();

  const uniqueAuthors = new Set(allSkills.map((s) => s.author).filter(Boolean)).size;

  const filtered = allSkills.filter((skill) => {
    const matchesCat = !cat || skill.category === cat;
    const matchesQuery =
      !q ||
      skill.name.toLowerCase().includes(q.toLowerCase()) ||
      skill.description.toLowerCase().includes(q.toLowerCase()) ||
      skill.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const isEmpty = allSkills.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
            Claude Code
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
            Open Source
          </span>
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
          The Claude Code Skill Catalog
        </h1>
        <p className="max-w-xl text-base text-zinc-400">
          Discover, deploy, and contribute structured skills that extend Claude&apos;s
          capabilities. Every skill ships with instructions, scripts, templates, and
          samples.
        </p>

        {!isEmpty && (
          <div className="mt-6">
            <StatsBanner categories={categories} authorCount={uniqueAuthors} />
          </div>
        )}
      </div>

      {/* Search + Filter */}
      {!isEmpty && (
        <div className="mb-8 space-y-4">
          <Suspense>
            <SearchBar className="max-w-lg" />
          </Suspense>
          <Suspense>
            <CategoryNav categories={categories} activeCategory={cat ?? "all"} />
          </Suspense>
        </div>
      )}

      {/* Grid */}
      {isEmpty ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <NoResults query={q} category={cat} />
      ) : (
        <>
          <p className="mb-5 text-xs text-zinc-600">
            {filtered.length} skill{filtered.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
            {cat ? ` in ${cat}` : ""}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((skill) => (
              <SkillCard key={`${skill.category}/${skill.slug}`} skill={skill} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <span className="font-mono text-2xl font-bold text-zinc-600">SM</span>
      </div>
      <h2 className="mb-2 text-lg font-semibold text-zinc-300">No skills yet</h2>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">
        This catalog is empty. Add your first skill using the scaffold command or
        copy the template from{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-300">
          skills/_template/
        </code>
        .
      </p>
      <pre className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-4 text-left font-mono text-sm text-zinc-300">
        bash scripts/new-skill.sh development my-skill
      </pre>
    </div>
  );
}

function NoResults({ query, category }: { query?: string; category?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-zinc-500">
        No skills found
        {query ? ` for "${query}"` : ""}
        {category ? ` in ${category}` : ""}
        .
      </p>
    </div>
  );
}
