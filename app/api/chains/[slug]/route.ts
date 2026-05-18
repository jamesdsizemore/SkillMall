import { NextRequest, NextResponse } from 'next/server'
import { getChain } from '@/lib/chains'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const chain = getChain(slug)
  if (!chain) {
    return NextResponse.json({ error: `Chain not found: ${slug}` }, { status: 404 })
  }
  return NextResponse.json(chain)
}
