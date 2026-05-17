import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveProviderConfig, createLLMClient, ConfigError } from "@/lib/providers";
import { optimizePrompt } from "@/lib/prompt-optimizer";

const OptimizeBodySchema = z.object({
  prompt: z.string().min(1).max(10_000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = OptimizeBodySchema.safeParse(body);

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
  const audit = await optimizePrompt(parsed.data.prompt, client);
  return NextResponse.json(audit);
}
