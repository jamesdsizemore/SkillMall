"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/skills";

type Props = {
  categories: Category[];
  activeCategory?: string;
};

export function CategoryNav({ categories, activeCategory }: Props) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const totalSkills = categories.reduce((s, c) => s + c.skills.length, 0);

  const items = [
    { slug: "all", label: "ALL", count: totalSkills },
    ...CATEGORIES.map((meta) => ({
      slug: meta.slug,
      label: meta.label.toUpperCase(),
      count: categories.find((c) => c.slug === meta.slug)?.skills.length ?? 0,
    })),
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive =
          item.slug === "all"
            ? !activeCategory || activeCategory === "all"
            : activeCategory === item.slug;

        const href =
          item.slug === "all"
            ? q ? `/?q=${q}` : "/"
            : q ? `/?cat=${item.slug}&q=${q}` : `/?cat=${item.slug}`;

        return (
          <Link
            key={item.slug}
            href={href}
            className={cn(
              "px-3 py-1.5 text-[10px] tracking-widest transition-colors border",
              isActive
                ? "border-sm-display bg-sm-display text-sm-bg"
                : "border-sm-border text-sm-secondary hover:border-sm-primary hover:text-sm-primary"
            )}
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            [ {item.label} {item.count} ]
          </Link>
        );
      })}
    </nav>
  );
}
