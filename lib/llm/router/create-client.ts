import {
  finishLLMRequest,
  recordLLMRequestEvent,
  startLLMRequest,
  type LLMRequestStartResult,
} from './request-ledger'
import { assertPhase1AuthMode, assertPhase1GatewayBackend } from './secret-refs'
import { defaultAuthModeForProvider } from './config'
import type { LLMRequestFinishInput, LLMRequestStartInput } from './types'
import type { CompletionOptions, LLMClient, ProviderConfig } from '../../providers/types'

export type DirectLLMClientFactory = (config: ProviderConfig) => LLMClient

export interface RouterLedger {
  start(input: LLMRequestStartInput): LLMRequestStartResult
  finish(input: LLMRequestFinishInput): void
  event(input: Parameters<typeof recordLLMRequestEvent>[0]): void
}

const defaultLedger: RouterLedger = {
  start: startLLMRequest,
  finish: finishLLMRequest,
  event: recordLLMRequestEvent,
}

function errorCodeFor(error: unknown): string {
  if (error instanceof Error && error.name) return error.name
  return 'llm_request_error'
}

function errorMessageFor(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'LLM request failed'
}

export function createRouterLLMClient(
  config: ProviderConfig,
  directFactory: DirectLLMClientFactory,
  ledger: RouterLedger = defaultLedger
): LLMClient {
  const authMode = assertPhase1AuthMode(config.authMode ?? defaultAuthModeForProvider(config.provider))
  const routeBackend = assertPhase1GatewayBackend(config.gatewayBackend)
  const directClient = directFactory(config)

  return {
    provider: directClient.provider,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      const started = ledger.start({
        operation: options?.operation ?? 'unknown',
        providerId: config.provider,
        modelId: config.model,
        authMode,
        routeBackend,
        routingPolicyId: config.routingPolicyId,
        metadata: options?.metadata,
      })

      try {
        const output = await directClient.complete(prompt, options)
        ledger.finish({
          requestId: started.requestId,
          status: 'succeeded',
        })
        return output
      } catch (error) {
        ledger.event({
          requestId: started.requestId,
          eventType: 'provider.error',
          providerId: config.provider,
          modelId: config.model,
          message: errorMessageFor(error),
        })
        ledger.finish({
          requestId: started.requestId,
          status: 'failed',
          errorCode: errorCodeFor(error),
        })
        throw error
      }
    },
  }
}
