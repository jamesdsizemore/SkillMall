"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Code2, Palette, PenLine, Search, Zap,
  Server, Brain, Briefcase, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/skills";

const ICONS: Record<string, React.ElementType> = {
  Code2, Palette, PenLine, Search, Zap, Server, Brain, Briefcase,
};

type Props = {
  categories: Category[];
  activeCategory?: string;
};

export function CategoryNav({ categories, activeCategory }: Props) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const all = [
    { slug: "all", label: "All Skills", count: categories.reduce((s, c) => s + c.skills.length, 0), icon: "LayoutGrid" },
    ...CATEGORIES.map((meta) => ({
      slug: meta.slug,
      label: meta.label,
      count: categories.find((c) => c.slug === meta.slug)?.skills.length ?? 0,
      icon: meta.icon,
    })),
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {all.map((item) => {
        const Icon = item.icon === "LayoutGrid" ? LayoutGrid : (ICONS[item.icon] ?? LayoutGrid);
        const isActive = activeCategory === item.slug || (!activeCategory && item.slug === "all");
        const href =
          item.slug === "all"
            ? q ? `/?q=${q}` : "/"
            : q ? `/?cat=${item.slug}&q=${q}` : `/?cat=${item.slug}`;

        return (
          <Link
            key={item.slug}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-zinc-500 bg-zinc-700 text-zinc-100"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-300"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
            <span
              className={cn(
                "ml-0.5 tabular-nums",
                isActive ? "text-zinc-400" : "text-zinc-600"
              )}
            >
              {item.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
