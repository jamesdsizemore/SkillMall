import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeProviderConfig } from '@/lib/providers/config-store'
import { resolveRouterProviderConfig } from '@/lib/llm/router/config'
import {
  getRoutingPolicyRecord,
  findForbiddenRoutingPolicyFields,
  listRoutingPolicies,
  RoutingPolicyStoreError,
  setRoutingPolicyEnabled,
  upsertRoutingPolicy,
} from '@/lib/llm/router/routing-policy-store'
import { PHASE2_ROUTING_POLICY_MODES } from '@/lib/llm/router/types'

export const dynamic = 'force-dynamic'

const PolicyBodySchema = z.object({
  action: z.enum(['upsert', 'enable', 'disable', 'activate']).optional(),
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  mode: z.string().min(1).optional(),
  rules: z.unknown().optional(),
  budget: z.unknown().optional(),
  enabled: z.boolean().optional(),
}).strict()

function policyResponse(policy: ReturnType<typeof getRoutingPolicyRecord>) {
  return policy ?? null
}

export async function GET() {
  try {
    return NextResponse.json({
      policies: listRoutingPolicies(),
      supportedModes: PHASE2_ROUTING_POLICY_MODES,
      unsupportedModes: ['cheapest_compatible', 'quality_first', 'semantic_router'],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'policy_store_unavailable',
        message: error instanceof Error ? error.message : 'Routing policy store unavailable',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const rejectedFields = findForbiddenRoutingPolicyFields(body, '')
  if (rejectedFields.length > 0) {
    return NextResponse.json(
      {
        error: 'policy_field_rejected',
        rejectedFields,
        message: 'Routing policies accept config references and numeric estimates only; raw secrets and prompt/response bodies are not accepted.',
      },
      { status: 400 }
    )
  }

  const parsed = PolicyBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_policy_input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const action = parsed.data.action ?? 'upsert'

  try {
    if (action === 'enable' || action === 'disable') {
      const policy = setRoutingPolicyEnabled(parsed.data.id, action === 'enable')
      return NextResponse.json({ success: true, policy })
    }

    if (action === 'activate') {
      const policy = getRoutingPolicyRecord(parsed.data.id)
      if (!policy) {
        return NextResponse.json(
          { error: 'routing_policy_not_found', message: 'Routing policy was not found.' },
          { status: 404 }
        )
      }
      const config = resolveRouterProviderConfig()
      const saved = await writeProviderConfig({
        provider: config.provider,
        providerRegistryId: config.providerRegistryId,
        executionKind: config.executionKind,
        model: config.model,
        authMode: config.authMode,
        secretRef: config.secretRef,
        gatewayBackend: config.gatewayBackend,
        baseURL: config.baseURL,
        routingPolicyId: policy.id,
      })
      return NextResponse.json({
        success: true,
        activated: true,
        policy: policyResponse(policy),
        activeProviderRegistryId: saved.providerRegistryId,
        routingPolicyId: saved.routingPolicyId ?? policy.id,
      })
    }

    if (!parsed.data.name || !parsed.data.mode) {
      return NextResponse.json(
        { error: 'invalid_policy_input', message: 'Policy upsert requires name and mode.' },
        { status: 400 }
      )
    }

    const policy = upsertRoutingPolicy({
      id: parsed.data.id,
      name: parsed.data.name,
      mode: parsed.data.mode,
      rules: parsed.data.rules,
      budget: parsed.data.budget,
      enabled: parsed.data.enabled,
    })
    return NextResponse.json({ success: true, policy })
  } catch (error) {
    const status = error instanceof RoutingPolicyStoreError ? 400 : 500
    return NextResponse.json(
      {
        error: status === 400 ? 'invalid_routing_policy' : 'routing_policy_error',
        message: error instanceof Error ? error.message : 'Routing policy operation failed',
      },
      { status }
    )
  }
}
