import type Database from 'better-sqlite3'
import { getDb } from '../../db/client'

export const usageCostLabels = {
  actual_cost_usd: 'provider_or_gateway_reported_actual_cost',
  estimated_cost_usd: 'locally_estimated_cost',
} as const

export type UsageBudgetStatus =
  | 'not_configured'
  | 'within_budget'
  | 'over_budget'
  | 'estimated_over_budget'
  | 'unknown'

export interface UsageSummaryMetrics {
  request_count: number
  succeeded_count: number
  failed_count: number
  started_count: number
  input_tokens: number
  output_tokens: number
  cached_input_tokens: number
  reasoning_tokens: number
  total_tokens: number
  latency_ms: number
  average_latency_ms: number | null
  actual_cost_usd: number
  estimated_cost_usd: number
}

export type ProviderUsageSummary = UsageSummaryMetrics & {
  provider_id: string
}

export type ModelUsageSummary = UsageSummaryMetrics & {
  provider_id: string
  model_id: string | null
}

export type OperationUsageSummary = UsageSummaryMetrics & {
  operation: string
}

export type AuthModeUsageSummary = UsageSummaryMetrics & {
  auth_mode: string
}

export type RouteBackendUsageSummary = UsageSummaryMetrics & {
  route_backend: string
}

export type RoutingPolicyUsageSummary = UsageSummaryMetrics & {
  routing_policy_id: string | null
}

export interface RoutingPolicyBudgetSummary {
  routing_policy_id: string
  policy_name: string
  policy_mode: string
  enabled: boolean
  request_count: number
  actual_cost_usd: number
  estimated_cost_usd: number
  budget_configured: boolean
  budget_remaining_usd: number | null
  budget_limit_usd: number | null
  budget_status: UsageBudgetStatus
}

export interface UsageSummaryResponse {
  available: boolean
  summary: UsageSummaryMetrics
  byProvider: ProviderUsageSummary[]
  byModel: ModelUsageSummary[]
  byOperation: OperationUsageSummary[]
  byAuthMode: AuthModeUsageSummary[]
  byRouteBackend: RouteBackendUsageSummary[]
  byRoutingPolicy: RoutingPolicyUsageSummary[]
  budgetPolicies: RoutingPolicyBudgetSummary[]
  costLabels: typeof usageCostLabels
  generatedAt: string
  message?: string
}

type MetricRow = {
  request_count: number | null
  succeeded_count: number | null
  failed_count: number | null
  started_count: number | null
  input_tokens: number | null
  output_tokens: number | null
  cached_input_tokens: number | null
  reasoning_tokens: number | null
  total_tokens: number | null
  latency_ms: number | null
  average_latency_ms: number | null
  actual_cost_usd: number | null
  estimated_cost_usd: number | null
}

type BudgetPolicyRow = {
  routing_policy_id: string
  policy_name: string
  policy_mode: string
  enabled: number
  budget_json: string | null
  request_count: number | null
  actual_cost_usd: number | null
  estimated_cost_usd: number | null
}

const metricsSql = `
  COUNT(*) AS request_count,
  SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) AS succeeded_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
  SUM(CASE WHEN status = 'started' THEN 1 ELSE 0 END) AS started_count,
  SUM(COALESCE(input_tokens, 0)) AS input_tokens,
  SUM(COALESCE(output_tokens, 0)) AS output_tokens,
  SUM(COALESCE(cached_input_tokens, 0)) AS cached_input_tokens,
  SUM(COALESCE(reasoning_tokens, 0)) AS reasoning_tokens,
  SUM(
    COALESCE(input_tokens, 0) +
    COALESCE(output_tokens, 0) +
    COALESCE(cached_input_tokens, 0) +
    COALESCE(reasoning_tokens, 0)
  ) AS total_tokens,
  SUM(COALESCE(latency_ms, 0)) AS latency_ms,
  AVG(latency_ms) AS average_latency_ms,
  SUM(COALESCE(actual_cost_usd, 0)) AS actual_cost_usd,
  SUM(COALESCE(estimated_cost_usd, 0)) AS estimated_cost_usd
`

