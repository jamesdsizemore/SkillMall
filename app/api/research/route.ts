import { NextRequest, NextResponse } from "next/server";
import { ApiResearchBodySchema } from "@/lib/validators";
import { resolveProviderConfig, createLLMClient, ConfigError } from "@/lib/providers";
import { runResearchEngine, FetchError, ExtractionError } from "@/lib/research-engine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ApiResearchBodySchema.safeParse(body);

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

  try {
    const result = await runResearchEngine(
      parsed.data.topic,
      parsed.data.sourceUrls,
      client
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FetchError || err instanceof ExtractionError) {
      return NextResponse.json(
        { error: "pipeline_failed", message: err.message },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
