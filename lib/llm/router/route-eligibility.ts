import type Database from 'better-sqlite3'
import { getDb } from '../../db/client'
import { providerRegistryIdForExecutableProvider } from '../../providers/registry'
import type { ProviderConfig, ProviderID, ProviderRegistryID } from '../../providers/types'
import { getLatestPricingSnapshot, type PricingSnapshotRecord } from './pricing-refresh'
import type { RoutingCandidate } from './routing-policy'
import type { ModelCapabilityFlag, ModelCapabilityMetadata } from './model-capabilities'

export type RouteOperation =
  | 'skill.generate'
  | 'skill.preview'
  | 'skill.optimize_prompt'
  | 'provider.test'
  | 'chat.text'
  | 'embedding'

export type CapabilityEligibilityStatus = 'eligible' | 'blocked' | 'unknown'
export type PricingEligibilityStatus = 'available' | 'missing' | 'stale' | 'not_required'

export interface OperationRequirement {
  operation: RouteOperation
  requiredCapabilities: ModelCapabilityFlag[]
  pricingRequired: boolean
}

export interface RouteEligibilityResult {
  candidateId: string
  providerRegistryId: ProviderRegistryID
  executableProviderId: ProviderID
  modelId: string
  enabled: boolean
  capabilityStatus: CapabilityEligibilityStatus
  pricingStatus: PricingEligibilityStatus
  blockerCodes: string[]
  explanation: string
  evidence: {
    capabilitySource?: string
    capabilityConfidence?: string
    capabilitySourceUrl?: string
    capabilityFetchedAt?: string
    pricingSource?: string
    pricingSourceUrl?: string
    pricingSnapshotAt?: string
  }
}

interface ModelCapabilityRow {
  capabilities_json: string
  last_checked_at: string | null
}

export interface RouteEligibilityInput {
  candidate: RoutingCandidate
  operation?: RouteOperation
  requirePricing?: boolean
  db?: Database.Database
  now?: () => Date
}

const STALE_MS = 24 * 60 * 60 * 1000

function operationRequirement(operation: RouteOperation = 'chat.text', requirePricing = false): OperationRequirement {
  if (operation === 'embedding') {
    return {
      operation,
      requiredCapabilities: ['embeddings'],
      pricingRequired: requirePricing,
    }
  }

  return {
    operation,
    requiredCapabilities: ['text_input', 'text_output'],
    pricingRequired: requirePricing,
  }
}

function isStale(value: string | undefined | null, now: Date): boolean {
  if (!value) return true
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return true
  return now.getTime() - parsed > STALE_MS
}

function parseCapabilities(row: ModelCapabilityRow | undefined): ModelCapabilityMetadata | undefined {
  if (!row) return undefined
  try {
    const parsed = JSON.parse(row.capabilities_json) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as ModelCapabilityMetadata
      : undefined
  } catch {
    return undefined
  }
}

function loadCapabilityMetadata(
  providerRegistryId: ProviderRegistryID,
  modelId: string,
  db: Database.Database
): { metadata?: ModelCapabilityMetadata; lastCheckedAt?: string | null } {
  const row = db.prepare(`
    SELECT capabilities_json, last_checked_at
    FROM llm_models
    WHERE provider_registry_id = ? AND model_id = ?
    ORDER BY last_checked_at DESC, id DESC
    LIMIT 1
  `).get(providerRegistryId, modelId) as ModelCapabilityRow | undefined

  return {
    metadata: parseCapabilities(row),
    lastCheckedAt: row?.last_checked_at,
  }
}

function providerRegistryIdForConfig(config: ProviderConfig): ProviderRegistryID {
  return config.providerRegistryId ?? providerRegistryIdForExecutableProvider(config.provider)
}

