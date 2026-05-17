"use client";

import Link from "next/link";
import { FileCode2, BookOpen, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "./category-badge";
import type { Skill } from "@/lib/skills";

type Props = {
  skill: Skill;
};

export function SkillCard({ skill }: Props) {
  return (
    <Link href={`/skills/${skill.category}/${skill.slug}`} className="group block">
      <Card className="h-full border-zinc-800 bg-zinc-900/50 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-900 hover:shadow-lg hover:shadow-black/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CategoryBadge category={skill.category} />
            <span className="text-xs text-zinc-600 tabular-nums">v{skill.version}</span>
          </div>
          <h3 className="mt-2 font-mono text-sm font-semibold text-zinc-100 group-hover:text-white">
            {skill.name}
          </h3>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="text-xs leading-relaxed text-zinc-400 line-clamp-2">
            {skill.description}
          </p>

          {skill.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skill.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-zinc-700 bg-zinc-800/50 px-1.5 py-0 text-[10px] text-zinc-500"
                >
                  {tag}
                </Badge>
              ))}
              {skill.tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="border-zinc-700 bg-zinc-800/50 px-1.5 py-0 text-[10px] text-zinc-600"
                >
                  +{skill.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-zinc-800 pt-3">
          <div className="flex w-full items-center justify-between">
            <div className="flex gap-3">
              {skill.hasScripts && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <FileCode2 className="h-3 w-3" />
                  scripts
                </span>
              )}
              {skill.hasTemplates && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <BookOpen className="h-3 w-3" />
                  templates
                </span>
              )}
              {skill.linked_skills.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <Zap className="h-3 w-3" />
                  {skill.linked_skills.length} linked
                </span>
              )}
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
