import { NextResponse } from "next/server";
import { ConfigError } from "@/lib/providers";
import { resolveRouterProviderConfig } from "@/lib/llm/router/config";
import { getProviderCatalog } from "@/lib/providers/catalog";

export const dynamic = "force-dynamic";

function accessLabel(authMode: string | null, gatewayBackend: string | null): string | null {
  if (gatewayBackend && gatewayBackend !== "direct") return "gateway_access";
  if (authMode === "env_key") return "api_access";
  if (authMode === "local_cli_session") return "local_tool_session";
  if (authMode === "none_local") return "local_runtime";
  if (authMode === "gateway_virtual_key") return "gateway_access";
  return null;
}

export async function GET() {
  try {
    const config = resolveRouterProviderConfig();
    const providers = await getProviderCatalog({
      ...config,
      apiKey:
        config.authMode === "env_key" && config.secretRef?.type === "env"
          ? process.env[config.secretRef.name]
          : undefined,
    });
    return NextResponse.json({
      configured: true,
      activeProvider: config.provider,
      activeModel: config.model,
      authMode: config.authMode,
      gatewayBackend: config.gatewayBackend,
      accessLabel: accessLabel(config.authMode, config.gatewayBackend),
      secretRef: config.secretRef ?? null,
      baseURL: config.baseURL ?? null,
      routingPolicyId: config.routingPolicyId ?? null,
      warnings: config.warnings,
      providers,
    });
  } catch (err) {
    if (err instanceof ConfigError) {
      const providers = await getProviderCatalog();
      return NextResponse.json({
        configured: false,
        activeProvider: null,
        activeModel: null,
        authMode: null,
        gatewayBackend: "direct",
        accessLabel: null,
        secretRef: null,
        baseURL: null,
        routingPolicyId: null,
        warnings: [],
        providers,
      });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
