import type { ProviderModelSourceLabel } from '../../providers/model-sources'
import type { ProviderRegistryID } from '../../providers/types'
import type { ModelPricing } from './costing'

export type ModelCapabilitySource =
  | 'official_api'
  | 'official_docs'
  | 'portkey_models'
  | 'litellm_reference'
  | 'source_backed_static'
  | 'manual'
  | 'fallback'
  | 'unknown'

export type ModelCapabilityConfidence =
  | 'authoritative'
  | 'source_backed'
  | 'reference'
  | 'manual'
  | 'fallback'
  | 'unknown'

export type ModelCapabilityFlag =
  | 'text_input'
  | 'text_output'
  | 'image_input'
  | 'image_output'
  | 'audio_input'
  | 'audio_output'
  | 'tool_calling'
  | 'parallel_tool_calling'
  | 'structured_output'
  | 'prompt_caching'
  | 'reasoning'
  | 'web_search'
  | 'embeddings'
  | 'rerank'
  | 'image_generation'
  | 'transcription'
  | 'speech'
  | 'video_input'
  | 'video_output'

export type ModelCapabilityBlocker =
  | 'missing_metadata'
  | 'stale_metadata'
  | 'account_scoped_source'
  | 'provider_specific_source_required'
  | 'unsupported_operation'
  | 'missing_price'
  | 'fallback_only'
  | 'manual_only'
  | 'reference_only'
  | 'unknown_source'

export interface ModelCapabilityMetadata {
  source: ModelCapabilitySource
  sourceName?: string
  sourceUrl?: string
  sourceUpdatedAt?: string
  fetchedAt?: string
  confidence: ModelCapabilityConfidence
  capabilities: Partial<Record<ModelCapabilityFlag, boolean>>
  limits: {
    contextWindow?: number
    maxInputTokens?: number
    maxOutputTokens?: number
  }
  mode?: string
  endpointFamily?: string
  blockers: ModelCapabilityBlocker[]
}

export interface ProviderModelCapabilityInput {
  providerRegistryId: ProviderRegistryID
  modelId: string
  source: ProviderModelSourceLabel
  authoritative: boolean
  sourceName: string
  sourceUrl?: string
  fetchedAt: string
  raw?: Record<string, unknown>
  blocker?: string
}

