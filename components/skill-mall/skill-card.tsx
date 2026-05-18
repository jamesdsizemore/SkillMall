"use client";

import Link from "next/link";
import type { Skill } from "@/lib/skills";

type Props = {
  skill: Skill;
  index?: number;
  qualityScore?: number;
};

export function SkillCard({ skill, index = 0, qualityScore }: Props) {
  const fillPercent = qualityScore ?? 0;

  return (
    <Link
      href={`/skills/${skill.category}/${skill.slug}`}
      className="group block border border-sm-border bg-sm-surface transition-colors hover:border-sm-display"
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="p-4">
        {/* Category + version row */}
        <div
          className="mb-3 flex items-center justify-between text-[9px] tracking-widest text-sm-disabled"
          style={{ fontFamily: "var(--font-space-mono, monospace)" }}
        >
          <span>[ {skill.category.toUpperCase()} ]</span>
          <span>v{skill.version}</span>
        </div>

        {/* Skill name */}
        <h3 className="mb-2 text-sm font-semibold text-sm-display leading-snug group-hover:text-sm-display">
          {skill.name}
        </h3>

        {/* Description */}
        <p className="mb-4 text-xs leading-relaxed text-sm-secondary line-clamp-2">
          {skill.description}
        </p>

        {/* Tags */}
        {skill.tags.length > 0 && (
          <div
            className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[9px] tracking-wider text-sm-disabled"
            style={{ fontFamily: "var(--font-space-mono, monospace)" }}
          >
            {skill.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        {/* Segmented quality bar */}
        <div className="h-0.5 w-full bg-sm-border-subtle">
          <div
            className="h-full bg-sm-blue"
            style={{
              width: `${fillPercent}%`,
              animation: `segmentFill 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${index * 60 + 200}ms both`,
              "--fill-percent": `${fillPercent}%`,
            } as React.CSSProperties}
          />
        </div>
      </div>
    </Link>
  );
}
