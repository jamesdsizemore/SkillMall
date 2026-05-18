import Link from "next/link";
import { getTrending7d, getRising } from "@/lib/analytics";
import { getSkill, getAllSkills } from "@/lib/skills";

function SkillRow({
  slug,
  velocity,
  badge,
}: {
  slug: string;
  velocity: number;
  badge?: string;
}) {
  // Find skill details
  const allSkills = getAllSkills();
  const skill = allSkills.find((s) => s.slug === slug);

  if (!skill) {
    return (
      <div className="flex items-center justify-between border border-sm-border p-3 opacity-50">
        <span
          className="text-[10px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {slug}
        </span>
        <span
          className="text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {velocity} installs
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/skills/${skill.category}/${skill.slug}`}
      className="flex items-center justify-between border border-sm-border bg-sm-surface p-3 hover:border-sm-display transition-colors"
    >
      <div>
        <p className="text-sm font-semibold text-sm-display">{skill.name}</p>
        <p className="text-xs text-sm-secondary">{skill.description.slice(0, 80)}...</p>
      </div>
      <div className="text-right shrink-0 ml-4">
        {badge && (
          <p
            className="text-[9px] tracking-widest text-sm-blue mb-1"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ {badge} ]
          </p>
        )}
        <p
          className="text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          {velocity} install{velocity !== 1 ? "s" : ""} / 7d
        </p>
      </div>
    </Link>
  );
}

export default function TrendingPage() {
  const trending = getTrending7d(10);
  const rising = getRising();

  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-12">
        {/* Trending */}
        <section>
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ TRENDING ]
          </p>
          <h1 className="mb-6 text-2xl font-bold text-sm-display">Top Skills This Week</h1>

          {trending.length === 0 ? (
            <div className="border border-sm-border p-6 text-center">
              <p
                className="text-[9px] tracking-widest text-sm-disabled"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ NO INSTALL DATA YET ]
              </p>
              <p className="mt-2 text-sm text-sm-secondary">
                Install events appear here after skills are deployed.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {trending.map((item, i) => (
                <div key={item.skill_slug} className="flex items-start gap-3">
                  <span
                    className="text-2xl font-black text-sm-border w-8 shrink-0 mt-3"
                    style={{ fontFamily: '"Doto", monospace' }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <SkillRow slug={item.skill_slug} velocity={item.velocity} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rising */}
        <section>
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ RISING ]
          </p>
          <h2 className="mb-6 text-xl font-bold text-sm-display">Accelerating This Week</h2>
          <p className="mb-4 text-sm text-sm-secondary">
            Skills with more than 50% velocity increase compared to the previous 7 days.
          </p>

          {rising.length === 0 ? (
            <div className="border border-sm-border p-6 text-center">
              <p
                className="text-[9px] tracking-widest text-sm-disabled"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ NO RISING SKILLS YET ]
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rising.map((item) => (
                <SkillRow
                  key={item.skill_slug}
                  slug={item.skill_slug}
                  velocity={item.velocity}
                  badge={`+${item.growth_pct}%`}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
