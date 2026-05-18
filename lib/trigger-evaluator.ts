import type { LLMClient } from "./providers";
import type { Skill } from "./skills";
import { z } from "zod";

export interface TriggerEvalResult {
  truePositiveRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  overallAccuracy: number;
  positiveQueries: Array<{ query: string; triggered: boolean }>;
  negativeQueries: Array<{ query: string; triggered: boolean }>;
  failingQueries: Array<{ query: string; type: "fn" | "fp"; suggestion: string }>;
}

const QueryGenSchema = z.object({
  positive: z.array(z.string()).length(10),
  negative: z.array(z.string()).length(10),
});

const EvalSchema = z.object({
  results: z.array(
    z.object({
      query: z.string(),
      would_trigger: z.boolean(),
      confidence: z.number(),
    })
  ),
});

/**
 * Evaluate how reliably a skill's description triggers agents.
 * Generates 10 positive + 10 negative test queries via LLM,
 * then evaluates each against the skill description.
 */
export async function evaluateTriggers(
  skill: Skill,
  client: LLMClient
): Promise<TriggerEvalResult> {
  // Step 1: Generate 20 queries
  const genPrompt = `Generate evaluation queries for this AI agent skill:

Skill name: ${skill.name}
Skill description: "${skill.description}"
Category: ${skill.category}

Generate exactly 10 "positive" queries (user messages that SHOULD trigger this skill) and
exactly 10 "negative" queries (user messages that should NOT trigger this skill).

Return JSON only. No markdown fences:
{"positive": ["query1", "query2", ...], "negative": ["query1", "query2", ...]}`;

  const genRaw = await client.complete(genPrompt, {
    responseFormat: "json_object",
    temperature: 0.5,
    maxTokens: 1000,
    systemPrompt:
      "You are a prompt engineering expert generating test queries for skill trigger evaluation. Return only valid JSON.",
  });

  const queries = QueryGenSchema.parse(JSON.parse(genRaw));

  // Step 2: Evaluate each query against the skill description
  const allQueries = [...queries.positive, ...queries.negative];
  const evalPrompt = `Given this AI agent skill:
Name: ${skill.name}
Description: "${skill.description}"

For each user query, determine if an AI agent would select this skill to fulfill the request.

Queries:
${allQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Return JSON only. No markdown fences:
{"results": [{"query": "...", "would_trigger": true/false, "confidence": 0.0-1.0}, ...]}`;

  const evalRaw = await client.complete(evalPrompt, {
    responseFormat: "json_object",
    temperature: 0.1,
    maxTokens: 1500,
    systemPrompt:
      "You simulate agent skill selection behavior. Return only valid JSON.",
  });

  const evalResult = EvalSchema.parse(JSON.parse(evalRaw));
  const positiveResults = evalResult.results.slice(0, 10);
  const negativeResults = evalResult.results.slice(10);

  const truePositives = positiveResults.filter((r) => r.would_trigger).length;
  const falsePositives = negativeResults.filter((r) => r.would_trigger).length;
  const falseNegatives = positiveResults.filter((r) => !r.would_trigger).length;

  const truePositiveRate = Math.round((truePositives / 10) * 100);
  const falsePositiveRate = Math.round((falsePositives / 10) * 100);
  const falseNegativeRate = Math.round((falseNegatives / 10) * 100);
  const overallAccuracy = Math.round(
    ((truePositives + (10 - falsePositives)) / 20) * 100
  );

  const failingQueries: TriggerEvalResult["failingQueries"] = [
    ...positiveResults
      .filter((r) => !r.would_trigger)
      .map((r) => ({
        query: r.query,
        type: "fn" as const,
        suggestion:
          "Add this scenario's keywords to the description or when_to_use field",
      })),
    ...negativeResults
      .filter((r) => r.would_trigger)
      .map((r) => ({
        query: r.query,
        type: "fp" as const,
        suggestion: "Narrow the description to exclude this scenario",
      })),
  ];

  return {
    truePositiveRate,
    falsePositiveRate,
    falseNegativeRate,
    overallAccuracy,
    positiveQueries: positiveResults.map((r) => ({
      query: r.query,
      triggered: r.would_trigger,
    })),
    negativeQueries: negativeResults.map((r) => ({
      query: r.query,
      triggered: r.would_trigger,
    })),
    failingQueries,
  };
}
