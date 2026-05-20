import type Database from 'better-sqlite3'
import { getDb } from '../../db/client'
import type { ProviderConfig, ProviderID, ProviderRegistryID } from '../../providers/types'
import { getProviderRegistryEntry } from '../../providers/registry'
import {
  assertRouterAuthMode,
  assertRouterGatewayBackend,
  assertRouterRoutingPolicyMode,
  sanitizeSecretRef,
  validateSecretRefForAuthMode,
} from './secret-refs'
import type { LLMAuthMode, RoutingPolicyMode } from './types'

const providerIds = new Set<ProviderID>(['openai', 'anthropic', 'claude-code', 'gemini', 'groq', 'ollama'])
const policyIdPattern = /^[a-z0-9][a-z0-9._-]{1,80}$/
export const FORBIDDEN_ROUTING_POLICY_FIELD_NAMES = new Set([
  'apiKey',
  'api_key',
  'rawKey',
  'raw_key',
  'key',
  'token',
  'accessToken',
  'access_token',
  'authToken',
  'auth_token',
  'oauthToken',
  'oauth_token',
  'sessionToken',
  'session_token',
  'browserSessionToken',
  'browser_session_token',
  'browserToken',
  'browser_token',
  'credential',
  'credentials',
  'credentialPath',
  'credential_path',
  'credentialsPath',
  'credentials_path',
  'credentialFile',
  'credential_file',
  'credentialFilePath',
  'credential_file_path',
  'prompt',
  'prompts',
  'systemPrompt',
  'userPrompt',
  'messages',
  'response',
  'responses',
  'completion',
  'output',
])

export class RoutingPolicyStoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoutingPolicyStoreError'
  }
}

export interface RoutingPolicyCandidateInput {
  id: string
  config: ProviderConfig
  enabled?: boolean
  estimatedCostUsd?: number
}

export interface RoutingPolicyRules {
  candidates?: RoutingPolicyCandidateInput[]
}

export interface RoutingPolicyBudget {
  remainingUsd?: number
  limitUsd?: number
}

export interface RoutingPolicyWriteInput {
  id: string
  name: string
  mode: RoutingPolicyMode | string
  rules?: unknown
  budget?: unknown
  enabled?: boolean
}

export interface RoutingPolicyRecord {
  id: string
  name: string
  mode: RoutingPolicyMode
  rules: RoutingPolicyRules
  budget: RoutingPolicyBudget
  enabled: boolean
  createdAt: string
  updatedAt: string
}

type RoutingPolicyRow = {
  id: string
  name: string
  mode: string
  rules_json: string
  budget_json: string
  enabled: number
  created_at: string
  updated_at: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    return isObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function findForbiddenRoutingPolicyFields(value: unknown, prefix = 'policy'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenRoutingPolicyFields(item, `${prefix}[${index}]`))
  }
  if (!isObject(value)) return []

  return Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const nestedMatches = findForbiddenRoutingPolicyFields(nested, path)
    return FORBIDDEN_ROUTING_POLICY_FIELD_NAMES.has(key) ? [path, ...nestedMatches] : nestedMatches
  })
}

function rejectForbiddenFields(value: unknown, prefix = 'policy'): void {
  const rejectedFields = findForbiddenRoutingPolicyFields(value, prefix)
  if (rejectedFields.length > 0) {
    throw new RoutingPolicyStoreError(`Routing policy field is not allowed: ${rejectedFields[0]}`)
  }
}

function normalizeId(id: unknown): string {
  if (typeof id !== 'string' || !policyIdPattern.test(id.trim())) {
    throw new RoutingPolicyStoreError('Routing policy id must be 2-81 lowercase letters, numbers, dots, underscores, or hyphens')
  }
  return id.trim()
}

function normalizeName(name: unknown): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new RoutingPolicyStoreError('Routing policy name is required')
  }
  return name.trim().slice(0, 120)
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeProviderConfig(value: unknown): ProviderConfig {
  if (!isObject(value)) throw new RoutingPolicyStoreError('Routing policy candidate config is required')
  rejectForbiddenFields(value, 'candidate.config')

  const provider = value.provider
  if (typeof provider !== 'string' || !providerIds.has(provider as ProviderID)) {
    throw new RoutingPolicyStoreError(`Unsupported routing policy provider: ${String(provider)}`)
  }

  const model = value.model
  if (typeof model !== 'string' || model.trim().length === 0) {
    throw new RoutingPolicyStoreError('Routing policy candidate model is required')
  }

  const authMode = value.authMode === undefined ? undefined : assertRouterAuthMode(value.authMode)
  const gatewayBackend = assertRouterGatewayBackend(value.gatewayBackend)
  const secretRef = value.secretRef === undefined ? undefined : sanitizeSecretRef(value.secretRef)
  if (authMode) validateSecretRefForAuthMode(authMode, secretRef)

  const providerRegistryId =
    typeof value.providerRegistryId === 'string' && getProviderRegistryEntry(value.providerRegistryId as ProviderRegistryID)
      ? (value.providerRegistryId as ProviderRegistryID)
      : undefined

  return {
    provider: provider as ProviderID,
    providerRegistryId,
    executionKind: typeof value.executionKind === 'string' ? value.executionKind as ProviderConfig['executionKind'] : undefined,
    model: model.trim(),
    authMode: authMode as LLMAuthMode | undefined,
    secretRef,
    gatewayBackend,
    baseURL: typeof value.baseURL === 'string' && value.baseURL.trim().length > 0 ? value.baseURL.trim() : undefined,
  }
}

