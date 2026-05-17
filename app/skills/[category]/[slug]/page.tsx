import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkill, getSkillReadme, getAllSkills } from "@/lib/skills";
import { DeployButton } from "@/components/skill-mall/deploy-button";

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateStaticParams() {
  const skills = getAllSkills();
  return skills.map((s) => ({ category: s.category, slug: s.slug }));
}

function qualityScore(skill: ReturnType<typeof getSkill>) {
  if (!skill) return 0;
  return (
    (skill.hasScripts ? 20 : 0) +
    (skill.hasTemplates ? 30 : 0) +
    (skill.hasSamples ? 30 : 0) +
    Math.min(skill.tags.length * 4, 20)
  );
}

export default async function SkillPage({ params }: Props) {
  const { category, slug } = await params;
  const skill = getSkill(category, slug);
  if (!skill) notFound();

  const readme = getSkillReadme(category, slug);
  const score = qualityScore(skill);

  return (
    <div className="bg-sm-bg">
      {/* Back nav */}
      <div className="border-b border-sm-border bg-sm-surface px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/?cat=${category}`}
            className="text-[10px] tracking-widest text-sm-secondary transition-colors hover:text-sm-primary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            ← [ {category.toUpperCase()} ]
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="lg:col-span-2">
            {/* Title with character-by-character reveal */}
            <CharRevealTitle title={skill.name} />

            <p className="mt-3 mb-6 text-sm leading-relaxed text-sm-secondary">
              {skill.description}
            </p>

            {/* Bracket-notation tags */}
            {skill.tags.length > 0 && (
              <div
                className="mb-8 flex flex-wrap gap-3 text-[9px] tracking-widest text-sm-disabled"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                {skill.tags.map((tag) => (
                  <span key={tag}>[ {tag} ]</span>
                ))}
              </div>
            )}

            {/* Bracket-notation tabs */}
            <SkillTabs skill={skill} readme={readme} />
          </div>

          {/* Sidebar — quality panel + deploy */}
          <div className="space-y-6">
            {/* Quality score panel — dark background, Doto number as hero */}
            <div className="bg-sm-display p-6 dot-grid-texture">
              <p
                className="mb-1 text-[9px] tracking-widest text-sm-bg/60"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ QUALITY SCORE ]
              </p>
              <div
                className="text-7xl font-black leading-none text-sm-bg"
                style={{ fontFamily: '"Doto", monospace' }}
              >
                {score}
              </div>
              <div className="mt-3 h-0.5 w-full bg-sm-bg/20">
                <div
                  className="h-full bg-sm-bg"
                  style={{ width: `${score}%`, transition: "width 1s ease-out" }}
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="border border-sm-border p-4">
              <p
                className="mb-3 text-[9px] tracking-widest text-sm-secondary"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ DETAILS ]
              </p>
              <dl className="space-y-2">
                {[
                  ["Category", skill.category],
                  ["Version", skill.version],
                  ...(skill.author ? [["Author", skill.author] as [string, string]] : []),
                  ...(skill.license ? [["License", skill.license] as [string, string]] : []),
                ].map(([dt, dd]) => (
                  <div key={dt} className="flex items-center justify-between text-xs">
                    <dt className="text-sm-disabled">{dt}</dt>
                    <dd
                      className="text-sm-primary"
                      style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                    >
                      {dd}
                    </dd>
                  </div>
                ))}
              </dl>

              {(skill.hasScripts || skill.hasTemplates || skill.hasSamples) && (
                <div className="mt-3 border-t border-sm-border pt-3">
                  <p
                    className="mb-2 text-[9px] tracking-widest text-sm-disabled"
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    [ INCLUDES ]
                  </p>
                  <div
                    className="flex flex-wrap gap-2 text-[9px] tracking-widest text-sm-secondary"
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    {skill.hasScripts && <span>[ SCRIPTS ]</span>}
                    {skill.hasTemplates && <span>[ TEMPLATES ]</span>}
                    {skill.hasSamples && <span>[ SAMPLES ]</span>}
                  </div>
                </div>
              )}

              {skill.linked_skills.length > 0 && (
                <div className="mt-3 border-t border-sm-border pt-3">
                  <p
                    className="mb-2 text-[9px] tracking-widest text-sm-disabled"
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    [ LINKED SKILLS ]
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skill.linked_skills.map((linked) => (
                      <span
                        key={linked}
                        className="text-[9px] tracking-widest text-sm-secondary"
                        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                      >
                        {linked}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Deploy */}
            <div>
              <p
                className="mb-3 text-[9px] tracking-widest text-sm-secondary"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ DEPLOY ]
              </p>
              <DeployButton skillPath={skill.path} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Character-by-character reveal for skill title
function CharRevealTitle({ title }: { title: string }) {
  return (
    <h1 className="text-2xl font-bold text-sm-display sm:text-3xl">
      {title.split("").map((char, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            animation: `charReveal 0.04s ease-out ${i * 30}ms both`,
            whiteSpace: char === " " ? "pre" : undefined,
          }}
        >
          {char}
        </span>
      ))}
    </h1>
  );
}

// Bracket-notation tab bar — client component for interactivity
import { SkillTabs } from "@/components/skill-mall/skill-detail/SkillTabs";
