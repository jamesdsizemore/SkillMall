"use client";

import { cn } from "@/lib/utils";

type Props = {
  category: string;
  className?: string;
};

export function CategoryBadge({ category, className }: Props) {
  return (
    <span
      className={cn("text-[9px] tracking-widest text-sm-secondary", className)}
      style={{ fontFamily: "var(--font-space-mono, monospace)" }}
    >
      [ {category.toUpperCase()} ]
    </span>
  );
}
