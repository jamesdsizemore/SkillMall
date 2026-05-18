import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSkill } from "@/lib/skills";
import { resolveProviderConfig, createLLMClient, ConfigError } from "@/lib/providers";
import { evaluateTriggers } from "@/lib/trigger-evaluator";

const EvalBodySchema = z.object({
  category: z.string().min(1),
  slug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = EvalBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const skill = getSkill(parsed.data.category, parsed.data.slug);
  if (!skill) {
    return NextResponse.json({ error: "skill_not_found" }, { status: 404 });
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
    const result = await evaluateTriggers(skill, client);

    const warning =
      result.overallAccuracy < 80
        ? `Accuracy ${result.overallAccuracy}% is below the 80% warning threshold. Review failing queries.`
        : null;

    return NextResponse.json({ ...result, warning });
  } catch (err) {
    return NextResponse.json(
      {
        error: "evaluation_failed",
        message: err instanceof Error ? err.message : "Evaluation failed",
      },
      { status: 422 }
    );
  }
}
