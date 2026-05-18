type Props = {
  skillsShId: string;
};

export function SkillsShBadge({ skillsShId }: Props) {
  return (
    <a
      href={`https://skills.sh/skills/${skillsShId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 border border-sm-border px-2 py-1 text-[9px] tracking-widest text-sm-secondary transition-colors hover:border-sm-display hover:text-sm-display"
      style={{ fontFamily: "var(--font-space-mono, monospace)" }}
      title={`View on skills.sh: ${skillsShId}`}
    >
      <span className="text-sm-disabled">skills.sh /</span>
      <span>{skillsShId}</span>
    </a>
  );
}
