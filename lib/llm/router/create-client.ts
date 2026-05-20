import {
  finishLLMRequest,
  recordLLMRequestEvent,
  startLLMRequest,
  type LLMRequestStartResult,
} from './request-ledger'
import { assertRouterAuthMode, assertRouterGatewayBackend } from './secret-refs'
import { defaultAuthModeForProvider } from './config'
import type { LLMRequestFinishInput, LLMRequestStartInput } from './types'
import type { CompletionOptions, LLMClient, ProviderConfig } from '../../providers/types'
import { createGatewayLLMClient, type GatewayBackedLLMClient, type GatewayLLMClientFactory } from './gateway-client'
import { createOpenAICompatibleLLMClient } from './openai-compatible-client'
import { getLatestPricingSnapshot, type PricingSnapshotRecord } from './pricing-refresh'
import { resolveRequestCost } from './costing'
import { evaluateRoutingPolicy, loadRoutingPolicy, RoutingPolicyError, type RoutingDecision, type RoutingPolicy } from './routing-policy'
import { providerRegistryIdForExecutableProvider } from '../../providers/registry'

export type DirectLLMClientFactory = (config: ProviderConfig) => LLMClient
export type PricingSnapshotLookup = (
  providerId: string,
  modelId: string
) => PricingSnapshotRecord | undefined

export interface RouterLedger {
  start(input: LLMRequestStartInput): LLMRequestStartResult
  finish(input: LLMRequestFinishInput): void
  event(input: Parameters<typeof recordLLMRequestEvent>[0]): void
}

export type RoutingPolicyLoader = (policyId: string) => RoutingPolicy | undefined

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
  ledger: RouterLedger = defaultLedger,
  gatewayFactory: GatewayLLMClientFactory = createGatewayLLMClient,
  policyLoader: RoutingPolicyLoader = loadRoutingPolicy,
  pricingLookup: PricingSnapshotLookup = getLatestPricingSnapshot
): LLMClient {
  const routingDecision = config.routingPolicyId
    ? evaluateRoutingPolicy(config, policyLoader(config.routingPolicyId))
    : evaluateRoutingPolicy(config)
  const selectedConfig = routingDecision.config
  const authMode = assertRouterAuthMode(selectedConfig.authMode ?? defaultAuthModeForProvider(selectedConfig.provider))
  const routeBackend = assertRouterGatewayBackend(selectedConfig.gatewayBackend)
  const providerRegistryId = selectedConfig.providerRegistryId ?? providerRegistryIdForExecutableProvider(selectedConfig.provider)
  const executionKind = selectedConfig.executionKind ?? (routeBackend === 'bifrost_local' ? 'bifrost_local' : 'direct')

  return {
    provider: selectedConfig.provider,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      const started = ledger.start({
        operation: options?.operation ?? 'unknown',
        providerId: selectedConfig.provider,
        providerRegistryId,
        executionKind,
        modelId: selectedConfig.model,
        authMode,
        routeBackend,
        routingPolicyId: selectedConfig.routingPolicyId ?? config.routingPolicyId,
        metadata: options?.metadata,
      })

      if (config.routingPolicyId) {
        recordRoutingDecisionEvents(started.requestId, routingDecision, ledger, config.routingPolicyId)
      }

      const blockedAttempt = routingDecision.attempts.find((attempt) => attempt.status === 'blocked')
      if (blockedAttempt) {
        ledger.finish({
          requestId: started.requestId,
          status: 'failed',
          errorCode: 'RoutingPolicyBlocked',
          metadata: { routingPolicyBlockReason: blockedAttempt.reason },
        })
        throw new RoutingPolicyError(blockedAttempt.reason ?? 'Routing policy blocked request')
      }

      try {
        const executionClient =
          executionKind === 'openai_compatible'
            ? createOpenAICompatibleLLMClient({ ...selectedConfig, authMode, executionKind, providerRegistryId })
            : routeBackend === 'direct'
            ? directFactory(selectedConfig)
            : gatewayFactory({ ...selectedConfig, authMode, gatewayBackend: routeBackend })

        if ('completeWithMetadata' in executionClient) {
          const output = await (executionClient as GatewayBackedLLMClient).completeWithMetadata(
            prompt,
            options
          )
          const pricing =
            pricingLookup(providerRegistryId, selectedConfig.model) ??
            pricingLookup(selectedConfig.provider, selectedConfig.model)
          const resolvedCost = resolveRequestCost({
            providerReportedCostUsd: output.actualCostUsd,
            usage: output.usage,
            pricing: pricing?.pricing,
            pricingSource: pricing?.source,
          })
          ledger.finish({
            requestId: started.requestId,
            status: 'succeeded',
            inputTokens: output.usage?.inputTokens,
            outputTokens: output.usage?.outputTokens,
            cachedInputTokens: output.usage?.cachedInputTokens,
            reasoningTokens: output.usage?.reasoningTokens,
            actualCostUsd: resolvedCost.actualCostUsd,
            estimatedCostUsd: output.estimatedCostUsd ?? resolvedCost.estimatedCostUsd,
            costSource: output.costSource ?? resolvedCost.costSource,
            metadata: output.metadata,
          })
          return output.text
        }

        const output = await executionClient.complete(prompt, options)
        ledger.finish({
          requestId: started.requestId,
          status: 'succeeded',
        })
        return output
      } catch (error) {
        ledger.event({
          requestId: started.requestId,
          eventType: 'provider.error',
          providerId: selectedConfig.provider,
          providerRegistryId,
          executionKind,
          modelId: selectedConfig.model,
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

function recordRoutingDecisionEvents(
  requestId: string,
  decision: RoutingDecision,
  ledger: RouterLedger,
  routingPolicyId?: string
): void {
  for (const attempt of decision.attempts) {
    ledger.event({
      requestId,
      eventType: `routing.policy.${attempt.status}`,
      providerId: attempt.providerId,
      modelId: attempt.modelId,
      metadata: {
        routingPolicyId,
        candidateId: attempt.candidateId,
        routeBackend: attempt.routeBackend,
        reason: attempt.reason,
        mode: decision.mode,
      },
    })
  }
}
