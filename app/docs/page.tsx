import Link from "next/link";
import { NAV_SECTIONS } from "@/lib/docs";

export const metadata = {
  title: "Documentation — SkillMall",
  description: "Developer guides, user tutorials, and marketing resources for SkillMall.",
};

export default function DocsIndexPage() {
  return (
    <div className="bg-sm-bg min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p
          className="mb-2 text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          [ SKILLMALL DOCUMENTATION ]
        </p>
        <h1 className="mb-2 text-3xl font-black text-sm-display">Documentation</h1>
        <p className="mb-10 text-sm text-sm-secondary">
          Developer guides, user tutorials, API reference, and marketing resources.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {NAV_SECTIONS.map(section => (
            <div key={section.slug}>
              <p
                className="mb-4 text-[9px] tracking-widest text-sm-secondary border-b border-sm-border pb-2"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ {section.title.toUpperCase()} ]
              </p>
              <ul className="space-y-2">
                {section.items.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block text-sm text-sm-secondary hover:text-sm-display transition-colors"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border border-sm-border p-6">
          <p
            className="mb-2 text-[9px] tracking-widest text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ QUICK LINKS ]
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Getting Started', href: '/docs/developer/getting-started' },
              { label: 'Quick Start Tutorial', href: '/docs/guide/quick-start' },
              { label: 'CLI Reference', href: '/docs/developer/cli-reference' },
              { label: 'API Reference', href: '/docs/developer/api-reference' },
              { label: 'Troubleshooting', href: '/docs/guide/troubleshooting' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-sm-display hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
