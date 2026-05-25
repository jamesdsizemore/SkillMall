import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSkill } from "@/lib/skills";
import { isSkillAuthor, getSessionFromCookies } from "@/lib/auth/policy";
import { getSuggestions } from "@/lib/self-improvement/analyzer";
import { SuggestionList } from "@/components/skill-mall/improvements/SuggestionList";

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export default async function ImprovementsPage({ params }: Props) {
  const { category, slug } = await params;
  const skill = getSkill(category, slug);
  if (!skill) notFound();

  const session = await getSessionFromCookies();
  if (!session) redirect("/api/auth/login");

  const isAuthor = isSkillAuthor(session, skill);
  const suggestions = getSuggestions(slug);

  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/skills/${category}/${slug}`}
          className="text-[10px] tracking-widest text-sm-secondary hover:text-sm-primary transition-colors"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          ← [ {skill.name.toUpperCase()} ]
        </Link>

        <div className="mt-6">
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ SKILL IMPROVEMENTS ]
          </p>
          <h1 className="text-2xl font-bold text-sm-display mb-2">{skill.name}</h1>
          <p className="text-sm text-sm-secondary mb-8">
            LLM-generated improvement suggestions based on user feedback.
            {isAuthor
              ? " You are the author — you can apply or reject suggestions."
              : " View-only — only the skill author can apply suggestions."}
          </p>

          <SuggestionList
            suggestions={suggestions as Parameters<typeof SuggestionList>[0]["suggestions"]}
            skillSlug={slug}
            skillCategory={category}
            isAuthor={isAuthor}
          />
        </div>
      </div>
    </div>
  );
}
