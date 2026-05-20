import { NextRequest, NextResponse } from "next/server";
import { ApiCreateSkillBodySchema } from "@/lib/validators";
import { resolveProviderConfig, createLLMClient, ConfigError } from "@/lib/providers";
import { buildSkillFromResearch } from "@/lib/pipeline";

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
  const { researchResult, metadata, selectedToolNames, selectedMetaTypes, skillMdContent } = parsed.data;

  try {
    const result = await buildSkillFromResearch({
      researchResult,
      metadata,
      selectedToolNames,
      selectedMetaTypes,
      skillMdContent,
    }, client);

    return NextResponse.json({
      skillDirectory: result.skillDirectory,
      promptCount: result.promptCount,
      fileCount: result.skillDirectory.files.length,
      validation: result.validation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "pipeline_failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 422 }
    );
  }
}
