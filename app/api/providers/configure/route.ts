import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ConfigureBodySchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ConfigureBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // In production, env vars must be set in the hosting environment
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "use_env_vars",
        message:
          "In production, set SKILL_MALL_PROVIDER, SKILL_MALL_API_KEY, and SKILL_MALL_MODEL as environment variables in your hosting dashboard.",
      },
      { status: 400 }
    );
  }

  // In development, write to .env.local
  try {
    const fs = await import("fs/promises");
    const envPath = ".env.local";
    let existing = "";
    try {
      existing = await fs.readFile(envPath, "utf-8");
    } catch {
      // File doesn't exist yet
    }

    const lines = existing.split("\n").filter((l) => {
      return (
        !l.startsWith("SKILL_MALL_PROVIDER=") &&
        !l.startsWith("SKILL_MALL_API_KEY=") &&
        !l.startsWith("SKILL_MALL_MODEL=")
      );
    });

    lines.push(`SKILL_MALL_PROVIDER=${parsed.data.provider}`);
    if (parsed.data.apiKey) lines.push(`SKILL_MALL_API_KEY=${parsed.data.apiKey}`);
    if (parsed.data.model) lines.push(`SKILL_MALL_MODEL=${parsed.data.model}`);

    await fs.writeFile(envPath, lines.join("\n") + "\n", "utf-8");

    return NextResponse.json({
      success: true,
      provider: parsed.data.provider,
      model: parsed.data.model,
    });
  } catch {
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}
