export type CategoryMeta = {
  slug: string;
  label: string;
  description: string;
  color: string;
  icon: string;
};

export const CATEGORIES: CategoryMeta[] = [
  {
    slug: "development",
    label: "Development",
    description: "Coding, debugging, testing, and refactoring",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon: "Code2",
  },
  {
    slug: "design",
    label: "Design",
    description: "UI/UX, design systems, and visual assets",
    color: "bg-pink-500/15 text-pink-400 border-pink-500/25",
    icon: "Palette",
  },
  {
    slug: "writing",
    label: "Writing",
    description: "Documentation, PRDs, content, and communication",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    icon: "PenLine",
  },
  {
    slug: "research",
    label: "Research",
    description: "Analysis, investigation, and data exploration",
    color: "bg-teal-500/15 text-teal-400 border-teal-500/25",
    icon: "Search",
  },
  {
    slug: "productivity",
    label: "Productivity",
    description: "Task management, planning, and workflow automation",
    color: "bg-violet-500/15 text-violet-400 border-violet-500/25",
    icon: "Zap",
  },
  {
    slug: "infrastructure",
    label: "Infrastructure",
    description: "DevOps, deployment, monitoring, and cloud",
    color: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    icon: "Server",
  },
  {
    slug: "ai",
    label: "AI",
    description: "Prompt engineering, agent design, and ML workflows",
    color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    icon: "Brain",
  },
  {
    slug: "business",
    label: "Business",
    description: "Strategy, operations, and stakeholder communication",
    color: "bg-green-500/15 text-green-400 border-green-500/25",
    icon: "Briefcase",
  },
];

export function getCategoryMeta(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
