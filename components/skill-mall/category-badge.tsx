"use client";

import { getCategoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Props = {
  category: string;
  className?: string;
};

export function CategoryBadge({ category, className }: Props) {
  const meta = getCategoryMeta(category);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        meta?.color ?? "bg-zinc-800 text-zinc-400 border-zinc-700",
        className
      )}
    >
      {meta?.label ?? category}
    </span>
  );
}
