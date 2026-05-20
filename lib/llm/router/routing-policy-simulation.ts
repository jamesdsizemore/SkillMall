import type { ProviderConfig } from '../../providers/types'
import { evaluateRoutingPolicy, type RoutingCandidate, type RoutingDecision, type RoutingPolicy } from './routing-policy'
import type { RoutingPolicyRecord } from './routing-policy-store'
import { evaluateRouteEligibility, type RouteEligibilityResult, type RouteOperation } from './route-eligibility'
import type Database from 'better-sqlite3'

export interface RoutingPolicySimulationInput {
  baseConfig: ProviderConfig
  policy: RoutingPolicy | RoutingPolicyRecord
  estimatedCostUsd?: number
  operation?: RouteOperation
  requirePricing?: boolean
  db?: Database.Database
  now?: () => Date
}

export interface RoutingPolicySimulationResult {
  simulation: true
  providerRequestSent: false
  promptStored: false
  responseStored: false
  policyId: string
  mode: RoutingDecision['mode']
  selected: {
    candidateId: string
    providerId: string
    modelId: string
    routeBackend: string
  } | null
  blocked: boolean
  attempts: RoutingDecision['attempts']
  eligibility: RouteEligibilityResult[]
  estimatedCostUsd: number | null
}

function isRecordPolicy(policy: RoutingPolicy | RoutingPolicyRecord): policy is RoutingPolicyRecord {
  return 'rules' in policy
}

function candidatesForSimulation(
  policy: RoutingPolicy | RoutingPolicyRecord,
  estimatedCostUsd: number | undefined
): RoutingCandidate[] | undefined {
  const candidates = isRecordPolicy(policy) ? policy.rules.candidates : policy.candidates
  if (estimatedCostUsd === undefined) return candidates
  return candidates?.map((candidate) => ({
    ...candidate,
    estimatedCostUsd: candidate.estimatedCostUsd ?? estimatedCostUsd,
  }))
}

export function simulateRoutingPolicyDecision(input: RoutingPolicySimulationInput): RoutingPolicySimulationResult {
  const policy: RoutingPolicy = {
    id: input.policy.id,
    mode: input.policy.mode,
    candidates: candidatesForSimulation(input.policy, input.estimatedCostUsd),
    budget: isRecordPolicy(input.policy) ? input.policy.budget : input.policy.budget,
  }
  const decision = evaluateRoutingPolicy(input.baseConfig, policy)
  const selectedAttempt = decision.attempts.find((attempt) => attempt.status === 'selected') ?? null
  const eligibility = (policy.candidates ?? []).map((candidate) =>
    evaluateRouteEligibility({
      candidate,
      operation: input.operation,
      requirePricing: input.requirePricing,
      db: input.db,
      now: input.now,
    })
  )
  const selectedEligibility = eligibility.find((item) => item.candidateId === selectedAttempt?.candidateId)
  const selectedBlocked = selectedEligibility
    ? selectedEligibility.capabilityStatus !== 'eligible' ||
      (input.requirePricing === true && selectedEligibility.pricingStatus !== 'available')
    : false
  const blocked = decision.attempts.some((attempt) => attempt.status === 'blocked') || selectedBlocked
  const attempts = selectedBlocked && selectedAttempt
    ? decision.attempts.map((attempt) =>
        attempt.candidateId === selectedAttempt.candidateId
          ? {
              ...attempt,
              status: 'blocked' as const,
              reason: selectedEligibility?.blockerCodes.length
                ? `route_eligibility_blocked:${selectedEligibility.blockerCodes.join(',')}`
                : 'route_eligibility_blocked',
            }
          : attempt
      )
    : decision.attempts

  return {
    simulation: true,
    providerRequestSent: false,
    promptStored: false,
    responseStored: false,
    policyId: policy.id,
    mode: decision.mode,
    selected: selectedAttempt && !selectedBlocked
      ? {
          candidateId: selectedAttempt.candidateId,
          providerId: selectedAttempt.providerId,
          modelId: selectedAttempt.modelId,
          routeBackend: selectedAttempt.routeBackend,
        }
      : null,
    blocked,
    attempts,
    eligibility,
    estimatedCostUsd: input.estimatedCostUsd ?? null,
  }
}
