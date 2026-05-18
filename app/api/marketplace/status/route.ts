import { NextResponse } from 'next/server'
import { checkMarketplaceReady } from '@/lib/marketplace/gate'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(checkMarketplaceReady())
}
