import Link from "next/link";
import { getAllCollections } from "@/lib/collections";

export const metadata = {
  title: "Skill Collections — SkillMall",
  description: "Curated bundles of related skills with recommended deployment sequences.",
};

export default function CollectionsPage() {
  const collections = getAllCollections();

  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p
          className="mb-2 text-[9px] tracking-widest text-sm-secondary"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ COLLECTIONS ]
        </p>
        <h1 className="mb-2 text-2xl font-bold text-sm-display">
          Skill Collections
        </h1>
        <p className="mb-10 text-sm text-sm-secondary">
          Curated bundles of related skills with recommended deployment sequences.
        </p>

        {collections.length === 0 ? (
          <div className="border border-sm-border p-8 text-center">
            <p
              className="text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ NO COLLECTIONS YET ]
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="group block border border-sm-border bg-sm-surface p-5 transition-colors hover:border-sm-display"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="mb-1 font-semibold text-sm-display group-hover:text-sm-display">
                      {c.name}
                    </h2>
                    <p className="text-sm text-sm-secondary">{c.description}</p>
                  </div>
                  <span
                    className="shrink-0 border border-sm-border px-2 py-0.5 text-[9px] tracking-widest text-sm-disabled"
                    style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                  >
                    {c.skills.length} SKILLS
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 border-t border-sm-border pt-6">
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ DEPLOY A COLLECTION ]
          </p>
          <pre className="text-xs text-sm-secondary">
            npx skill-mall deploy-pack &lt;slug&gt; --agent claude-code
          </pre>
        </div>
      </div>
    </div>
  );
}