export function normalizeRoutingPolicyRules(value: unknown): RoutingPolicyRules {
  if (value === undefined || value === null || value === '') return {}
  if (!isObject(value)) throw new RoutingPolicyStoreError('Routing policy rules must be an object')
  rejectForbiddenFields(value)

  if (!Array.isArray(value.candidates)) return {}
  return {
    candidates: value.candidates.flatMap((candidate, index) => {
      if (!isObject(candidate)) return []
      const config = normalizeProviderConfig(candidate.config)
      return [
        {
          id: typeof candidate.id === 'string' && candidate.id.trim().length > 0
            ? candidate.id.trim()
            : `candidate-${index + 1}`,
          config,
          enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : undefined,
          estimatedCostUsd: finiteNumber(candidate.estimatedCostUsd),
        },
      ]
    }),
  }
}

export function normalizeRoutingPolicyBudget(value: unknown): RoutingPolicyBudget {
  if (value === undefined || value === null || value === '') return {}
  if (!isObject(value)) throw new RoutingPolicyStoreError('Routing policy budget must be an object')
  rejectForbiddenFields(value)

  const remainingUsd = finiteNumber(value.remainingUsd) ?? finiteNumber(value.remaining_usd)
  const limitUsd =
    finiteNumber(value.limitUsd) ??
    finiteNumber(value.limit_usd) ??
    finiteNumber(value.monthlyBudgetUsd) ??
    finiteNumber(value.monthly_budget_usd)

  return {
    ...(remainingUsd !== undefined ? { remainingUsd } : {}),
    ...(limitUsd !== undefined ? { limitUsd } : {}),
  }
}

export function normalizeRoutingPolicyDraft(input: RoutingPolicyWriteInput): RoutingPolicyRecord {
  return {
    id: normalizeId(input.id),
    name: normalizeName(input.name),
    mode: assertRouterRoutingPolicyMode(input.mode),
    rules: normalizeRoutingPolicyRules(input.rules),
    budget: normalizeRoutingPolicyBudget(input.budget),
    enabled: input.enabled !== false,
    createdAt: '',
    updatedAt: '',
  }
}

function rowToRecord(row: RoutingPolicyRow): RoutingPolicyRecord {
  return {
    id: row.id,
    name: row.name,
    mode: assertRouterRoutingPolicyMode(row.mode),
    rules: normalizeRoutingPolicyRules(parseJsonObject(row.rules_json)),
    budget: normalizeRoutingPolicyBudget(parseJsonObject(row.budget_json)),
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listRoutingPolicies(db: Database.Database = getDb()): RoutingPolicyRecord[] {
  const rows = db.prepare(`
    SELECT id, name, mode, rules_json, budget_json, enabled, created_at, updated_at
    FROM llm_routing_policies
    ORDER BY enabled DESC, name ASC, id ASC
  `).all() as RoutingPolicyRow[]
  return rows.map(rowToRecord)
}

export function getRoutingPolicyRecord(
  id: string,
  db: Database.Database = getDb()
): RoutingPolicyRecord | undefined {
  const row = db.prepare(`
    SELECT id, name, mode, rules_json, budget_json, enabled, created_at, updated_at
    FROM llm_routing_policies
    WHERE id = ?
  `).get(id) as RoutingPolicyRow | undefined
  return row ? rowToRecord(row) : undefined
}

export function upsertRoutingPolicy(
  input: RoutingPolicyWriteInput,
  db: Database.Database = getDb()
): RoutingPolicyRecord {
  const draft = normalizeRoutingPolicyDraft(input)
  const enabled = draft.enabled ? 1 : 0

  db.prepare(`
    INSERT INTO llm_routing_policies (
      id,
      name,
      mode,
      rules_json,
      budget_json,
      enabled,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @name,
      @mode,
      @rulesJson,
      @budgetJson,
      @enabled,
      datetime('now'),
      datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      mode = excluded.mode,
      rules_json = excluded.rules_json,
      budget_json = excluded.budget_json,
      enabled = excluded.enabled,
      updated_at = datetime('now')
  `).run({
    id: draft.id,
    name: draft.name,
    mode: draft.mode,
    rulesJson: JSON.stringify(draft.rules),
    budgetJson: JSON.stringify(draft.budget),
    enabled,
  })

  const saved = getRoutingPolicyRecord(draft.id, db)
  if (!saved) throw new RoutingPolicyStoreError(`Routing policy ${draft.id} was not saved`)
  return saved
}

export function setRoutingPolicyEnabled(
  id: string,
  enabled: boolean,
  db: Database.Database = getDb()
): RoutingPolicyRecord {
  const normalizedId = normalizeId(id)
  const result = db.prepare(`
    UPDATE llm_routing_policies
    SET enabled = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(enabled ? 1 : 0, normalizedId)

  if (result.changes === 0) {
    throw new RoutingPolicyStoreError(`Routing policy not found: ${normalizedId}`)
  }

  const saved = getRoutingPolicyRecord(normalizedId, db)
  if (!saved) throw new RoutingPolicyStoreError(`Routing policy not found: ${normalizedId}`)
  return saved
}
