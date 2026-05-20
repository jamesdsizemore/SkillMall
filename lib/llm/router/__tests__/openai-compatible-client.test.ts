import { afterEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createOpenAICompatibleLLMClient } from '../openai-compatible-client'
import { createRouterLLMClient } from '../create-client'
import { startLLMRequest, finishLLMRequest } from '../request-ledger'

const phase1MigrationSql = fs.readFileSync(
  path.join(process.cwd(), 'db/migrations/006_llm_router_core.sql'),
  'utf-8'
)
const phase2MigrationSql = fs.readFileSync(
  path.join(process.cwd(), 'db/migrations/007_llm_router_phase2.sql'),
  'utf-8'
)
const phase4MigrationSql = fs.readFileSync(
  path.join(process.cwd(), 'db/migrations/008_provider_auth_router_phase4.sql'),
  'utf-8'
)
const tempDbs: Array<{ db: Database.Database; file: string }> = []

function createDb(): Database.Database {
  const file = path.join(os.tmpdir(), `skillmall-openai-compatible-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(phase1MigrationSql)
  db.exec(phase2MigrationSql)
  db.exec(phase4MigrationSql)
  tempDbs.push({ db, file })
  return db
}

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY
  vi.restoreAllMocks()
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

describe('createOpenAICompatibleLLMClient', () => {
  it('calls a configured OpenAI-compatible endpoint and returns usage/cost metadata without leaking prompts', async () => {
    process.env.OPENROUTER_API_KEY = 'redacted-openrouter-key'
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'response-1',
          choices: [{ message: { content: 'provider text' } }],
          usage: {
            prompt_tokens: 11,
            completion_tokens: 17,
            prompt_tokens_details: { cached_tokens: 3 },
            completion_tokens_details: { reasoning_tokens: 5 },
          },
        }),
        {
          status: 200,
          headers: { 'x-openai-compatible-response-cost': '0.0123' },
        }
      )
    )

    const client = createOpenAICompatibleLLMClient(
      {
        provider: 'openai',
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        model: 'openai/gpt-5-mini',
        authMode: 'env_key',
        secretRef: { type: 'env', name: 'OPENROUTER_API_KEY' },
        baseURL: 'https://openrouter.example/api/v1/',
      },
      fetchFn
    )

    const result = await client.completeWithMetadata('do not store this prompt', {
      operation: 'skill.preview',
      systemPrompt: 'system text',
    })

    expect(result).toMatchObject({
      text: 'provider text',
      usage: {
        inputTokens: 11,
        outputTokens: 17,
        cachedInputTokens: 3,
        reasoningTokens: 5,
      },
      actualCostUsd: 0.0123,
      costSource: 'openai_compatible',
      metadata: {
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        responseId: 'response-1',
      },
    })
    expect(fetchFn).toHaveBeenCalledWith(
      'https://openrouter.example/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer redacted-openrouter-key',
          'Content-Type': 'application/json',
        }),
      })
    )
    expect(JSON.stringify(result.metadata)).not.toContain('do not store')
  })

  it('requires env secret refs and configured base URLs', () => {
    expect(() =>
      createOpenAICompatibleLLMClient({
        provider: 'openai',
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        model: 'openai/gpt-5-mini',
        authMode: 'env_key',
        secretRef: { type: 'env', name: 'OPENROUTER_API_KEY' },
      })
    ).toThrow('baseURL')

    expect(() =>
      createOpenAICompatibleLLMClient({
        provider: 'openai',
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        model: 'openai/gpt-5-mini',
        authMode: 'gateway_virtual_key',
        secretRef: { type: 'gateway_virtual_key_ref', name: 'BIFROST_VIRTUAL_KEY' },
        baseURL: 'https://openrouter.example/api/v1',
      })
    ).toThrow('env_key')
  })

  it('persists provider registry id and execution kind in ledger rows', () => {
    const db = createDb()
    const started = startLLMRequest(
      {
        operation: 'skill.preview',
        providerId: 'openai',
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        modelId: 'openai/gpt-5-mini',
        authMode: 'env_key',
        routeBackend: 'direct',
        metadata: { prompt: 'do not store', workflow: 'preview' },
      },
      db
    )

    finishLLMRequest(
      {
        requestId: started.requestId,
        status: 'succeeded',
        inputTokens: 11,
        outputTokens: 17,
        actualCostUsd: 0.0123,
        costSource: 'openai_compatible',
        metadata: { response: 'do not store', providerResponseId: 'response-1' },
      },
      db
    )

    const row = db.prepare('SELECT provider_id, provider_registry_id, execution_kind, metadata_json FROM llm_requests').get() as {
      provider_id: string
      provider_registry_id: string
      execution_kind: string
      metadata_json: string
    }

    expect(row).toMatchObject({
      provider_id: 'openai',
      provider_registry_id: 'openrouter',
      execution_kind: 'openai_compatible',
    })
    expect(row.metadata_json).toContain('response-1')
    expect(row.metadata_json).not.toContain('do not store')
  })

  it('routes configured registry targets through the generic OpenAI-compatible client', async () => {
    process.env.OPENROUTER_API_KEY = 'redacted-openrouter-key'
    const ledger = {
      starts: [] as unknown[],
      finishes: [] as unknown[],
      events: [] as unknown[],
      start(input: Parameters<typeof startLLMRequest>[0]) {
        this.starts.push(input)
        return { requestId: 'request-1', startedAt: '2026-05-20T12:00:00.000Z' }
      },
      finish(input: Parameters<typeof finishLLMRequest>[0]) {
        this.finishes.push(input)
      },
      event(input: unknown) {
        this.events.push(input)
      },
    }
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }))
    )
    vi.stubGlobal('fetch', fetchFn)

    const client = createRouterLLMClient(
      {
        provider: 'openai',
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        model: 'openai/gpt-5-mini',
        authMode: 'env_key',
        secretRef: { type: 'env', name: 'OPENROUTER_API_KEY' },
        baseURL: 'https://openrouter.example/api/v1',
      },
      vi.fn(() => {
        throw new Error('direct client should not be created')
      }),
      ledger
    )

    await expect(client.complete('prompt')).resolves.toBe('ok')
    expect(ledger.starts).toEqual([
      expect.objectContaining({
        providerId: 'openai',
        providerRegistryId: 'openrouter',
        executionKind: 'openai_compatible',
        modelId: 'openai/gpt-5-mini',
      }),
    ])
    expect(fetchFn).toHaveBeenCalledWith(
      'https://openrouter.example/api/v1/chat/completions',
      expect.any(Object)
    )
  })
})
