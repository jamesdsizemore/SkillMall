import { NextRequest, NextResponse } from "next/server";
import { ApiCreateSkillBodySchema } from "@/lib/validators";
import { resolveProviderConfig, createLLMClient, ConfigError } from "@/lib/providers";
import { buildSkillFromResearch } from "@/lib/pipeline";
import { logInstallEvent } from "@/lib/analytics";

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
      writeToDisk: true,
    }, client);

    if (!result.validation.valid) {
      return NextResponse.json(
        { error: "validation_failed", details: result.validation.errors },
        { status: 422 }
      );
    }
    if (!result.writeResult) {
      return NextResponse.json({ error: "write_failed" }, { status: 500 });
    }

    // Log install event (aggregate analytics, no PII)
    logInstallEvent(metadata.slug, "claude-code");

    return NextResponse.json({
      slug: metadata.slug,
      path: result.writeResult.path,
      fileCount: result.writeResult.fileCount,
      promptCount: result.promptCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "pipeline_failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 422 }
    );
  }
}