export const emptyUsageMetrics: UsageSummaryMetrics = {
  request_count: 0,
  succeeded_count: 0,
  failed_count: 0,
  started_count: 0,
  input_tokens: 0,
  output_tokens: 0,
  cached_input_tokens: 0,
  reasoning_tokens: 0,
  total_tokens: 0,
  latency_ms: 0,
  average_latency_ms: null,
  actual_cost_usd: 0,
  estimated_cost_usd: 0,
}

function numberOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeMetrics<T extends MetricRow>(row: T | undefined): UsageSummaryMetrics {
  if (!row) return { ...emptyUsageMetrics }

  return {
    request_count: numberOrZero(row.request_count),
    succeeded_count: numberOrZero(row.succeeded_count),
    failed_count: numberOrZero(row.failed_count),
    started_count: numberOrZero(row.started_count),
    input_tokens: numberOrZero(row.input_tokens),
    output_tokens: numberOrZero(row.output_tokens),
    cached_input_tokens: numberOrZero(row.cached_input_tokens),
    reasoning_tokens: numberOrZero(row.reasoning_tokens),
    total_tokens: numberOrZero(row.total_tokens),
    latency_ms: numberOrZero(row.latency_ms),
    average_latency_ms: numberOrNull(row.average_latency_ms),
    actual_cost_usd: numberOrZero(row.actual_cost_usd),
    estimated_cost_usd: numberOrZero(row.estimated_cost_usd),
  }
}

function queryAll<T>(db: Database.Database, sql: string): T[] {
  const statement = db.prepare(sql)
  if (typeof statement.all !== 'function') return []
  return statement.all() as T[]
}

function parseJsonObject(value: string | null): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function firstFiniteNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function budgetStatus({
  budgetConfigured,
  remainingUsd,
  limitUsd,
  actualCostUsd,
  estimatedCostUsd,
}: {
  budgetConfigured: boolean
  remainingUsd: number | null
  limitUsd: number | null
  actualCostUsd: number
  estimatedCostUsd: number
}): UsageBudgetStatus {
  if (!budgetConfigured) return 'not_configured'
  if (remainingUsd !== null) return remainingUsd < 0 ? 'over_budget' : 'within_budget'
  if (limitUsd !== null) {
    if (actualCostUsd > limitUsd) return 'over_budget'
    if (actualCostUsd === 0 && estimatedCostUsd > limitUsd) return 'estimated_over_budget'
    return 'within_budget'
  }
  return 'unknown'
}

function normalizeBudgetPolicy(row: BudgetPolicyRow): RoutingPolicyBudgetSummary {
  const budget = parseJsonObject(row.budget_json)
  const remainingUsd = firstFiniteNumber(budget, ['remainingUsd', 'remaining_usd'])
  const limitUsd = firstFiniteNumber(budget, [
    'limitUsd',
    'limit_usd',
    'monthlyLimitUsd',
    'monthly_limit_usd',
    'monthlyBudgetUsd',
    'monthly_budget_usd',
  ])
  const budgetConfigured = Object.keys(budget).length > 0
  const actualCostUsd = numberOrZero(row.actual_cost_usd)
  const estimatedCostUsd = numberOrZero(row.estimated_cost_usd)

  return {
    routing_policy_id: row.routing_policy_id,
    policy_name: row.policy_name,
    policy_mode: row.policy_mode,
    enabled: row.enabled === 1,
    request_count: numberOrZero(row.request_count),
    actual_cost_usd: actualCostUsd,
    estimated_cost_usd: estimatedCostUsd,
    budget_configured: budgetConfigured,
    budget_remaining_usd: remainingUsd,
    budget_limit_usd: limitUsd,
    budget_status: budgetStatus({
      budgetConfigured,
      remainingUsd,
      limitUsd,
      actualCostUsd,
      estimatedCostUsd,
    }),
  }
}

