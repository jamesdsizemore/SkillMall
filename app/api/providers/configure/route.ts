import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeProviderConfig } from "@/lib/providers/config-store";
import {
  assertRouterAuthMode,
  assertRouterGatewayBackend,
  sanitizeSecretRef,
  validateSecretRefForAuthMode,
} from "@/lib/llm/router/secret-refs";
import { assertLocalBifrostBaseURL } from "@/lib/llm/router/gateway-adapter";

const ConfigureBodySchema = z.object({
  provider: z.enum(["openai", "anthropic", "claude-code", "gemini", "groq", "ollama"]),
  model: z.string().optional(),
  authMode: z.enum(["env_key", "local_cli_session", "none_local", "gateway_virtual_key"]).optional(),
  secretRef: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("env"), name: z.string().min(1) }),
      z.object({ type: z.literal("gateway_virtual_key_ref"), name: z.string().min(1) }),
      z.object({ type: z.literal("none") }),
    ])
    .optional(),
  gatewayBackend: z.enum(["direct", "bifrost_local"]).optional(),
  baseURL: z.string().url().optional(),
  routingPolicyId: z.string().min(1).optional(),
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
      ? assertRouterAuthMode(parsed.data.authMode)
      : undefined;
    const gatewayBackend = assertRouterGatewayBackend(parsed.data.gatewayBackend);
    if (gatewayBackend === "bifrost_local") assertLocalBifrostBaseURL(parsed.data.baseURL);
    const secretRef = parsed.data.secretRef ? sanitizeSecretRef(parsed.data.secretRef) : undefined;
    if (authMode) validateSecretRefForAuthMode(authMode, secretRef);

    const saved = await writeProviderConfig({
      provider: parsed.data.provider,
      model: parsed.data.model,
      authMode,
      secretRef,
      gatewayBackend,
      baseURL: parsed.data.baseURL,
      routingPolicyId: parsed.data.routingPolicyId,
    });

    return NextResponse.json({
      success: true,
      provider: saved.provider,
      model: saved.model,
      authMode: saved.authMode,
      gatewayBackend: saved.gatewayBackend,
      secretRef: saved.secretRef ?? null,
      baseURL: saved.baseURL ?? null,
      routingPolicyId: saved.routingPolicyId ?? null,
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
