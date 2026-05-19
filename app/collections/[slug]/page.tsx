import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllCollections, getCollection } from "@/lib/collections";
import { getSkill } from "@/lib/skills";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  return getAllCollections().map((c) => ({ slug: c.slug }));
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const orderedSkills = [...collection.skills].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <p
          className="mb-2 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          <Link href="/collections" className="hover:text-sm-secondary transition-colors">
            [ COLLECTIONS ]
          </Link>
          {" / "}
          {collection.slug.toUpperCase()}
        </p>

        <h1 className="mb-2 text-2xl font-bold text-sm-display">{collection.name}</h1>
        <p className="mb-8 text-sm text-sm-secondary">{collection.description}</p>

        {/* Deploy CTA */}
        <div className="mb-8 border border-sm-border bg-sm-surface p-4">
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-secondary"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ DEPLOY THIS COLLECTION ]
          </p>
          <pre className="text-xs text-sm-primary">
            npx skill-mall deploy-pack {collection.slug} --agent claude-code
          </pre>
        </div>

        {/* Skills list */}
        <p
          className="mb-3 text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ {collection.skills.length} SKILLS — DEPLOY IN ORDER ]
        </p>

        <div className="space-y-2">
          {orderedSkills.map((cs, idx) => {
            const parts = cs.slug.split("/");
            const skillCat = parts.length === 2 ? parts[0] : null;
            const skillSlug = parts.length === 2 ? parts[1] : parts[0];
            const skill = skillCat ? getSkill(skillCat, skillSlug) : null;

            return (
              <div key={cs.slug} className="border border-sm-border bg-sm-surface p-4">
                <div className="flex items-start gap-4">
                  {/* Step number */}
                  <span
                    className="shrink-0 text-2xl font-black text-sm-display leading-none"
                    style={{ fontFamily: '"Doto", monospace' }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {skill ? (
                        <Link
                          href={`/skills/${skillCat}/${skillSlug}`}
                          className="font-semibold text-sm-display hover:underline"
                        >
                          {skill.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-sm-display">{cs.slug}</span>
                      )}
                      {skill && (
                        <span
                          className="text-[9px] tracking-widest text-sm-disabled"
                          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                        >
                          [ {skillCat?.toUpperCase()} ]
                        </span>
                      )}
                    </div>

                    {skill && (
                      <p className="mb-2 text-xs text-sm-secondary">{skill.description}</p>
                    )}

                    {cs.note && (
                      <p
                        className="text-[9px] tracking-widest text-sm-secondary"
                        style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                      >
                        {cs.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Author */}
        <p
          className="mt-6 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ CURATED BY {collection.author.toUpperCase()} ]
        </p>
      </div>
    </div>
  );
}
