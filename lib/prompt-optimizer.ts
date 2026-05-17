import type { LLMClient } from "./providers";
import { PromptAuditSchema } from "./validators";

export interface PromptAudit {
  tokenCountBefore: number;
  tokenCountAfter: number;
  tokenReductionPercent: number;
  tokenEfficiencyScore: number;
  intentDimensionsPresent: string[];
  intentDimensionsMissing: string[];
  intentSuggestions: Record<string, string>;
  intentCompletenessScore: number;
  outputClarityScore: number;
  outputClarityIssues: string[];
  outputClarityPasses: boolean;
  triggerSharpnessScore: number;
  triggerSharpnessPasses: boolean;
  triggerSuggestion: string | null;
  optimizedPrompt: string;
  optimizationFailed?: boolean;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.35);
}

const SYSTEM_PROMPT =
  "You are a prompt quality auditor. Analyze prompts for efficiency, intent completeness, output clarity, and trigger sharpness. Return only valid JSON. No markdown fences.";

const AUDIT_PROMPT = (promptText: string) => `Audit this prompt across 4 quality dimensions.

<prompt>
${promptText}
</prompt>

Return this JSON structure exactly. No markdown fences. Raw JSON:

{
  "token_efficiency": {
    "score": <0-100, where 100 = no unnecessary words>,
    "unnecessary_phrases": ["<phrase that could be removed without changing output>"],
    "optimized_text": "<the full prompt with unnecessary phrases removed>"
  },
  "intent_completeness": {
    "score": <0-100, where 100 = all 9 dimensions explicitly addressed>,
    "present": ["<dimension names that are clearly addressed>"],
    "missing": ["<dimension names that are absent or ambiguous>"],
    "suggestions": {
      "<missing_dimension>": "<specific suggestion for how to add it concisely>"
    }
  },
  "output_clarity": {
    "score": <0-100>,
    "issues": ["<specific issue with output specification>"],
    "passes": <true if: output deliverable named, structure specified, ordering stated>
  },
  "trigger_sharpness": {
    "score": <0-100>,
    "first_sentence": "<the actual first sentence of the prompt>",
    "passes": <true if first sentence is imperative and unambiguous>,
    "suggestion": "<rewritten first sentence if it fails, null if it passes>"
  },
  "optimized_prompt": "<the best version of this prompt incorporating all improvements>",
  "estimated_tokens_before": <word_count * 1.35 rounded to integer>,
  "estimated_tokens_after": <word_count_of_optimized * 1.35 rounded to integer>
}

The nine intent dimensions: task, input, output, constraints, context, audience, memory, success-criteria, examples.`;

/**
 * Audit a prompt across 4 quality dimensions.
 * On LLM failure, returns the unoptimized prompt with optimizationFailed: true.
 * Never throws.
 */
export async function optimizePrompt(
  promptText: string,
  client: LLMClient
): Promise<PromptAudit> {
  const tokensBefore = estimateTokens(promptText);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    let prompt = AUDIT_PROMPT(promptText);
    if (attempt > 0 && lastError instanceof Error) {
      prompt = `${prompt}\n\nPrevious response failed validation: ${lastError.message}\nReturn corrected JSON.`;
    }

    try {
      const raw = await client.complete(prompt, {
        responseFormat: "json_object",
        temperature: 0.1,
        maxTokens: 1500,
        systemPrompt: SYSTEM_PROMPT,
      });

      const parsed = PromptAuditSchema.parse(JSON.parse(raw));

      const tokensAfter = estimateTokens(parsed.optimized_prompt);
      const reductionPct =
        tokensBefore > 0 ? Math.round(((tokensBefore - tokensAfter) / tokensBefore) * 100) : 0;

      return {
        tokenCountBefore: tokensBefore,
        tokenCountAfter: tokensAfter,
        tokenReductionPercent: reductionPct,
        tokenEfficiencyScore: parsed.token_efficiency.score,
        intentDimensionsPresent: parsed.intent_completeness.present,
        intentDimensionsMissing: parsed.intent_completeness.missing,
        intentSuggestions: parsed.intent_completeness.suggestions,
        intentCompletenessScore: parsed.intent_completeness.score,
        outputClarityScore: parsed.output_clarity.score,
        outputClarityIssues: parsed.output_clarity.issues,
        outputClarityPasses: parsed.output_clarity.passes,
        triggerSharpnessScore: parsed.trigger_sharpness.score,
        triggerSharpnessPasses: parsed.trigger_sharpness.passes,
        triggerSuggestion: parsed.trigger_sharpness.suggestion,
        optimizedPrompt: parsed.optimized_prompt,
      };
    } catch (err) {
      lastError = err;
    }
  }

  // Both attempts failed — return graceful fallback
  return {
    tokenCountBefore: tokensBefore,
    tokenCountAfter: tokensBefore,
    tokenReductionPercent: 0,
    tokenEfficiencyScore: 0,
    intentDimensionsPresent: [],
    intentDimensionsMissing: [],
    intentSuggestions: {},
    intentCompletenessScore: 0,
    outputClarityScore: 0,
    outputClarityIssues: [],
    outputClarityPasses: false,
    triggerSharpnessScore: 0,
    triggerSharpnessPasses: false,
    triggerSuggestion: null,
    optimizedPrompt: promptText,
    optimizationFailed: true,
  };
}
