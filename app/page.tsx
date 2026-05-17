import { Suspense } from "react";
import { getSkillsByCategory, getAllSkills } from "@/lib/skills";
import { SkillCard } from "@/components/skill-mall/skill-card";
import { SearchBar } from "@/components/skill-mall/search-bar";
import { CategoryNav } from "@/components/skill-mall/category-nav";
import { HeroSection } from "@/components/skill-mall/homepage/HeroSection";
import { StatCounters } from "@/components/skill-mall/homepage/StatCounters";
import { WhatIsASkill } from "@/components/skill-mall/homepage/WhatIsASkill";

type Props = {
  searchParams: Promise<{ q?: string; cat?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { q, cat } = await searchParams;
  const categories = getSkillsByCategory();
  const allSkills = getAllSkills();

  const skillCount = allSkills.length;
  const categoryCount = categories.filter((c) => c.skills.length > 0).length;

  const filtered = allSkills.filter((skill) => {
    const matchesCat = !cat || skill.category === cat;
    const matchesQuery =
      !q ||
      skill.name.toLowerCase().includes(q.toLowerCase()) ||
      skill.description.toLowerCase().includes(q.toLowerCase()) ||
      skill.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="bg-sm-bg">
      <HeroSection />

      <StatCounters
        skillCount={skillCount}
        categoryCount={categoryCount}
        agentCount={54}
      />

      <WhatIsASkill />

      <section id="catalog" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 space-y-4">
            <Suspense>
              <SearchBar className="max-w-md" />
            </Suspense>
            <Suspense>
              <CategoryNav categories={categories} activeCategory={cat ?? "all"} />
            </Suspense>
          </div>

          {allSkills.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <NoResults query={q} category={cat} />
          ) : (
            <>
              <p
                className="mb-6 text-[10px] tracking-widest text-sm-disabled"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ {filtered.length} SKILL{filtered.length !== 1 ? "S" : ""}
                {q ? ` MATCHING "${q.toUpperCase()}"` : ""}
                {cat && cat !== "all" ? ` IN ${cat.toUpperCase()}` : ""} ]
              </p>
              <div className="grid grid-cols-1 gap-px border border-sm-border bg-sm-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((skill, i) => (
                  <SkillCard key={`${skill.category}/${skill.slug}`} skill={skill} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="mb-6 text-6xl font-black text-sm-border"
        style={{ fontFamily: '"Doto", monospace' }}
      >
        00
      </div>
      <p
        className="mb-3 text-xs tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ NO SKILLS YET ]
      </p>
      <p className="mb-8 max-w-sm text-sm text-sm-secondary">
        Add your first skill using the scaffold command or copy the template.
      </p>
      <code
        className="border border-sm-border bg-sm-surface px-6 py-3 text-sm text-sm-primary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        bash scripts/new-skill.sh development my-skill
      </code>
    </div>
  );
}

function NoResults({ query, category }: { query?: string; category?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p
        className="text-xs tracking-widest text-sm-secondary"
        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      >
        [ NO RESULTS
        {query ? ` FOR "${query.toUpperCase()}"` : ""}
        {category && category !== "all" ? ` IN ${category.toUpperCase()}` : ""} ]
      </p>
    </div>
  );
}
