import { NextRequest, NextResponse } from 'next/server'
import { handleWebhook } from '@/lib/marketplace/payments'

// Next.js App Router: raw body is accessed via req.arrayBuffer()
// No need for bodyParser: false config — App Router doesn't use bodyParser
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 })
  }

  // Read raw body — MUST use arrayBuffer for Stripe signature verification
  const rawArrayBuffer = await req.arrayBuffer()
  const rawBody = Buffer.from(rawArrayBuffer)

  try {
    const result = await handleWebhook(rawBody, signature)
    return NextResponse.json({ received: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Stripe signature verification failed or webhook secret missing
    if (message.includes('signature') || message.includes('secret') || message.includes('No signatures')) {
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
