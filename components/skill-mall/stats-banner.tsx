import { Layers, FolderOpen, Users } from "lucide-react";
import type { Category } from "@/lib/skills";

type Props = {
  categories: Category[];
  authorCount?: number;
};

export function StatsBanner({ categories, authorCount }: Props) {
  const skillCount = categories.reduce((s, c) => s + c.skills.length, 0);
  const categoryCount = categories.filter((c) => c.skills.length > 0).length;

  const stats = [
    { icon: Layers, label: "Skills", value: skillCount },
    { icon: FolderOpen, label: "Categories", value: categoryCount },
    ...(authorCount != null
      ? [{ icon: Users, label: "Contributors", value: authorCount }]
      : []),
  ];

  return (
    <div className="flex flex-wrap gap-6">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-500" />
          <span className="tabular-nums text-2xl font-bold text-zinc-100">{value}</span>
          <span className="text-sm text-zinc-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
