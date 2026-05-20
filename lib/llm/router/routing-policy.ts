import type { ProviderConfig } from '../../providers/types'
import type Database from 'better-sqlite3'
import { getDb } from '../../db/client'
import { assertRouterRoutingPolicyMode } from './secret-refs'
import type { RoutingPolicyMode } from './types'

export interface RoutingCandidate {
  id: string
  config: ProviderConfig
  enabled?: boolean
  estimatedCostUsd?: number
}

export interface RoutingPolicy {
  id: string
  mode: RoutingPolicyMode
  candidates?: RoutingCandidate[]
  budget?: {
    remainingUsd?: number
  }
}

type StoredRoutingPolicyRow = {
  id: string
  mode: string
  rules_json: string
  budget_json: string
}

export interface RoutingAttempt {
  candidateId: string
  providerId: string
  modelId: string
  routeBackend: string
  status: 'selected' | 'skipped' | 'blocked'
  reason?: string
}

export interface RoutingDecision {
  config: ProviderConfig
  mode: RoutingPolicyMode
  attempts: RoutingAttempt[]
}

export class RoutingPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoutingPolicyError'
  }
}

function attemptFor(candidate: RoutingCandidate, status: RoutingAttempt['status'], reason?: string): RoutingAttempt {
  return {
    candidateId: candidate.id,
    providerId: candidate.config.provider,
    modelId: candidate.config.model,
    routeBackend: candidate.config.gatewayBackend ?? 'direct',
    status,
    reason,
  }
}

function enabledCandidates(policy: RoutingPolicy): RoutingCandidate[] {
  return (policy.candidates ?? []).filter((candidate) => candidate.enabled !== false)
}

function manualDecision(baseConfig: ProviderConfig, policy?: RoutingPolicy): RoutingDecision {
  const candidate = policy?.candidates?.find((item) => item.enabled !== false) ?? {
    id: 'manual',
    config: baseConfig,
  }
  return {
    config: candidate.config,
    mode: 'manual',
    attempts: [attemptFor(candidate, 'selected', 'manual')],
  }
}

function fallbackDecision(baseConfig: ProviderConfig, policy: RoutingPolicy): RoutingDecision {
  const candidates = enabledCandidates(policy)
  if (candidates.length === 0) {
    throw new RoutingPolicyError('fallback_chain requires at least one enabled candidate')
  }

  return {
    config: candidates[0].config,
    mode: 'fallback_chain',
    attempts: candidates.map((candidate, index) =>
      attemptFor(candidate, index === 0 ? 'selected' : 'skipped', index === 0 ? 'first_candidate' : 'fallback_candidate')
    ),
  }
}

function localFirstDecision(baseConfig: ProviderConfig, policy: RoutingPolicy): RoutingDecision {
  const candidates = enabledCandidates(policy)
  if (candidates.length === 0) return manualDecision(baseConfig)

  const selected =
    candidates.find((candidate) => candidate.config.authMode === 'none_local') ?? candidates[0]

  return {
    config: selected.config,
    mode: 'local_first',
    attempts: candidates.map((candidate) =>
      attemptFor(
        candidate,
        candidate.id === selected.id ? 'selected' : 'skipped',
        candidate.id === selected.id ? 'local_first_selected' : 'not_local_first'
      )
    ),
  }
}

function budgetGuardedManualDecision(baseConfig: ProviderConfig, policy: RoutingPolicy): RoutingDecision {
  const decision = manualDecision(baseConfig, { ...policy, mode: 'manual' })
  const selected = policy.candidates?.find((candidate) => candidate.config === decision.config)
  const remaining = policy.budget?.remainingUsd

  if (
    typeof remaining === 'number' &&
    selected?.estimatedCostUsd !== undefined &&
    selected.estimatedCostUsd > remaining
  ) {
    return {
      ...decision,
      mode: 'budget_guarded_manual',
      attempts: [
        attemptFor(
          selected,
          'blocked',
          `estimated_cost_exceeds_budget:${selected.estimatedCostUsd}>${remaining}`
        ),
      ],
    }
  }

  return {
    ...decision,
    mode: 'budget_guarded_manual',
  }
}

export function evaluateRoutingPolicy(
  baseConfig: ProviderConfig,
  policy?: RoutingPolicy
): RoutingDecision {
  if (!policy) return manualDecision(baseConfig)

  const mode = assertRouterRoutingPolicyMode(policy.mode)
  if (mode === 'manual') return manualDecision(baseConfig, policy)
  if (mode === 'fallback_chain') return fallbackDecision(baseConfig, policy)
  if (mode === 'local_first') return localFirstDecision(baseConfig, policy)
  if (mode === 'budget_guarded_manual') return budgetGuardedManualDecision(baseConfig, policy)

  const _exhaustive: never = mode
  throw new RoutingPolicyError(`Unsupported routing policy mode: ${_exhaustive}`)
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function isProviderConfig(value: unknown): value is ProviderConfig {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as ProviderConfig).provider === 'string' &&
      typeof (value as ProviderConfig).model === 'string'
  )
}

function parseCandidates(rules: Record<string, unknown>): RoutingCandidate[] | undefined {
  if (!Array.isArray(rules.candidates)) return undefined
  return rules.candidates.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return []
    const raw = candidate as Record<string, unknown>
    if (!isProviderConfig(raw.config)) return []
    return [
      {
        id: typeof raw.id === 'string' ? raw.id : `candidate-${index + 1}`,
        config: raw.config,
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : undefined,
        estimatedCostUsd:
          typeof raw.estimatedCostUsd === 'number' && Number.isFinite(raw.estimatedCostUsd)
            ? raw.estimatedCostUsd
            : undefined,
      },
    ]
  })
}

function parseBudget(budget: Record<string, unknown>): RoutingPolicy['budget'] | undefined {
  if (typeof budget.remainingUsd === 'number' && Number.isFinite(budget.remainingUsd)) {
    return { remainingUsd: budget.remainingUsd }
  }
  return undefined
}

export function loadRoutingPolicy(
  policyId: string,
  db: Database.Database = getDb()
): RoutingPolicy | undefined {
  const row = db.prepare(`
    SELECT id, mode, rules_json, budget_json
    FROM llm_routing_policies
    WHERE id = ? AND enabled = 1
  `).get(policyId) as StoredRoutingPolicyRow | undefined

  if (!row) return undefined

  const rules = parseJsonObject(row.rules_json)
  const budget = parseJsonObject(row.budget_json)
  return {
    id: row.id,
    mode: assertRouterRoutingPolicyMode(row.mode),
    candidates: parseCandidates(rules),
    budget: parseBudget(budget),
  }
}
