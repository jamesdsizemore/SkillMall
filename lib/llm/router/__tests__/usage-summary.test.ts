import { afterEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  createUnavailableUsageSummary,
  getUsageSummary,
  usageCostLabels,
} from '../usage-summary'

const phase1MigrationPath = path.join(process.cwd(), 'db/migrations/006_llm_router_core.sql')
const phase2MigrationPath = path.join(process.cwd(), 'db/migrations/007_llm_router_phase2.sql')
const phase1MigrationSql = fs.readFileSync(phase1MigrationPath, 'utf-8')
const phase2MigrationSql = fs.readFileSync(phase2MigrationPath, 'utf-8')
const tempDbs: Array<{ db: Database.Database; file: string }> = []

function createRouterDb(): Database.Database {
  const file = path.join(os.tmpdir(), `skillmall-usage-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  tempDbs.push({ db, file })
  return db
}

function insertPolicy(db: Database.Database) {
  db.prepare(`
    INSERT INTO llm_routing_policies (
      id,
      name,
      mode,
      budget_json
    ) VALUES (?, ?, ?, ?)
  `).run(
    'policy-budget',
    'Budget guarded OpenAI',
    'budget_guarded_manual',
    JSON.stringify({ remainingUsd: 7.5, monthlyBudgetUsd: 20 })
  )
}

function insertRequest(db: Database.Database, overrides: Record<string, unknown>) {
  db.prepare(`
    INSERT INTO llm_requests (
      id,
      operation,
      provider_id,
      model_id,
      route_backend,
      auth_mode,
      routing_policy_id,
      status,
      started_at,
      completed_at,
      latency_ms,
      input_tokens,
      output_tokens,
      cached_input_tokens,
      reasoning_tokens,
      estimated_cost_usd,
      actual_cost_usd,
      cost_source
    ) VALUES (
      @id,
      @operation,
      @providerId,
      @modelId,
      @routeBackend,
      @authMode,
      @routingPolicyId,
      @status,
      @startedAt,
      @completedAt,
      @latencyMs,
      @inputTokens,
      @outputTokens,
      @cachedInputTokens,
      @reasoningTokens,
      @estimatedCostUsd,
      @actualCostUsd,
      @costSource
    )
  `).run({
    id: 'request-1',
    operation: 'skill.preview',
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    routeBackend: 'direct',
    authMode: 'env_key',
    routingPolicyId: null,
    status: 'succeeded',
    startedAt: '2026-05-20T10:00:00.000Z',
    completedAt: '2026-05-20T10:00:01.000Z',
    latencyMs: 1000,
    inputTokens: 10,
    outputTokens: 20,
    cachedInputTokens: 2,
    reasoningTokens: 3,
    estimatedCostUsd: null,
    actualCostUsd: 0.05,
    costSource: 'gateway',
    ...overrides,
  })
}

afterEach(() => {
  while (tempDbs.length > 0) {
    const entry = tempDbs.pop()
    if (!entry) continue
    entry.db.close()
    for (const suffix of ['', '-shm', '-wal']) {
      try {
        fs.unlinkSync(entry.file + suffix)
      } catch {}
    }
  }
})

describe('usage summary helpers', () => {
  it('groups usage by provider, model, and operation with distinct actual and estimated cost labels', () => {
    const db = createRouterDb()
    insertPolicy(db)
    insertRequest(db, {
      id: 'request-openai-success',
      routingPolicyId: 'policy-budget',
      actualCostUsd: 0.05,
      estimatedCostUsd: null,
    })
    insertRequest(db, {
      id: 'request-openai-failure',
      operation: 'skill.preview',
      status: 'failed',
      latencyMs: 500,
      inputTokens: 6,
      outputTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 1,
      actualCostUsd: null,
      estimatedCostUsd: 0.01,
      routingPolicyId: 'policy-budget',
    })
    insertRequest(db, {
      id: 'request-anthropic-generate',
      operation: 'skill.generate',
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4',
      routeBackend: 'bifrost_local',
      authMode: 'gateway_virtual_key',
      inputTokens: 40,
      outputTokens: 80,
      cachedInputTokens: 5,
      reasoningTokens: 7,
      latencyMs: 2500,
      actualCostUsd: null,
      estimatedCostUsd: 0.2,
      routingPolicyId: null,
    })

    const usage = getUsageSummary(db)

    expect(usage.available).toBe(true)
    expect(usage.costLabels).toBe(usageCostLabels)
    expect(usage.costLabels).toEqual({
      actual_cost_usd: 'provider_or_gateway_reported_actual_cost',
      estimated_cost_usd: 'locally_estimated_cost',
    })
    expect(usage.summary).toMatchObject({
      request_count: 3,
      succeeded_count: 2,
      failed_count: 1,
      input_tokens: 56,
      output_tokens: 100,
      cached_input_tokens: 7,
      reasoning_tokens: 11,
      total_tokens: 174,
      actual_cost_usd: 0.05,
      latency_ms: 4000,
      average_latency_ms: 1333.3333333333333,
    })
    expect(usage.summary.estimated_cost_usd).toBeCloseTo(0.21)

    expect(usage.byProvider.find((row) => row.provider_id === 'openai')).toMatchObject({
      provider_id: 'openai',
      request_count: 2,
      failed_count: 1,
      actual_cost_usd: 0.05,
      estimated_cost_usd: 0.01,
    })
    expect(usage.byModel.find((row) => row.model_id === 'claude-sonnet-4')).toMatchObject({
      provider_id: 'anthropic',
      model_id: 'claude-sonnet-4',
      request_count: 1,
      input_tokens: 40,
      output_tokens: 80,
    })
    expect(usage.byOperation.find((row) => row.operation === 'skill.preview')).toMatchObject({
      operation: 'skill.preview',
      request_count: 2,
      failed_count: 1,
    })
  })

  it('surfaces auth mode, route backend, routing policy, and configured budget status', () => {
    const db = createRouterDb()
    insertPolicy(db)
    insertRequest(db, {
      id: 'request-budgeted',
      routeBackend: 'bifrost_local',
      authMode: 'gateway_virtual_key',
      routingPolicyId: 'policy-budget',
      actualCostUsd: 0.5,
      estimatedCostUsd: 0.25,
    })

    const usage = getUsageSummary(db)

    expect(usage.byAuthMode).toEqual([
      expect.objectContaining({
        auth_mode: 'gateway_virtual_key',
        request_count: 1,
      }),
    ])
    expect(usage.byRouteBackend).toEqual([
      expect.objectContaining({
        route_backend: 'bifrost_local',
        request_count: 1,
      }),
    ])
    expect(usage.byRoutingPolicy).toEqual([
      expect.objectContaining({
        routing_policy_id: 'policy-budget',
        request_count: 1,
      }),
    ])
    expect(usage.budgetPolicies).toEqual([
      expect.objectContaining({
        routing_policy_id: 'policy-budget',
        policy_mode: 'budget_guarded_manual',
        budget_configured: true,
        budget_remaining_usd: 7.5,
        budget_limit_usd: 20,
        budget_status: 'within_budget',
        actual_cost_usd: 0.5,
        estimated_cost_usd: 0.25,
      }),
    ])
  })

  it('returns empty metrics for an empty ledger', () => {
    const db = createRouterDb()
    const usage = getUsageSummary(db)

    expect(usage.available).toBe(true)
    expect(usage.summary).toMatchObject({
      request_count: 0,
      succeeded_count: 0,
      failed_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      actual_cost_usd: 0,
      estimated_cost_usd: 0,
      average_latency_ms: null,
    })
    expect(usage.byProvider).toEqual([])
    expect(usage.byModel).toEqual([])
    expect(usage.byOperation).toEqual([])
  })

  it('builds an unavailable response without losing cost labels', () => {
    const usage = createUnavailableUsageSummary('Usage ledger is unavailable in this environment.')

    expect(usage).toMatchObject({
      available: false,
      message: 'Usage ledger is unavailable in this environment.',
      summary: {
        request_count: 0,
        actual_cost_usd: 0,
        estimated_cost_usd: 0,
      },
      costLabels: {
        actual_cost_usd: 'provider_or_gateway_reported_actual_cost',
        estimated_cost_usd: 'locally_estimated_cost',
      },
    })
  })
})