export interface ReferenceModelCapabilityInput {
  providerRegistryId?: string
  modelId: string
  source: 'portkey_models' | 'litellm_reference'
  sourceName: string
  sourceUrl?: string
  sourceLicense?: string
  raw: Record<string, unknown>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function numberField(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function sourceFromProviderRecord(input: ProviderModelCapabilityInput): ModelCapabilitySource {
  if (input.source === 'manual') return 'manual'
  if (input.source === 'fallback') return 'fallback'
  if (input.source === 'source_backed_static') return 'source_backed_static'
  if (input.source === 'live') return 'official_api'
  return 'unknown'
}

function confidenceFromProviderRecord(input: ProviderModelCapabilityInput): ModelCapabilityConfidence {
  if (input.source === 'manual') return 'manual'
  if (input.source === 'fallback') return 'fallback'
  if (input.source === 'source_backed_static') return 'source_backed'
  if (input.source === 'live' && input.authoritative) return 'authoritative'
  return 'unknown'
}

function baseBlockers(
  source: ModelCapabilitySource,
  confidence: ModelCapabilityConfidence,
  explicitBlocker?: string
): ModelCapabilityBlocker[] {
  const blockers: ModelCapabilityBlocker[] = []
  if (source === 'unknown' || confidence === 'unknown') blockers.push('unknown_source')
  if (source === 'fallback') blockers.push('fallback_only')
  if (source === 'manual') blockers.push('manual_only')
  if (explicitBlocker) {
    if (/account/i.test(explicitBlocker)) blockers.push('account_scoped_source')
    else if (/provider-specific|adapter|required/i.test(explicitBlocker)) blockers.push('provider_specific_source_required')
    else blockers.push('missing_metadata')
  }
  return unique(blockers)
}

function setFlag(
  capabilities: Partial<Record<ModelCapabilityFlag, boolean>>,
  flag: ModelCapabilityFlag,
  value: unknown
): void {
  if (typeof value === 'boolean') capabilities[flag] = value
}

function inferOpenRouterCapabilities(raw: Record<string, unknown>, metadata: ModelCapabilityMetadata): void {
  const architecture = isObject(raw.architecture) ? raw.architecture : undefined
  const inputModalities = stringArray(architecture?.input_modalities)
  const outputModalities = stringArray(architecture?.output_modalities)
  if (inputModalities.includes('text')) metadata.capabilities.text_input = true
  if (outputModalities.includes('text')) metadata.capabilities.text_output = true
  if (inputModalities.includes('image')) metadata.capabilities.image_input = true
  if (outputModalities.includes('image')) {
    metadata.capabilities.image_output = true
    metadata.capabilities.image_generation = true
  }
  if (inputModalities.includes('audio')) metadata.capabilities.audio_input = true
  if (outputModalities.includes('audio')) metadata.capabilities.audio_output = true
  if (outputModalities.includes('embeddings')) metadata.capabilities.embeddings = true
  const supported = stringArray(raw.supported_parameters)
  if (supported.includes('tools')) metadata.capabilities.tool_calling = true
  if (supported.includes('response_format')) metadata.capabilities.structured_output = true
  metadata.limits.contextWindow = numberField(raw.context_length) ?? metadata.limits.contextWindow
  const topProvider = isObject(raw.top_provider) ? raw.top_provider : undefined
  metadata.limits.maxOutputTokens = numberField(topProvider?.max_completion_tokens) ?? metadata.limits.maxOutputTokens
  metadata.endpointFamily = 'openrouter'
}

function inferGeminiCapabilities(raw: Record<string, unknown>, metadata: ModelCapabilityMetadata): void {
  const methods = stringArray(raw.supportedGenerationMethods)
  if (methods.includes('generateContent')) {
    metadata.capabilities.text_input = true
    metadata.capabilities.text_output = true
  }
  if (methods.includes('embedContent')) metadata.capabilities.embeddings = true
  setFlag(metadata.capabilities, 'reasoning', raw.thinking)
  metadata.limits.maxInputTokens = numberField(raw.inputTokenLimit)
  metadata.limits.contextWindow = numberField(raw.inputTokenLimit)
  metadata.limits.maxOutputTokens = numberField(raw.outputTokenLimit)
}

function inferCohereCapabilities(raw: Record<string, unknown>, metadata: ModelCapabilityMetadata): void {
  const endpoints = stringArray(raw.endpoints)
  const defaultEndpoints = stringArray(raw.default_endpoints)
  const supportedEndpoints = [...endpoints, ...defaultEndpoints]
  if (supportedEndpoints.includes('chat') || supportedEndpoints.includes('generate')) {
    metadata.capabilities.text_input = true
    metadata.capabilities.text_output = true
  }
  if (supportedEndpoints.includes('embed')) metadata.capabilities.embeddings = true
  if (supportedEndpoints.includes('rerank')) metadata.capabilities.rerank = true
  metadata.limits.contextWindow = numberField(raw.context_length)
}

function inferLiteLLMCapabilities(raw: Record<string, unknown>, metadata: ModelCapabilityMetadata): void {
  const mode = typeof raw.mode === 'string' ? raw.mode : undefined
  metadata.mode = mode
  if (mode === 'chat' || mode === 'completion' || mode === 'responses') {
    metadata.capabilities.text_input = true
    metadata.capabilities.text_output = true
  }
  if (mode === 'embedding') metadata.capabilities.embeddings = true
  if (mode === 'image_generation') metadata.capabilities.image_generation = true
  if (mode === 'audio_transcription') metadata.capabilities.transcription = true
  if (mode === 'audio_speech') metadata.capabilities.speech = true
  setFlag(metadata.capabilities, 'tool_calling', raw.supports_function_calling)
  setFlag(metadata.capabilities, 'parallel_tool_calling', raw.supports_parallel_function_calling)
  setFlag(metadata.capabilities, 'structured_output', raw.supports_response_schema)
  setFlag(metadata.capabilities, 'prompt_caching', raw.supports_prompt_caching)
  setFlag(metadata.capabilities, 'reasoning', raw.supports_reasoning)
  setFlag(metadata.capabilities, 'web_search', raw.supports_web_search)
  setFlag(metadata.capabilities, 'image_input', raw.supports_vision)
  setFlag(metadata.capabilities, 'audio_input', raw.supports_audio_input)
  setFlag(metadata.capabilities, 'audio_output', raw.supports_audio_output)
  metadata.limits.contextWindow = numberField(raw.max_input_tokens) ?? numberField(raw.max_tokens)
  metadata.limits.maxInputTokens = numberField(raw.max_input_tokens)
  metadata.limits.maxOutputTokens = numberField(raw.max_output_tokens) ?? numberField(raw.max_tokens)
}

function inferGenericOfficialCapabilities(input: ProviderModelCapabilityInput, metadata: ModelCapabilityMetadata): void {
  if (input.providerRegistryId === 'gemini' && input.raw) inferGeminiCapabilities(input.raw, metadata)
  if (input.providerRegistryId === 'cohere' && input.raw) inferCohereCapabilities(input.raw, metadata)
  if (input.providerRegistryId === 'openrouter' && input.raw) inferOpenRouterCapabilities(input.raw, metadata)
  if (input.source === 'source_backed_static') {
    metadata.capabilities.text_input = true
    metadata.capabilities.text_output = true
  }
}

export function normalizeProviderModelCapabilities(input: ProviderModelCapabilityInput): ModelCapabilityMetadata {
  const source = sourceFromProviderRecord(input)
  const confidence = confidenceFromProviderRecord(input)
  const metadata: ModelCapabilityMetadata = {
    source,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    fetchedAt: input.fetchedAt,
    confidence,
    capabilities: {},
    limits: {},
    blockers: baseBlockers(source, confidence, input.blocker),
  }

  inferGenericOfficialCapabilities(input, metadata)
  if (Object.keys(metadata.capabilities).length === 0 && Object.keys(metadata.limits).length === 0) {
    metadata.blockers = unique([...metadata.blockers, 'missing_metadata'])
  }

  return metadata
}

export function normalizeReferenceModelCapabilities(input: ReferenceModelCapabilityInput): ModelCapabilityMetadata {
  const metadata: ModelCapabilityMetadata = {
    source: input.source,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    confidence: 'reference',
    capabilities: {},
    limits: {},
    blockers: ['reference_only'],
  }

  if (input.source === 'litellm_reference') inferLiteLLMCapabilities(input.raw, metadata)
  if (input.source === 'portkey_models') {
    metadata.capabilities.text_input = true
    metadata.capabilities.text_output = true
    metadata.blockers.push('missing_metadata')
  }

  if (Object.keys(metadata.capabilities).length === 0 && Object.keys(metadata.limits).length === 0) {
    metadata.blockers.push('missing_metadata')
  }

  return metadata
}

export function modelCapabilityContextWindow(metadata: ModelCapabilityMetadata): number | undefined {
  return metadata.limits.contextWindow ?? metadata.limits.maxInputTokens
}

export function modelCapabilityMaxOutputTokens(metadata: ModelCapabilityMetadata): number | undefined {
  return metadata.limits.maxOutputTokens
}

export function hasUsablePrice(pricing: ModelPricing | undefined): boolean {
  return Boolean(
    pricing &&
      (typeof pricing.inputPerMillion === 'number' ||
        typeof pricing.outputPerMillion === 'number' ||
        typeof pricing.cachedInputPerMillion === 'number' ||
        typeof pricing.reasoningOutputPerMillion === 'number')
  )
}