function capabilityStatusFor(
  metadata: ModelCapabilityMetadata | undefined,
  lastCheckedAt: string | undefined | null,
  requirement: OperationRequirement,
  now: Date
): { status: CapabilityEligibilityStatus; blockers: string[] } {
  if (!metadata) return { status: 'unknown', blockers: ['missing_metadata'] }

  const blockers: string[] = [...(metadata.blockers ?? [])]
  if (metadata.confidence === 'reference') blockers.push('reference_only')
  if (metadata.source === 'portkey_models' || metadata.source === 'litellm_reference') blockers.push('reference_only')
  if (isStale(lastCheckedAt ?? metadata.fetchedAt ?? metadata.sourceUpdatedAt, now)) blockers.push('stale_metadata')

  for (const capability of requirement.requiredCapabilities) {
    const value = metadata.capabilities?.[capability]
    if (value === false) blockers.push(`unsupported_capability:${capability}`)
    if (value === undefined) blockers.push(`unknown_capability:${capability}`)
  }

  const uniqueBlockers = [...new Set(blockers)]
  if (uniqueBlockers.some((blocker) => blocker.startsWith('unsupported_capability'))) {
    return { status: 'blocked', blockers: uniqueBlockers }
  }
  if (uniqueBlockers.length > 0) return { status: 'unknown', blockers: uniqueBlockers }
  return { status: 'eligible', blockers: [] }
}

function pricingStatusFor(
  pricing: PricingSnapshotRecord | undefined,
  requirement: OperationRequirement,
  now: Date
): { status: PricingEligibilityStatus; blockers: string[] } {
  if (!requirement.pricingRequired) return { status: 'not_required', blockers: [] }
  if (!pricing) return { status: 'missing', blockers: ['missing_price'] }
  if (isStale(pricing.snapshotAt, now)) return { status: 'stale', blockers: ['stale_price'] }
  if (
    pricing.pricing.inputPerMillion === undefined &&
    pricing.pricing.outputPerMillion === undefined &&
    pricing.pricing.cachedInputPerMillion === undefined &&
    pricing.pricing.reasoningOutputPerMillion === undefined
  ) {
    return { status: 'missing', blockers: ['missing_price'] }
  }
  return { status: 'available', blockers: [] }
}

function explanationFor(result: {
  capabilityStatus: CapabilityEligibilityStatus
  pricingStatus: PricingEligibilityStatus
  blockerCodes: string[]
}): string {
  if (result.blockerCodes.length === 0) return 'Candidate is eligible for the requested operation.'
  return `Candidate is ${result.capabilityStatus} for capabilities and pricing is ${result.pricingStatus}: ${result.blockerCodes.join(', ')}.`
}

export function evaluateRouteEligibility(input: RouteEligibilityInput): RouteEligibilityResult {
  const db = input.db ?? getDb()
  const now = input.now?.() ?? new Date()
  const requirement = operationRequirement(input.operation, input.requirePricing)
  const candidate = input.candidate
  const providerRegistryId = providerRegistryIdForConfig(candidate.config)
  const executableProviderId = candidate.config.provider
  const enabled = candidate.enabled !== false
  const { metadata, lastCheckedAt } = loadCapabilityMetadata(providerRegistryId, candidate.config.model, db)
  const capability = enabled
    ? capabilityStatusFor(metadata, lastCheckedAt, requirement, now)
    : { status: 'blocked' as const, blockers: ['candidate_disabled'] }
  const pricing = pricingStatusFor(
    getLatestPricingSnapshot(providerRegistryId, candidate.config.model, db),
    requirement,
    now
  )
  const blockerCodes = [...new Set([...capability.blockers, ...pricing.blockers])]
  const result = {
    candidateId: candidate.id,
    providerRegistryId,
    executableProviderId,
    modelId: candidate.config.model,
    enabled,
    capabilityStatus: capability.status,
    pricingStatus: pricing.status,
    blockerCodes,
    explanation: '',
    evidence: {
      capabilitySource: metadata?.source,
      capabilityConfidence: metadata?.confidence,
      capabilitySourceUrl: metadata?.sourceUrl,
      capabilityFetchedAt: metadata?.fetchedAt ?? lastCheckedAt ?? undefined,
      pricingSource: pricing.status === 'available' || pricing.status === 'stale'
        ? getLatestPricingSnapshot(providerRegistryId, candidate.config.model, db)?.source
        : undefined,
      pricingSourceUrl: pricing.status === 'available' || pricing.status === 'stale'
        ? getLatestPricingSnapshot(providerRegistryId, candidate.config.model, db)?.sourceUrl
        : undefined,
      pricingSnapshotAt: pricing.status === 'available' || pricing.status === 'stale'
        ? getLatestPricingSnapshot(providerRegistryId, candidate.config.model, db)?.snapshotAt
        : undefined,
    },
  } satisfies Omit<RouteEligibilityResult, 'explanation'> & { explanation: string }

  return {
    ...result,
    explanation: explanationFor(result),
  }
}
