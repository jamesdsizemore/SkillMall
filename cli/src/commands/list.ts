import { getAllSkills, requireRepoRoot, truncate, pc } from "../utils.js";

export function listCommand(args: string[]): void {
  const catFlagIdx = args.indexOf("--cat");
  const catFilter = catFlagIdx !== -1 ? args[catFlagIdx + 1] : undefined;

  const repoRoot = requireRepoRoot();
  const skills = getAllSkills(repoRoot);

  if (skills.length === 0) {
    console.log(pc.yellow("No skills found in the catalog."));
    return;
  }

  // Apply category filter
  const filtered = catFilter
    ? skills.filter((s) => s.category === catFilter)
    : skills;

  if (filtered.length === 0) {
    console.log(pc.yellow(`No skills found in category: ${catFilter}`));
    return;
  }

  // Group by category
  const byCategory: Record<string, typeof filtered> = {};
  for (const skill of filtered) {
    if (!byCategory[skill.category]) byCategory[skill.category] = [];
    byCategory[skill.category].push(skill);
  }

  const categoryNames = Object.keys(byCategory).sort();

  console.log();
  console.log(
    pc.bold(
      `  ${filtered.length} skill${filtered.length === 1 ? "" : "s"}` +
        (catFilter ? ` in category ${pc.cyan(catFilter)}` : " in catalog")
    )
  );
  console.log();

  const NAME_W = 30;
  const DESC_W = 60;

  console.log(
    "  " +
      pc.dim(pad("CATEGORY / SKILL", NAME_W + 4)) +
      pc.dim(pad("DESCRIPTION", DESC_W))
  );
  console.log("  " + pc.dim("-".repeat(NAME_W + 4 + DESC_W)));

  for (const cat of categoryNames) {
    console.log();
    console.log("  " + pc.bold(pc.cyan(cat.toUpperCase())));

    for (const skill of byCategory[cat].sort((a, b) =>
      a.skillName.localeCompare(b.skillName)
    )) {
      const nameDisplay = pad(skill.skillName, NAME_W);
      const desc = truncate(skill.frontmatter.description ?? "", DESC_W);
      console.log(
        "    " + pc.green(nameDisplay) + "  " + pc.dim(desc)
      );
    }
  }

  console.log();
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}
