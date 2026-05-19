import { NextRequest, NextResponse } from "next/server";
import { ApiCreateSkillBodySchema } from "@/lib/validators";
import { resolveProviderConfig, createLLMClient, ConfigError } from "@/lib/providers";
import { buildSkillDirectory } from "@/lib/skill-builder";
import { validateSkillDirectory } from "@/lib/pipeline";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ApiCreateSkillBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  let config;
  try {
    config = resolveProviderConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: "provider_not_configured", setupUrl: "/settings/providers" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const client = createLLMClient(config);
  const { researchResult, metadata, selectedToolNames } = parsed.data;
  const filteredResult =
    selectedToolNames && selectedToolNames.length > 0
      ? { ...researchResult, tools: researchResult.tools.filter((t) => selectedToolNames.includes(t.name)) }
      : researchResult;

  try {
    const skillDirectory = await buildSkillDirectory(filteredResult, metadata, client);
    const validation = validateSkillDirectory(skillDirectory);
    const skillMd = skillDirectory.files.find((file) => file.path === "SKILL.md")?.content.trim();

    if (!validation.valid || !skillMd) {
      return NextResponse.json(
        {
          error: "invalid_skill_preview",
          message: "Generated preview did not include a valid SKILL.md file.",
          validation,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      skillDirectory,
      fileCount: skillDirectory.files.length,
      validation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "pipeline_failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 422 }
    );
  }
}
