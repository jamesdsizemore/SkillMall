import { NextResponse } from "next/server";
import { ConfigError } from "@/lib/providers";
import { resolveRouterProviderConfig } from "@/lib/llm/router/config";
import { getProviderCatalog } from "@/lib/providers/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = resolveRouterProviderConfig();
    const providers = await getProviderCatalog();
    return NextResponse.json({
      configured: true,
      activeProvider: config.provider,
      activeModel: config.model,
      authMode: config.authMode,
      gatewayBackend: config.gatewayBackend,
      secretRef: config.secretRef ?? null,
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
        secretRef: null,
        warnings: [],
        providers,
      });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
