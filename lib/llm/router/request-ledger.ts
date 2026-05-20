import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { getDb } from '../../db/client'
import {
  assertRouterAuthMode,
  assertRouterGatewayBackend,
} from './secret-refs'
import type {
  LLMRequestEventInput,
  LLMRequestFinishInput,
  LLMRequestStartInput,
} from './types'

const bodyMetadataKeys = new Set([
  'body',
  'completion',
  'content',
  'input',
  'messages',
  'output',
  'prompt',
  'prompts',
  'request',
  'request_body',
  'requestbody',
  'response',
  'response_body',
  'responsebody',
])

const secretMetadataPatterns = [
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /cookie/i,
  /browser[_-]?token/i,
  /credential/i,
  /raw[_-]?key/i,
  /secret/i,
  /session[_-]?cookie/i,
  /session[_-]?token/i,
  /token/i,
]

const secretMetadataValuePatterns = [
  /\bapi[_-]?key\s*[:=]\s*\S+/i,
  /\b(?:access[_-]?token|browser[_-]?token|session[_-]?token|token)\s*[:=]\s*\S+/i,
  /\b(?:authorization|bearer)\s+[-._~+/=a-z0-9]+\b/i,
  /\b(?:auth[_-]?cookie|browser[_-]?cookie|browser[_-]?session[_-]?cookie|session[_-]?cookie|cookie)\s*[:=]\s*\S+/i,
  /\bsk-[a-z0-9_-]{8,}\b/i,
  /(?:^|[~\s])(?:\/?[.\w-]+\/)*\.(?:codex|claude)\/[^\s]+/i,
  /\/Users\/[^\s]*(?:\.codex|\.claude|auth\.json|credentials?)[^\s]*/i,
]

function isSensitiveMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase()
  return bodyMetadataKeys.has(normalized) || secretMetadataPatterns.some((pattern) => pattern.test(normalized))
}

function isSensitiveMetadataValue(value: string): boolean {
  return secretMetadataValuePatterns.some((pattern) => pattern.test(value))
}

export interface LLMRequestStartResult {
  requestId: string
  startedAt: string
}

function scrubMetadata(value: unknown): unknown {
  if (typeof value === 'string') return isSensitiveMetadataValue(value) ? '[redacted]' : value
  if (Array.isArray(value)) return value.map(scrubMetadata)
  if (!value || typeof value !== 'object') return value

  const scrubbed: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isSensitiveMetadataKey(key)) continue
    scrubbed[key] = scrubMetadata(nestedValue)
  }
  return scrubbed
}

export function stringifyLedgerMetadata(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return '{}'
  return JSON.stringify(scrubMetadata(metadata))
}

function nowIso(): string {
  return new Date().toISOString()
}

function calculateLatencyMs(startedAt: string, completedAt: string): number | null {
  const started = Date.parse(startedAt)
  const completed = Date.parse(completedAt)
  if (Number.isNaN(started) || Number.isNaN(completed)) return null
  return Math.max(0, completed - started)
}

function tableHasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  return rows.some((row) => row.name === columnName)
}

export function startLLMRequest(
  input: LLMRequestStartInput,
  db: Database.Database = getDb()
): LLMRequestStartResult {
  const requestId = randomUUID()
  const startedAt = nowIso()
  const authMode = assertRouterAuthMode(input.authMode)
  const routeBackend = assertRouterGatewayBackend(input.routeBackend)

  if (tableHasColumn(db, 'llm_requests', 'provider_registry_id')) {
    db.prepare(`
      INSERT INTO llm_requests (
        id,
        operation,
        provider_id,
        provider_registry_id,
        execution_kind,
        model_id,
        route_backend,
        auth_mode,
        routing_policy_id,
        status,
        started_at,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'started', ?, ?)
    `).run(
      requestId,
      input.operation,
      input.providerId,
      input.providerRegistryId ?? input.providerId,
      input.executionKind ?? (routeBackend === 'bifrost_local' ? 'bifrost_local' : 'direct'),
      input.modelId ?? null,
      routeBackend,
      authMode,
      input.routingPolicyId ?? null,
      startedAt,
      stringifyLedgerMetadata(input.metadata)
    )
  } else {
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
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'started', ?, ?)
    `).run(
      requestId,
      input.operation,
      input.providerId,
      input.modelId ?? null,
      routeBackend,
      authMode,
      input.routingPolicyId ?? null,
      startedAt,
      stringifyLedgerMetadata(input.metadata)
    )
  }

  return { requestId, startedAt }
}

export function finishLLMRequest(
  input: LLMRequestFinishInput,
  db: Database.Database = getDb()
): void {
  const completedAt = nowIso()
  const existing = db
    .prepare('SELECT started_at FROM llm_requests WHERE id = ?')
    .get(input.requestId) as { started_at: string } | undefined

  const latencyMs = existing ? calculateLatencyMs(existing.started_at, completedAt) : null

  db.prepare(`
    UPDATE llm_requests
    SET
      status = ?,
      completed_at = ?,
      latency_ms = ?,
      input_tokens = ?,
      output_tokens = ?,
      cached_input_tokens = ?,
      reasoning_tokens = ?,
      estimated_cost_usd = ?,
      actual_cost_usd = ?,
      cost_source = ?,
      error_code = ?,
      metadata_json = ?
    WHERE id = ?
  `).run(
    input.status,
    completedAt,
    latencyMs,
    input.inputTokens ?? null,
    input.outputTokens ?? null,
    input.cachedInputTokens ?? null,
    input.reasoningTokens ?? null,
    input.estimatedCostUsd ?? null,
    input.actualCostUsd ?? null,
    input.costSource ?? null,
    input.errorCode ?? null,
    stringifyLedgerMetadata(input.metadata),
    input.requestId
  )
}

export function recordLLMRequestEvent(
  input: LLMRequestEventInput,
  db: Database.Database = getDb()
): void {
  if (tableHasColumn(db, 'llm_request_events', 'provider_registry_id')) {
    db.prepare(`
      INSERT INTO llm_request_events (
        request_id,
        event_type,
        provider_id,
        provider_registry_id,
        execution_kind,
        model_id,
        message,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.requestId,
      input.eventType,
      input.providerId ?? null,
      input.providerRegistryId ?? input.providerId ?? null,
      input.executionKind ?? null,
      input.modelId ?? null,
      input.message ?? null,
      stringifyLedgerMetadata(input.metadata)
    )
    return
  }

  db.prepare(`
    INSERT INTO llm_request_events (
      request_id,
      event_type,
      provider_id,
      model_id,
      message,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.requestId,
    input.eventType,
    input.providerId ?? null,
    input.modelId ?? null,
    input.message ?? null,
    stringifyLedgerMetadata(input.metadata)
  )
}
