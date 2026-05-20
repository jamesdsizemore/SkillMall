import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeProviderConfig } from "@/lib/providers/config-store";
import {
  assertPhase1AuthMode,
  assertPhase1GatewayBackend,
  sanitizeSecretRef,
  validateSecretRefForAuthMode,
} from "@/lib/llm/router/secret-refs";

const ConfigureBodySchema = z.object({
  provider: z.enum(["openai", "anthropic", "claude-code", "gemini", "groq", "ollama"]),
  model: z.string().optional(),
  authMode: z.enum(["env_key", "local_cli_session", "none_local"]).optional(),
  secretRef: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("env"), name: z.string().min(1) }),
      z.object({ type: z.literal("none") }),
    ])
    .optional(),
  gatewayBackend: z.literal("direct").optional(),
}).strict();

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ConfigureBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const authMode = parsed.data.authMode
      ? assertPhase1AuthMode(parsed.data.authMode)
      : undefined;
    const gatewayBackend = assertPhase1GatewayBackend(parsed.data.gatewayBackend);
    const secretRef = parsed.data.secretRef ? sanitizeSecretRef(parsed.data.secretRef) : undefined;
    if (authMode) validateSecretRefForAuthMode(authMode, secretRef);

    const saved = await writeProviderConfig({
      provider: parsed.data.provider,
      model: parsed.data.model,
      authMode,
      secretRef,
      gatewayBackend,
    });

    return NextResponse.json({
      success: true,
      provider: saved.provider,
      model: saved.model,
      authMode: saved.authMode,
      gatewayBackend: saved.gatewayBackend,
      secretRef: saved.secretRef ?? null,
      configPath: saved.path,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_provider_config",
        message: error instanceof Error ? error.message : "Invalid provider configuration",
      },
      { status: 400 }
    );
  }
}