export function createUnavailableUsageSummary(message: string): UsageSummaryResponse {
  return {
    available: false,
    summary: { ...emptyUsageMetrics },
    byProvider: [],
    byModel: [],
    byOperation: [],
    byAuthMode: [],
    byRouteBackend: [],
    byRoutingPolicy: [],
    budgetPolicies: [],
    costLabels: usageCostLabels,
    generatedAt: new Date().toISOString(),
    message,
  }
}

export function getUsageSummary(db: Database.Database = getDb()): UsageSummaryResponse {
  const summary = normalizeMetrics(
    db.prepare(`
      SELECT
        ${metricsSql}
      FROM llm_requests
    `).get() as MetricRow | undefined
  )

  const byProvider = queryAll<MetricRow & { provider_id: string }>(
    db,
    `
      SELECT
        provider_id,
        ${metricsSql}
      FROM llm_requests
      GROUP BY provider_id
      ORDER BY request_count DESC, provider_id ASC
    `
  ).map((row) => ({ provider_id: row.provider_id, ...normalizeMetrics(row) }))

  const byModel = queryAll<MetricRow & { provider_id: string; model_id: string | null }>(
    db,
    `
      SELECT
        provider_id,
        model_id,
        ${metricsSql}
      FROM llm_requests
      GROUP BY provider_id, model_id
      ORDER BY request_count DESC, provider_id ASC, model_id ASC
    `
  ).map((row) => ({
    provider_id: row.provider_id,
    model_id: row.model_id,
    ...normalizeMetrics(row),
  }))

  const byOperation = queryAll<MetricRow & { operation: string }>(
    db,
    `
      SELECT
        operation,
        ${metricsSql}
      FROM llm_requests
      GROUP BY operation
      ORDER BY request_count DESC, operation ASC
    `
  ).map((row) => ({ operation: row.operation, ...normalizeMetrics(row) }))

  const byAuthMode = queryAll<MetricRow & { auth_mode: string }>(
    db,
    `
      SELECT
        auth_mode,
        ${metricsSql}
      FROM llm_requests
      GROUP BY auth_mode
      ORDER BY request_count DESC, auth_mode ASC
    `
  ).map((row) => ({ auth_mode: row.auth_mode, ...normalizeMetrics(row) }))

  const byRouteBackend = queryAll<MetricRow & { route_backend: string }>(
    db,
    `
      SELECT
        route_backend,
        ${metricsSql}
      FROM llm_requests
      GROUP BY route_backend
      ORDER BY request_count DESC, route_backend ASC
    `
  ).map((row) => ({ route_backend: row.route_backend, ...normalizeMetrics(row) }))

  const byRoutingPolicy = queryAll<MetricRow & { routing_policy_id: string | null }>(
    db,
    `
      SELECT
        routing_policy_id,
        ${metricsSql}
      FROM llm_requests
      GROUP BY routing_policy_id
      ORDER BY request_count DESC, routing_policy_id ASC
    `
  ).map((row) => ({
    routing_policy_id: row.routing_policy_id,
    ...normalizeMetrics(row),
  }))

  const budgetPolicies = queryAll<BudgetPolicyRow>(
    db,
    `
      SELECT
        policies.id AS routing_policy_id,
        policies.name AS policy_name,
        policies.mode AS policy_mode,
        policies.enabled AS enabled,
        policies.budget_json AS budget_json,
        COUNT(requests.id) AS request_count,
        SUM(COALESCE(requests.actual_cost_usd, 0)) AS actual_cost_usd,
        SUM(COALESCE(requests.estimated_cost_usd, 0)) AS estimated_cost_usd
      FROM llm_routing_policies policies
      LEFT JOIN llm_requests requests ON requests.routing_policy_id = policies.id
      GROUP BY policies.id, policies.name, policies.mode, policies.enabled, policies.budget_json
      ORDER BY request_count DESC, policies.id ASC
    `
  ).map(normalizeBudgetPolicy)

  return {
    available: true,
    summary,
    byProvider,
    byModel,
    byOperation,
    byAuthMode,
    byRouteBackend,
    byRoutingPolicy,
    budgetPolicies,
    costLabels: usageCostLabels,
    generatedAt: new Date().toISOString(),
  }
}
