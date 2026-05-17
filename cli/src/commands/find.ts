import { pc } from "../utils.js";

interface SkillsShResult {
  id: string;
  name: string;
  installs: number;
  source: string;
}

interface SkillsShResponse {
  skills: SkillsShResult[];
}

export async function findCommand(args: string[]): Promise<void> {
  const query = args.join(" ").trim();

  if (!query) {
    process.stderr.write(
      pc.red("Usage: skill-mall find <query>\n")
    );
    process.exit(1);
  }

  console.log();
  console.log(
    pc.dim(`Searching skills.sh for: `) + pc.bold(query)
  );
  console.log();

  let results: SkillsShResult[] = [];

  try {
    const url = `https://skills.sh/api/search?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);

    if (!res.ok) {
      process.stderr.write(
        pc.red(`skills.sh API error: HTTP ${res.status}\n`)
      );
      process.exit(1);
    }

    const data = (await res.json()) as SkillsShResponse;
    results = data.skills ?? [];
  } catch (err) {
    process.stderr.write(
      pc.red(
        `Could not reach skills.sh: ${err instanceof Error ? err.message : String(err)}\n`
      )
    );
    process.exit(1);
  }

  if (results.length === 0) {
    console.log(pc.yellow("No skills found on skills.sh for that query."));
    console.log();
    console.log(
      "  Create one instead:  " +
        pc.cyan(`npx skill-mall create "${query}"`)
    );
    console.log();
    return;
  }

  const NAME_W = 36;
  const SOURCE_W = 32;

  console.log(
    "  " +
      pad(pc.bold("NAME"), NAME_W + 2) +
      pad(pc.bold("SOURCE"), SOURCE_W + 2) +
      pc.bold("INSTALLS")
  );
  console.log(
    "  " + pc.dim("-".repeat(NAME_W + SOURCE_W + 16))
  );

  for (const skill of results) {
    const name = pad(pc.green(skill.name), NAME_W + 10); // account for color codes
    const source = pad(pc.dim(skill.source ?? ""), SOURCE_W);
    const installs = pc.yellow(String(skill.installs ?? 0));
    console.log("  " + name + "  " + source + "  " + installs);
  }

  console.log();
  console.log(
    pc.dim(
      `  ${results.length} result${results.length === 1 ? "" : "s"} from skills.sh`
    )
  );
  console.log();
  console.log(
    "  Deploy one:  " +
      pc.cyan("npx skill-mall deploy <category/name>")
  );
  console.log(
    "  Create new:  " +
      pc.cyan(`npx skill-mall create "${query}"`)
  );
  console.log();
}

function pad(s: string, width: number): string {
  // Strip ANSI codes for length calculation
  const visible = s.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, width - visible.length);
  return s + " ".repeat(padding);
}
