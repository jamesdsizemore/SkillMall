"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavSection, TocEntry } from "@/lib/docs";

type Props = {
  children: React.ReactNode;
  navSections: NavSection[];
  toc: TocEntry[];
};

export function DocLayout({ children, navSections, toc }: Props) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const filteredSections = useMemo(() => {
    if (!search.trim()) return navSections;
    const q = search.toLowerCase();
    return navSections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.title.toLowerCase().includes(q)
        ),
      }))
      .filter(s => s.items.length > 0);
  }, [search, navSections]);

  return (
    <div className="flex min-h-screen bg-sm-bg">
      {/* Left sidebar */}
      <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-sm-border bg-sm-surface overflow-y-auto">
        <div className="p-4 border-b border-sm-border">
          <Link href="/docs" className="block">
            <p
              className="text-[9px] tracking-widest text-sm-disabled mb-1"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ SKILLMALL ]
            </p>
            <p className="text-sm font-bold text-sm-display">Documentation</p>
          </Link>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-sm-border">
          <input
            type="text"
            placeholder="Search docs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-sm-bg border border-sm-border px-2 py-1.5 text-xs text-sm-primary placeholder:text-sm-disabled outline-none focus:border-sm-display"
          />
        </div>

        {/* Navigation */}
        <nav className="p-3">
          {filteredSections.map(section => (
            <div key={section.slug} className="mb-4">
              <p
                className="mb-2 text-[9px] tracking-widest text-sm-disabled"
                style={{ fontFamily: "var(--font-space-mono, monospace)" }}
              >
                [ {section.title.toUpperCase()} ]
              </p>
              <ul className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "block px-2 py-1.5 text-xs transition-colors rounded-sm",
                          isActive
                            ? "text-sm-display bg-sm-display/10"
                            : "text-sm-secondary hover:text-sm-primary hover:bg-sm-bg"
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {children}
        </div>
      </main>

      {/* Right TOC */}
      {toc.length > 3 && (
        <aside className="sticky top-0 h-screen w-56 shrink-0 border-l border-sm-border bg-sm-surface overflow-y-auto hidden xl:block">
          <div className="p-4">
            <p
              className="mb-3 text-[9px] tracking-widest text-sm-disabled"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }}
            >
              [ ON THIS PAGE ]
            </p>
            <ul className="space-y-1">
              {toc.filter(e => e.level <= 2).map((entry, i) => (
                <li key={i}>
                  <a
                    href={`#${entry.id}`}
                    className={cn(
                      "block text-xs text-sm-secondary hover:text-sm-primary transition-colors",
                      entry.level === 2 ? "pl-3" : ""
                    )}
                  >
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
