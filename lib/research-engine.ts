import * as cheerio from "cheerio";
import { ResearchResultSchema } from "./validators";
import type { LLMClient } from "./providers";
import type { ResearchResult } from "./validators";

export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchError";
  }
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

const PER_URL_CHAR_CAP = 8_000;
const COMBINED_CHAR_CAP = 20_000;
const FETCH_TIMEOUT_MS = 15_000;

async function fetchAndExtract(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "SkillMall-ResearchEngine/1.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new FetchError(`HTTP ${response.status} fetching ${url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $(
    "script, style, nav, footer, header, aside, [role='banner'], [role='navigation'], .cookie-banner, .advertisement, .sidebar"
  ).remove();

  const main = $(
    "main, article, [role='main'], .content, #content, .post-content, .entry-content"
  ).first();
  const rawText = (main.length ? main : $("body")).text();

  return rawText.replace(/\s+/g, " ").trim().slice(0, PER_URL_CHAR_CAP);
}

async function fetchAllUrls(
  urls: string[]
): Promise<{ text: string; successUrls: string[]; failedUrls: string[] }> {
  const results = await Promise.allSettled(
    urls.map((url) => fetchAndExtract(url).then((text) => ({ url, text })))
  );

  const successUrls: string[] = [];
  const failedUrls: string[] = [];
  const texts: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      successUrls.push(result.value.url);
      texts.push(result.value.text);
    } else {
      failedUrls.push(urls[i]);
    }
  }

  if (successUrls.length === 0 && urls.length > 0) {
    throw new FetchError(
      "All URLs failed to fetch. Check the URLs and your network connection."
    );
  }

  const combined = texts.join("\n\n").slice(0, COMBINED_CHAR_CAP);
  return { text: combined, successUrls, failedUrls };
}

function buildExtractionPromptWithContent(
  topic: string,
  content: string,
  urls: string[]
): string {
  return `Extract every named tool, framework, matrix, canvas, methodology, and principle from the following content about "${topic}".

Source URL(s): ${urls.join(", ")}

<content>
${content}
</content>

Return a JSON object with this exact structure. No markdown fences. No explanation. Raw JSON only:

{
  "topic": "${topic}",
  "sources": ${JSON.stringify(urls)},
  "summary": "<2-3 sentences. First sentence MUST start with an imperative verb: Apply, Run, Analyze, Use, Execute, Generate. Max 150 characters for the first sentence.>",
  "tools": [
    {
      "name": "<canonical name of the tool>",
      "category": "<logical group within this domain>",
      "description": "<1-2 sentences, precise>",
      "artifactType": "<one of: matrix | canvas | grid | list | flowchart | analysis>",
      "artifactStructure": "<blank template structure as markdown with labeled columns/rows but no values>",
      "inputs": ["<what data or context this tool requires>"],
      "outputs": ["<the named deliverables this tool produces>"],
      "howUsed": "<2-5 numbered steps explaining the procedure>"
    }
  ],
  "principles": ["<core tenets of the methodology>"],
  "suggestedCategory": "<one of: development | design | writing | research | productivity | infrastructure | ai | business>",
  "suggestedTags": ["<3-6 tags, lowercase-hyphenated>"]
}

Rules:
- Only extract tools explicitly named in the content. Do not infer or invent.
- artifactStructure must be usable as a blank template with labeled but empty fields.
- summary first sentence must be imperative. "Apply Blue Ocean Strategy to..." not "This skill helps...".`;
}

function buildExtractionPromptNoUrls(topic: string): string {
  return `Extract every named tool, framework, matrix, canvas, methodology, and principle for the domain "${topic}" using your training knowledge.

Return a JSON object with this exact structure. No markdown fences. No explanation. Raw JSON only:

{
  "topic": "${topic}",
  "sources": [],
  "researchUnverified": true,
  "summary": "<2-3 sentences. First sentence MUST start with an imperative verb. Note at the end: Provide source URLs for authoritative, verified results.>",
  "tools": [
    {
      "name": "<canonical name>",
      "category": "<logical group>",
      "description": "<1-2 sentences, precise>",
      "artifactType": "<one of: matrix | canvas | grid | list | flowchart | analysis>",
      "artifactStructure": "<blank template as markdown>",
      "inputs": ["<inputs>"],
      "outputs": ["<outputs>"],
      "howUsed": "<2-5 numbered steps>"
    }
  ],
  "principles": ["<core tenets>"],
  "suggestedCategory": "<one of: development | design | writing | research | productivity | infrastructure | ai | business>",
  "suggestedTags": ["<3-6 tags>"]
}`;
}

const SYSTEM_PROMPT =
  "You are a structured knowledge extraction engine. You extract named tools, frameworks, methodologies, matrices, and principles from domain content. You return only valid JSON. You never invent tools that are not explicitly present in the provided content. If content is missing, return the best extraction possible — never fabricate.";

async function extractWithRetry(
  prompt: string,
  client: LLMClient
): Promise<ResearchResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    let fullPrompt = prompt;
    if (attempt > 0 && lastError instanceof Error) {
      fullPrompt = `${prompt}\n\nThe previous response failed validation with error: ${lastError.message}\n\nReturn corrected JSON. Same structure. No markdown fences. Fix only the failing fields.`;
    }

    const raw = await client.complete(fullPrompt, {
      responseFormat: "json_object",
      temperature: 0.1,
      maxTokens: 4096,
      systemPrompt: SYSTEM_PROMPT,
    });

    try {
      const parsed = JSON.parse(raw);
      return ResearchResultSchema.parse(parsed);
    } catch (err) {
      lastError = err;
    }
  }

  throw new ExtractionError(
    `Extraction failed after 2 attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/**
 * Run the Research Engine for the given topic and optional source URLs.
 * - With URLs: fetches content, extracts tools, returns validated ResearchResult
 * - Without URLs: uses LLM training knowledge, sets researchUnverified: true
 */
export async function runResearchEngine(
  topic: string,
  sourceUrls: string[],
  client: LLMClient
): Promise<ResearchResult> {
  if (sourceUrls.length === 0) {
    const result = await extractWithRetry(buildExtractionPromptNoUrls(topic), client);
    return { ...result, researchUnverified: true };
  }

  const { text, successUrls, failedUrls } = await fetchAllUrls(sourceUrls);
  const result = await extractWithRetry(
    buildExtractionPromptWithContent(topic, text, successUrls),
    client
  );

  return {
    ...result,
    sources: successUrls,
    ...(failedUrls.length > 0 ? { partialSources: true } : {}),
  };
}
