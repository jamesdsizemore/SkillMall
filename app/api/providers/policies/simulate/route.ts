import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveRouterProviderConfig } from '@/lib/llm/router/config'
import { simulateRoutingPolicyDecision } from '@/lib/llm/router/routing-policy-simulation'
import {
  getRoutingPolicyRecord,
  findForbiddenRoutingPolicyFields,
  normalizeRoutingPolicyDraft,
  RoutingPolicyStoreError,
} from '@/lib/llm/router/routing-policy-store'

export const dynamic = 'force-dynamic'

const SimulationBodySchema = z.object({
  id: z.string().min(1).optional(),
  policy: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
      mode: z.string().min(1),
      rules: z.unknown().optional(),
      budget: z.unknown().optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
  estimatedCostUsd: z.number().finite().optional(),
}).strict()

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const rejectedFields = findForbiddenRoutingPolicyFields(body, '')
  if (rejectedFields.length > 0) {
    return NextResponse.json(
      {
        error: 'policy_field_rejected',
        rejectedFields,
        message: 'Policy simulation accepts routing policy references and numeric estimates only; prompt/response bodies and raw secrets are not accepted.',
      },
      { status: 400 }
    )
  }

  const parsed = SimulationBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_simulation_input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const policy = parsed.data.policy
      ? normalizeRoutingPolicyDraft({
          id: parsed.data.policy.id,
          name: parsed.data.policy.name,
          mode: parsed.data.policy.mode,
          rules: parsed.data.policy.rules,
          budget: parsed.data.policy.budget,
          enabled: parsed.data.policy.enabled,
        })
      : parsed.data.id
        ? getRoutingPolicyRecord(parsed.data.id)
        : undefined

    if (!policy) {
      return NextResponse.json(
        { error: 'routing_policy_not_found', message: 'Select or provide a routing policy to simulate.' },
        { status: 404 }
      )
    }

    const baseConfig = resolveRouterProviderConfig()
    const result = simulateRoutingPolicyDecision({
      baseConfig,
      policy,
      estimatedCostUsd: parsed.data.estimatedCostUsd,
    })

    return NextResponse.json(result)
  } catch (error) {
    const status = error instanceof RoutingPolicyStoreError ? 400 : 500
    return NextResponse.json(
      {
        error: status === 400 ? 'invalid_routing_policy' : 'routing_policy_simulation_error',
        message: error instanceof Error ? error.message : 'Routing policy simulation failed',
      },
      { status }
    )
  }
}
