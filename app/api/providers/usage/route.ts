import { NextResponse } from 'next/server'
import { createUnavailableUsageSummary, getUsageSummary } from '@/lib/llm/router/usage-summary'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(getUsageSummary())
  } catch {
    return NextResponse.json(
      createUnavailableUsageSummary('Usage ledger is unavailable in this environment.')
    )
  }
}
