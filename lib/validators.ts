import { z } from "zod";

export const ResearchToolSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  artifactType: z.enum(["matrix", "canvas", "grid", "list", "flowchart", "analysis"]),
  artifactStructure: z.string().min(20).max(3000),
  inputs: z.array(z.string().min(1)).min(1).max(10),
  outputs: z.array(z.string().min(1)).min(1).max(10),
  howUsed: z.string().min(20).max(1000),
});

export const ResearchResultSchema = z.object({
  topic: z.string().min(1),
  sources: z.array(z.string()),
  summary: z.string().min(50).max(1024),
  tools: z.array(ResearchToolSchema).min(1),
  principles: z.array(z.string()),
  suggestedCategory: z.enum([
    "development",
    "design",
    "writing",
    "research",
    "productivity",
    "infrastructure",
    "ai",
    "business",
  ]),
  suggestedTags: z.array(z.string()).min(1).max(8),
  researchUnverified: z.boolean().optional(),
  partialSources: z.boolean().optional(),
});

export const FrameworkSelectionSchema = z.object({
  selected: z.array(z.string()).min(1).max(3),
  rationale: z.string().min(10),
});

export const PromptAuditSchema = z.object({
  token_efficiency: z.object({
    score: z.number().min(0).max(100),
    unnecessary_phrases: z.array(z.string()),
    optimized_text: z.string().min(1),
  }),
  intent_completeness: z.object({
    score: z.number().min(0).max(100),
    present: z.array(z.string()),
    missing: z.array(z.string()),
    suggestions: z.record(z.string(), z.string()),
  }),
  output_clarity: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    passes: z.boolean(),
  }),
  trigger_sharpness: z.object({
    score: z.number().min(0).max(100),
    first_sentence: z.string(),
    passes: z.boolean(),
    suggestion: z.string().nullable(),
  }),
  optimized_prompt: z.string().min(1),
  estimated_tokens_before: z.number().positive(),
  estimated_tokens_after: z.number().positive(),
});

export const PipelineInputSchema = z.object({
  topic: z.string().min(1).max(500),
  sourceUrls: z.array(z.string()).max(10),
  metadata: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
    title: z.string().optional(),
    author: z.string().optional(),
    category: z.enum([
      "development",
      "design",
      "writing",
      "research",
      "productivity",
      "infrastructure",
      "ai",
      "business",
    ]),
    tags: z.array(z.string()).max(8),
    targetAgents: z.array(z.string()),
  }),
  selectedToolNames: z.array(z.string()).optional(),
  selectedMetaTypes: z.array(z.string()).optional(),
  writeToDisk: z.boolean().optional(),
  outputBasePath: z.string().optional(),
});

export const ApiResearchBodySchema = z.object({
  topic: z.string().min(1).max(500),
  sourceUrls: z.array(z.string()).max(10),
});

export const ApiCreateSkillBodySchema = z.object({
  researchResult: ResearchResultSchema,
  metadata: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
    title: z.string().optional(),
    author: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()),
    targetAgents: z.array(z.string()),
  }),
  selectedToolNames: z.array(z.string()).optional(),
  selectedMetaTypes: z.array(z.string()).optional(),
});

export type ResearchResult = z.infer<typeof ResearchResultSchema>;
export type ResearchTool = z.infer<typeof ResearchToolSchema>;
