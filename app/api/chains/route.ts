import { NextResponse } from 'next/server'
import { listChains } from '@/lib/chains'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(listChains())
}
